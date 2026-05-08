import { useState, useRef, useCallback, useEffect } from 'react';

export const useAudioCapture = (onChunkReady?: (base64: string) => void) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const vadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Voice Activity Detection using audio levels
  const startVoiceActivityDetection = useCallback(() => {
    if (!stream) return;

    console.log('🎤 Starting Voice Activity Detection');

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isSpeaking = false;
      let speechStartTime = 0;

      vadIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Voice activity detection thresholds
        const SPEECH_THRESHOLD = 15; // Minimum volume to consider as speech
        const SILENCE_DURATION = 1500; // 1.5 seconds of silence to stop recording

        if (average > SPEECH_THRESHOLD) {
          if (!isSpeaking) {
            console.log('🎙️ Speech detected, starting recording');
            isSpeaking = true;
            speechStartTime = Date.now();
            setIsListening(true);

            // Clear any existing silence timeout
            if (silenceTimeoutRef.current) {
              clearTimeout(silenceTimeoutRef.current);
            }
          }
        } else if (isSpeaking && Date.now() - speechStartTime > SILENCE_DURATION) {
          console.log('🤫 Silence detected, stopping recording');
          isSpeaking = false;
          setIsListening(false);

          // Stop current recording and process the chunk
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 100); // Check every 100ms

    } catch (err) {
      console.error('❌ Failed to start voice activity detection:', err);
    }
  }, [stream]);

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
    try {
      setError(null);
      console.log('🎤 Requesting microphone access for continuous recording...');

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      console.log('🎤 Microphone access granted');
      setStream(mediaStream);
      setIsStreaming(true);

      // Start voice activity detection
      startVoiceActivityDetection();

      // Set up MediaRecorder for continuous recording
      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          console.log('📦 Audio chunk received, size:', event.data.size);
        }
      };

      recorder.onstop = () => {
        console.log('⏹️ Speech segment ended, processing audio...');
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        console.log('📊 Audio blob size:', blob.size, 'bytes');

        // Some browsers produce very small WebM chunks depending on MediaRecorder/VAD timing.
        // Instead of dropping them, we still send them so the backend can decode or
        // respond with a proper error/transcript.
        const blobType = blob.type || 'audio/webm';
        const normalizedBlob = blob.type === blobType ? blob : new Blob([blob], { type: blobType });

        if (blob.size < 200) {
          console.log('⚠ Very small audio chunk, still sending:', blob.size, 'bytes');
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          console.log('📤 Sending speech segment, base64 length:', base64.length);
          onChunkReady?.(base64);

          // Restart recording for next speech segment after processing
          if (isStreaming) {
            chunksRef.current = [];
            setTimeout(() => {
              if (mediaRecorderRef.current && isStreaming) {
                mediaRecorderRef.current.start();
              }
            }, 500); // Small delay to prevent overlap
          }
        };
        reader.readAsDataURL(normalizedBlob);
        chunksRef.current = [];
      };

      // Start continuous recording
      recorder.start();
      console.log('🎬 Continuous recording started with VAD');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access microphone';
      console.error('❌ Audio capture error:', err);
      setError(errorMessage);
    }
  }, [onChunkReady, startVoiceActivityDetection, isStreaming]);

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  return {
    isStreaming,
    isListening,
    error,
    startCapture,
    stopCapture
  };
};
