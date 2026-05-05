import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken, interviewApi } from '@/lib/api';
import { useVideoCapture } from './useVideoCapture';

interface SocketResponse {
  transcript?: string;
  ai_text?: string;
  ai_video?: string; // base64 video chunk
  status?: 'analyzing' | 'responding' | 'waiting';
}

export const useInterviewWebSocket = (interviewId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Video capture integration
  const videoCapture = useVideoCapture();

  const connect = useCallback(() => {
    if (!interviewId) return;

    const token = getAuthToken();
    const url = `${interviewApi.getTalkUrl(interviewId)}?token=${token}`;
    
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('Video WS connected');
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
        if (data.ai_video) {
          // Handle AI avatar video if provided
          console.log('AI video received');
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
      if (chunkIntervalRef.current) {
        clearInterval(chunkIntervalRef.current);
      }
      videoCapture.stopCapture();
    };

    socket.onerror = (err) => {
      console.error('WS error:', err);
      setError('WebSocket connection failed');
    };
  }, [interviewId, videoCapture]);

  const startVideoStream = useCallback(() => {
    videoCapture.startCapture();
    setIsStreaming(true);

    // Send video chunks periodically
    chunkIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && videoCapture.isStreaming) {
        const chunk = videoCapture.getVideoChunk();
        if (chunk) {
          socketRef.current.send(JSON.stringify({ 
            type: 'video_chunk', 
            data: chunk,
            timestamp: Date.now()
          }));
        }
      }
    }, 1000); // 1fps for analysis
  }, [videoCapture]);

  const stopVideoStream = useCallback(() => {
    setIsStreaming(false);
    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }
    videoCapture.stopCapture();
  }, [videoCapture]);

  const disconnect = useCallback(() => {
    stopVideoStream();
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, [stopVideoStream]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isStreaming,
    videoCapture, // Expose video refs/states
    transcript,
    error,
    connect,
    disconnect,
    startVideoStream,
    stopVideoStream
  };
};

