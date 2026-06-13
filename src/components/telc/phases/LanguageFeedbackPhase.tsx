interface LanguageFeedbackPhaseProps {
  corrections: string | null;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
}

interface CorrectionBlock {
  wrong?: string;
  right?: string;
  explanation?: string;
}

function parseCorrections(text: string): CorrectionBlock[] {
  if (!text.trim()) return [];
  const blocks = text.split(/(?=^\s*❌)/m).map(b => b.trim()).filter(Boolean);
  return blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const result: CorrectionBlock = {};
    let current: 'wrong' | 'right' | 'explanation' | null = null;
    for (const line of lines) {
      if (line.startsWith('❌')) { current = 'wrong'; result.wrong = line.replace(/^❌\s*/, ''); }
      else if (line.startsWith('✅')) { current = 'right'; result.right = line.replace(/^✅\s*/, ''); }
      else if (line.startsWith('💡')) { current = 'explanation'; result.explanation = line.replace(/^💡\s*/, ''); }
      else if (current) {
        result[current] = `${result[current] || ''} ${line}`.trim();
      }
    }
    return result;
  }).filter(b => b.wrong || b.right || b.explanation);
}

export default function LanguageFeedbackPhase({ corrections, loading, error, onContinue }: LanguageFeedbackPhaseProps) {
  const blocks = corrections ? parseCorrections(corrections) : [];

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Sprachliche Korrekturen
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Detaillierte Hinweise zu Grammatik, Wortwahl und Stil
        </p>
      </div>

      {loading && corrections === null && (
        <div style={{ textAlign: 'center', padding: '40px 4px' }}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Analyse läuft... ⏳</p>
        </div>
      )}

      {error && !loading && corrections === null && (
        <div style={{
          padding: 14, borderRadius: 10, marginBottom: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {corrections !== null && !loading && blocks.length === 0 && (
        <div style={{
          padding: 16, borderRadius: 10, marginBottom: 16,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          color: '#86efac', fontSize: 14, textAlign: 'center',
        }}>
          Keine sprachlichen Fehler gefunden — sehr gut!
        </div>
      )}

      {blocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {blocks.map((b, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 10,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(100,116,139,0.04)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {b.wrong && (
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#fca5a5' }}>
                  ❌ {b.wrong}
                </div>
              )}
              {b.right && (
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#86efac' }}>
                  ✅ {b.right}
                </div>
              )}
              {b.explanation && (
                <div style={{ fontSize: 12, lineHeight: 1.5, color: '#fcd34d' }}>
                  💡 {b.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={loading && corrections === null}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: (loading && corrections === null)
            ? 'rgba(100,116,139,0.2)'
            : 'linear-gradient(135deg, #3b82f6, #60a5fa)',
          color: (loading && corrections === null) ? '#64748b' : '#06081a',
          fontSize: 15, fontWeight: 600,
          cursor: (loading && corrections === null) ? 'not-allowed' : 'pointer',
        }}
      >
        Weiter zur Selbsteinschätzung
      </button>
    </div>
  );
}
