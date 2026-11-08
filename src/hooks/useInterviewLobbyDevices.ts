'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type DeviceOption = { deviceId: string; label: string };

export function useInterviewLobbyDevices(audioDeviceId: string, videoDeviceId: string, cameraEnabled = true, previewEnabled = true) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [microphones, setMicrophones] = useState<DeviceOption[]>([]);
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [level, setLevel] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopMeter = useCallback(() => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    setLevel(0);
  }, []);

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    stopMeter();
  }, [stopMeter]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(devices.filter((device) => device.kind === 'audioinput').map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Microphone ${index + 1}`,
    })));
    setCameras(devices.filter((device) => device.kind === 'videoinput').map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `Camera ${index + 1}`,
    })));
  }, []);

  const startMeter = useCallback((mediaStream: MediaStream) => {
    stopMeter();
    const audioTrack = mediaStream.getAudioTracks()[0];
    if (!audioTrack) return;
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(new MediaStream([audioTrack]));
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = context;
      const buffer = new Uint8Array(analyser.fftSize);
      const sample = () => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (const value of buffer) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buffer.length) * 5));
        animationFrameRef.current = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      setLevel(0);
    }
  }, [stopMeter]);

  const startPreview = useCallback(async () => {
    if (!previewEnabled) return false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Camera and microphone access requires a supported browser over HTTPS.');
      setCameraError('Camera preview is unavailable in this browser.');
      return false;
    }
    setIsLoading(true);
    setMicError(null);
    setCameraError(null);
    stopPreview();
    const audio: MediaTrackConstraints | false = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(audioDeviceId ? { deviceId: { exact: audioDeviceId } } : {}),
    };
    const video: MediaTrackConstraints | false = cameraEnabled ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      ...(videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {}),
    } : false;
    let nextStream: MediaStream | null = null;
    try {
      nextStream = await navigator.mediaDevices.getUserMedia({ audio, video });
    } catch (combinedError) {
      const errorName = combinedError instanceof DOMException ? combinedError.name : '';
      try {
        nextStream = await navigator.mediaDevices.getUserMedia({ audio, video: false });
        setCameraError(errorName === 'NotAllowedError' || errorName === 'SecurityError'
          ? 'Camera permission was denied. Continue in audio-only mode or allow camera access and retry.'
          : 'Camera preview is unavailable. You can continue in audio-only mode.');
      } catch (audioError) {
        const audioName = audioError instanceof DOMException ? audioError.name : '';
        setMicError(audioName === 'NotAllowedError' || audioName === 'SecurityError'
          ? 'Microphone permission was denied. Allow microphone access in browser settings, then retry.'
          : audioName === 'NotFoundError' || audioName === 'DevicesNotFoundError'
            ? 'No microphone was found. Connect a microphone to continue.'
            : 'Could not access your microphone. Check its permissions and try again.');
        setCameraError(errorName === 'NotAllowedError' || errorName === 'SecurityError'
          ? 'Camera permission was denied. You can still continue with audio after enabling your microphone.'
          : 'Camera preview is unavailable.');
        setIsLoading(false);
        await refreshDevices().catch(() => undefined);
        return false;
      }
    }

    streamRef.current = nextStream;
    setStream(nextStream);
    const videoElement = videoRef.current;
    if (videoElement && nextStream.getVideoTracks().length) {
      videoElement.srcObject = nextStream;
      void videoElement.play().catch(() => undefined);
    }
    startMeter(nextStream);
    await refreshDevices().catch(() => undefined);
    setIsLoading(false);
    return nextStream.getAudioTracks().length > 0;
  }, [audioDeviceId, cameraEnabled, previewEnabled, refreshDevices, startMeter, stopPreview, videoDeviceId]);

  useEffect(() => {
    if (!previewEnabled) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close();
      }
      audioContextRef.current = null;
      return;
    }
    const previewStart = window.setTimeout(() => { void startPreview(); }, 0);
    return () => {
      window.clearTimeout(previewStart);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopMeter();
    };
  }, [previewEnabled, startPreview, stopMeter, stopPreview]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    if (stream) void videoRef.current.play().catch(() => undefined);
  }, [stream]);

  return {
    stream,
    videoRef,
    microphones,
    cameras,
    level,
    micError,
    cameraError,
    isLoading,
    hasMicrophone: Boolean(stream?.getAudioTracks().some((track) => track.readyState === 'live')),
    hasCamera: Boolean(stream?.getVideoTracks().some((track) => track.readyState === 'live')),
    startPreview,
    stopPreview,
    refreshDevices,
  };
}
