import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioCapture = (onChunkReady?: (base64: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const isPausedRef = useRef(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Activity Detection using audio levels
  const startVoiceActivityDetection = useCallback((mediaStream: MediaStream) => {
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

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isSpeaking = false;
      let lastSpeechTime = Date.now();

      vadIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || isPausedRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;

        const SPEECH_THRESHOLD = 5;
        const SILENCE_DURATION = 1500;

        if (average > SPEECH_THRESHOLD) {
          lastSpeechTime = Date.now();

          if (!isSpeaking) {
            isSpeaking = true;
            setIsListening(true);
            console.log(`🎙️ Speech detected (lvl: ${average.toFixed(1)}), listening...`);

            // ✅ Start a FRESH recorder only when speech begins
            if (mediaRecorderRef.current?.state === 'inactive') {
              chunksRef.current = [];
              mediaRecorderRef.current.start();
            }
          }
        } else {
          // Add a periodic log for debugging levels when silent (optional, every 2s)
          if (Date.now() % 2000 < 100) {
            // console.log(`🔈 Ambient level: ${average.toFixed(1)}`);
          }

          if (isSpeaking && Date.now() - lastSpeechTime > SILENCE_DURATION) {
            isSpeaking = false;
            setIsListening(false);
            console.log('🤫 Silence detected, processing segment');

            if (mediaRecorderRef.current?.state === 'recording') {
              mediaRecorderRef.current.stop(); // onstop fires → sends chunk
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

    // Stop audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
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
      console.log(`🎬 Using mimeType: ${mimeType || 'default'}`);

      // Set up MediaRecorder for continuous recording
      const recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Start voice activity detection
      startVoiceActivityDetection(mediaStream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunksRef.current.length === 0) return;
        
        console.log('⏹️ Speech segment ended, processing audio...');
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        chunksRef.current = [];

        // ✅ Smaller minimum — allow short words like "Yes", "No"
        if (blob.size < 500) {
          console.log(`No speech detected, segment too small (${blob.size} bytes)`);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
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
    isPausedRef.current = paused;
    if (paused) {
      setIsListening(false);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        chunksRef.current = []; // Clear current chunks if paused
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount only
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
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
