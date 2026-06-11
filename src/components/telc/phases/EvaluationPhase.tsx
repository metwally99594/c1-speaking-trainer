import { CRITERIA_LABELS } from '../types';
import type { AIEvaluation, GradeCriterion } from '../types';
import GradeCard from '../components/GradeCard';
import ScoreBar from '../components/ScoreBar';

interface EvaluationPhaseProps {
  evaluation: AIEvaluation | null;
  onContinue: () => void;
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

export default function EvaluationPhase({ evaluation, onContinue }: EvaluationPhaseProps) {
  if (!evaluation) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 4px' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Auswertung läuft... ⏳</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Bewertung
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Ihre Leistung wurde bewertet
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ScoreBar total={evaluation.total_points} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {CRITERIA.map(key => (
          <GradeCard key={key} criterion={key} grade={evaluation[key]} label={CRITERIA_LABELS[key]} />
        ))}
      </div>

      {evaluation.note && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 12, marginBottom: 16,
          fontSize: 12, lineHeight: 1.6, color: '#94a3b8',
        }}>
          {evaluation.note}
        </div>
      )}

      {evaluation.feedback && (
        <div style={{
          background: 'rgba(59,130,246,0.05)', borderRadius: 12,
          border: '1px solid rgba(59,130,246,0.1)', padding: 16, marginBottom: 20,
        }}>
          {evaluation.feedback.strengths.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#22c55e' }}>Stärken</h4>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.7, color: '#94a3b8' }}>
                {evaluation.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.feedback.improvements.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 6px', color: '#f59e0b' }}>Verbesserungsvorschläge</h4>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.7, color: '#94a3b8' }}>
                {evaluation.feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {evaluation.feedback.overall_comment && (
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#f1f5f9' }}>
              {evaluation.feedback.overall_comment}
            </p>
          )}
        </div>
      )}

      <button
        onClick={onContinue}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
          color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Weiter zur Selbsteinschätzung
      </button>
    </div>
  );
}
