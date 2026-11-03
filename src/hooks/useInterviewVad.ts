'use client';

import { useCallback, useRef, useState } from 'react';

type VadDispose = () => Promise<void>;

export function useInterviewVad(onSpeechStart: () => void) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disposeRef = useRef<VadDispose | null>(null);
  const activeRef = useRef(false);
  const callbackRef = useRef(onSpeechStart);
  callbackRef.current = onSpeechStart;

  const start = useCallback(async () => {
    if (activeRef.current) return true;
    activeRef.current = true;
    setError(null);
    try {
      const { recordAudio } = await import('vad-web');
      const dispose = await recordAudio({
        onSpeechStart: () => {
          if (activeRef.current) callbackRef.current();
        },
      });
      if (!activeRef.current) {
        await dispose();
        return false;
      }
      disposeRef.current = dispose;
      setIsAvailable(true);
      return true;
    } catch (reason) {
      activeRef.current = false;
      setIsAvailable(false);
      setError(reason instanceof Error ? reason.message : 'Voice activity detection is unavailable.');
      return false;
    }
  }, []);

  const stop = useCallback(async () => {
    activeRef.current = false;
    setIsAvailable(false);
    const dispose = disposeRef.current;
    disposeRef.current = null;
    if (dispose) await dispose().catch(() => undefined);
  }, []);

  return { isAvailable, error, start, stop };
}
