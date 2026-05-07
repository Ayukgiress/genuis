import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioCapture = (onChunkReady?: (base64: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      setStream(mediaStream);
      setIsStreaming(true);

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          // Callback for chunk ready: pass base64 to WS
          onChunkReady?.(base64);
        };
        reader.readAsDataURL(blob);
        chunksRef.current = [];
      };

      // Send chunks as they become available for real-time streaming
      const sendInterval = setInterval(() => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            onChunkReady?.(base64);
          };
          reader.readAsDataURL(blob);
          chunksRef.current = []; // Clear chunks after sending
        }
      }, 500);

      // Store interval for cleanup
      (recorder as MediaRecorder & { _sendInterval: NodeJS.Timeout })._sendInterval = sendInterval;

      recorder.start(500); // Chunk every 500ms for real-time streaming

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      console.error('Audio capture error:', err);
    }
  }, [onChunkReady]);

  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Clear the send interval
      if ((mediaRecorderRef.current as MediaRecorder & { _sendInterval?: NodeJS.Timeout })._sendInterval) {
        clearInterval((mediaRecorderRef.current as MediaRecorder & { _sendInterval?: NodeJS.Timeout })._sendInterval);
      }
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    setIsStreaming(false);
    setStream(null);
  }, [stream]);

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return {
    isStreaming,
    error,
    startCapture,
    stopCapture
  };
};