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

  const audioCaptureCallback = useCallback(async (base64Audio: string) => {
    if (isAiResponding) {
      console.log('🤖 AI is responding, ignoring user speech');
      return;
    }

    console.log('🎤 User speech detected, sending automatically. Size:', base64Audio.length);

    try {
      setIsAiResponding(true);
      audioCaptureRef.current?.setPaused(true);

      // Send audio via HTTP POST
      const response: InterviewMessage = await interviewApi.sendAudioMessage(interviewId!, base64Audio);

      // ✅ Ignore no_speech sentinel
      if ((response as any).status === 'no_speech') {
        console.log('No speech detected, ignoring');
        setIsAiResponding(false);
        audioCaptureRef.current?.setPaused(false);
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
        console.log('🔊 Playing AI response...');
        setIsAiResponding(true); // Ensure it's true while playing
        audioPlayback.playAudio(audioData as string, 'audio/webm', () => {
          setIsAiResponding(false);
          audioCaptureRef.current?.setPaused(false);
          console.log('🎤 Ready for user response');
        });
      } else if (response.content) {
        // Speech-to-speech fallback using browser TTS (because backend audio is missing)
        console.log('🔊 Falling back to browser TTS for AI response');
        const textToSpeak = response.content;
        if (typeof window !== "undefined" && textToSpeak && "speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
            setIsAiResponding(true); // Highlight AI as speaking
            setIsTtsActive(true);
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.onend = () => {
              setIsAiResponding(false);
              setIsTtsActive(false);
              audioCaptureRef.current?.setPaused(false);
              console.log('🎤 Ready for user response');
            };
            utterance.onerror = (event) => {
              console.error('TTS error:', event);
              setIsAiResponding(false);
              setIsTtsActive(false);
              audioCaptureRef.current?.setPaused(false);
              console.log('🎤 Ready for user response (TTS error)');
            };
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error('TTS execution error:', e);
            setIsAiResponding(false);
            setIsTtsActive(false);
            audioCaptureRef.current?.setPaused(false);
          }
        } else {
          setIsAiResponding(false);
          setIsTtsActive(false);
          audioCaptureRef.current?.setPaused(false);
        }
      } else {
        setIsAiResponding(false);
        setIsTtsActive(false);
        audioCaptureRef.current?.setPaused(false);
      }

    } catch (error: any) {
      // 422 = no speech detected, not a real error
      if (error?.status === 422) {
        console.log('No speech detected, ignoring');
      } else {
        console.error('❌ Failed to send audio message:', error);
        setError(`Failed to process speech (${error?.status || 'unknown error'}). Please try again.`);
      }
      setIsAiResponding(false);
      setIsTtsActive(false);
      audioCaptureRef.current?.setPaused(false);
    }
  }, [isAiResponding, onMessage, audioPlayback]);

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
