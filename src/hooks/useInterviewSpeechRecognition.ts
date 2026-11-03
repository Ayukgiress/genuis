'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InterviewLanguage } from '@/store/interviewCallStore';

type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechRecognitionErrorLike = { error: string };
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const localeFallback = (locale: InterviewLanguage) => locale === 'fr-CM' ? 'fr-FR' : 'en-US';

export function useInterviewSpeechRecognition(language: InterviewLanguage, onFinalTranscript: (text: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isTextFallback, setIsTextFallback] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const fallbackAttemptedRef = useRef(false);
  const activeRef = useRef(false);
  const finalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
    finalTimerRef.current = null;
    try { recognitionRef.current?.stop(); } catch { /* recognition may already have stopped */ }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setIsSupported(false);
      setIsTextFallback(true);
      setError('Speech recognition is not supported in this browser. Use text chat or try Chrome or Edge.');
      return false;
    }

    setIsSupported(true);
    setIsTextFallback(false);
    setError(null);
    activeRef.current = true;
    fallbackAttemptedRef.current = false;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let interim = '';
      const finalParts: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const spoken = result?.[0]?.transcript?.trim();
        if (!spoken) continue;
        if (result.isFinal) finalParts.push(spoken);
        else interim += `${spoken} `;
      }
      if (interim.trim()) setTranscript(interim.trim());
      if (finalParts.length) {
        const finalText = finalParts.join(' ').trim();
        setTranscript(finalText);
        if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
        finalTimerRef.current = setTimeout(() => {
          if (!activeRef.current) return;
          activeRef.current = false;
          try { recognition.stop(); } catch { /* no-op */ }
          setIsListening(false);
          onFinalRef.current(finalText);
        }, 650);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'language-not-supported' && !fallbackAttemptedRef.current) {
        fallbackAttemptedRef.current = true;
        setError(`This browser does not support ${language}; using ${localeFallback(language)} recognition. Accent accuracy may vary.`);
        try { recognition.stop(); } catch { /* no-op */ }
        window.setTimeout(() => {
          if (!activeRef.current) return;
          const fallback = new Recognition();
          fallback.continuous = true;
          fallback.interimResults = true;
          fallback.lang = localeFallback(language);
          recognitionRef.current = fallback;
          fallback.onresult = recognition.onresult;
          fallback.onerror = recognition.onerror;
          fallback.onend = recognition.onend;
          try { fallback.start(); } catch { setIsListening(false); }
        }, 100);
        return;
      }
      activeRef.current = false;
      setIsTextFallback(true);
      setIsListening(false);
      setError(`Speech recognition stopped (${event.error}). Switch to text chat to continue.`);
    };

    recognition.onend = () => {
      if (activeRef.current) {
        try { recognitionRef.current?.start(); } catch { setIsListening(false); }
      } else {
        setIsListening(false);
      }
    };

    try {
      recognition.start();
      setIsListening(true);
      setTranscript('');
      return true;
    } catch {
      activeRef.current = false;
      setIsTextFallback(true);
      setIsListening(false);
      setError('Could not start speech recognition. Switch to text chat to continue.');
      return false;
    }
  }, [language]);

  return { isSupported, isTextFallback, isListening, error, transcript, start, stop };
}
