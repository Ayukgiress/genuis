import { useState, useCallback, useRef, useEffect } from 'react';
import { interviewApi } from '@/lib/api';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import type { InterviewMessage } from '@/types';

export type SessionPhase =
  | 'idle'
  | 'preparing'
  | 'ai_speaking'
  | 'user_listening'
  | 'processing'
  | 'completed';

/** Resolved media for a single AI turn — all fields optional for backward compat. */
export interface AiTurnMedia {
  audioData?: string | null;
  videoUrl?: string | null;   // ai_avatar_video_url
  videoData?: string | null;  // base64 inline video
}

function extractMedia(msg: InterviewMessage): AiTurnMedia {
  return {
    audioData: msg.audio_data ?? null,
    videoUrl: msg.ai_avatar_video_url ?? null,
    videoData: msg.video_data ?? null,
  };
}

interface UseInterviewSessionOptions {
  interviewId: number | null;
  onMessage?: (message: InterviewMessage) => void;
  onAiTurnMedia?: (media: AiTurnMedia) => void;
}

export const useInterviewSession = ({ interviewId, onMessage, onAiTurnMedia }: UseInterviewSessionOptions) => {
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [error, setError] = useState<string | null>(null);

  const audioPlayback = useAudioPlayback();
  const audioCaptureRef = useRef<ReturnType<typeof useAudioCapture> | null>(null);

  // Refs to avoid stale closures in callbacks
  const phaseRef = useRef<SessionPhase>('idle');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const transition = useCallback((next: SessionPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Called when AI audio/TTS finishes — resume mic
  const onAiTurnEnd = useCallback(() => {
    currentUtteranceRef.current = null;
    audioCaptureRef.current?.setPaused(false);
    transition('user_listening');
  }, [transition]);

  const playAiResponse = useCallback(async (content: string, media: AiTurnMedia) => {
    transition('ai_speaking');
    audioCaptureRef.current?.setPaused(true);
    onAiTurnMedia?.(media);

    if (media.audioData) {
      audioPlayback.playAudio(media.audioData, 'audio/webm', onAiTurnEnd);
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
      const utterance = new SpeechSynthesisUtterance(content);
      currentUtteranceRef.current = utterance;

      const cleanup = (benign = false) => {
        if (currentUtteranceRef.current !== utterance) return;
        if (!benign) onAiTurnEnd();
      };

      utterance.onend = () => cleanup();
      utterance.onerror = (e) => {
        const benign = e?.error === 'interrupted' || e?.error === 'canceled';
        cleanup(benign);
        if (benign) onAiTurnEnd(); // safety net
      };

      window.speechSynthesis.speak(utterance);
    } else {
      onAiTurnEnd();
    }
  }, [audioPlayback, onAiTurnEnd, onAiTurnMedia, transition]);

  // Audio capture callback — fires when user finishes a speech segment
  const onUserChunk = useCallback(async (base64Audio: string) => {
    if (phaseRef.current !== 'user_listening') return;

    transition('processing');
    audioCaptureRef.current?.setPaused(true);

    try {
      const response = await interviewApi.sendAudioMessage(interviewId!, base64Audio);

      if ((response as any).status === 'no_speech') {
        audioCaptureRef.current?.setPaused(false);
        transition('user_listening');
        return;
      }

      onMessage?.(response);
      await playAiResponse(response.content, extractMedia(response));
    } catch (err: any) {
      if (err?.status !== 422) {
        setError(`Failed to process speech (${err?.status ?? 'unknown'}). Please try again.`);
      }
      audioCaptureRef.current?.setPaused(false);
      transition('user_listening');
    }
  }, [interviewId, onMessage, playAiResponse, transition]);

  const audioCapture = useAudioCapture(onUserChunk);
  audioCaptureRef.current = audioCapture;

  const start = useCallback(() => {
    transition('preparing');
    audioCapture.startCapture();
  }, [audioCapture, transition]);

  const stop = useCallback(() => {
    audioCapture.stopCapture();
    audioPlayback.stopAudio();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    currentUtteranceRef.current = null;
    transition('idle');
  }, [audioCapture, audioPlayback, transition]);

  const complete = useCallback(() => {
    stop();
    transition('completed');
  }, [stop, transition]);

  // Speak the opening AI message then move to user_listening
  const speakOpening = useCallback(async (content: string, media: AiTurnMedia) => {
    await playAiResponse(content, media);
  }, [playAiResponse]);

  // After preparing, caller should invoke speakOpening or beginListening directly
  const beginListening = useCallback(() => {
    transition('user_listening');
    audioCaptureRef.current?.setPaused(false);
  }, [transition]);

  useEffect(() => {
    return () => {
      audioPlayback.stopAudio();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, [audioPlayback]);

  return {
    phase,
    error,
    audioCapture,
    // Derived booleans for convenience
    isActive: phase !== 'idle' && phase !== 'completed',
    isAiSpeaking: phase === 'ai_speaking',
    isUserListening: phase === 'user_listening',
    isProcessing: phase === 'processing',
    // Actions
    start,
    stop,
    complete,
    speakOpening,
    beginListening,
  };
};
