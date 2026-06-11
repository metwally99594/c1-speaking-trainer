import { Volume2, VolumeX } from 'lucide-react';

interface TTSSpeakerProps {
  text: string;
  speaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
}

export default function TTSSpeaker({ text, speaking, onSpeak, onStop }: TTSSpeakerProps) {
  return (
    <div style={{
      background: 'rgba(59,130,246,0.05)',
      borderRadius: 12,
      border: '1px solid rgba(59,130,246,0.1)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <button
          onClick={speaking ? onStop : onSpeak}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 4, color: speaking ? '#ef4444' : '#3b82f6',
            flexShrink: 0, marginTop: 2,
          }}
          title={speaking ? 'Stop' : 'Vorlesen'}
        >
          {speaking ? <VolumeX size={20} /> : <Volume2 size={20} />}
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
          display: 'flex', alignItems: 'center', gap: 3, height: 20, paddingLeft: 32,
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
