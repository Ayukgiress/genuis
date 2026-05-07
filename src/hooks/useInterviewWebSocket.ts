import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken, interviewApi } from '@/lib/api';
import { useAudioCapture } from './useAudioCapture';
import { useAudioPlayback } from './useAudioPlayback';

interface SocketResponse {
  transcript?: string;
  ai_text?: string;
  ai_audio?: string; // base64 audio response
  status?: 'analyzing' | 'responding' | 'waiting';
}

export const useInterviewWebSocket = (interviewId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Audio capture integration
  const audioCapture = useAudioCapture((base64Audio: string) => {
    // Send audio chunk to WebSocket
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'audio_chunk',
        data: base64Audio,
        timestamp: Date.now()
      }));
    }
  });

  const audioPlayback = useAudioPlayback();

  const connect = useCallback(() => {
    if (!interviewId) return;
    if (!('WebSocket' in window)) {
      setError('WebSocket not supported in this browser');
      return;
    }

    setConnectionAttempted(true);
    const token = getAuthToken();
    const url = `${interviewApi.getTalkUrl(interviewId)}?token=${token}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('Audio Interview WS connected');
    };

    socket.onmessage = (event) => {
      try {
        const data: SocketResponse = JSON.parse(event.data);
        if (data.transcript) {
          setTranscript(data.transcript);
        }
        if (data.ai_text) {
          // Emit AI response event or use callback
          console.log('AI Response:', data.ai_text);
        }
        if (data.ai_audio) {
          // Play AI audio response
          console.log('AI audio received, playing...');
          audioPlayback.playAudio(data.ai_audio);
        }
        if (data.status === 'responding') {
          setIsStreaming(false);
        }
      } catch (e) {
        console.error('Socket message error:', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      audioCapture.stopCapture();
      audioPlayback.stopAudio();
    };

    socket.onerror = (err) => {
      console.error('WS error:', err);
      setError('WebSocket connection failed. Audio interviews require backend WebSocket support. Please implement the WebSocket endpoint for real-time audio streaming.');
    };
  }, [interviewId, audioPlayback]);

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
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, [stopAudioStream]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isStreaming,
    connectionAttempted,
    audioCapture,
    transcript,
    error,
    connect,
    disconnect,
    startAudioStream,
    stopAudioStream
  };
};

