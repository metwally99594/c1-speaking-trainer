import { useState } from 'react';
import { CRITERIA_LABELS, GRADES } from '../types';
import type { Grade, GradeCriterion, UserAssessment } from '../types';

interface SelfAssessPhaseProps {
  onComplete: (assessment: UserAssessment) => void;
}

const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit_1a',
  'aufgabengerechtheit_1b',
  'diskussionsfuehrung',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];

export default function SelfAssessPhase({ onComplete }: SelfAssessPhaseProps) {
  const [impression, setImpression] = useState<UserAssessment['overall_impression'] | null>(null);
  const [selfGrades, setSelfGrades] = useState<Partial<Record<GradeCriterion, Grade>>>({});
  const [freeText, setFreeText] = useState('');
  const [showSelfGrades, setShowSelfGrades] = useState(false);

  const handleSubmit = () => {
    onComplete({
      overall_impression: impression || 'agree',
      self_grades: showSelfGrades ? selfGrades : undefined,
      free_text: freeText || undefined,
    });
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Selbsteinschätzung
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Wie bewerten Sie Ihre eigene Leistung?
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Gesamteindruck
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {([
            { value: 'agree' as const, label: 'Stimme der Bewertung zu' },
            { value: 'too_strict' as const, label: 'Zu streng bewertet' },
            { value: 'too_generous' as const, label: 'Zu großzügig bewertet' },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => setImpression(opt.value)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                border: impression === opt.value
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(100,116,139,0.2)',
                background: impression === opt.value
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(100,116,139,0.04)',
                cursor: 'pointer', fontSize: 14, color: '#f1f5f9',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowSelfGrades(!showSelfGrades)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 8,
          border: '1px solid rgba(100,116,139,0.2)',
          background: 'rgba(100,116,139,0.05)', color: '#f1f5f9',
          fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 16, textAlign: 'center',
        }}
      >
        {showSelfGrades ? 'Eigene Noten ausblenden' : 'Eigene Noten vergeben (optional)'}
      </button>

      {showSelfGrades && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {CRITERIA.map(key => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              padding: '8px 12px', borderRadius: 8, background: 'rgba(100,116,139,0.05)',
            }}>
              <span style={{ fontSize: 13, color: '#f1f5f9', flex: 1 }}>
                {CRITERIA_LABELS[key]}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {GRADES.map(g => (
                  <button
                    key={g}
                    onClick={() => setSelfGrades(prev => ({ ...prev, [key]: g }))}
                    style={{
                      width: 32, height: 32, borderRadius: 6,
                      border: selfGrades[key] === g
                        ? '2px solid #3b82f6'
                        : '1px solid rgba(100,116,139,0.2)',
                      background: selfGrades[key] === g
                        ? 'rgba(59,130,246,0.15)'
                        : 'transparent',
                      color: selfGrades[key] === g ? '#3b82f6' : '#94a3b8',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#f1f5f9' }}>
          Anmerkungen (optional)
        </h3>
        <textarea
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          placeholder="Ihre Anmerkungen zur Prüfung..."
          style={{
            width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
            border: '1px solid rgba(100,116,139,0.2)',
            background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
            fontSize: 13, lineHeight: 1.6, resize: 'vertical',
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!impression}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: impression
            ? 'linear-gradient(135deg, #3b82f6, #60a5fa)'
            : 'rgba(100,116,139,0.2)',
          color: impression ? '#06081a' : '#64748b',
          fontSize: 15, fontWeight: 600,
          cursor: impression ? 'pointer' : 'not-allowed',
          transition: 'all 0.15s',
        }}
      >
        Ergebnisse anzeigen
      </button>
    </div>
  );
}
