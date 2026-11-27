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
  audioDeviceId?: string;
  videoDeviceId?: string;
  language?: string;
  onMessage?: (message: InterviewMessage) => void;
  onAiTurnMedia?: (media: AiTurnMedia) => void;
  onAiAmplitude?: (level: number) => void;
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
  audioDeviceId,
  videoDeviceId,
  language,
  onMessage,
  onAiTurnMedia,
  onAiAmplitude,
}: UseInterviewRuntimeOptions) => {
  const [phase, setPhase] = useState<InterviewRuntimePhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const audioPlayback = useAudioPlayback(onAiAmplitude);
  const videoCapture = useVideoCapture(videoDeviceId);
  const audioCaptureRef = useRef<((paused: boolean) => void) | null>(null);
  const phaseRef = useRef<InterviewRuntimePhase>("idle");
  const runtimeGenerationRef = useRef(0);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const mutedRef = useRef(false);
  const { playAudio, stopAudio } = audioPlayback;
  const stopVideoCapture = videoCapture.stopCapture;

  const transition = useCallback((next: InterviewRuntimePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setCapturePaused = useCallback((paused: boolean) => {
    audioCaptureRef.current?.(paused || mutedRef.current);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    setCapturePaused(muted || phaseRef.current !== "user_listening");
  }, [setCapturePaused]);

  const resumeListening = useCallback((generation: number) => {
    if (generation !== runtimeGenerationRef.current) return;
    currentUtteranceRef.current = null;
    setCapturePaused(false);
    transition("user_listening");
  }, [setCapturePaused, transition]);

  const speakWithBrowserTts = useCallback((content: string, generation: number) => {
    if (generation !== runtimeGenerationRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resumeListening(generation);
      return;
    }

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }

    const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [content];
    let sentenceIndex = 0;
    const speakNext = () => {
      if (generation !== runtimeGenerationRef.current) return;
      const sentence = sentences[sentenceIndex++];
      if (!sentence) {
        currentUtteranceRef.current = null;
        resumeListening(generation);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentence);
      if (language) utterance.lang = language;
      currentUtteranceRef.current = utterance;
      utterance.onend = () => {
        if (currentUtteranceRef.current === utterance) speakNext();
      };
      utterance.onerror = (event) => {
        const benign = event?.error === "interrupted" || event?.error === "canceled";
        if (generation === runtimeGenerationRef.current && currentUtteranceRef.current === utterance && !benign) speakNext();
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }, [language, resumeListening]);

  const playAiResponse = useCallback(
    async (content: string, media: AiTurnMedia, generation: number) => {
      if (generation !== runtimeGenerationRef.current) return;
      transition("interviewer_speaking");
      setCapturePaused(true);
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
    [onAiTurnMedia, playAudio, resumeListening, setCapturePaused, speakWithBrowserTts, transition],
  );

  const onUserChunk = useCallback(
    async (base64Audio: string) => {
      if (phaseRef.current !== "user_listening") return;
      const generation = runtimeGenerationRef.current;

      transition("processing");
      setCapturePaused(true);

      try {
        const response = await interviewApi.sendAudioMessage(
          interviewId!,
          base64Audio,
        );
        if (generation !== runtimeGenerationRef.current) return;

        if ("status" in response && response.status === "no_speech") {
          setCapturePaused(false);
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
        setCapturePaused(false);
        transition("user_listening");
      }
    },
    [interviewId, onMessage, playAiResponse, setCapturePaused, transition],
  );

  const audioCapture = useAudioCapture(onUserChunk, audioDeviceId);
  const startAudioCapture = audioCapture.startCapture;
  const stopAudioCapture = audioCapture.stopCapture;
  const setAudioPaused = audioCapture.setPaused;
  useEffect(() => {
    audioCaptureRef.current = setAudioPaused;
  }, [setAudioPaused]);

  const submitText = useCallback(async (content: string) => {
    if (!interviewId || phaseRef.current !== "user_listening") return;
    const text = content.trim();
    if (!text) return;
    const generation = runtimeGenerationRef.current;
    setCapturePaused(true);
    transition("processing");
    onMessage?.({
      id: Date.now(),
      interview_id: interviewId,
      role: "user",
      content: text,
      transcript: text,
      created_at: new Date().toISOString(),
    });
    try {
      const response = await interviewApi.sendMessage(interviewId, {
        role: "user",
        content: text,
        generate_audio: false,
      });
      if (generation !== runtimeGenerationRef.current) return;
      onMessage?.(response);
      await playAiResponse(response.content, extractMedia(response), generation);
    } catch (reason) {
      if (generation !== runtimeGenerationRef.current) return;
      setError(reason instanceof Error ? reason.message : "Could not send your answer. Try again or use text chat.");
      setCapturePaused(false);
      transition("user_listening");
    }
  }, [interviewId, onMessage, playAiResponse, setCapturePaused, transition]);

  const interruptAi = useCallback(() => {
    if (phaseRef.current !== "interviewer_speaking") return;
    runtimeGenerationRef.current += 1;
    stopAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    currentUtteranceRef.current = null;
    transition("user_listening");
    setCapturePaused(false);
  }, [setCapturePaused, stopAudio, transition]);

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
    setCapturePaused(false);
  }, [setCapturePaused, transition]);

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
    submitText,
    interruptAi,
    setMuted,
  };
};

export const useInterviewSocket = useInterviewRuntime;
