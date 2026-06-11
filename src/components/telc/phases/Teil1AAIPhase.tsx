import { useState, useEffect } from 'react';
import TTSSpeaker from '../components/TTSSpeaker';
import RecordButton, { STATES } from '../components/RecordButton';
import Timer from '../components/Timer';
import { DURATION } from '../types';

interface Teil1AAIPhaseProps {
  aiResponse: string | null;
  aiLoading: boolean;
  aiError: string | null;
  onAiResponseDone: () => void;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onQuestionsReady: (text: string) => void;
}

export default function Teil1AAIPhase({
  aiResponse, aiLoading, aiError, onAiResponseDone,
  recording, processing, transcript, fallbackMode,
  startRecording, stopRecording,
  onQuestionsReady,
}: Teil1AAIPhaseProps) {
  const [step, setStep] = useState<'listening' | 'answering'>('listening');
  const shownResponse = aiResponse && !aiLoading ? aiResponse : '';

  useEffect(() => {
    if (transcript && !processing && !fallbackMode) {
      onQuestionsReady(transcript);
    }
  }, [transcript, processing, fallbackMode, onQuestionsReady]);

  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : transcript ? STATES.DONE : STATES.IDLE;

  if (aiLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 4px' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>AI antwortet... ⏳</p>
      </div>
    );
  }

  if (aiError) {
    return (
      <div style={{ padding: '0 4px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 16 }}>{aiError}</p>
        <button onClick={onAiResponseDone} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Überspringen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 1A — Präsentation Ihres Partners
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Hören Sie die Präsentation Ihres Partners
        </p>
      </div>

      {shownResponse && step === 'listening' && (
        <>
          <TTSSpeaker text={shownResponse} speaking={false} onSpeak={() => {}} onStop={() => {}} />
          <button
            onClick={() => { setStep('answering'); onAiResponseDone(); }}
            style={{
              width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Weiter — Zusammenfassung geben
          </button>
        </>
      )}

      {step === 'answering' && !transcript && (
        <>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              Fassen Sie die Präsentation zusammen und stellen Sie 1-2 Fragen (1:30 Min.)
            </p>
          </div>
          <Timer totalSeconds={DURATION.TEIL_1B_QUESTIONS} running={!transcript} />
          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} disabled={!!transcript} />
          </div>
        </>
      )}

      {fallbackMode && step === 'answering' && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
            Bitte geben Sie Ihre Zusammenfassung ein
          </p>
          <textarea
            placeholder="Ihre Zusammenfassung und Fragen..."
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const ta = document.querySelector('.telc-teil1a-ai textarea') as HTMLTextAreaElement | null;
              const val = ta?.value || '';
              if (val.trim()) onQuestionsReady(val);
            }}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Text übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
