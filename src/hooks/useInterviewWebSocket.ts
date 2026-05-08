import { useState, useEffect, useCallback } from 'react';
import { interviewApi } from '@/lib/api';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';
import type { InterviewMessage } from '@/types';

// Note: Now using HTTP-based audio processing instead of WebSocket

export const useInterviewWebSocket = (interviewId: number | null) => {
  const [isConnected, setIsConnected] = useState(true); // Always "connected" for HTTP approach
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Audio capture integration
  const audioPlayback = useAudioPlayback();

  const audioCapture = useAudioCapture(async (base64Audio: string) => {
    if (isAiResponding) {
      console.log('🤖 AI is responding, ignoring user speech');
      return;
    }

    console.log('🎤 User speech detected, sending automatically. Size:', base64Audio.length);

    try {
      setIsAiResponding(true);

      // Send audio via HTTP POST
      const response: InterviewMessage = await interviewApi.sendAudioMessage(interviewId!, {
        base64_audio: base64Audio
      });

      console.log('✅ AI response received:', response);

      // Handle AI text response
      if (response.content) {
        console.log('💬 AI says:', response.content);
      }

      // Handle AI audio response
      if (response.audio_data) {
        console.log('🔊 Playing AI response...');
        audioPlayback.playAudio(response.audio_data);

        // Wait for audio to finish playing before allowing new speech
        setTimeout(() => {
          setIsAiResponding(false);
          console.log('🎤 Ready for user response');
        }, 2000); // Estimate based on audio length, or we could track actual playback end
      } else {
        setIsAiResponding(false);
      }

    } catch (error: any) {
      // 422 = no speech detected, not a real error
      if (error?.status === 422) {
        console.log('No speech detected, ignoring');
      } else {
        setError('Failed to process speech. Please try again.');
      }
      setIsAiResponding(false);
    }
  });

  // Simple connect/disconnect for compatibility
  const connect = useCallback(() => {
    setConnectionAttempted(true);
    console.log('🎭 Conversational interview connected');
  }, []);

  const disconnect = useCallback(() => {
    console.log('🎭 Conversational interview disconnected');
  }, []);

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
    isStreaming,
    connectionAttempted,
    audioCapture,
    error,
    isAiResponding,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream
  };
};

