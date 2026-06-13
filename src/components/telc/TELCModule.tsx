import { useState, useEffect, useCallback } from 'react';
import { Users, MessageCircle } from 'lucide-react';
import { PHASES } from './types';
import type { DiscussionTurn, UserAssessment } from './types';
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

export default function TELCModule() {
  const [view, setView] = useState<'exam' | 'admin'>('exam');
  const [phase, setPhase] = useState(PHASES.IDLE);

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
  const [languageFeedback, setLanguageFeedback] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState(false);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(new Set());
  const [partnerMode, setPartnerMode] = useState<'ai' | 'human' | null>(null);

  const resetExam = useCallback(() => {
    setPhase(PHASES.IDLE);
    setCurrentTopic(null);
    setCurrentZitat(null);
    setTranscripts({ teil_1a: '', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] });
    setPartnerMode(null);
    setAiPartnerResponse(null);
    setEvaluation(null);
    setLanguageFeedback(null);
    setHistoryView(false);
    stt.reset();
    ai.reset();
  }, [stt, ai]);

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

  // TEIL_1B_AI_SUMMARIZES — Leila summarizes + asks questions
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

  // TEIL_1A_AI_PRESENTS — Leila presents on the topic from different angle
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

  // TEIL_1B_AI_ANSWERS — Leila briefly answers candidate's questions
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
    if (phase === PHASES.LANGUAGE_FEEDBACK && languageFeedback === null && !ai.loading) {
      ai.correctLanguage(transcripts).then(text => {
        if (text !== null) {
          setLanguageFeedback(text);
          session.saveSession({ language_feedback: text } as never);
        }
      });
    }
  }, [phase, languageFeedback, ai, transcripts, session]);

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
  }, [resetExam]);

  const handleViewHistory = useCallback(() => {
    session.getHistory();
    resetExam();
    setHistoryView(true);
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

  if (historyView) {
    return (
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', textAlign: 'center', color: '#f1f5f9' }}>
          Prüfungsverlauf
        </h2>
        {session.history.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
            Keine abgeschlossenen Prüfungen
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {session.history.map(s => (
              <div key={s.id} style={{
                padding: 14, borderRadius: 10,
                border: '1px solid rgba(100,116,139,0.2)', background: 'rgba(100,116,139,0.04)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>
                  {s.topic?.title || 'Unbekannt'}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                  {new Date(s.timestamp).toLocaleDateString('de-DE')}
                </div>
                {s.ai_evaluation && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: s.ai_evaluation.passed ? '#22c55e' : '#ef4444' }}>
                      {s.ai_evaluation.total_points}/40
                    </span>
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 4,
                      background: s.ai_evaluation.passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: s.ai_evaluation.passed ? '#22c55e' : '#ef4444',
                    }}>
                      {s.ai_evaluation.passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {s.language_feedback && (
                    <button
                      onClick={() => setExpandedFeedbackIds(prev => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        return next;
                      })}
                      style={{
                        padding: '6px 12px', borderRadius: 6,
                        border: '1px solid rgba(59,130,246,0.3)',
                        background: 'rgba(59,130,246,0.08)', color: '#60a5fa',
                        fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      {expandedFeedbackIds.has(s.id) ? 'Korrekturen ausblenden' : 'Korrekturen anzeigen'}
                    </button>
                  )}
                  <button
                    onClick={() => session.deleteFromHistory(s.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 6,
                      border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    Löschen
                  </button>
                </div>
                {s.language_feedback && expandedFeedbackIds.has(s.id) && (
                  <pre style={{
                    marginTop: 8, padding: 10, borderRadius: 8,
                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(100,116,139,0.2)',
                    color: '#cbd5e1', fontSize: 12, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontFamily: 'inherit', margin: '8px 0 0',
                  }}>
                    {s.language_feedback}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setHistoryView(false)}
          style={{
            width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 10,
            border: 'none', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Neue Prüfung
        </button>
      </div>
    );
  }

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
            corrections={languageFeedback}
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
      {renderPhase()}
      <style>{`
        textarea:focus { outline: none; border-color: rgba(59,130,246,0.4); }
      `}</style>
    </div>
  );
}
