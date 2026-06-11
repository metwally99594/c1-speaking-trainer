import { useEffect } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';

interface RecordPhaseProps {
  title: string;
  subtitle: string;
  duration: number;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  setFallbackTranscript: (text: string) => void;
  onTranscriptReady: (text: string) => void;
}

export default function RecordPhase({
  title, subtitle, duration,
  recording, processing, transcript, fallbackMode, error,
  startRecording, stopRecording, setFallbackTranscript,
  onTranscriptReady,
}: RecordPhaseProps) {
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
          {title}
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {subtitle}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#ef4444' }}>
            Fehler
          </p>
          <p style={{ fontSize: 13, margin: '0 0 10px', color: '#fca5a5' }}>{error}</p>
          <button
            onClick={startRecording}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {recording && (
        <Timer totalSeconds={duration} running={recording} onEnd={handleTimerEnd} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} disabled={!!transcript} />
      </div>

      {fallbackMode && !error && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
            Transkription fehlgeschlagen
          </p>
          <textarea
            placeholder="Geben Sie hier Ihren Text ein..."
            onChange={e => setFallbackTranscript(e.target.value)}
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const ta = document.querySelector('.telc-record textarea') as HTMLTextAreaElement | null;
              const text = ta?.value || '';
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
