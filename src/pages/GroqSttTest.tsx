import { useState, useRef, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Mic, Square, Send, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

type Status = 'idle' | 'recording' | 'sending' | 'done' | 'error';

export default function GroqSttTest() {
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setStatus('recording');
      setTranscript('');
      setErrorMsg('');
      setLatency(null);
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setElapsed(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('sending');

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');

        const sendStart = Date.now();
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          setLatency(Date.now() - sendStart);
          if (!res.ok) {
            setErrorMsg(data.error || `HTTP ${res.status}`);
            setStatus('error');
          } else {
            setTranscript(data.text || '');
            setStatus('done');
          }
        } catch {
          setLatency(Date.now() - sendStart);
          setErrorMsg('Network error — is the API running?');
          setStatus('error');
        }
      };

      recorder.start();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 30000);
    } catch {
      setErrorMsg('Microphone access denied or unavailable');
      setStatus('error');
    }
  }, [stopRecording]);

  const reset = () => {
    setStatus('idle');
    setTranscript('');
    setErrorMsg('');
    setLatency(null);
    setElapsed(0);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Groq Whisper STT Test" showBack />

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Status:{' '}
            <span
              className={cn('font-medium', {
                'text-zinc-300': status === 'idle',
                'text-red-400': status === 'recording',
                'text-yellow-400': status === 'sending',
                'text-emerald-400': status === 'done',
                'text-red-500': status === 'error',
              })}
            >
              {status === 'idle' && 'Ready'}
              {status === 'recording' && `Recording… ${elapsed}s`}
              {status === 'sending' && 'Sending to Groq…'}
              {status === 'done' && 'Transcription received'}
              {status === 'error' && 'Error'}
            </span>
          </div>
          {status === 'recording' && (
            <span className="inline-flex items-center gap-2 text-red-400 text-sm">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {(status === 'idle' || status === 'done' || status === 'error') && (
            <>
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                <Mic size={18} />
                Start Recording
              </button>
              {(status === 'done' || status === 'error') && (
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
                >
                  <Trash2 size={18} />
                  Reset
                </button>
              )}
            </>
          )}
          {status === 'recording' && (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              <Square size={18} />
              Stop Recording
            </button>
          )}
          {status === 'sending' && (
            <div className="flex items-center gap-2 px-5 py-2.5 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              Transcribing…
            </div>
          )}
        </div>

        {latency !== null && (
          <p className="text-xs text-zinc-500">
            API latency: {latency}ms
          </p>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Send size={14} />
          Transcript
        </h2>
        {status === 'idle' && (
          <p className="text-zinc-500 text-sm">Press "Start Recording" and speak.</p>
        )}
        {errorMsg && (
          <div className="flex items-start gap-2 text-red-400 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {transcript ? (
          <p className="text-zinc-100 whitespace-pre-wrap">{transcript}</p>
        ) : (
          (status === 'done' || status === 'sending') && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              {status === 'done' ? (
                <>
                  <CheckCircle2 size={16} />
                  No text returned — try speaking longer or louder.
                </>
              ) : (
                'Waiting for response…'
              )}
            </div>
          )
        )}
      </div>

      <details className="text-xs text-zinc-600 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <summary className="cursor-pointer font-medium">Architecture</summary>
        <pre className="mt-2 whitespace-pre-wrap leading-relaxed">
{`Microphone → MediaRecorder → audio/webm blob
  → POST /api/transcribe
  → Vercel Edge Function forwards to Groq Whisper
  → Returns { text: "..." }
  → Displayed in this page`}
        </pre>
        <p className="mt-2 text-zinc-500">
          Feature flag: <code className="text-zinc-300">USE_GROQ_STT</code>
        </p>
      </details>
    </div>
  );
}
