import { useState, useEffect, useRef, useCallback } from "react";
import { interviewApi } from "@/lib/api";
import { useAudioCapture } from "./useAudioCapture";
import { useAudioPlayback } from "./useAudioPlayback";
import { useVideoCapture } from "./useVideoCapture";
import type { InterviewMessage } from "@/types";

export type InterviewRuntimePhase =
  | "idle"
  | "preparing"
  | "interviewer_speaking"
  | "user_listening"
  | "processing"
  | "completed";

export interface AiTurnMedia {
  audioData?: string | null;
  audioUrl?: string | null;
  audioMimeType?: string | null;
  videoUrl?: string | null;
  videoData?: string | null;
  videoMimeType?: string | null;
  avatarImageUrl?: string | null;
  avatarImageData?: string | null;
  avatarImageMimeType?: string | null;
  avatarType?: InterviewMessage["avatar_type"] | null;
  playbackState?: InterviewMessage["playback_state"] | null;
  speakingState?: InterviewMessage["speaking_state"] | null;
  transcript?: string | null;
}

export interface InterviewRuntimeState {
  phase: InterviewRuntimePhase;
  isActive: boolean;
  isInterviewerSpeaking: boolean;
  isUserListening: boolean;
  isProcessing: boolean;
  error: string | null;
}

interface UseInterviewRuntimeOptions {
  interviewId: number | null;
  onMessage?: (message: InterviewMessage) => void;
  onAiTurnMedia?: (media: AiTurnMedia) => void;
}

export function extractMedia(msg: InterviewMessage): AiTurnMedia {
  return {
    audioData: msg.audio_data ?? null,
    audioUrl: msg.audio_url ?? null,
    audioMimeType: msg.audio_mime_type ?? null,
    videoUrl: msg.ai_avatar_video_url ?? msg.video_url ?? null,
    videoData: msg.video_data ?? null,
    videoMimeType: msg.video_mime_type ?? null,
    avatarImageUrl: msg.ai_avatar_image_url ?? msg.avatar_image_url ?? null,
    avatarImageData: msg.avatar_image_data ?? null,
    avatarImageMimeType: msg.avatar_image_mime_type ?? null,
    avatarType: msg.avatar_type ?? null,
    playbackState: msg.playback_state ?? null,
    speakingState: msg.speaking_state ?? null,
    transcript: msg.transcript ?? null,
  };
}

export const useInterviewRuntime = ({
  interviewId,
  onMessage,
  onAiTurnMedia,
}: UseInterviewRuntimeOptions) => {
  const [phase, setPhase] = useState<InterviewRuntimePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const audioPlayback = useAudioPlayback();
  const videoCapture = useVideoCapture();
  const audioCaptureRef = useRef<((paused: boolean) => void) | null>(null);
  const phaseRef = useRef<InterviewRuntimePhase>("idle");
  const runtimeGenerationRef = useRef(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { playAudio, stopAudio } = audioPlayback;
  const stopVideoCapture = videoCapture.stopCapture;

  const transition = useCallback((next: InterviewRuntimePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const resumeListening = useCallback((generation: number) => {
    if (generation !== runtimeGenerationRef.current) return;
    currentUtteranceRef.current = null;
    audioCaptureRef.current?.(false);
    transition("user_listening");
  }, [transition]);

  const speakWithBrowserTts = useCallback((content: string, generation: number) => {
    if (generation !== runtimeGenerationRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resumeListening(generation);
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(content);
    currentUtteranceRef.current = utterance;
    utterance.onend = () => {
      if (currentUtteranceRef.current === utterance) resumeListening(generation);
    };
    utterance.onerror = (event) => {
      const benign = event?.error === "interrupted" || event?.error === "canceled";
      if (generation === runtimeGenerationRef.current &&
        (benign || currentUtteranceRef.current === utterance)) {
        resumeListening(generation);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, [resumeListening]);

  const playAiResponse = useCallback(
    async (content: string, media: AiTurnMedia, generation: number) => {
      if (generation !== runtimeGenerationRef.current) return;
      transition("interviewer_speaking");
      audioCaptureRef.current?.(true);
      onAiTurnMedia?.(media);

      const audioSource = media.audioUrl ?? media.audioData;
      if (audioSource) {
        let fallbackStarted = false;
        const fallbackToSpeech = () => {
          if (fallbackStarted || generation !== runtimeGenerationRef.current) return;
          fallbackStarted = true;
          speakWithBrowserTts(content, generation);
        };
        const playbackStarted = await playAudio(
          audioSource,
          media.audioMimeType || "audio/webm",
          () => resumeListening(generation),
          fallbackToSpeech,
        );
        if (playbackStarted || generation !== runtimeGenerationRef.current) return;
        fallbackToSpeech();
        return;
      }

      speakWithBrowserTts(content, generation);
    },
    [onAiTurnMedia, playAudio, resumeListening, speakWithBrowserTts, transition],
  );

  const onUserChunk = useCallback(
    async (base64Audio: string) => {
      if (phaseRef.current !== "user_listening") return;
      const generation = runtimeGenerationRef.current;

      transition("processing");
      audioCaptureRef.current?.(true);

      try {
        const response = await interviewApi.sendAudioMessage(
          interviewId!,
          base64Audio,
        );
        if (generation !== runtimeGenerationRef.current) return;

        if ("status" in response && response.status === "no_speech") {
          audioCaptureRef.current?.(false);
          transition("user_listening");
          return;
        }

        onMessage?.(response);
        await playAiResponse(response.content, extractMedia(response), generation);
      } catch (err: unknown) {
        if (generation !== runtimeGenerationRef.current) return;
        const status = err instanceof Error && "status" in err
          ? Number(err.status)
          : undefined;
        if (status !== 422) {
          setError(
            `Failed to process speech (${status ?? "unknown"}). Please try again.`,
          );
        }
        audioCaptureRef.current?.(false);
        transition("user_listening");
      }
    },
    [interviewId, onMessage, playAiResponse, transition],
  );

  const audioCapture = useAudioCapture(onUserChunk);
  const startAudioCapture = audioCapture.startCapture;
  const stopAudioCapture = audioCapture.stopCapture;
  const setAudioPaused = audioCapture.setPaused;
  useEffect(() => {
    audioCaptureRef.current = setAudioPaused;
  }, [setAudioPaused]);

  const start = useCallback(async () => {
    const generation = ++runtimeGenerationRef.current;
    setError(null);
    transition("preparing");
    const microphoneReady = await startAudioCapture();
    if (generation !== runtimeGenerationRef.current) {
      if (microphoneReady) stopAudioCapture();
      return false;
    }
    if (!microphoneReady) {
      transition("idle");
      return false;
    }
    return true;
  }, [startAudioCapture, stopAudioCapture, transition]);

  const stop = useCallback(() => {
    runtimeGenerationRef.current += 1;
    stopAudioCapture();
    stopVideoCapture();
    stopAudio();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    currentUtteranceRef.current = null;
    transition("idle");
  }, [stopAudioCapture, stopAudio, stopVideoCapture, transition]);

  const complete = useCallback(() => {
    stop();
    transition("completed");
  }, [stop, transition]);

  const speakOpening = useCallback(
    async (content: string, media: AiTurnMedia) => {
      await playAiResponse(content, media, runtimeGenerationRef.current);
    },
    [playAiResponse],
  );

  const beginListening = useCallback(() => {
    transition("user_listening");
    audioCaptureRef.current?.(false);
  }, [transition]);

  useEffect(() => {
    return () => {
      runtimeGenerationRef.current += 1;
      currentUtteranceRef.current = null;
      stopAudioCapture();
      stopAudio();
      stopVideoCapture();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, [stopAudioCapture, stopAudio, stopVideoCapture]);

  return {
    phase,
    error,
    audioCapture,
    videoCapture,
    isActive: phase !== "idle" && phase !== "completed",
    isInterviewerSpeaking: phase === "interviewer_speaking",
    isUserListening: phase === "user_listening",
    isProcessing: phase === "processing",
    start,
    stop,
    complete,
    speakOpening,
    beginListening,
    transition,
  };
};

export const useInterviewSocket = useInterviewRuntime;
