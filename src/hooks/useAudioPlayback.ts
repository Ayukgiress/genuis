import { useRef, useCallback } from 'react';

export const useAudioPlayback = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playAudio = useCallback(async (base64Audio: string, mimeType: string = 'audio/webm', onEnded?: () => void) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Convert base64 to blob
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mimeType });

      // Create object URL and play
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Initialize AudioContext if needed (for better control)
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      // Clean up when done
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        onEnded?.();
      };

      await audio.play();

      return true;
    } catch (error) {
      console.error('Audio playback error:', error);
      onEnded?.(); // Ensure we unlock if playback fails
      return false;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  return {
    playAudio,
    stopAudio
  };
};