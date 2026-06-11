import { useEffect } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import { DURATION } from '../types';

interface Teil1APhaseProps {
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  mediaError: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  setFallbackTranscript: (text: string) => void;
  onTranscriptReady: (text: string) => void;
}

export default function Teil1APhase({
  recording, processing, transcript, fallbackMode, mediaError,
  startRecording, stopRecording, setFallbackTranscript,
  onTranscriptReady,
}: Teil1APhaseProps) {
  useEffect(() => {
    if (transcript && !processing && !fallbackMode) {
      onTranscriptReady(transcript);
    }
  }, [transcript, processing, fallbackMode, onTranscriptReady]);

  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : transcript ? STATES.DONE : STATES.IDLE;

  const handleTimerEnd = () => {
    if (recording) stopRecording();
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 1A — Präsentation
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Sie haben 3 Minuten Zeit für Ihre Präsentation
        </p>
      </div>

      {mediaError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.2)', padding: 14, marginBottom: 16,
          fontSize: 13, color: '#ef4444',
        }}>
          Mikrofonfehler: {mediaError}
        </div>
      )}

      {recording && (
        <Timer totalSeconds={DURATION.TEIL_1A} running={recording} onEnd={handleTimerEnd} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <RecordButton
          state={btnState}
          onStart={startRecording}
          onStop={stopRecording}
          disabled={!!transcript}
        />
      </div>

      {fallbackMode && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
            Transkription fehlgeschlagen
          </p>
          <textarea
            placeholder="Geben Sie hier Ihre Präsentation ein..."
            onChange={e => setFallbackTranscript(e.target.value)}
            style={{
              width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const textarea = document.querySelector('.telc-teil1a textarea') as HTMLTextAreaElement | null;
              const text = textarea?.value || '';
              if (text.trim()) onTranscriptReady(text);
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
