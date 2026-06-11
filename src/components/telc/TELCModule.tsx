import { useState, useEffect, useCallback } from 'react';
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
import Teil1BAIPhase from './phases/Teil1BAIPhase';
import Teil1AAIPhase from './phases/Teil1AAIPhase';
import Teil1BCandidateListensPhase from './phases/Teil1BCandidateListensPhase';
import Teil2Phase from './phases/Teil2Phase';
import EvaluationPhase from './phases/EvaluationPhase';
import SelfAssessPhase from './phases/SelfAssessPhase';
import ResultsPhase from './phases/ResultsPhase';
import TELCAdmin from './admin/TELCAdmin';

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
  const [historyView, setHistoryView] = useState(false);

  const resetExam = useCallback(() => {
    setPhase(PHASES.IDLE);
    setCurrentTopic(null);
    setCurrentZitat(null);
    setTranscripts({ teil_1a: '', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] });
    setAiPartnerResponse(null);
    setEvaluation(null);
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
    setPhase(PHASES.TEIL_1B_AI_LISTENS);
  }, [transcripts, session]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1B_AI_LISTENS && transcripts.teil_1a && !aiPartnerResponse && !ai.loading) {
      ai.callPartner(
        'TEIL_1B',
        `${currentTopic?.title}: ${currentTopic?.prompt}`,
        transcripts.teil_1a,
      ).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, transcripts.teil_1a, currentTopic, ai]);

  const handleAiResponseDone = useCallback(() => {
  }, []);

  const handleTeil1BAnswers = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_answers: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_answers: text } } as never);
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1A_AI_PRESENTS);
  }, [transcripts, session]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1A_AI_PRESENTS && !aiPartnerResponse && !ai.loading) {
      ai.callPartner(
        'TEIL_1A',
        `${currentTopic?.title}: ${currentTopic?.prompt}`,
        `The candidate presented on: ${transcripts.teil_1a?.slice(0, 200)}...`,
      ).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, currentTopic, transcripts.teil_1a, ai]);

  const handleAiPresentationDone = useCallback(() => {
  }, []);

  const handleTeil1BQuestions = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_questions: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_questions: text } } as never);
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_CANDIDATE_LISTENS);
  }, [transcripts, session]);

  useEffect(() => {
    if (phase === PHASES.TEIL_1B_CANDIDATE_LISTENS && transcripts.teil_1b_questions && !aiPartnerResponse && !ai.loading) {
      ai.callPartner(
        'TEIL_1B',
        `The candidate asked questions about the AI presentation. Topic: ${currentTopic?.title}`,
        transcripts.teil_1b_questions,
      ).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, transcripts.teil_1b_questions, currentTopic, ai]);

  const handleTeil1BDone = useCallback(() => {
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_2_DISKUSSION);
  }, []);

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
    setHistoryView(true);
    resetExam();
  }, [session, resetExam]);

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
                      {s.ai_evaluation.total_points}/48
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
                <button
                  onClick={() => session.deleteFromHistory(s.id)}
                  style={{
                    marginTop: 8, padding: '6px 12px', borderRadius: 6,
                    border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  Löschen
                </button>
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
            transcript={stt.transcript} fallbackMode={stt.fallbackMode} mediaError={stt.mediaError}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript} onTranscriptReady={handleTeil1ATranscript}
          />
        );
      case PHASES.TEIL_1B_AI_LISTENS:
        return (
          <Teil1BAIPhase
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onAiResponseDone={handleAiResponseDone}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            onAnswersReady={handleTeil1BAnswers}
          />
        );
      case PHASES.TEIL_1A_AI_PRESENTS:
        return (
          <Teil1AAIPhase
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onAiResponseDone={handleAiPresentationDone}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            onQuestionsReady={handleTeil1BQuestions}
          />
        );
      case PHASES.TEIL_1B_CANDIDATE_LISTENS:
        return (
          <Teil1BCandidateListensPhase
            aiResponse={aiPartnerResponse} aiLoading={ai.loading} aiError={ai.error}
            onComplete={handleTeil1BDone}
          />
        );
      case PHASES.TEIL_2_DISKUSSION:
        return (
          <Teil2Phase
            zitat={currentZitat!} callPartner={ai.callPartner}
            recording={stt.recording} processing={stt.processing}
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            onTurnsReady={handleTeil2Turns}
          />
        );
      case PHASES.EVALUATION:
        return <EvaluationPhase evaluation={evaluation} onContinue={handleEvalContinue} />;
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
