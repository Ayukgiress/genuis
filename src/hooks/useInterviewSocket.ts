import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken, interviewApi } from '@/lib/api';

interface SocketResponse {
  user_text?: string;
  ai_text?: string;
  ai_audio?: string; // base64
  status?: 'speaking' | 'listening' | 'processing';
}

export const useInterviewSocket = (interviewId: number | null) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const processAudioQueueRef = useRef<() => void>();

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const decodeBase64Audio = useCallback(async (base64Audio: string): Promise<AudioBuffer> => {
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBuffer = await audioContextRef.current!.decodeAudioData(bytes.buffer.slice());
    return audioBuffer;
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    try {
      await initAudio();
      const audioBuffer = await decodeBase64Audio(base64Audio);
      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current!.destination);

      setIsSpeaking(true);
      source.onended = () => {
        setIsSpeaking(false);
        processAudioQueueRef.current?.();
      };
      source.start();
    } catch (e) {
      console.error('Playback error:', e);
      setIsSpeaking(false);
      processAudioQueueRef.current?.();
    }
  }, [initAudio, decodeBase64Audio]);

  const processAudioQueue = useCallback(() => {
    if (audioQueueRef.current.length > 0 && !isPlayingRef.current) {
      const nextAudio = audioQueueRef.current.shift();
      if (nextAudio) {
        isPlayingRef.current = true;
        playAudio(nextAudio).finally(() => {
          isPlayingRef.current = false;
        });
      }
    }
  }, [playAudio]);

  // Set the ref after processAudioQueue is defined
  useEffect(() => {
    processAudioQueueRef.current = processAudioQueue;
  }, [processAudioQueue]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            socketRef.current?.send(JSON.stringify({ audio: base64data }));
          };
          reader.readAsDataURL(event.data);
        }
      };

      mediaRecorder.start(500); // Send chunks every 500ms
      setIsListening(true);
    } catch (err) {
      console.error('Mic error:', err);
      setError('Could not access microphone');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsListening(false);
  }, []);

  const connect = useCallback(() => {
    if (!interviewId) return;

    const token = getAuthToken();
    const url = `${interviewApi.getTalkUrl(interviewId)}?token=${token}`;
    
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setError(null);
      // Start recording immediately on connect for seamless flow
      startRecording();
    };

    socket.onmessage = (event) => {
      try {
        const data: SocketResponse = JSON.parse(event.data);
        if (data.user_text) setTranscript(data.user_text);
        if (data.ai_audio) {
          audioQueueRef.current.push(data.ai_audio);
          processAudioQueue();
        }
        if (data.status === 'speaking') setIsSpeaking(true);
        if (data.status === 'listening') setIsSpeaking(false);
      } catch (e) {
        console.error('Socket message error:', e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      stopRecording();
    };

    socket.onerror = () => {
      setError('WebSocket connection error');
    };
  }, [interviewId, startRecording, stopRecording, processAudioQueue]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording
  };
};
