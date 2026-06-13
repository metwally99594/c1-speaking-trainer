import { useRef } from 'react';
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
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

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

      {recording && !fallbackMode && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 13, textAlign: 'center', fontWeight: 500,
        }}>
          🎤 Aufnahme läuft...
        </div>
      )}

      {processing && !fallbackMode && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, marginBottom: 12,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          color: '#fcd34d', fontSize: 13, textAlign: 'center', fontWeight: 500,
        }}>
          ⏳ Wird erkannt...
        </div>
      )}

      {transcript && !fallbackMode && (
        <>
          <div style={{
            padding: 12, borderRadius: 10, marginBottom: 12,
            border: '1px solid rgba(34,197,94,0.2)',
            background: 'rgba(34,197,94,0.05)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 6,
              color: '#4ade80', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Ihr Text
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.6, color: '#f1f5f9',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {transcript}
            </div>
          </div>
          <button
            onClick={() => onTranscriptReady(transcript)}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            Weiter
          </button>
        </>
      )}

      {fallbackMode && !error && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
            Transkription fehlgeschlagen
          </p>
          <textarea
            ref={fallbackTextareaRef}
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
              const text = fallbackTextareaRef.current?.value?.trim() || '';
              if (text) onTranscriptReady(text);
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
