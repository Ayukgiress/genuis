import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioCapture = (onChunkReady?: (base64: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const isPausedRef = useRef(false);
  // Cooldown: ignore all audio events for this many ms after unpausing.
  // This prevents the AI's TTS bleed (residual audio in the room/echo canceller
  // settling) from being picked up as user speech.
  const cooldownUntilRef = useRef<number>(0);
  // VAD's internal "is speaking" state — needs to be resettable from outside
  // so we can force a fresh state when pausing/unpausing.
  const vadIsSpeakingRef = useRef<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supportedMimeTypeRef = useRef<string>('');

  // Voice Activity Detection using audio levels
  const startVoiceActivityDetection = useCallback(async (mediaStream: MediaStream) => {
    if (!mediaStream) return;

    console.log('🎤 Starting Voice Activity Detection');

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // ✅ Resume AudioContext if suspended (common in Chrome/Safari)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = microphone;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isSpeaking = false;
      let lastSpeechTime = Date.now();

      vadIntervalRef.current = setInterval(() => {
        // Hard guards first — bail before doing any work.
        if (!analyserRef.current || isPausedRef.current) return;
        // Cooldown after unpause — ignore AI bleed.
        if (Date.now() < cooldownUntilRef.current) {
          // Reset the speaking state machine so it doesn't think it's mid-speech.
          isSpeaking = false;
          vadIsSpeakingRef.current = false;
          setIsListening(false);
          return;
        }

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        const SPEECH_THRESHOLD = 3.5;
        const SILENCE_DURATION = 1800;

        if (average > SPEECH_THRESHOLD) {
          lastSpeechTime = Date.now();

          if (!isSpeaking) {
            isSpeaking = true;
            vadIsSpeakingRef.current = true;
            setIsListening(true);
            console.log(`🎙️ Speech detected (lvl: ${average.toFixed(1)}), listening...`);

            // ✅ Start a FRESH recorder only when speech begins
            if (mediaRecorderRef.current?.state === 'inactive') {
              chunksRef.current = [];
              try {
                mediaRecorderRef.current.start();
              } catch (err) {
                console.warn('MediaRecorder.start() failed:', err);
              }
            }
          }
        } else {
          if (isSpeaking && Date.now() - lastSpeechTime > SILENCE_DURATION) {
            isSpeaking = false;
            vadIsSpeakingRef.current = false;
            setIsListening(false);
            console.log('🤫 Silence detected, processing segment');

            if (mediaRecorderRef.current?.state === 'recording') {
              try {
                mediaRecorderRef.current.stop(); // onstop fires → sends chunk
              } catch (err) {
                console.warn('MediaRecorder.stop() failed:', err);
              }
            }
          }
        }
      }, 50);

    } catch (err) {
      console.error('❌ Failed to start voice activity detection:', err);
    }
  }, []);

  const stopCapture = useCallback(() => {
    console.log('🛑 Stopping audio capture');

    // Clear all timeouts and intervals
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }

    // Disconnect the analyser source so it's not holding a ref to the stream
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
      sourceNodeRef.current = null;
    }

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }

    // Stop all audio tracks from the current stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setIsStreaming(false);
    setIsListening(false);
  }, [stream]);

  const startCapture = useCallback(async () => {
    isPausedRef.current = false;
    cooldownUntilRef.current = 0;
    vadIsSpeakingRef.current = false;
    try {
      setError(null);
      console.log('🎤 Requesting microphone access for continuous recording...');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      console.log('🎤 Microphone access granted');
      setStream(mediaStream);
      setIsStreaming(true);

      // ✅ Find supported mimeType
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];

      const mimeType = supportedMimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
      supportedMimeTypeRef.current = mimeType;
      console.log(`🎬 Using mimeType: ${mimeType || 'default'}`);

      // Set up MediaRecorder for continuous recording
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Start voice activity detection
      await startVoiceActivityDetection(mediaStream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // If we were paused while this stop was in flight, drop the chunk.
        if (isPausedRef.current) {
          chunksRef.current = [];
          return;
        }
        if (chunksRef.current.length === 0) return;

        console.log('⏹️ Speech segment ended, processing audio...');
        const blob = new Blob(chunksRef.current, { type: supportedMimeTypeRef.current || 'audio/webm' });
        chunksRef.current = [];

        // ✅ Smaller minimum — allow short words like "Yes", "No"
        if (blob.size < 500) {
          console.log(`No speech detected, segment too small (${blob.size} bytes)`);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          // Final guard: if we got paused between onstop and the async FileReader
          // callback, drop the audio. This kills any race-condition audio that
          // contains AI bleed-through.
          if (isPausedRef.current) {
            console.log('🔇 Dropping audio chunk (paused while decoding)');
            return;
          }
          const base64 = (reader.result as string).split(',')[1];
          onChunkReady?.(base64);
        };
        reader.readAsDataURL(blob);
      };

      // Just initialize, don't start yet. VAD will control it.
      mediaRecorderRef.current = recorder;
      console.log('🎬 VAD-controlled recording ready');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      console.error('❌ Audio capture error:', err);
      setError(errorMessage);
    }
  }, [onChunkReady, startVoiceActivityDetection]);

  const setPaused = useCallback((paused: boolean) => {
    const wasPaused = isPausedRef.current;
    isPausedRef.current = paused;

    if (paused) {
      setIsListening(false);
      // Reset VAD state machine so it doesn't think it's mid-speech when we unpause.
      vadIsSpeakingRef.current = false;
      // Stop any in-progress recording and clear chunks so the onstop callback
      // emits nothing. onstop also re-checks isPausedRef.current as a safety net.
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('MediaRecorder.stop() during pause failed:', err);
        }
      }
      // Clear chunks immediately in case onstop hasn't fired yet.
      chunksRef.current = [];
    } else {
      // Unpausing: enforce a cooldown so the AI's residual audio in the room
      // (and the echo canceller settling) doesn't get picked up as user speech.
      // 800ms is enough to swallow the tail of a TTS utterance on most browsers.
      cooldownUntilRef.current = Date.now() + 800;
      console.log('🎤 Mic unpaused (cooldown 800ms)');
    }

    // Avoid noisy no-op logs
    if (wasPaused !== paused) {
      console.log(paused ? '🔇 Mic paused' : '🎤 Mic resumed');
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount only
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect(); } catch {}
      }
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return {
    isStreaming,
    isListening,
    error,
    startCapture,
    stopCapture,
    setPaused
  };
};
