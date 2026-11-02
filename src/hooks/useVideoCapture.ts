import { useState, useRef, useCallback, useEffect } from 'react';

export const useVideoCapture = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureGenerationRef = useRef(0);
  // Consumers attach this ref to a <video> element
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCapture = useCallback(async () => {
    if (streamRef.current) return; // already running
    const generation = ++captureGenerationRef.current;
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      if (generation !== captureGenerationRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      setIsStreaming(true);
    } catch (err) {
      if (generation !== captureGenerationRef.current) return;
      const errorName = err instanceof DOMException ? err.name : '';
      const message = errorName === 'NotAllowedError' || errorName === 'SecurityError'
        ? 'Camera access is blocked. Allow camera access in your browser’s site settings, then try again.'
        : errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError'
          ? 'No camera was found. Connect a camera or continue with audio only.'
          : errorName === 'NotReadableError' || errorName === 'TrackStartError'
            ? 'Your camera is busy in another app. Close other camera apps and try again.'
            : !navigator.mediaDevices?.getUserMedia
              ? 'Camera access is unavailable in this browser. Use a recent browser over HTTPS.'
              : err instanceof Error
                ? err.message
                : 'Camera unavailable. Check your device and browser permissions.';
      setError(message);
    }
  }, []);

  const stopCapture = useCallback(() => {
    captureGenerationRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // When videoRef is attached after startCapture already ran, wire the stream
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  useEffect(() => () => stopCapture(), [stopCapture]);

  return { isStreaming, error, videoRef, attachVideo, startCapture, stopCapture };
};
