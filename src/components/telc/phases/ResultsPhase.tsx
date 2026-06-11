import { CRITERIA_LABELS } from '../types';
import type { TELCSession, GradeCriterion } from '../types';
import GradeCard from '../components/GradeCard';
import ScoreBar from '../components/ScoreBar';
import TranscriptViewer from '../components/TranscriptViewer';

interface ResultsPhaseProps {
  session: TELCSession | null;
  onTryAgain: () => void;
  onViewHistory: () => void;
}

const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];

function formatTurns(turns?: { role: string; text: string }[]): string {
  if (!turns || turns.length === 0) return '';
  return turns.map(t => `[${t.role === 'candidate' ? 'Sie' : 'Partner'}]: ${t.text}`).join('\n\n');
}

export default function ResultsPhase({ session, onTryAgain, onViewHistory }: ResultsPhaseProps) {
  if (!session || !session.ai_evaluation) return null;

  const { topic, zitat, transcripts, ai_evaluation, user_assessment } = session;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Prüfungsergebnis
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {new Date(session.timestamp).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      <div style={{
        background: 'rgba(59,130,246,0.05)', borderRadius: 10,
        border: '1px solid rgba(59,130,246,0.1)', padding: 12, marginBottom: 20,
      }}>
        <p style={{ fontSize: 13, margin: '0 0 2px', color: '#94a3b8' }}>Thema</p>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#f1f5f9' }}>{topic.title}</p>
        <p style={{ fontSize: 12, fontStyle: 'italic', marginTop: 6, color: '#94a3b8' }}>
          Zitat: „{zitat.text} — {zitat.author}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <ScoreBar total={ai_evaluation.total_points} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {CRITERIA.map(key => (
          <GradeCard key={key} criterion={key} grade={ai_evaluation[key]} label={CRITERIA_LABELS[key]} />
        ))}
      </div>

      {ai_evaluation.feedback.overall_comment && (
        <div style={{
          background: 'rgba(59,130,246,0.04)', borderRadius: 10,
          border: '1px solid rgba(59,130,246,0.1)', padding: 14, marginBottom: 20,
          fontSize: 13, lineHeight: 1.7, color: '#f1f5f9',
        }}>
          {ai_evaluation.feedback.overall_comment}
        </div>
      )}

      {user_assessment && (
        <div style={{
          background: 'rgba(34,197,94,0.04)', borderRadius: 10,
          border: '1px solid rgba(34,197,94,0.1)', padding: 14, marginBottom: 20,
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#22c55e' }}>
            Ihre Selbsteinschätzung
          </h4>
          <p style={{ fontSize: 13, margin: 0, color: '#94a3b8' }}>
            {user_assessment.overall_impression === 'agree' && 'Stimme der Bewertung zu'}
            {user_assessment.overall_impression === 'too_strict' && 'Zu streng bewertet'}
            {user_assessment.overall_impression === 'too_generous' && 'Zu großzügig bewertet'}
          </p>
          {user_assessment.free_text && (
            <p style={{ fontSize: 13, marginTop: 8, color: '#f1f5f9' }}>{user_assessment.free_text}</p>
          )}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Transkripte
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <TranscriptViewer label="Teil 1A — Präsentation" text={transcripts.teil_1a} />
          <TranscriptViewer label="Teil 1B — Antworten auf Fragen" text={transcripts.teil_1b_answers} />
          <TranscriptViewer label="Teil 1B — Fragen zu Partner-Präsentation" text={transcripts.teil_1b_questions} />
          <TranscriptViewer label="Teil 2 — Diskussion" text={formatTurns(transcripts.teil_2_turns)} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={onTryAgain}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Erneut versuchen
        </button>
        <button
          onClick={onViewHistory}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 12,
            border: '1px solid rgba(100,116,139,0.2)', background: 'transparent',
            color: '#f1f5f9', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Prüfungsverlauf anzeigen
        </button>
      </div>
    </div>
  );
}
