import { useRef, useCallback, useEffect } from 'react';

export const useAudioPlayback = (onAmplitude?: (level: number) => void) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterFrameRef = useRef<number | null>(null);

  const stopMeter = useCallback(() => {
    if (meterFrameRef.current !== null) cancelAnimationFrame(meterFrameRef.current);
    meterFrameRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    onAmplitude?.(0);
  }, [onAmplitude]);

  const playAudio = useCallback(async (
    audioSource: string,
    mimeType: string = 'audio/webm',
    onEnded?: () => void,
    onPlaybackError?: () => void,
  ) => {
    try {
      stopMeter();
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;

      const isDirectUrl = /^(https?:|blob:)/i.test(audioSource);
      const dataUrlMatch = audioSource.match(/^data:([^;,]+)?;base64,([\s\S]+)$/);
      let audioUrl = audioSource;
      if (!isDirectUrl && !audioSource.startsWith('data:')) {
        const binaryString = atob(audioSource);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        objectUrlRef.current = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
        audioUrl = objectUrlRef.current;
      } else if (dataUrlMatch) {
        const binaryString = atob(dataUrlMatch[2]);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        objectUrlRef.current = URL.createObjectURL(new Blob([bytes], { type: dataUrlMatch[1] || mimeType }));
        audioUrl = objectUrlRef.current;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      if (audioUrl.startsWith('blob:') && typeof window !== 'undefined' && window.AudioContext) {
        try {
          const context = new AudioContext();
          const source = context.createMediaElementSource(audio);
          const analyser = context.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyser.connect(context.destination);
          audioContextRef.current = context;
          if (context.state === 'suspended') await context.resume();
          const samples = new Float32Array(analyser.fftSize);
          const measure = () => {
            if (audioContextRef.current !== context) return;
            analyser.getFloatTimeDomainData(samples);
            let sum = 0;
            for (const sample of samples) sum += sample * sample;
            onAmplitude?.(Math.min(1, Math.sqrt(sum / samples.length) * 5));
            meterFrameRef.current = requestAnimationFrame(measure);
          };
          measure();
        } catch {
          stopMeter();
        }
      }
      let playbackStarted = false;
      const releaseObjectUrl = () => {
        stopMeter();
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
        audio.onended = null;
        audio.onerror = null;
        if (audioRef.current === audio) audioRef.current = null;
      };

      // Clean up when done
      audio.onended = () => {
        releaseObjectUrl();
        onEnded?.();
      };
      audio.onerror = () => {
        releaseObjectUrl();
        if (playbackStarted) onPlaybackError?.();
      };

      await audio.play();
      playbackStarted = true;

      return true;
    } catch (error) {
      console.error('Audio playback error:', error);
      stopMeter();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      audioRef.current = null;
      return false;
    }
  }, [onAmplitude, stopMeter]);

  const stopAudio = useCallback(() => {
    stopMeter();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, [stopMeter]);

  useEffect(() => () => {
    stopMeter();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, [stopMeter]);

  return {
    playAudio,
    stopAudio
  };
};