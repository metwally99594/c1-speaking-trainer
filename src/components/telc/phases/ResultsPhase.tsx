import { useState } from 'react';
import { CRITERIA_LABELS } from '../types';
import type { TELCSession, GradeCriterion, GrammatikError, WortschatzError, SatzstrukturError, Grade } from '../types';
import GradeCard from '../components/GradeCard';
import ScoreBar from '../components/ScoreBar';
import TranscriptViewer from '../components/TranscriptViewer';
import { gradeToPoints, maxPointsFor } from '../scoring';

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
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'details' | 'errors' | 'transcripts'>('overview');

  if (!session || !session.ai_evaluation) return null;

  const { topic, zitat, transcripts, ai_evaluation, user_assessment, language_errors } = session;

  const totalErrors = language_errors
    ? language_errors.grammatik.length + language_errors.wortschatz.length + language_errors.satzstruktur.length
    : 0;

  const renderOverview = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ScoreBar total={ai_evaluation.total_points} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, margin: '8px 0 4px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Globale Kriterien (Sprachliche Qualität)
        </h4>
        {CRITERIA.map(key => (
          <GradeCard key={key} criterion={key} grade={ai_evaluation[key]} label={CRITERIA_LABELS[key]} />
        ))}
      </div>

      {ai_evaluation.feedback.overall_comment && (
        <div style={{
          background: 'rgba(59,130,246,0.04)', borderRadius: 12,
          border: '1px solid rgba(59,130,246,0.1)', padding: 14,
          fontSize: 13, lineHeight: 1.7, color: '#f1f5f9',
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: '#60a5fa' }}>Gesamtgutachten</h4>
          {ai_evaluation.feedback.overall_comment}
        </div>
      )}

      {user_assessment && (
        <div style={{
          background: 'rgba(34,197,94,0.04)', borderRadius: 12,
          border: '1px solid rgba(34,197,94,0.1)', padding: 14,
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
    </div>
  );

  const renderDetails = () => {
    const perPart = ai_evaluation.per_part;
    if (!perPart) {
      return (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          Keine detaillierte Bewertung für die einzelnen Teile verfügbar.
        </div>
      );
    }

    const renderPartGrade = (grade: Grade, label: string, key: string) => {
      const pts = gradeToPoints(grade, key);
      const maxPts = maxPointsFor(key);
      return (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.04)', marginBottom: 12
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, background: 'rgba(59,130,246,0.15)',
              color: '#60a5fa', padding: '2px 8px', borderRadius: 6
            }}>
              Kriterium {grade}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1' }}>
              {pts} / {maxPts} P.
            </span>
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Teil 1A */}
        <div style={sectionCardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: '#3b82f6', borderBottom: '1px solid rgba(59,130,246,0.15)', paddingBottom: 6 }}>
            Teil 1A: Präsentation
          </h3>
          {renderPartGrade(perPart.teil_1a.grade, 'Inhaltliche Qualität (Aufgabengerechtheit)', 'teil_1a')}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <h4 style={noteHeaderStyle}>📝 Inhalt & Struktur (Content Notes)</h4>
              <ul style={listStyle}>
                {perPart.teil_1a.content_notes.map((note, idx) => (
                  <li key={idx} style={{ color: '#cbd5e1' }}>{note}</li>
                ))}
                {perPart.teil_1a.content_notes.length === 0 && <li style={{ color: '#64748b' }}>Keine inhaltlichen Anmerkungen.</li>}
              </ul>
            </div>
            <div style={{ marginTop: 4 }}>
              <h4 style={noteHeaderStyle}>🗣️ Sprachlicher Ausdruck (Language Notes)</h4>
              <ul style={listStyle}>
                {perPart.teil_1a.language_notes.map((note, idx) => (
                  <li key={idx} style={{ color: '#cbd5e1' }}>{note}</li>
                ))}
                {perPart.teil_1a.language_notes.length === 0 && <li style={{ color: '#64748b' }}>Keine sprachlichen Anmerkungen.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Teil 1B */}
        <div style={sectionCardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: '#8b5cf6', borderBottom: '1px solid rgba(139,92,246,0.15)', paddingBottom: 6 }}>
            Teil 1B: Zusammenfassung & Fragen
          </h3>
          {renderPartGrade(perPart.teil_1b.grade, 'Reaktion & Interaktion (Aufgabengerechtheit)', 'teil_1b')}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <h4 style={noteHeaderStyle}>📝 Inhalt & Struktur (Content Notes)</h4>
              <ul style={listStyle}>
                {perPart.teil_1b.content_notes.map((note, idx) => (
                  <li key={idx} style={{ color: '#cbd5e1' }}>{note}</li>
                ))}
                {perPart.teil_1b.content_notes.length === 0 && <li style={{ color: '#64748b' }}>Keine inhaltlichen Anmerkungen.</li>}
              </ul>
            </div>
            <div style={{ marginTop: 4 }}>
              <h4 style={noteHeaderStyle}>🗣️ Sprachlicher Ausdruck (Language Notes)</h4>
              <ul style={listStyle}>
                {perPart.teil_1b.language_notes.map((note, idx) => (
                  <li key={idx} style={{ color: '#cbd5e1' }}>{note}</li>
                ))}
                {perPart.teil_1b.language_notes.length === 0 && <li style={{ color: '#64748b' }}>Keine sprachlichen Anmerkungen.</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Teil 2 */}
        <div style={sectionCardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px', color: '#10b981', borderBottom: '1px solid rgba(16,185,129,0.15)', paddingBottom: 6 }}>
            Teil 2: Diskussion
          </h3>
          {renderPartGrade(perPart.teil_2.grade, 'Diskussionsführung (Aufgabengerechtheit)', 'teil_2')}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {perPart.teil_2.inhalt && (
              <div style={t2CardStyle}>
                <strong style={t2LabelStyle}>💡 Inhalt & Tiefe:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.inhalt}</p>
              </div>
            )}
            {perPart.teil_2.argumentation && (
              <div style={t2CardStyle}>
                <strong style={t2LabelStyle}>🗣️ Argumentationskette:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.argumentation}</p>
              </div>
            )}
            {perPart.teil_2.reaktion && (
              <div style={t2CardStyle}>
                <strong style={t2LabelStyle}>🔄 Reaktion auf Partner:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.reaktion}</p>
              </div>
            )}
            {perPart.teil_2.sprache && (
              <div style={t2CardStyle}>
                <strong style={t2LabelStyle}>🎓 Wissenschaftssprache & Stil:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.sprache}</p>
              </div>
            )}
            {perPart.teil_2.interaktion && (
              <div style={t2CardStyle}>
                <strong style={t2LabelStyle}>🤝 Gesprächsführung & Fluss:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.interaktion}</p>
              </div>
            )}
            {perPart.teil_2.gesamtkommentar && (
              <div style={{ ...t2CardStyle, borderLeftColor: '#10b981', background: 'rgba(16,185,129,0.02)' }}>
                <strong style={{ ...t2LabelStyle, color: '#10b981' }}>📊 Fazit zur Diskussion:</strong>
                <p style={t2TextStyle}>{perPart.teil_2.gesamtkommentar}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderErrors = () => {
    if (!language_errors || totalErrors === 0) {
      return (
        <div style={{
          padding: 20, borderRadius: 12, textAlign: 'center',
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          color: '#86efac', fontSize: 14,
        }}>
          ✅ Keine sprachlichen Fehler gefunden — hervorragende Leistung!
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {language_errors.haeufigster_fehler && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
            color: '#fdba74', fontSize: 13, fontWeight: 500,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
            <span><strong style={{ color: '#fed7aa' }}>Häufigster Fehler:</strong> {language_errors.haeufigster_fehler}</span>
          </div>
        )}

        {language_errors.grammatik.length > 0 && (
          <ErrorSection title="Grammatikfehler" count={language_errors.grammatik.length} color="#ef4444">
            {language_errors.grammatik.map((e, i) => <GrammatikCard key={i} err={e} />)}
          </ErrorSection>
        )}

        {language_errors.wortschatz.length > 0 && (
          <ErrorSection title="Wortschatzfehler" count={language_errors.wortschatz.length} color="#f59e0b">
            {language_errors.wortschatz.map((e, i) => <WortschatzCard key={i} err={e} />)}
          </ErrorSection>
        )}

        {language_errors.satzstruktur.length > 0 && (
          <ErrorSection title="Satzstrukturfehler" count={language_errors.satzstruktur.length} color="#8b5cf6">
            {language_errors.satzstruktur.map((e, i) => <SatzstrukturCard key={i} err={e} />)}
          </ErrorSection>
        )}
      </div>
    );
  };

  const renderTranscripts = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TranscriptViewer label="Teil 1A — Präsentation" text={transcripts.teil_1a} />
      <TranscriptViewer label="Teil 1B — Antworten auf Fragen" text={transcripts.teil_1b_answers} />
      <TranscriptViewer label="Teil 1B — Fragen zu Partner-Präsentation" text={transcripts.teil_1b_questions} />
      <TranscriptViewer label="Teil 2 — Diskussion" text={formatTurns(transcripts.teil_2_turns)} />
    </div>
  );

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
        background: 'rgba(59,130,246,0.05)', borderRadius: 12,
        border: '1px solid rgba(59,130,246,0.1)', padding: 12, marginBottom: 20,
      }}>
        <p style={{ fontSize: 12, margin: '0 0 2px', color: '#94a3b8' }}>Thema</p>
        <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#f1f5f9' }}>{topic.title}</p>
        <p style={{ fontSize: 12, fontStyle: 'italic', marginTop: 6, color: '#94a3b8' }}>
          Zitat: „{zitat.text}“ — {zitat.author}
        </p>
      </div>

      {/* Interactive Tabs Header */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        padding: 4, borderRadius: 10,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <button
          onClick={() => setActiveSubTab('overview')}
          style={activeSubTab === 'overview' ? activeTabStyle : inactiveTabStyle}
        >
          Übersicht
        </button>
        <button
          onClick={() => setActiveSubTab('details')}
          style={activeSubTab === 'details' ? activeTabStyle : inactiveTabStyle}
        >
          Teile
        </button>
        <button
          onClick={() => setActiveSubTab('errors')}
          style={activeSubTab === 'errors' ? activeTabStyle : inactiveTabStyle}
        >
          Fehler ({totalErrors})
        </button>
        <button
          onClick={() => setActiveSubTab('transcripts')}
          style={activeSubTab === 'transcripts' ? activeTabStyle : inactiveTabStyle}
        >
          Transkript
        </button>
      </div>

      {/* Rendering tab contents */}
      <div style={{ marginBottom: 24 }}>
        {activeSubTab === 'overview' && renderOverview()}
        {activeSubTab === 'details' && renderDetails()}
        {activeSubTab === 'errors' && renderErrors()}
        {activeSubTab === 'transcripts' && renderTranscripts()}
      </div>

      {/* Action Buttons */}
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

// Helper Styles & Components for Mistakes
const activeTabStyle: React.CSSProperties = {
  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
  background: 'rgba(59,130,246,0.18)', color: '#60a5fa',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  textAlign: 'center', transition: 'all 0.2s',
};

const inactiveTabStyle: React.CSSProperties = {
  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none',
  background: 'transparent', color: '#94a3b8',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
  textAlign: 'center', transition: 'all 0.2s',
};

const sectionCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.01)', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.03)', padding: 16,
};

const noteHeaderStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: '0 0 6px',
};

const listStyle: React.CSSProperties = {
  margin: 0, paddingLeft: 16, fontSize: 13, lineHeight: 1.5,
  display: 'flex', flexDirection: 'column', gap: 6,
};

const t2CardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.01)', borderLeft: '3px solid #3b82f6',
  padding: '8px 12px', borderRadius: '0 8px 8px 0',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const t2LabelStyle: React.CSSProperties = {
  fontSize: 12, color: '#3b82f6',
};

const t2TextStyle: React.CSSProperties = {
  fontSize: 13, margin: 0, color: '#cbd5e1', lineHeight: 1.5,
};

function ErrorSection({ title, count, color, children }: { title: string; count: number; color: string; children: React.ReactNode }) {
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
    <div style={errCardStyle}>
      <ErrRow icon="❌" text={err.falsch} color="#fca5a5" />
      <ErrRow icon="✅" text={err.richtig} color="#86efac" />
      {err.regel && <ErrRow icon="📚" text={err.regel} color="#60a5fa" small bold />}
      {err.erklaerung && <ErrRow icon="💡" text={err.erklaerung} color="#fcd34d" small />}
      {err.beispiel && <ErrRow icon="📝" text={err.beispiel} color="#cbd5e1" small italic />}
    </div>
  );
}

function WortschatzCard({ err }: { err: WortschatzError }) {
  return (
    <div style={errCardStyle}>
      <ErrRow icon="❌" text={err.falsch} color="#fca5a5" />
      <ErrRow icon="✅" text={err.richtig} color="#86efac" />
      {err.unterschied && <ErrRow icon="💡" text={err.unterschied} color="#fcd34d" small />}
    </div>
  );
}

function SatzstrukturCard({ err }: { err: SatzstrukturError }) {
  return (
    <div style={errCardStyle}>
      <ErrRow icon="❌" text={err.falsch} color="#fca5a5" />
      <ErrRow icon="✅" text={err.richtig} color="#86efac" />
      {err.regel && <ErrRow icon="📚" text={err.regel} color="#60a5fa" small bold />}
    </div>
  );
}

function ErrRow({ icon, text, color, small, bold, italic }: { icon: string; text: string; color: string; small?: boolean; bold?: boolean; italic?: boolean }) {
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

const errCardStyle: React.CSSProperties = {
  padding: 12, borderRadius: 10,
  border: '1px solid rgba(100,116,139,0.2)',
  background: 'rgba(100,116,139,0.04)',
  display: 'flex', flexDirection: 'column', gap: 6,
};
