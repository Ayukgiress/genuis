import { useState, useCallback, useRef, useEffect } from 'react';
import { interviewApi } from '@/lib/api';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import type { InterviewMessage } from '@/types';

// Note: Now using HTTP-based audio processing instead of WebSocket

export const useInterviewWebSocket = (
  interviewId: number | null,
  onMessage?: (message: InterviewMessage) => void
) => {
  const [isConnected, setIsConnected] = useState(true); // Always "connected" for HTTP approach
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isTtsActive, setIsTtsActive] = useState(false); // explicit TTS flag

  const audioCaptureRef = useRef<any>(null);

  // Audio capture integration
  const audioPlayback = useAudioPlayback();

  // Track the currently active TTS utterance so we can cancel/guard it.
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Guard to ensure we only play ONE form of audio per AI turn
  // (backend audio OR browser TTS fallback — never both).
  const ttsStartedRef = useRef(false);

  // Centralized cleanup so we unpause the mic exactly once per AI turn.
  const finalizeAiTurn = useCallback(() => {
    setIsAiResponding(false);
    setIsTtsActive(false);
    ttsStartedRef.current = false;
    currentUtteranceRef.current = null;
    audioCaptureRef.current?.setPaused(false);
    console.log('🎤 Ready for user response');
  }, []);

  const audioCaptureCallback = useCallback(async (base64Audio: string) => {
    if (isAiResponding) {
      console.log('🤖 AI is responding, ignoring user speech');
      return;
    }

    console.log('🎤 User speech detected, sending automatically. Size:', base64Audio.length);

    try {
      setIsAiResponding(true);
      ttsStartedRef.current = false;
      audioCaptureRef.current?.setPaused(true);

      // Send audio via HTTP POST
      const response: InterviewMessage = await interviewApi.sendAudioMessage(interviewId!, base64Audio);

      // ✅ Ignore no_speech sentinel
      if ((response as any).status === 'no_speech') {
        console.log('No speech detected, ignoring');
        finalizeAiTurn();
        return;
      }

      console.log('✅ AI response received:', response);
      if (onMessage) onMessage(response);

      // Handle AI text response
      if (response.content) {
        console.log('💬 AI says:', response.content);
      }

      const audioData =
        (response as any).audio_data ??
        (response as any).audio ??
        (response as any).audioData ??
        (response as any).ai_audio_base64 ??
        (response as any).aiAudioBase64 ??
        null;

      if (audioData) {
        // ✅ Prefer backend audio. Use TTS as fallback ONLY if no audio comes back.
        console.log('🔊 Playing AI response (backend audio)...');
        setIsTtsActive(false);
        audioPlayback.playAudio(audioData as string, 'audio/webm', () => {
          finalizeAiTurn();
        });
      } else if (response.content && typeof window !== "undefined" && "speechSynthesis" in window) {
        // Speech-to-speech fallback using browser TTS (because backend audio is missing)
        console.log('🔊 Falling back to browser TTS for AI response');
        const textToSpeak = response.content;

        try {
          // Cancel any in-flight utterance first to avoid overlap.
          // This WILL fire an "interrupted" error on the previous utterance — which is normal
          // and benign. We filter that out in the onerror handler below.
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
          }

          setIsTtsActive(true);
          ttsStartedRef.current = true;

          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          currentUtteranceRef.current = utterance;

          utterance.onstart = () => {
            console.log('🗣️ TTS started');
          };

          utterance.onend = () => {
            console.log('🗣️ TTS ended');
            if (currentUtteranceRef.current === utterance) {
              finalizeAiTurn();
            }
          };

          utterance.onerror = (event) => {
            // "interrupted" and "canceled" are BENIGN — they fire when we call
            // speechSynthesis.cancel() before the next utterance, or when the user
            // navigates away. They are NOT real errors.
            const benign = event?.error === 'interrupted' || event?.error === 'canceled';
            if (benign) {
              console.log(`TTS ${event.error} (benign, ignored)`);
              // Don't finalize here — onend will fire and handle cleanup.
              // If onend was swallowed (some browsers), finalize as a safety net.
              if (currentUtteranceRef.current === utterance) {
                finalizeAiTurn();
              }
              return;
            }
            console.error('TTS error:', event);
            if (currentUtteranceRef.current === utterance) {
              finalizeAiTurn();
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error('TTS execution error:', e);
          finalizeAiTurn();
        }
      } else if (response.content) {
        // TTS not supported — just unlock the mic
        console.log('⚠️ No TTS support and no backend audio, unlocking mic');
        finalizeAiTurn();
      } else {
        // No content, no audio — just unlock the mic
        finalizeAiTurn();
      }

    } catch (error: any) {
      // 422 = no speech detected, not a real error
      if (error?.status === 422) {
        console.log('No speech detected, ignoring');
      } else {
        console.error('❌ Failed to send audio message:', error);
        setError(`Failed to process speech (${error?.status || 'unknown error'}). Please try again.`);
      }
      finalizeAiTurn();
    }
  }, [isAiResponding, onMessage, audioPlayback, finalizeAiTurn]);

  const audioCapture = useAudioCapture(audioCaptureCallback);
  audioCaptureRef.current = audioCapture;

  // Stop any in-flight TTS / AI audio when interview is torn down
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
      audioPlayback.stopAudio();
    };
  }, [audioPlayback]);

  // Simple connect/disconnect for compatibility
  const connect = useCallback(() => {
    setConnectionAttempted(true);
    console.log('🎭 Conversational interview connected');
  }, []);

  const disconnect = useCallback(() => {
    console.log('🎭 Conversational interview disconnected');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    audioPlayback.stopAudio();
  }, [audioPlayback]);

  const startAudioStream = useCallback(() => {
    console.log('🎤 Starting automatic audio capture');
    audioCapture.startCapture();
  }, [audioCapture]);

  const stopAudioStream = useCallback(() => {
    console.log('🛑 Stopping automatic audio capture');
    audioCapture.stopCapture();
  }, [audioCapture]);

  return {
    isConnected, // Always true in HTTP mode
    isStreaming: audioCapture.isStreaming, // propagate mic streaming state up
    connectionAttempted,
    audioCapture,
    error,
    isAiResponding,
    isTtsActive,
    isUserSpeaking: audioCapture.isStreaming && audioCapture.isListening && !isAiResponding,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream
  };
};
