import Timer from '../components/Timer';
import { DURATION } from '../types';
import type { PraesentationTopic, Zitat } from '../types';

interface PrepPhaseProps {
  topic: PraesentationTopic;
  zitat: Zitat;
  onReady: () => void;
}

export default function PrepPhase({ topic, zitat, onReady }: PrepPhaseProps) {
  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Vorbereitungszeit
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Sie haben 20 Minuten Zeit, sich vorzubereiten
        </p>
      </div>

      <Timer totalSeconds={DURATION.PREP} running onEnd={onReady} />

      <div style={{
        background: 'rgba(59,130,246,0.05)', borderRadius: 12,
        border: '1px solid rgba(59,130,246,0.1)', padding: 16, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#3b82f6' }}>
          Ihr Thema
        </h3>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: '#f1f5f9' }}>
          {topic.title}
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#94a3b8' }}>
          {topic.prompt}
        </p>
      </div>

      <div style={{
        background: 'rgba(245,158,11,0.05)', borderRadius: 12,
        border: '1px solid rgba(245,158,11,0.1)', padding: 16, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
          Zitat für die Diskussion
        </h3>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>
          — {zitat.author}
        </p>
      </div>

      <div style={{
        background: 'rgba(34,197,94,0.05)', borderRadius: 12,
        border: '1px solid rgba(34,197,94,0.1)', padding: 16, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#22c55e' }}>
          Struktur-Tipps
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: '#94a3b8' }}>
          {topic.tips?.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={onReady}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
          color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Bereit — Prüfung beginnen
      </button>
    </div>
  );
}
