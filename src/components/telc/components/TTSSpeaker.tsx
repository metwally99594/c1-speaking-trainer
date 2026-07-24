import { Volume2, Square } from 'lucide-react';
import useTTSAdapter from '../tts/useTTSAdapter';

interface TTSSpeakerProps {
  text: string;
  compact?: boolean;
}

export default function TTSSpeaker({ text, compact }: TTSSpeakerProps) {
  const { speak, stop, speaking } = useTTSAdapter();

  if (compact) {
    return (
      <button
        onClick={speaking ? stop : () => speak(text)}
        title={speaking ? 'Stop' : 'Anhören'}
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: speaking
            ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid rgba(100,116,139,0.3)',
          background: speaking
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(100,116,139,0.1)',
          color: speaking ? '#ef4444' : '#94a3b8',
          cursor: 'pointer', padding: 0,
          transition: 'background 0.15s',
        }}
      >
        {speaking ? <Square size={12} /> : <Volume2 size={14} />}
      </button>
    );
  }

  return (
    <div style={{
      background: 'rgba(59,130,246,0.05)',
      borderRadius: 12,
      border: '1px solid rgba(59,130,246,0.1)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <button
          onClick={speaking ? stop : () => speak(text)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '8px 14px', borderRadius: 8, flexShrink: 0,
            border: speaking
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(59,130,246,0.3)',
            background: speaking
              ? 'rgba(239,68,68,0.1)'
              : 'rgba(59,130,246,0.1)',
            color: speaking ? '#ef4444' : '#3b82f6',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          {speaking ? <Square size={16} /> : <Volume2 size={16} />}
          {speaking ? 'Stop' : 'Anhören'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, lineHeight: 1.6, color: '#f1f5f9',
            margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {text}
          </p>
        </div>
      </div>
      {speaking && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, height: 20, paddingLeft: 0, marginTop: 4,
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 3, height: '60%', borderRadius: 2, background: '#3b82f6',
              animation: 'telc-wave 0.8s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
          <style>{`
            @keyframes telc-wave {
              0%, 100% { transform: scaleY(0.5); }
              50% { transform: scaleY(1.2); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
