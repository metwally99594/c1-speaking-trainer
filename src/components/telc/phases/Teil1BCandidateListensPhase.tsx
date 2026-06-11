import TTSSpeaker from '../components/TTSSpeaker';

interface Teil1BCandidateListensPhaseProps {
  aiResponse: string | null;
  aiLoading: boolean;
  aiError: string | null;
  onComplete: () => void;
}

export default function Teil1BCandidateListensPhase({
  aiResponse, aiLoading, aiError, onComplete,
}: Teil1BCandidateListensPhaseProps) {
  const shownResponse = aiResponse && !aiLoading ? aiResponse : '';

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
        <button onClick={onComplete} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Weiter zur Diskussion
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Antwort Ihres Partners
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Hören Sie die Antworten auf Ihre Fragen
        </p>
      </div>

      {shownResponse && (
        <>
          <TTSSpeaker text={shownResponse} speaking={false} onSpeak={() => {}} onStop={() => {}} />
          <button
            onClick={onComplete}
            style={{
              width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Weiter zur Diskussion
          </button>
        </>
      )}
    </div>
  );
}
