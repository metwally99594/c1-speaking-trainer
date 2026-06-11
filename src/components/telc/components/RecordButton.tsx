import { Mic, Square, Loader2, Check } from 'lucide-react';

export const STATES = {
  IDLE: 'idle' as const,
  RECORDING: 'recording' as const,
  PROCESSING: 'processing' as const,
  DONE: 'done' as const,
};

type ButtonState = (typeof STATES)[keyof typeof STATES];

interface RecordButtonProps {
  state?: ButtonState;
  onStart?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

export default function RecordButton({
  state = STATES.IDLE,
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  if (state === STATES.PROCESSING) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.7,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.15)',
        }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Transkribiere...</span>
      </div>
    );
  }

  if (state === STATES.DONE) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(34,197,94,0.15)',
          border: '2px solid rgba(34,197,94,0.3)',
        }}>
          <Check size={32} style={{ color: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 13, color: '#22c55e' }}>Aufgenommen</span>
      </div>
    );
  }

  const isRecording = state === STATES.RECORDING;

  return (
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, padding: 0,
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
        border: isRecording ? '2px solid rgba(239,68,68,0.4)' : '2px solid rgba(59,130,246,0.2)',
        transition: 'all 0.2s',
        animation: isRecording ? 'telc-pulse 1.5s ease-in-out infinite' : 'none',
      }}>
        {isRecording
          ? <Square size={20} style={{ color: '#ef4444' }} fill="#ef4444" />
          : <Mic size={28} style={{ color: '#3b82f6' }} />
        }
      </div>
      <span style={{
        fontSize: 13,
        color: isRecording ? '#ef4444' : '#94a3b8',
        fontWeight: isRecording ? 600 : 400,
      }}>
        {isRecording ? 'Aufnehmen...' : 'Aufnahme starten'}
      </span>
      <style>{`
        @keyframes telc-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </button>
  );
}
