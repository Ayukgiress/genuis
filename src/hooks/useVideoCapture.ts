import { useState, useRef, useCallback, useEffect } from 'react';

export const useVideoCapture = (onChunkReady?: (base64: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
      
      // Setup canvas for frame capture
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not found');
      
      const recorder = new MediaRecorder(mediaStream, { 
        mimeType: 'video/webm;codecs=vp9' 
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          // Callback for chunk ready: pass base64 to WS
          onChunkReady?.(base64);
        };
        reader.readAsDataURL(blob);
        chunksRef.current = [];
      };
      
      recorder.start(500); // Chunk every 500ms
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      console.error('Video capture error:', err);
    }
  }, [onChunkReady]);

  const stopCapture = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setStream(null);
  }, [stream]);

  const getVideoChunk = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return null;
    
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/webp', 0.8); // Compress for WS
    }
    return null;
  }, []);

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return {
    isStreaming,
    error,
    videoRef,
    canvasRef,
    startCapture,
    stopCapture,
    getVideoChunk
  };
};

