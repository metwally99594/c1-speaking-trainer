import type { LanguageErrors, GrammatikError, WortschatzError, SatzstrukturError } from '../types';

interface LanguageFeedbackPhaseProps {
  errors: LanguageErrors | null;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
}

export default function LanguageFeedbackPhase({ errors, loading, error, onContinue }: LanguageFeedbackPhaseProps) {
  const total = errors
    ? errors.grammatik.length + errors.wortschatz.length + errors.satzstruktur.length
    : 0;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Fehleranalyse
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Detaillierte Hinweise zu Grammatik, Wortschatz und Satzstruktur
        </p>
      </div>

      {loading && errors === null && (
        <div style={{ textAlign: 'center', padding: '40px 4px' }}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Analyse läuft... ⏳</p>
        </div>
      )}

      {error && !loading && errors === null && (
        <div style={{
          padding: 14, borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {errors !== null && total === 0 && (
        <div style={{
          padding: 16, borderRadius: 10, marginBottom: 16,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          color: '#86efac', fontSize: 14, textAlign: 'center',
        }}>
          ✅ Keine sprachlichen Fehler gefunden — sehr gut!
        </div>
      )}

      {errors !== null && errors.grammatik.length > 0 && (
        <Section title="Grammatikfehler" count={errors.grammatik.length} color="#ef4444">
          {errors.grammatik.map((e, i) => <GrammatikCard key={i} err={e} />)}
        </Section>
      )}

      {errors !== null && errors.wortschatz.length > 0 && (
        <Section title="Wortschatzfehler" count={errors.wortschatz.length} color="#f59e0b">
          {errors.wortschatz.map((e, i) => <WortschatzCard key={i} err={e} />)}
        </Section>
      )}

      {errors !== null && errors.satzstruktur.length > 0 && (
        <Section title="Satzstrukturfehler" count={errors.satzstruktur.length} color="#8b5cf6">
          {errors.satzstruktur.map((e, i) => <SatzstrukturCard key={i} err={e} />)}
        </Section>
      )}

      <button
        onClick={onContinue}
        disabled={loading && errors === null}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: (loading && errors === null)
            ? 'rgba(100,116,139,0.2)'
            : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
          color: (loading && errors === null) ? '#64748b' : '#06081a',
          fontSize: 15, fontWeight: 600,
          cursor: (loading && errors === null) ? 'not-allowed' : 'pointer',
          marginTop: 8,
        }}
      >
        Weiter zur Selbsteinschätzung
      </button>
    </div>
  );
}

function Section({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{
        fontSize: 14, fontWeight: 700, margin: '0 0 10px',
        color, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {title}
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 10,
          background: `${color}22`, color,
        }}>
          {count}
        </span>
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function GrammatikCard({ err }: { err: GrammatikError }) {
  return (
    <div style={cardStyle}>
      <Row icon="❌" text={err.falsch} color="#fca5a5" />
      <Row icon="✅" text={err.richtig} color="#86efac" />
      {err.regel && <Row icon="📚" text={err.regel} color="#60a5fa" small bold />}
      {err.erklaerung && <Row icon="💡" text={err.erklaerung} color="#fcd34d" small />}
      {err.beispiel && <Row icon="📝" text={err.beispiel} color="#cbd5e1" small italic />}
    </div>
  );
}

function WortschatzCard({ err }: { err: WortschatzError }) {
  return (
    <div style={cardStyle}>
      <Row icon="❌" text={err.falsch} color="#fca5a5" />
      <Row icon="✅" text={err.richtig} color="#86efac" />
      {err.unterschied && <Row icon="💡" text={err.unterschied} color="#fcd34d" small />}
    </div>
  );
}

function SatzstrukturCard({ err }: { err: SatzstrukturError }) {
  return (
    <div style={cardStyle}>
      <Row icon="❌" text={err.falsch} color="#fca5a5" />
      <Row icon="✅" text={err.richtig} color="#86efac" />
      {err.regel && <Row icon="📚" text={err.regel} color="#60a5fa" small bold />}
    </div>
  );
}

function Row({ icon, text, color, small, bold, italic }: { icon: string; text: string; color: string; small?: boolean; bold?: boolean; italic?: boolean }) {
  return (
    <div style={{
      fontSize: small ? 12 : 13,
      lineHeight: 1.5,
      color,
      fontWeight: bold ? 600 : 400,
      fontStyle: italic ? 'italic' : 'normal',
      display: 'flex', gap: 6, alignItems: 'flex-start',
    }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 12, borderRadius: 10,
  border: '1px solid rgba(100,116,139,0.2)',
  background: 'rgba(100,116,139,0.04)',
  display: 'flex', flexDirection: 'column', gap: 6,
};
