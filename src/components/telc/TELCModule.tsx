import { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle, ArrowLeft } from 'lucide-react';
import { PHASES, CRITERIA_LABELS, GRADE_LABELS } from './types';
import type { DiscussionTurn, UserAssessment, TELCSession, LanguageErrors, PartEvaluation, Teil2DetailedEvaluation, Grade, GradeCriterion } from './types';
import type { PraesentationTopic, Zitat } from './types';
import { buildEvaluation } from './scoring';
import useSTT from './useSTT';
import useAIPartner from './useAIPartner';
import useTELCSession from './useTELCSession';
import IdlePhase from './phases/IdlePhase';
import PrepPhase from './phases/PrepPhase';
import Teil1APhase from './phases/Teil1APhase';
import ListenPhase from './phases/ListenPhase';
import RecordPhase from './phases/RecordPhase';
import Teil2Phase from './phases/Teil2Phase';
import PartnerDiscussionPhase from './phases/PartnerDiscussionPhase';
import EvaluationPhase from './phases/EvaluationPhase';
import LanguageFeedbackPhase from './phases/LanguageFeedbackPhase';
import SelfAssessPhase from './phases/SelfAssessPhase';
import ResultsPhase from './phases/ResultsPhase';
import TELCAdmin from './admin/TELCAdmin';
import { DURATION } from './types';
import { seedIfEmpty } from './lib/seedStorage';

if (typeof window !== 'undefined') seedIfEmpty();

type CurrentTab = 'pruefung' | 'verlauf';
type DetailSubTab = 'eval' | 'errors';
const CRITERIA: GradeCriterion[] = ['aufgabengerechtheit', 'fluessigkeit', 'repertoire', 'grammatische_richtigkeit', 'aussprache'];
const GRADE_COLOR: Record<Grade, string> = { A: '#22c55e', B: '#60a5fa', C: '#f59e0b', D: '#ef4444' };

export default function TELCModule() {
  const [view, setView] = useState<'exam' | 'admin'>('exam');
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [currentTab, setCurrentTab] = useState<CurrentTab>('pruefung');
  const [detailSession, setDetailSession] = useState<TELCSession | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<DetailSubTab>('eval');

  const stt = useSTT();
  const ai = useAIPartner();
  const session = useTELCSession();

  const [currentTopic, setCurrentTopic] = useState<PraesentationTopic | null>(null);
  const [currentZitat, setCurrentZitat] = useState<Zitat | null>(null);
  const [transcripts, setTranscripts] = useState({
    teil_1a: '',
    teil_1b_answers: '',
    teil_1b_questions: '',
    teil_2_turns: [] as DiscussionTurn[],
  });
  const [aiPartnerResponse, setAiPartnerResponse] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<ReturnType<typeof buildEvaluation> | null>(null);
  const [languageErrors, setLanguageErrors] = useState<LanguageErrors | null>(null);
  const [partnerMode, setPartnerMode] = useState<'ai' | 'human' | null>(null);

  const resetExam = useCallback(() => {
    setPhase(PHASES.IDLE);
    setCurrentTopic(null);
    setCurrentZitat(null);
    setTranscripts({ teil_1a: '', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] });
    setPartnerMode(null);
    setAiPartnerResponse(null);
    setEvaluation(null);
    setLanguageErrors(null);
    session.clearCurrent();
    stt.reset();
    ai.reset();
  }, [stt, ai, session]);

  const handleStart = useCallback((topic: PraesentationTopic, zitat: Zitat) => {
    setCurrentTopic(topic);
    setCurrentZitat(zitat);
    session.createSession(topic, zitat);
    setPhase(PHASES.PREP);
  }, [session]);

  const handleReady = useCallback(() => {
    setPhase(PHASES.TEIL_1A_CANDIDATE);
  }, []);

  const handleTeil1ATranscript = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1a: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1a: text } } as never);
    stt.reset();
    setPhase(PHASES.PARTNER_MODE_SELECT);
  }, [transcripts, session, stt]);

  const handleSelectPartnerMode = useCallback((mode: 'ai' | 'human') => {
    stt.reset();
    setPartnerMode(mode);
    setPhase(mode === 'ai' ? PHASES.TEIL_1B_AI_SUMMARIZES : PHASES.PARTNER_1B_SUMMARIZES);
  }, [stt]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1B_AI_SUMMARIZES && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.summarizeAndAsk(currentTopic.title, transcripts.teil_1a).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
  }, [phase, aiPartnerResponse, ai, currentTopic, transcripts.teil_1a]);

  const handleTeil1BAnswers = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_answers: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_answers: text } } as never);
    setAiPartnerResponse(null);
    stt.reset();
    setPhase(partnerMode === 'human' ? PHASES.PARTNER_1A_PRESENTS : PHASES.TEIL_1A_AI_PRESENTS);
  }, [transcripts, session, partnerMode, stt]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1A_AI_PRESENTS && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.presentOnTopic(currentTopic.title, currentTopic.prompt, transcripts.teil_1a).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
  }, [phase, aiPartnerResponse, ai, currentTopic, transcripts.teil_1a]);

  const handleTeil1BQuestions = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_questions: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_questions: text } } as never);
    setAiPartnerResponse(null);
    stt.reset();
    setPhase(partnerMode === 'human' ? PHASES.PARTNER_1B_ANSWERS : PHASES.TEIL_1B_AI_ANSWERS);
  }, [transcripts, session, partnerMode, stt]);

  const handlePartner1BSummarizes = useCallback((_text: string) => {
    stt.reset();
    setPhase(PHASES.TEIL_1B_CANDIDATE_ANSWERS);
  }, [stt]);

  const handlePartner1APresents = useCallback((_text: string) => {
    stt.reset();
    setPhase(PHASES.TEIL_1B_CANDIDATE_QUESTIONS);
  }, [stt]);

  const handlePartner1BAnswers = useCallback((_text: string) => {
    stt.reset();
    setPhase(PHASES.TEIL_2_DISKUSSION);
  }, [stt]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1B_AI_ANSWERS && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.answerCandidateQuestions(currentTopic.title, transcripts.teil_1b_questions).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
  }, [phase, aiPartnerResponse, ai, currentTopic, transcripts.teil_1b_questions]);

  const handleTeil2Turns = useCallback((turns: DiscussionTurn[]) => {
    setTranscripts(prev => ({ ...prev, teil_2_turns: turns }));
    session.saveSession({ transcripts: { ...transcripts, teil_2_turns: turns } } as never);
    setPhase(PHASES.EVALUATION);
  }, [transcripts, session]);

  useEffect(() => {
    if (phase === PHASES.EVALUATION && !evaluation && !ai.loading && currentTopic && currentZitat) {
      ai.evaluateExam(currentTopic, currentZitat, transcripts).then(raw => {
        if (raw) {
          const evalResult = buildEvaluation(raw as never);
          setEvaluation(evalResult);
          session.saveSession({ ai_evaluation: evalResult } as never);
        }
      });
    }
  }, [phase, currentTopic, currentZitat, transcripts, ai, evaluation, session]);

  const handleEvalContinue = useCallback(() => {
    setPhase(PHASES.LANGUAGE_FEEDBACK);
  }, []);

  useEffect(() => {
    if (phase === PHASES.LANGUAGE_FEEDBACK && languageErrors === null && !ai.loading) {
      ai.correctLanguage(transcripts).then(errors => {
        if (errors !== null) {
          setLanguageErrors(errors);
          session.saveSession({ language_errors: errors } as never);
        }
      });
    }
  }, [phase, languageErrors, ai, transcripts, session]);

  const handleLanguageFeedbackContinue = useCallback(() => {
    setPhase(PHASES.SELF_ASSESSMENT);
  }, []);

  const handleSelfAssess = useCallback((userAssessment: UserAssessment) => {
    session.saveSession({ user_assessment: userAssessment } as never);
    if (session.currentSession) {
      session.addToHistory({ ...session.currentSession, user_assessment: userAssessment });
    }
    setPhase(PHASES.RESULTS);
  }, [session]);

  const handleTryAgain = useCallback(() => {
    resetExam();
    setCurrentTab('pruefung');
  }, [resetExam]);

  const handleViewHistory = useCallback(() => {
    session.getHistory();
    resetExam();
    setCurrentTab('verlauf');
    setDetailSession(null);
  }, [session, resetExam]);

  const handleContinueToAnswers = useCallback(() => {
    stt.reset();
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_CANDIDATE_ANSWERS);
  }, [stt]);

  const handleContinueToQuestions = useCallback(() => {
    stt.reset();
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_CANDIDATE_QUESTIONS);
  }, [stt]);

  const handleContinueToDiscussion = useCallback(() => {
    stt.reset();
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_2_DISKUSSION);
  }, [stt]);

  if (view === 'admin') {
    return <TELCAdmin onBack={() => setView('exam')} />;
  }

  const renderTabs = () => (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 16,
      padding: 4, borderRadius: 10,
      background: 'rgba(100,116,139,0.08)',
      border: '1px solid rgba(100,116,139,0.15)',
    }}>
      <button
        onClick={() => { setCurrentTab('pruefung'); setDetailSession(null); }}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
          background: currentTab === 'pruefung' ? 'rgba(59,130,246,0.18)' : 'transparent',
          color: currentTab === 'pruefung' ? '#60a5fa' : '#94a3b8',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Prüfung
      </button>
      <button
        onClick={() => { session.getHistory(); setCurrentTab('verlauf'); setDetailSession(null); }}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
          background: currentTab === 'verlauf' ? 'rgba(59,130,246,0.18)' : 'transparent',
          color: currentTab === 'verlauf' ? '#60a5fa' : '#94a3b8',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Verlauf {session.history.length > 0 && <span style={{
          fontSize: 11, padding: '1px 7px', borderRadius: 10, marginLeft: 4,
          background: 'rgba(100,116,139,0.2)', color: '#cbd5e1',
        }}>{session.history.length}</span>}
      </button>
    </div>
  );

  const renderVerlauf = () => {
    if (detailSession) return renderDetailPage(detailSession);
    if (session.history.length === 0) {
      return (
        <div style={{ padding: '0 4px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: '#f1f5f9' }}>
            Prüfungsverlauf
          </h2>
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
            Keine abgeschlossenen Prüfungen
          </p>
        </div>
      );
    }
    return (
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: '#f1f5f9' }}>
          Prüfungsverlauf
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {session.history.map(s => (
            <div key={s.id} style={{
              padding: 14, borderRadius: 10,
              border: '1px solid rgba(100,116,139,0.2)', background: 'rgba(100,116,139,0.04)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>
                {s.topic?.title || 'Unbekannt'}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
                {new Date(s.timestamp).toLocaleDateString('de-DE', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </div>
              {s.ai_evaluation && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.ai_evaluation.passed ? '#22c55e' : '#ef4444' }}>
                    {s.ai_evaluation.total_points}/40
                  </span>
                  <span style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 6,
                    background: s.ai_evaluation.passed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    color: s.ai_evaluation.passed ? '#22c55e' : '#ef4444',
                    fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    {s.ai_evaluation.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setDetailSession(s); setDetailSubTab('eval'); }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid rgba(59,130,246,0.3)',
                    background: 'rgba(59,130,246,0.08)', color: '#60a5fa',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Details anzeigen
                </button>
                <button
                  onClick={() => session.deleteFromHistory(s.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 8,
                    border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetailPage = (s: TELCSession) => (
    <div style={{ padding: '0 4px' }}>
      <button
        onClick={() => setDetailSession(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: '#94a3b8',
          fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 14,
        }}
      >
        <ArrowLeft size={16} /> Zurück zum Verlauf
      </button>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          {s.topic?.title || 'Unbekannt'}
        </h2>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
          {new Date(s.timestamp).toLocaleDateString('de-DE', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 16,
        padding: 4, borderRadius: 10,
        background: 'rgba(100,116,139,0.08)',
        border: '1px solid rgba(100,116,139,0.15)',
      }}>
        <button
          onClick={() => setDetailSubTab('eval')}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
            background: detailSubTab === 'eval' ? 'rgba(59,130,246,0.18)' : 'transparent',
            color: detailSubTab === 'eval' ? '#60a5fa' : '#94a3b8',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Bewertung
        </button>
        <button
          onClick={() => setDetailSubTab('errors')}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
            background: detailSubTab === 'errors' ? 'rgba(59,130,246,0.18)' : 'transparent',
            color: detailSubTab === 'errors' ? '#60a5fa' : '#94a3b8',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Fehleranalyse
        </button>
      </div>

      {detailSubTab === 'eval' ? renderEvalDetail(s) : renderErrorsDetail(s)}
    </div>
  );

  const renderEvalDetail = (s: TELCSession) => {
    const ev = s.ai_evaluation;
    if (!ev) {
      return (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
          Keine Bewertung verfügbar
        </p>
      );
    }
    return (
      <div>
        <div style={{
          background: ev.passed ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${ev.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
          borderRadius: 10, padding: 14, marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>Gesamtpunktzahl</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: ev.passed ? '#22c55e' : '#ef4444' }}>
              {ev.total_points}<span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}> / 40</span>
            </div>
          </div>
          <span style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 8,
            background: ev.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
            color: ev.passed ? '#22c55e' : '#ef4444', fontWeight: 700, letterSpacing: 0.5,
          }}>
            {ev.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
          </span>
        </div>

        {ev.per_part && (
          <>
            {renderPartCard('Teil 1A — Präsentation', ev.per_part.teil_1a)}
            {renderPartCard('Teil 1B — Fragen & Antworten', ev.per_part.teil_1b)}
            {renderTeil2DetailCard(ev.per_part.teil_2)}
          </>
        )}

        <div style={{
          background: 'rgba(100,116,139,0.05)', borderRadius: 10,
          border: '1px solid rgba(100,116,139,0.15)', padding: 14, marginBottom: 16,
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 10px', color: '#f1f5f9' }}>
            TELC-Hauptkriterien
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {CRITERIA.map(key => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 10px', borderRadius: 6,
                background: 'rgba(0,0,0,0.15)',
              }}>
                <span style={{ fontSize: 12, color: '#cbd5e1' }}>{CRITERIA_LABELS[key]}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                  background: `${GRADE_COLOR[ev[key]]}22`, color: GRADE_COLOR[ev[key]],
                }}>
                  {ev[key]} — {GRADE_LABELS[ev[key]]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {ev.feedback?.overall_comment && (
          <div style={{
            background: 'rgba(59,130,246,0.05)', borderRadius: 10,
            border: '1px solid rgba(59,130,246,0.15)', padding: 14, marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 6px', color: '#60a5fa' }}>
              Gesamtkommentar
            </h3>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#f1f5f9' }}>
              {ev.feedback.overall_comment}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTeil2DetailCard = (part: Teil2DetailedEvaluation) => {
    const axes: Array<{ key: keyof Teil2DetailedEvaluation; label: string; color: string }> = [
      { key: 'inhalt', label: 'Inhaltliche Tiefe', color: '#22c55e' },
      { key: 'argumentation', label: 'Argumentation', color: '#60a5fa' },
      { key: 'reaktion', label: 'Reaktion auf Partner', color: '#a78bfa' },
      { key: 'sprache', label: 'Sprachliche Qualität', color: '#f59e0b' },
      { key: 'interaktion', label: 'Interaktion', color: '#ec4899' },
    ];
    const hasDetailed = axes.some(a => typeof part[a.key] === 'string' && (part[a.key] as string).trim().length > 0);
    if (!hasDetailed && (part.content_notes?.length || part.language_notes?.length)) {
      return renderPartCard('Teil 2 — Diskussion', {
        grade: part.grade,
        content_notes: part.content_notes || [],
        language_notes: part.language_notes || [],
      });
    }
    return (
      <div style={{
        background: 'rgba(100,116,139,0.05)', borderRadius: 10,
        border: '1px solid rgba(100,116,139,0.15)', padding: 14, marginBottom: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
            Teil 2 — Diskussion
          </h3>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
            background: `${GRADE_COLOR[part.grade]}22`, color: GRADE_COLOR[part.grade],
          }}>
            {part.grade} — {GRADE_LABELS[part.grade]}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {axes.map(a => {
            const text = (part[a.key] as string) || '';
            if (!text.trim()) return null;
            return (
              <div key={a.key} style={{
                padding: 10, borderRadius: 8,
                background: `${a.color}0d`,
                border: `1px solid ${a.color}33`,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, marginBottom: 4,
                  color: a.color, textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {a.label}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
                  {text}
                </div>
              </div>
            );
          })}
        </div>
        {part.gesamtkommentar && part.gesamtkommentar.trim() && (
          <div style={{
            marginTop: 10, padding: 10, borderRadius: 8,
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 4,
              color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Gesamtkommentar
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#f1f5f9' }}>
              {part.gesamtkommentar}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPartCard = (title: string, part: PartEvaluation) => (
    <div style={{
      background: 'rgba(100,116,139,0.05)', borderRadius: 10,
      border: '1px solid rgba(100,116,139,0.15)', padding: 14, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>{title}</h3>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
          background: `${GRADE_COLOR[part.grade]}22`, color: GRADE_COLOR[part.grade],
        }}>
          {part.grade} — {GRADE_LABELS[part.grade]}
        </span>
      </div>
      {part.content_notes.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Inhalt
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
            {part.content_notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
      {part.language_notes.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Sprache
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, lineHeight: 1.6, color: '#cbd5e1' }}>
            {part.language_notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  const renderErrorsDetail = (s: TELCSession) => {
    const errs = s.language_errors;
    if (!errs && s.language_feedback) {
      return (
        <pre style={{
          padding: 12, borderRadius: 10,
          background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(100,116,139,0.2)',
          color: '#cbd5e1', fontSize: 12, lineHeight: 1.6,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: 'inherit', margin: 0,
        }}>
          {s.language_feedback}
        </pre>
      );
    }
    if (!errs) {
      return (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
          Keine Fehleranalyse verfügbar
        </p>
      );
    }
    const total = errs.grammatik.length + errs.wortschatz.length + errs.satzstruktur.length;
    if (total === 0) {
      return (
        <div style={{
          padding: 16, borderRadius: 10,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          color: '#86efac', fontSize: 14, textAlign: 'center',
        }}>
          ✅ Keine sprachlichen Fehler gefunden — sehr gut!
        </div>
      );
    }
    return (
      <div>
        {errs.haeufigster_fehler && (
          <div style={{
            padding: 12, borderRadius: 10, marginBottom: 16,
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
            color: '#fdba74', fontSize: 13, fontWeight: 500,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
            <span><strong style={{ color: '#fed7aa' }}>Häufigster Fehler:</strong> {errs.haeufigster_fehler}</span>
          </div>
        )}
        {errs.grammatik.length > 0 && (
          <ErrorSection title="Grammatikfehler" count={errs.grammatik.length} color="#ef4444">
            {errs.grammatik.map((e, i) => (
              <div key={i} style={errCardStyle}>
                <ErrRow icon="❌" text={e.falsch} color="#fca5a5" />
                <ErrRow icon="✅" text={e.richtig} color="#86efac" />
                {e.regel && <ErrRow icon="📚" text={e.regel} color="#60a5fa" bold small />}
                {e.erklaerung && <ErrRow icon="💡" text={e.erklaerung} color="#fcd34d" small />}
                {e.beispiel && <ErrRow icon="📝" text={e.beispiel} color="#cbd5e1" small italic />}
              </div>
            ))}
          </ErrorSection>
        )}
        {errs.wortschatz.length > 0 && (
          <ErrorSection title="Wortschatzfehler" count={errs.wortschatz.length} color="#f59e0b">
            {errs.wortschatz.map((e, i) => (
              <div key={i} style={errCardStyle}>
                <ErrRow icon="❌" text={e.falsch} color="#fca5a5" />
                <ErrRow icon="✅" text={e.richtig} color="#86efac" />
                {e.unterschied && <ErrRow icon="💡" text={e.unterschied} color="#fcd34d" small />}
              </div>
            ))}
          </ErrorSection>
        )}
        {errs.satzstruktur.length > 0 && (
          <ErrorSection title="Satzstrukturfehler" count={errs.satzstruktur.length} color="#8b5cf6">
            {errs.satzstruktur.map((e, i) => (
              <div key={i} style={errCardStyle}>
                <ErrRow icon="❌" text={e.falsch} color="#fca5a5" />
                <ErrRow icon="✅" text={e.richtig} color="#86efac" />
                {e.regel && <ErrRow icon="📚" text={e.regel} color="#60a5fa" bold small />}
              </div>
            ))}
          </ErrorSection>
        )}
      </div>
    );
  };

  const renderPhase = () => {
    switch (phase) {
      case PHASES.IDLE:
        return <IdlePhase onStart={handleStart} onNavigateToAdmin={() => setView('admin')} />;
      case PHASES.PREP:
        return <PrepPhase topic={currentTopic!} zitat={currentZitat!} onReady={handleReady} />;
      case PHASES.TEIL_1A_CANDIDATE:
        return (
          <Teil1APhase
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            mediaError={stt.mediaError} error={stt.error} debugInfo={stt.debugInfo}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript} onTranscriptReady={handleTeil1ATranscript}
          />
        );
      case PHASES.PARTNER_MODE_SELECT:
        return (
          <div style={{ padding: '0 4px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', textAlign: 'center', color: '#f1f5f9' }}>
              Wer ist Ihr Partner?
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', textAlign: 'center' }}>
              Diese Auswahl gilt für Teil 1B und die Diskussion
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => handleSelectPartnerMode('ai')} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12,
                border: '1px solid rgba(59,130,246,0.2)',
                background: 'rgba(59,130,246,0.06)', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                }}>
                  <MessageCircle size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                    KI-Partner (Leila)
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                    Leila übernimmt Teil 1B und die Diskussion
                  </div>
                </div>
              </button>
              <button onClick={() => handleSelectPartnerMode('human')} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.2)',
                background: 'rgba(34,197,94,0.06)', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                }}>
                  <Users size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                    Partner (mit Freund)
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                    Ihr Freund übernimmt Teil 1B und die Diskussion
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
      case PHASES.PARTNER_1B_SUMMARIZES:
        return (
          <RecordPhase
            title="Teil 1B — Person B spricht"
            subtitle="Person B fasst Ihre Präsentation zusammen und stellt eine Frage (1:30)"
            duration={DURATION.TEIL_1B_AI_SUMMARIZE}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            error={stt.error}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript}
            onTranscriptReady={handlePartner1BSummarizes}
          />
        );
      case PHASES.PARTNER_1A_PRESENTS:
        return (
          <RecordPhase
            title="Teil 1A — Person B spricht"
            subtitle="Person B hält ihre eigene Präsentation (3 Minuten)"
            duration={DURATION.TEIL_1A}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            error={stt.error}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript}
            onTranscriptReady={handlePartner1APresents}
          />
        );
      case PHASES.PARTNER_1B_ANSWERS:
        return (
          <RecordPhase
            title="Teil 1B — Person B antwortet"
            subtitle="Person B beantwortet Ihre Fragen (1 Minute)"
            duration={DURATION.TEIL_1B_QUESTIONS}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            error={stt.error}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript}
            onTranscriptReady={handlePartner1BAnswers}
          />
        );
      case PHASES.TEIL_1B_AI_SUMMARIZES:
        return (
          <ListenPhase
            title="Teil 1B — Zusammenfassung"
            subtitle="Hören Sie die Zusammenfassung Ihres Partners"
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onContinue={handleContinueToAnswers}
            continueLabel="Weiter — Fragen beantworten"
          />
        );
      case PHASES.TEIL_1B_CANDIDATE_ANSWERS:
        return (
          <RecordPhase
            title="Teil 1B — Fragen beantworten"
            subtitle="Beantworten Sie die Fragen (1 Minute)"
            duration={DURATION.TEIL_1B_ANSWERS}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            error={stt.error}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript}
            onTranscriptReady={handleTeil1BAnswers}
          />
        );
      case PHASES.TEIL_1A_AI_PRESENTS:
        return (
          <ListenPhase
            title="Teil 1A — Präsentation Ihres Partners"
            subtitle="Hören Sie die Präsentation Ihres Partners"
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onContinue={handleContinueToQuestions}
            continueLabel="Weiter — Zusammenfassung geben"
          />
        );
      case PHASES.TEIL_1B_CANDIDATE_QUESTIONS:
        return (
          <RecordPhase
            title="Teil 1B — Zusammenfassung & Fragen"
            subtitle="Fassen Sie die Präsentation zusammen und stellen Sie 1-2 Fragen (1 Minute)"
            duration={DURATION.TEIL_1B_QUESTIONS}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            error={stt.error}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript}
            onTranscriptReady={handleTeil1BQuestions}
          />
        );
      case PHASES.TEIL_1B_AI_ANSWERS:
        return (
          <ListenPhase
            title="Antwort Ihres Partners"
            subtitle="Hören Sie die Antworten auf Ihre Fragen"
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onContinue={handleContinueToDiscussion}
            continueLabel="Weiter zur Diskussion"
          />
        );
      case PHASES.TEIL_2_DISKUSSION:
        if (partnerMode === 'human') {
          return (
            <PartnerDiscussionPhase
              zitat={currentZitat!}
              onTurnsReady={handleTeil2Turns}
            />
          );
        }
        return (
          <Teil2Phase
            zitat={currentZitat!}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            onTurnsReady={handleTeil2Turns}
          />
        );
      case PHASES.EVALUATION:
        return <EvaluationPhase evaluation={evaluation} onContinue={handleEvalContinue} />;
      case PHASES.LANGUAGE_FEEDBACK:
        return (
          <LanguageFeedbackPhase
            errors={languageErrors}
            loading={ai.loading}
            error={ai.error}
            onContinue={handleLanguageFeedbackContinue}
          />
        );
      case PHASES.SELF_ASSESSMENT:
        return <SelfAssessPhase onComplete={handleSelfAssess} />;
      case PHASES.RESULTS:
        return (
          <ResultsPhase
            session={session.currentSession} onTryAgain={handleTryAgain} onViewHistory={handleViewHistory}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh' }}>
      {renderTabs()}
      {currentTab === 'pruefung' ? renderPhase() : renderVerlauf()}
      <style>{`
        textarea:focus { outline: none; border-color: rgba(59,130,246,0.4); }
      `}</style>
    </div>
  );
}

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
