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
  debugInfo: Record<string, unknown>;
}

export default function useSTT(): STTHook {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setFallbackMode(false);
    setMediaError(null);
    setDebugInfo({});
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('[TELC STT] getUserMedia succeeded');

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log('[TELC STT] MIME type selected:', mimeType || 'default (browser chooses)');

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('[TELC STT] ondataavailable chunk size:', e.data.size, 'total chunks:', chunksRef.current.length);
        } else {
          console.log('[TELC STT] ondataavailable EMPTY chunk — skipped');
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        console.log('[TELC STT] recording stopped, chunks:', chunksRef.current.length);

        const recordedMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: recordedMime });
        const totalSize = audioBlob.size;
        console.log('[TELC STT] total blob size:', totalSize, 'type:', recordedMime);

        if (totalSize === 0) {
          console.error('[TELC STT] EMPTY BLOB — no audio data captured');
          setError('Keine Audiodaten — bitte Mikrofon prüfen');
          setFallbackMode(true);
          setProcessing(false);
          setDebugInfo({ blobSize: 0, error: 'empty blob' });
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          return;
        }

        setProcessing(true);

        try {
          const formData = new FormData();
          const ext = recordedMime.includes('mp4') ? 'mp4'
            : recordedMime.includes('ogg') ? 'ogg'
            : 'webm';
          formData.append('file', audioBlob, `recording.${ext}`);

          console.log('[TELC STT] sending to /api/transcribe, file:', `recording.${ext}`, 'size:', totalSize);
          console.log('[TELC STT] FormData keys:', Array.from(formData.keys()));

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          console.log('[TELC STT] /api/transcribe status:', response.status);
          setDebugInfo(prev => ({ ...prev, apiStatus: response.status }));

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('[TELC STT] /api/transcribe error body:', errorBody);
            throw new Error(`Transkription fehlgeschlagen (${response.status}): ${errorBody}`);
          }

          const data = await response.json();
          console.log('[TELC STT] /api/transcribe response:', JSON.stringify(data).slice(0, 300));
          setDebugInfo(prev => ({ ...prev, apiResponse: { ...data, _truncated: true } }));

          const text = data.text || data.transcript || '';
          console.log('[TELC STT] transcript text length:', text.length);

          if (!text.trim()) {
            console.warn('[TELC STT] empty transcript from Groq');
            setFallbackMode(true);
            setError('Kein Text erkannt — bitte nochmals sprechen');
          } else {
            setTranscript(text);
          }
        } catch (err) {
          console.error('[TELC STT] Error:', err);
          const msg = err instanceof Error ? err.message : 'Transkription fehlgeschlagen';
          setError(msg);
          setFallbackMode(true);
          setDebugInfo(prev => ({ ...prev, fetchError: msg }));
        } finally {
          setProcessing(false);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        console.error('[TELC STT] MediaRecorder error');
        setRecording(false);
        setError('Aufnahmefehler');
        setFallbackMode(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      setRecording(true);
      console.log('[TELC STT] MediaRecorder started with timeslice 100ms');
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
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setRecording(false);
    setProcessing(false);
    setTranscript('');
    setError(null);
    setFallbackMode(false);
    setMediaError(null);
    setDebugInfo({});
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
    debugInfo,
  };
}
