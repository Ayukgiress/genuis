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

  // Audio capture integration
  const audioPlayback = useAudioPlayback();

  const audioCapture = useAudioCapture(async (base64Audio: string) => {
    if (!interviewId) return;

    try {
      setIsStreaming(true);
      console.log('Sending audio via HTTP to interview:', interviewId);

      // Send audio via HTTP POST
      const response: InterviewMessage = await interviewApi.sendAudioMessage(interviewId, {
        base64_audio: base64Audio
      });

      console.log('Received AI response:', response);

      // Handle AI text response
      if (response.content) {
        console.log('AI Response:', response.content);
      }

      // Handle AI audio response (stored in the message)
      // Note: The backend might store audio data differently - adjust based on actual response
      if (response.audio_data) {
        console.log('AI audio received, playing...');
        audioPlayback.playAudio(response.audio_data);
      }

      setIsStreaming(false);
    } catch (error) {
      console.error('Error sending audio:', error);
      setError('Failed to process audio. Please try again.');
      setIsStreaming(false);
    }
  });

  const connect = useCallback(() => {
    if (!interviewId) return;

    setConnectionAttempted(true);
    setIsConnected(true);
    setError(null);
    console.log('Audio Interview HTTP mode ready for interview:', interviewId);
  }, [interviewId]);

  const startAudioStream = useCallback(() => {
    audioCapture.startCapture();
    setIsStreaming(true);
  }, [audioCapture]);

  const stopAudioStream = useCallback(() => {
    setIsStreaming(false);
    audioCapture.stopCapture();
    audioPlayback.stopAudio();
  }, [audioCapture, audioPlayback]);

  const disconnect = useCallback(() => {
    stopAudioStream();
    setIsConnected(true); // Stay "connected" for HTTP approach
  }, [stopAudioStream]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected, // Always true in HTTP mode
    isStreaming,
    connectionAttempted,
    audioCapture,
    error,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream
  };
};

