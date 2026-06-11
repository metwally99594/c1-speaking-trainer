import { useState, useCallback, useRef } from 'react';

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm',
];

function getSupportedMimeType(): string {
  return MIME_TYPES.find(m => MediaRecorder.isTypeSupported(m)) ?? '';
}

interface STTHook {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recording: boolean;
  processing: boolean;
  transcript: string;
  error: string | null;
  fallbackMode: boolean;
  setFallbackTranscript: (text: string) => void;
  reset: () => void;
  mediaError: string | null;
}

export default function useSTT(): STTHook {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setFallbackMode(false);
    setMediaError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log('[TELC STT] Using MIME:', mimeType || 'default');

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        setProcessing(true);

        const recordedMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: recordedMime });

        try {
          const formData = new FormData();
          const ext = recordedMime.includes('mp4') ? 'mp4'
            : recordedMime.includes('ogg') ? 'ogg'
            : 'webm';
          formData.append('file', audioBlob, `recording.${ext}`);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': recordedMime },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Transcription failed: ${response.status}`);
          }

          const data = await response.json();
          const text = data.text || data.transcript || '';
          setTranscript(text);

          if (!text.trim()) {
            setFallbackMode(true);
            setError('Leerer Transkript erhalten');
          }
        } catch (err) {
          console.error('[TELC STT] Error:', err);
          setError(err instanceof Error ? err.message : 'Transkription fehlgeschlagen');
          setFallbackMode(true);
        } finally {
          setProcessing(false);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        setRecording(false);
        setError('Aufnahmefehler');
        setFallbackMode(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(1000);
      setRecording(true);
    } catch (err) {
      console.error('[TELC STT] getUserMedia error:', err);
      setMediaError(err instanceof Error ? err.message : 'Mikrofonzugriff verweigert');
      setFallbackMode(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const setFallbackTranscript = useCallback((text: string) => {
    setTranscript(text);
    setFallbackMode(false);
  }, []);

  const reset = useCallback(() => {
    setRecording(false);
    setProcessing(false);
    setTranscript('');
    setError(null);
    setFallbackMode(false);
    setMediaError(null);
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    recording,
    processing,
    transcript,
    error,
    fallbackMode,
    setFallbackTranscript,
    reset,
    mediaError,
  };
}
