import { useState, useRef, useCallback } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Mic, Square, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { useGroqStt } from '../hooks/useGroqStt';

export default function GroqSttTest() {
  const {
    transcript, isRecording, isProcessing,
    startRecording, stopRecording, resetTranscript,
  } = useGroqStt();

  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const handleStart = useCallback(async () => {
    setErrorMsg('');
    startTimeRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 200);
    await startRecording();
  }, [startRecording]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopRecording();
  }, [stopRecording]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Groq Whisper STT Test" showBack />

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Status:{' '}
            <span
              className={cn('font-medium', {
                'text-zinc-300': !isRecording && !isProcessing && !transcript,
                'text-red-400': isRecording,
                'text-yellow-400': isProcessing,
                'text-emerald-400': !isRecording && !isProcessing && !!transcript,
              })}
            >
              {isRecording && `Recording… ${elapsed}s`}
              {isProcessing && 'Transcribing…'}
              {!isRecording && !isProcessing && !transcript && 'Ready'}
              {!isRecording && !isProcessing && !!transcript && 'Transcription received'}
            </span>
          </div>
          {isRecording && (
            <span className="inline-flex items-center gap-2 text-red-400 text-sm">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className="flex gap-3">
          {!isRecording && !isProcessing && !transcript && (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
            >
              <Mic size={18} />
              Start Recording
            </button>
          )}
          {isRecording && (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              <Square size={18} />
              Stop Recording
            </button>
          )}
          {(isProcessing || (transcript && !isRecording)) && (
            <button
              onClick={() => { resetTranscript(); setElapsed(0); setErrorMsg(''); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium transition-colors"
            >
              <Trash2 size={18} />
              Reset
            </button>
          )}
          {isProcessing && (
            <div className="flex items-center gap-2 px-5 py-2.5 text-zinc-400">
              <Loader2 size={18} className="animate-spin" />
              Transcribing…
            </div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
          <Send size={14} />
          Transcript
        </h2>
        {!transcript && !isProcessing && (
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
          isProcessing && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Waiting for response…
            </div>
          )
        )}
      </div>
    </div>
  );
}
