import { useRef, useCallback } from 'react';

export const useAudioPlayback = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const playAudio = useCallback(async (
    audioSource: string,
    mimeType: string = 'audio/webm',
    onEnded?: () => void,
    onPlaybackError?: () => void,
  ) => {
    try {
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
      let playbackStarted = false;
      const releaseObjectUrl = () => {
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
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      audioRef.current = null;
      return false;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  }, []);

  return {
    playAudio,
    stopAudio
  };
};