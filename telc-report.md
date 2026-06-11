# TELC C1 Mündlicher Ausdruck — Full Project Report

## Overview

Isolated exam simulator at `/telc` route. Candidate presents (Teil 1A), discusses with AI partner (Teil 1B), debates a Zitat (Teil 2), then receives evaluation. CMS-administered content in localStorage. STT via Groq Whisper, AI via OpenRouter/Claude, TTS via SpeechSynthesis.

## Architecture

```
src/components/telc/
├── admin/
│   └── TELCAdmin.tsx          # CMS: CRUD topic pairs + Zitate → localStorage
├── components/
│   ├── GradeCard.tsx           # Single criterion grade display (A/B/C/D + points)
│   ├── RecordButton.tsx        # Mic/Stop/Loading/Done states
│   ├── ScoreBar.tsx            # Total score bar with pass threshold marker
│   ├── Timer.tsx               # MM:SS countdown with color changes
│   ├── TranscriptViewer.tsx    # Collapsible transcript display
│   └── TTSSpeaker.tsx          # "Anhören"/"Stop" button + speaking wave animation
├── phases/
│   ├── EvaluationPhase.tsx     # Shows AI evaluation with grade cards + score bar
│   ├── IdlePhase.tsx           # Topic pair selection + Zitat selection + admin button
│   ├── ListenPhase.tsx         # Generic: AI response via TTS + Continue button
│   ├── PrepPhase.tsx           # 20min countdown, topic details, tips
│   ├── RecordPhase.tsx         # Generic: timer + record button + fallback textarea
│   ├── ResultsPhase.tsx        # Final results: scores, feedback, transcripts
│   ├── SelfAssessPhase.tsx     # User self-assessment: impression + optional grades
│   ├── Teil1APhase.tsx         # Candidate's 3min presentation recording
│   └── Teil2Phase.tsx          # 6min discussion with 4 fixed questions + turn history
│── TELCModule.tsx             # Phase router, STT/AI/session hooks, flow logic
│── scoring.ts                 # 5 criteria → points, 40 max, 24 pass
│── types.ts                   # All types, constants, phase enum, labels
│── useAIPartner.ts            # callAI, callPartner, evaluateExam → /api/anthropic
│── useSTT.ts                  # MediaRecorder → /api/transcribe → Groq Whisper
│── useTELCSession.ts          # localStorage persistence for sessions + history
│── useTTS.ts                  # Sentence-chunked TTS with async voice loading
api/
├── anthropic.mjs              # Vercel Edge → OpenRouter (anthropic/claude-sonnet-4)
└── transcribe.mjs             # Vercel Edge → Groq (whisper-large-v3, language=de)
```

## File by File — Complete Content

### types.ts

```typescript
export type Grade = 'A' | 'B' | 'C' | 'D';

export type GradeCriterion =
  | 'aufgabengerechtheit'
  | 'fluessigkeit'
  | 'repertoire'
  | 'grammatische_richtigkeit'
  | 'aussprache';

export interface TopicPair {
  id: string;
  variante: string;
  topic_a: {
    title: string;
    prompt: string;
    tips?: string[];
  };
  topic_b: {
    title: string;
    prompt: string;
    tips?: string[];
  };
}

export interface PraesentationTopic {
  id: string;
  title: string;
  prompt: string;
  tips: string[];
}

export interface Zitat {
  id: string;
  text: string;
  author: string;
  discussion_angle: string;
}

export interface EvalFeedback {
  strengths: string[];
  improvements: string[];
  overall_comment: string;
}

export interface DiscussionTurn {
  role: 'candidate' | 'ai';
  text: string;
}

export interface ExamTranscripts {
  teil_1a: string;
  teil_1b_answers: string;
  teil_1b_questions: string;
  teil_2_turns: DiscussionTurn[];
}

export interface AIEvaluation {
  aufgabengerechtheit: Grade;
  fluessigkeit: Grade;
  repertoire: Grade;
  grammatische_richtigkeit: Grade;
  aussprache: Grade;
  feedback: EvalFeedback;
  note: string;
  total_points: number;
  passed: boolean;
}

export interface UserAssessment {
  overall_impression: 'agree' | 'too_strict' | 'too_generous';
  self_grades?: Partial<Record<GradeCriterion, Grade>>;
  free_text?: string;
}

export interface TELCSession {
  id: string;
  timestamp: number;
  topic: PraesentationTopic;
  zitat: Zitat;
  transcripts: ExamTranscripts;
  ai_evaluation: AIEvaluation | null;
  user_assessment?: UserAssessment;
}

export type Phase =
  | 'IDLE'
  | 'PREP'
  | 'TEIL_1A_CANDIDATE'
  | 'TEIL_1B_AI_SUMMARIZES'
  | 'TEIL_1B_CANDIDATE_ANSWERS'
  | 'TEIL_1A_AI_PRESENTS'
  | 'TEIL_1B_CANDIDATE_QUESTIONS'
  | 'TEIL_1B_AI_ANSWERS'
  | 'TEIL_2_DISKUSSION'
  | 'EVALUATION'
  | 'SELF_ASSESSMENT'
  | 'RESULTS';

export const PHASES: Record<Phase, Phase> = {
  IDLE: 'IDLE',
  PREP: 'PREP',
  TEIL_1A_CANDIDATE: 'TEIL_1A_CANDIDATE',
  TEIL_1B_AI_SUMMARIZES: 'TEIL_1B_AI_SUMMARIZES',
  TEIL_1B_CANDIDATE_ANSWERS: 'TEIL_1B_CANDIDATE_ANSWERS',
  TEIL_1A_AI_PRESENTS: 'TEIL_1A_AI_PRESENTS',
  TEIL_1B_CANDIDATE_QUESTIONS: 'TEIL_1B_CANDIDATE_QUESTIONS',
  TEIL_1B_AI_ANSWERS: 'TEIL_1B_AI_ANSWERS',
  TEIL_2_DISKUSSION: 'TEIL_2_DISKUSSION',
  EVALUATION: 'EVALUATION',
  SELF_ASSESSMENT: 'SELF_ASSESSMENT',
  RESULTS: 'RESULTS',
};

export const GRADES: Grade[] = ['A', 'B', 'C', 'D'];

export const GRADE_LABELS: Record<Grade, string> = {
  A: 'Hervorragend',
  B: 'Gut',
  C: 'Ausreichend',
  D: 'Mangelhaft',
};

export const CRITERIA_LABELS: Record<GradeCriterion, string> = {
  aufgabengerechtheit: 'Aufgabengerechtheit',
  fluessigkeit: 'Flüssigkeit',
  repertoire: 'Repertoire',
  grammatische_richtigkeit: 'Grammatische Richtigkeit',
  aussprache: 'Aussprache und Intonation',
};

export const LOCAL_STORAGE_KEYS = {
  TOPIC_PAIRS: 'telc_topic_pairs',
  ZITATE: 'telc_zitate',
  CURRENT_SESSION: 'telc_session_current',
  HISTORY: 'telc_history',
} as const;

export const DURATION = {
  PREP: 20 * 60,
  TEIL_1A: 3 * 60,
  TEIL_1B_ANSWERS: 60,
  TEIL_1B_QUESTIONS: 60,
  TEIL_1B_AI_SUMMARIZE: 90,
  TEIL_1B_AI_ANSWERS: 30,
  TEIL_2: 6 * 60,
} as const;
```

**Key changes from old types:**
- `GradeCriterion` reduced from 7 to 5: removed `aufgabengerechtheit_1a`, `aufgabengerechtheit_1b`, `diskussionsfuehrung`
- `TopicPair` interface added (id, variante, topic_a: {title, prompt, tips}, topic_b: {title, prompt, tips})
- `LOCAL_STORAGE_KEYS.TOPIC_PAIRS` added → `'telc_topic_pairs'` (was `'telc_topics'`)
- Phase enum increased from 10 to 12: `TEIL_1B_AI_LISTENS` split into `TEIL_1B_AI_SUMMARIZES` + `TEIL_1B_CANDIDATE_ANSWERS`; `TEIL_1B_CANDIDATE_LISTENS` split into `TEIL_1B_CANDIDATE_QUESTIONS` + `TEIL_1B_AI_ANSWERS`
- `CRITERIA_LABELS` updated for new 5 keys
- `AIEvaluation` interface uses 5 criteria instead of 7 fields
- `DURATION.TEIL_1B_AI_SUMMARIZE` added (90s), `TEIL_1B_AI_ANSWERS` added (30s)

---

### scoring.ts

```typescript
import type { Grade, AIEvaluation, GradeCriterion } from './types';

const POINTS: Record<Grade, number> = {
  A: 8,
  B: 5,
  C: 2,
  D: 0,
};

export const TOTAL_MAX = 40;
export const PASS_THRESHOLD = 24;

export function gradeToPoints(grade: Grade, _criterion?: string): number {
  return POINTS[grade] ?? 0;
}

const ALL_CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];

export function calculateTotal(evaluation: Pick<AIEvaluation, GradeCriterion>): number {
  return ALL_CRITERIA.reduce((sum, key) => sum + gradeToPoints(evaluation[key] as Grade), 0);
}

export function hasPassed(totalPoints: number): boolean {
  return totalPoints >= PASS_THRESHOLD;
}

export function maxPointsFor(): number {
  return 8;
}

interface RawEval {
  aufgabengerechtheit?: Grade;
  fluessigkeit?: Grade;
  repertoire?: Grade;
  grammatische_richtigkeit?: Grade;
  aussprache?: Grade;
  feedback?: { strengths?: string[]; improvements?: string[]; overall_comment?: string };
  note?: string;
}

export function buildEvaluation(raw: RawEval): AIEvaluation {
  const evaluation: AIEvaluation = {
    aufgabengerechtheit: raw.aufgabengerechtheit || 'B',
    fluessigkeit: raw.fluessigkeit || 'B',
    repertoire: raw.repertoire || 'B',
    grammatische_richtigkeit: raw.grammatische_richtigkeit || 'B',
    aussprache: raw.aussprache || 'B',
    feedback: {
      strengths: raw.feedback?.strengths || [],
      improvements: raw.feedback?.improvements || [],
      overall_comment: raw.feedback?.overall_comment || '',
    },
    note: raw.note || '',
    total_points: 0,
    passed: false,
  };
  evaluation.total_points = calculateTotal(evaluation);
  evaluation.passed = hasPassed(evaluation.total_points);
  return evaluation;
}
```

**Key changes:**
- `TOTAL_MAX` from 48 → 40 (5 criteria × 8 max points each)
- `PASS_THRESHOLD` from 29 → 24 (60% of 40)
- `ALL_CRITERIA` uses new 5 criteria names
- `RawEval` interface uses 5 fields (was 7: aufgabengerechtheit_1a, aufgabengerechtheit_1b, diskussionsfuehrung)
- `buildEvaluation` builds with 5 fields → 5 fields → `calculateTotal` sums 5
- `gradeToPoints` accepts optional second parameter for GradeCard compatibility
- `maxPointsFor` takes no parameters (called as `maxPointsFor()` not `maxPointsFor(criterion)`)

---

### useAIPartner.ts

```typescript
import { useState, useCallback } from 'react';

export default function useAIPartner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAI = useCallback(async (systemPrompt: string, userMessage: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('[TELC AI] Error:', err);
      setError(err instanceof Error ? err.message : 'AI-Anfrage fehlgeschlagen');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const callPartner = useCallback(async (phase: string, content: string, candidateInput: string): Promise<string | null> => {
    const systemPrompt = `You are a German C1-level exam partner in a TELC C1 Mündlicher Ausdruck simulation.
Your role changes per phase:

TEIL_1B_SUMMARIZE (after candidate's Präsentation):
- Give a 3-4 sentence Zusammenfassung of what the candidate said
- Ask 1-2 genuine follow-up questions related to their presentation
- Speak naturally at C1 level — not too formal, not casual
- Language: German only

TEIL_1A (your own Präsentation):
- Present on the topic from a different angle than the candidate
- 90-120 words, structured with a thesis, 2 arguments, conclusion
- Language: German only

TEIL_2 (Diskussion):
- You have a genuine opinion on the Zitat
- Defend your position with arguments
- Challenge the candidate's view politely but firmly
- Ask follow-up questions to deepen the discussion
- Vary your reactions: agree partially, disagree, ask for clarification
- Never be neutral or passive
- Refer to the provided discussion questions naturally
- Language: German only

TEIL_1B_ANSWERS (brief answers to candidate's questions):
- Answer each question concisely (1-3 sentences each)
- Be direct and natural
- Language: German only

Current phase: ${phase}
Current topic/Zitat: ${content}
Candidate's last input: ${candidateInput}`;

    return callAI(systemPrompt, `Continue the exam as described. Current phase: ${phase}.`);
  }, [callAI]);

  const evaluateExam = useCallback(async (
    topic: { title: string },
    zitat: { text: string },
    transcripts: {
      teil_1a?: string;
      teil_1b_answers?: string;
      teil_1b_questions?: string;
      teil_2_turns?: { role: string; text: string }[];
    },
  ): Promise<Record<string, unknown> | null> => {
    const prompt = `You are an official TELC C1 German oral exam examiner.
Evaluate the following exam transcripts using the official TELC C1 grading scale.

EXAM CONTENT:
- Präsentation Topic: ${topic.title}
- Zitat for Diskussion: ${zitat.text}

TRANSCRIPTS:
[Teil 1A — Candidate Präsentation]
${transcripts.teil_1a || '[Keine Aufzeichnung]'}

[Teil 1B — Candidate answers to AI questions]
${transcripts.teil_1b_answers || '[Keine Aufzeichnung]'}

[Teil 1B — Candidate questions about AI presentation]
${transcripts.teil_1b_questions || '[Keine Aufzeichnung]'}

[Teil 2 — Diskussion (all turns)]
${(transcripts.teil_2_turns || []).map(t => `[${t.role === 'candidate' ? 'Kandidat' : 'Prüfer'}]: ${t.text}`).join('\n') || '[Keine Aufzeichnung]'}

GRADING SCALE:
A = Excellent (native-like / very strong)
B = Good (clear C1 level)
C = Adequate (B2 level, meets minimum)
D = Insufficient (below B2)

CRITERIA (official TELC C1 Hauptkriterien):
1. Aufgabengerechtheit — Did the candidate fulfill the task?
2. Flüssigkeit — Fluency and coherence of speech
3. Repertoire — Range of vocabulary and expressions
4. Grammatische Richtigkeit — Grammatical accuracy
5. Aussprache — Pronunciation and intonation

IMPORTANT: "Aussprache" CANNOT be properly evaluated from text transcripts.
Give a default B unless obvious phonetic spelling errors indicate mispronunciation.

Respond ONLY with a JSON object, no markdown, no explanation outside the JSON:
{
  "aufgabengerechtheit": "A|B|C|D",
  "fluessigkeit": "A|B|C|D",
  "repertoire": "A|B|C|D",
  "grammatische_richtigkeit": "A|B|C|D",
  "aussprache": "A|B|C|D",
  "feedback": {
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "overall_comment": "2-3 sentences in German"
  },
  "note": "any caveats about transcript-based evaluation"
}`;

    const result = await callAI(prompt, 'Evaluate the exam transcripts according to the TELC C1 grading scale.');
    if (!result) return null;

    try {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[TELC AI] Parse error:', e, 'Raw:', result);
      setError('Auswertung konnte nicht gelesen werden');
      return null;
    }
  }, [callAI]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { loading, error, callPartner, evaluateExam, callAI, reset };
}
```

**Key changes:**
- `callPartner` system prompt: Added `TEIL_1B_SUMMARIZE` section (was lumped under `TEIL_1B`), added `TEIL_1B_ANSWERS` section with concise answer instructions, `TEIL_2` now includes "Refer to the provided discussion questions naturally"
- `evaluateExam` prompt: JSON response format now has 5 keys only (was 7 with aufgabengerechtheit_1a, aufgabengerechtheit_1b, diskussionsfuehrung). Added explicit "CRITERIA (official TELC C1 Hauptkriterien)" section listing all 5 criteria.

---

### TELCModule.tsx

```typescript
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
import ListenPhase from './phases/ListenPhase';
import RecordPhase from './phases/RecordPhase';
import Teil2Phase from './phases/Teil2Phase';
import EvaluationPhase from './phases/EvaluationPhase';
import SelfAssessPhase from './phases/SelfAssessPhase';
import ResultsPhase from './phases/ResultsPhase';
import TELCAdmin from './admin/TELCAdmin';
import { DURATION } from './types';

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
    setPhase(PHASES.TEIL_1B_AI_SUMMARIZES);
  }, [transcripts, session]);

  // TEIL_1B_AI_SUMMARIZES — AI summarizes + asks questions
  useEffect(() => {
    if (phase === PHASES.TEIL_1B_AI_SUMMARIZES && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.callPartner(
        'TEIL_1B_SUMMARIZE',
        `${currentTopic.title}: ${currentTopic.prompt}`,
        transcripts.teil_1a,
      ).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
  }, [phase, aiPartnerResponse, ai, currentTopic, transcripts.teil_1a]);

  const handleTeil1BAnswers = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_answers: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_answers: text } } as never);
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1A_AI_PRESENTS);
  }, [transcripts, session]);

  // TEIL_1A_AI_PRESENTS — AI presents on the topic from different angle
  useEffect(() => {
    if (phase === PHASES.TEIL_1A_AI_PRESENTS && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.callPartner(
        'TEIL_1A',
        `${currentTopic.title}: ${currentTopic.prompt}`,
        `The candidate presented on: ${transcripts.teil_1a?.slice(0, 200)}...`,
      ).then(response => {
        setAiPartnerResponse(response || '');
      });
    }
  }, [phase, aiPartnerResponse, ai, currentTopic, transcripts.teil_1a]);

  const handleTeil1BQuestions = useCallback((text: string) => {
    setTranscripts(prev => ({ ...prev, teil_1b_questions: text }));
    session.saveSession({ transcripts: { ...transcripts, teil_1b_questions: text } } as never);
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_AI_ANSWERS);
  }, [transcripts, session]);

  // TEIL_1B_AI_ANSWERS — AI briefly answers candidate's questions
  useEffect(() => {
    if (phase === PHASES.TEIL_1B_AI_ANSWERS && !aiPartnerResponse && !ai.loading && currentTopic) {
      ai.callPartner(
        'TEIL_1B_ANSWERS',
        `The candidate asked questions about the AI presentation. Topic: ${currentTopic.title}`,
        transcripts.teil_1b_questions,
      ).then(response => {
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

  const handleContinueToAnswers = useCallback(() => {
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_CANDIDATE_ANSWERS);
  }, []);

  const handleContinueToQuestions = useCallback(() => {
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_1B_CANDIDATE_QUESTIONS);
  }, []);

  const handleContinueToDiscussion = useCallback(() => {
    setAiPartnerResponse(null);
    setPhase(PHASES.TEIL_2_DISKUSSION);
  }, []);

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
            transcript={stt.transcript} fallbackMode={stt.fallbackMode}
            mediaError={stt.mediaError} error={stt.error} debugInfo={stt.debugInfo}
            startRecording={stt.startRecording} stopRecording={stt.stopRecording}
            setFallbackTranscript={stt.setFallbackTranscript} onTranscriptReady={handleTeil1ATranscript}
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
```

**Key changes from old TELCModule:**
- Imports: Added `ListenPhase`, `RecordPhase`, `DURATION`; Removed `Teil1BAIPhase`, `Teil1AAIPhase`, `Teil1BCandidateListensPhase`
- Phase helpers: Added `handleContinueToAnswers`, `handleContinueToQuestions`, `handleContinueToDiscussion` to clear aiPartnerResponse and advance to next phase
- `handleTeil1ATranscript` now goes to `TEIL_1B_AI_SUMMARIZES` (was `TEIL_1B_AI_LISTENS`)
- `handleTeil1BAnswers` now goes to `TEIL_1A_AI_PRESENTS` (was from combined `Teil1BAIPhase`)
- `handleTeil1BQuestions` now goes to `TEIL_1B_AI_ANSWERS` (was `TEIL_1B_CANDIDATE_LISTENS`)
- New useEffect for `TEIL_1B_AI_SUMMARIZES` (calls `'TEIL_1B_SUMMARIZE'`)
- New useEffect for `TEIL_1B_AI_ANSWERS` (calls `'TEIL_1B_ANSWERS'`)
- Phase rendering: `TEIL_1B_AI_LISTENS` replaced by `TEIL_1B_AI_SUMMARIZES` → `ListenPhase`; `TEIL_1B_CANDIDATE_ANSWERS` → `RecordPhase`; `TEIL_1A_AI_PRESENTS` → `ListenPhase`; `TEIL_1B_CANDIDATE_QUESTIONS` → `RecordPhase`; `TEIL_1B_AI_ANSWERS` → `ListenPhase`
- History view: Score now shows `/40` instead of `/48`

---

### IdlePhase.tsx

```typescript
import { useState } from 'react';
import { Play, Settings } from 'lucide-react';
import type { TopicPair, PraesentationTopic, Zitat } from '../types';

interface IdlePhaseProps {
  onStart: (topic: PraesentationTopic, zitat: Zitat) => void;
  onNavigateToAdmin: () => void;
}

function loadFromStorage<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export default function IdlePhase({ onStart, onNavigateToAdmin }: IdlePhaseProps) {
  const [pairs] = useState<TopicPair[]>(() => loadFromStorage<TopicPair>('telc_topic_pairs'));
  const [zitate] = useState<Zitat[]>(() => loadFromStorage<Zitat>('telc_zitate'));
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'a' | 'b' | null>(null);
  const [selectedZitat, setSelectedZitat] = useState<Zitat | null>(null);

  const hasContent = pairs.length > 0 && zitate.length > 0;
  const canStart = selectedPairId && selectedChoice && selectedZitat;

  const handleStart = () => {
    if (!canStart) return;
    const pair = pairs.find(p => p.id === selectedPairId);
    if (!pair) return;
    const side = selectedChoice === 'a' ? pair.topic_a : pair.topic_b;
    const topic: PraesentationTopic = {
      id: pair.id,
      title: side.title,
      prompt: side.prompt,
      tips: side.tips || [],
    };
    onStart(topic, selectedZitat);
  };

  if (!hasContent) {
    return (
      <div style={{ padding: '0 4px', textAlign: 'center', paddingTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#f1f5f9' }}>
          TELC C1 Mündlicher Ausdruck
        </h2>
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 12,
          border: '1px solid rgba(245,158,11,0.2)', padding: 20, marginBottom: 20, textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#f59e0b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Bitte fügen Sie zuerst Themenvarianten und Zitate hinzu.
          </p>
          <button
            onClick={onNavigateToAdmin}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Inhalte verwalten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={onNavigateToAdmin}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid rgba(100,116,139,0.2)',
            background: 'transparent', color: '#94a3b8',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          <Settings size={14} /> Inhalte verwalten
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          TELC C1 Mündlicher Ausdruck
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Wählen Sie eine Themenvariante und ein Zitat
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Themenvarianten
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pairs.map(pair => (
            <div key={pair.id} style={{
              padding: 12, borderRadius: 10,
              border: selectedPairId === pair.id
                ? '2px solid #3b82f6'
                : '1px solid rgba(100,116,139,0.2)',
              background: selectedPairId === pair.id
                ? 'rgba(59,130,246,0.08)'
                : 'rgba(100,116,139,0.04)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>
                {pair.variante}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <SelectionCard
                  label="Thema A"
                  title={pair.topic_a.title}
                  prompt={pair.topic_a.prompt}
                  selected={selectedPairId === pair.id && selectedChoice === 'a'}
                  onClick={() => { setSelectedPairId(pair.id); setSelectedChoice('a'); }}
                />
                <SelectionCard
                  label="Thema B"
                  title={pair.topic_b.title}
                  prompt={pair.topic_b.prompt}
                  selected={selectedPairId === pair.id && selectedChoice === 'b'}
                  onClick={() => { setSelectedPairId(pair.id); setSelectedChoice('b'); }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Zitat für die Diskussion
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zitate.map(z => (
            <button
              key={z.id}
              onClick={() => setSelectedZitat(z)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                border: selectedZitat?.id === z.id
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(100,116,139,0.2)',
                background: selectedZitat?.id === z.id
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(100,116,139,0.04)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontStyle: 'italic', marginBottom: 4, color: '#f1f5f9' }}>
                „{z.text}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                — {z.author}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: canStart ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' : 'rgba(100,116,139,0.2)',
          color: canStart ? '#06081a' : '#64748b',
          fontSize: 15, fontWeight: 600,
          cursor: canStart ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Play size={18} />
        Prüfung starten
      </button>
    </div>
  );
}

function SelectionCard({
  label, title, prompt, selected, onClick,
}: {
  label: string; title: string; prompt: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: 10, borderRadius: 8, cursor: 'pointer',
        border: selected ? '2px solid #3b82f6' : '1px solid rgba(100,116,139,0.15)',
        background: selected ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.03)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
        {prompt}
      </div>
    </button>
  );
}
```

**Key changes from old IdlePhase:**
- Import: `TopicPair` added, `PraesentationTopic` still imported
- Loads from `'telc_topic_pairs'` instead of `'telc_topics'` → data typed as `TopicPair[]`
- State: `topics` → `pairs`, added `selectedPairId` and `selectedChoice` (was just `selectedTopic`)
- `hasContent` checks `pairs.length > 0` (was `topics.length > 0`)
- `handleStart` looks up selected pair, picks `topic_a` or `topic_b` based on choice, constructs `PraesentationTopic` from the side's data
- Rendering: Each pair shown as a card with variante name, containing two `SelectionCard` sub-components side-by-side (A/B). Selection requires both pair+choice (e.g., `selectedPairId === pair.id && selectedChoice === 'a'`)
- `SelectionCard` is a new helper component rendering a compact selectable card with label, title, prompt

---

### ListenPhase.tsx (NEW)

```typescript
import TTSSpeaker from '../components/TTSSpeaker';

interface ListenPhaseProps {
  title: string;
  subtitle: string;
  aiResponse: string | null;
  aiLoading: boolean;
  aiError: string | null;
  onContinue: () => void;
  continueLabel?: string;
}

export default function ListenPhase({
  title, subtitle, aiResponse, aiLoading, aiError, onContinue, continueLabel = 'Weiter',
}: ListenPhaseProps) {
  const shownResponse = aiResponse && !aiLoading ? aiResponse : '';

  if (aiLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 4px' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Partner antwortet...</p>
      </div>
    );
  }

  if (aiError) {
    return (
      <div style={{ padding: '0 4px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#ef4444', marginBottom: 16 }}>{aiError}</p>
        <button onClick={onContinue} style={{
          padding: '10px 20px', borderRadius: 8, border: 'none',
          background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}>
          Überspringen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {subtitle}
        </p>
      </div>

      {shownResponse && (
        <>
          <TTSSpeaker text={shownResponse} />
          <button
            onClick={onContinue}
            style={{
              width: '100%', marginTop: 16, padding: '12px 20px', borderRadius: 10,
              border: 'none', background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {continueLabel}
          </button>
        </>
      )}
    </div>
  );
}
```

**This is a new reusable component.** Used for 3 phases: `TEIL_1B_AI_SUMMARIZES`, `TEIL_1A_AI_PRESENTS`, `TEIL_1B_AI_ANSWERS`. Shows AI response text via TTSSpeaker + Continue button. Handles loading, error (with skip), and normal states. This replaced the listen-then-record pattern from the old `Teil1BAIPhase`, `Teil1AAIPhase`, and `Teil1BCandidateListensPhase` which had the listen+record combined in one component.

---

### RecordPhase.tsx (NEW)

```typescript
import { useEffect } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';

interface RecordPhaseProps {
  title: string;
  subtitle: string;
  duration: number;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => void;
  setFallbackTranscript: (text: string) => void;
  onTranscriptReady: (text: string) => void;
}

export default function RecordPhase({
  title, subtitle, duration,
  recording, processing, transcript, fallbackMode, error,
  startRecording, stopRecording, setFallbackTranscript,
  onTranscriptReady,
}: RecordPhaseProps) {
  useEffect(() => {
    if (transcript && !processing && !fallbackMode) {
      onTranscriptReady(transcript);
    }
  }, [transcript, processing, fallbackMode, onTranscriptReady]);

  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : transcript ? STATES.DONE : STATES.IDLE;

  const handleTimerEnd = () => {
    if (recording) stopRecording();
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          {subtitle}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#ef4444' }}>
            Fehler
          </p>
          <p style={{ fontSize: 13, margin: '0 0 10px', color: '#fca5a5' }}>{error}</p>
          <button
            onClick={startRecording}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {recording && (
        <Timer totalSeconds={duration} running={recording} onEnd={handleTimerEnd} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} disabled={!!transcript} />
      </div>

      {fallbackMode && !error && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
            Transkription fehlgeschlagen
          </p>
          <textarea
            placeholder="Geben Sie hier Ihren Text ein..."
            onChange={e => setFallbackTranscript(e.target.value)}
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const ta = document.querySelector('.telc-record textarea') as HTMLTextAreaElement | null;
              const text = ta?.value || '';
              if (text.trim()) onTranscriptReady(text);
            }}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Text übernehmen
          </button>
        </div>
      )}
    </div>
  );
}
```

**This is a new reusable component.** Used for 2 phases: `TEIL_1B_CANDIDATE_ANSWERS`, `TEIL_1B_CANDIDATE_QUESTIONS`. Handles recording with timer, error states, fallback textarea. This extracted the record-only pattern from the old combined phases. Notably simpler than `Teil1APhase` — no debug panel, no mediaError specific handling (errors go through the generic `error` path).

---

### Teil2Phase.tsx

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import { DURATION } from '../types';
import type { Zitat, DiscussionTurn } from '../types';

const DISCUSSION_QUESTIONS = [
  'Inwieweit stimmen Sie der Aussage zu?',
  'Welche Erfahrungen haben Sie persönlich mit diesem Thema gemacht?',
  'Sehen Sie Vor- oder Nachteile in der dargestellten Position?',
  'Welche Rolle spielt dieses Thema Ihrer Meinung nach in der heutigen Gesellschaft?',
];

interface Teil2PhaseProps {
  zitat: Zitat;
  callPartner: (phase: string, content: string, candidateInput: string) => Promise<string | null>;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function Teil2Phase({
  zitat, callPartner,
  recording, processing, transcript, fallbackMode,
  startRecording, stopRecording,
  onTurnsReady,
}: Teil2PhaseProps) {
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [discussionDone, setDiscussionDone] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const mountedRef = useRef(true);
  const endedRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const addTurn = useCallback((role: 'ai' | 'candidate', text: string) => {
    setTurns(prev => {
      const next = [...prev, { role, text }];
      turnsRef.current = next;
      return next;
    });
  }, []);

  const handleTimerEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (recording) stopRecording();
    setDiscussionDone(true);
    onTurnsReady(turnsRef.current);
  }, [recording, stopRecording, onTurnsReady]);

  useEffect(() => {
    if (turns.length >= 6 && turns[turns.length - 1]?.role === 'ai' && !endedRef.current) {
      handleTimerEnd();
    }
  }, [turns, handleTimerEnd]);

  useEffect(() => {
    let cancelled = false;
    const openDiscussion = async () => {
      setAiLoading(true);
      try {
        const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
        const response = await callPartner(
          'TEIL_2',
          `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
          '',
        );
        if (!mountedRef.current || cancelled) return;
        if (response) addTurn('ai', response);
      } catch (err) {
        if (!mountedRef.current || cancelled) return;
        setAiError(err instanceof Error ? err.message : 'Fehler');
      } finally {
        if (mountedRef.current && !cancelled) setAiLoading(false);
      }
    };
    openDiscussion();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!transcript || processing || fallbackMode || discussionDone) return;
    addTurn('candidate', transcript);

    let cancelled = false;
    const getAiResponse = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const lastCandidate = turnsRef.current.filter(t => t.role === 'candidate').pop()?.text || '';
        const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
        const response = await callPartner(
          'TEIL_2',
          `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
          lastCandidate,
        );
        if (!mountedRef.current || cancelled) return;
        if (response) addTurn('ai', response);
      } catch (err) {
        if (!mountedRef.current || cancelled) return;
        setAiError(err instanceof Error ? err.message : 'Fehler');
      } finally {
        if (mountedRef.current && !cancelled) setAiLoading(false);
      }
    };
    getAiResponse();
    return () => { cancelled = true; };
  }, [transcript, processing, fallbackMode, discussionDone]);

  const isCandidateTurn = !aiLoading && !discussionDone && turns.length > 0
    && turns[turns.length - 1]?.role === 'ai';
  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : transcript ? STATES.DONE : STATES.IDLE;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie über das Zitat (6 Minuten)
        </p>
      </div>

      {!discussionDone && (
        <Timer totalSeconds={DURATION.TEIL_2} running={!discussionDone} onEnd={handleTimerEnd} />
      )}

      <div style={{
        background: 'rgba(245,158,11,0.08)', borderRadius: 10,
        border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>
          — {zitat.author}
        </p>
      </div>

      <div style={{
        background: 'rgba(59,130,246,0.05)', borderRadius: 10,
        border: '1px solid rgba(59,130,246,0.15)', padding: 12, marginBottom: 12,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', margin: '0 0 6px' }}>
          Diskussionsfragen
        </p>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
          {DISCUSSION_QUESTIONS.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 200, overflowY: 'auto', marginBottom: 16,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 8,
            background: turn.role === 'ai' ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'ai' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, marginBottom: 2,
              color: turn.role === 'ai' ? '#3b82f6' : '#22c55e',
            }}>
              {turn.role === 'ai' ? 'Partner' : 'Sie'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#f1f5f9' }}>
              {turn.text}
            </div>
          </div>
        ))}
      </div>

      {isCandidateTurn && !transcript && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} />
        </div>
      )}

      {aiLoading && (
        <div style={{ textAlign: 'center', padding: 12 }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Partner antwortet...</p>
        </div>
      )}

      {aiError && (
        <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>
          {aiError}
        </div>
      )}

      {fallbackMode && isCandidateTurn && !discussionDone && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14,
        }}>
          <textarea
            placeholder="Ihr Diskussionsbeitrag..."
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const ta = document.querySelector('.telc-teil2 textarea') as HTMLTextAreaElement | null;
              const val = ta?.value || '';
              if (!val.trim()) return;
              addTurn('candidate', val);
              const getResponse = async () => {
                setAiLoading(true);
                setAiError(null);
                try {
                  const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
                  const response = await callPartner(
                    'TEIL_2',
                    `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
                    val,
                  );
                  if (!mountedRef.current) return;
                  if (response) addTurn('ai', response);
                } catch (err) {
                  if (!mountedRef.current) return;
                  setAiError(err instanceof Error ? err.message : 'Fehler');
                } finally {
                  if (mountedRef.current) setAiLoading(false);
                }
              };
              getResponse();
            }}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Senden
          </button>
        </div>
      )}

      {discussionDone && (
        <button
          onClick={() => onTurnsReady(turnsRef.current)}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Auswertung anzeigen
        </button>
      )}
    </div>
  );
}
```

**Key changes from old Teil2Phase:**
- Added `DISCUSSION_QUESTIONS` array with 4 fixed questions at top of file
- Every AI call now includes `Diskussionsfragen:\n${questionsText}` in the content string (both in `openDiscussion` and `getAiResponse` effects)
- New rendered UI block below the Zitat card: blue-tinted box with heading "Diskussionsfragen" and an `<ul>` listing all 4 questions
- Each question shows in a compact `<li>` with small font
- The `callPartner` content string now has the format: `Zitat: "..." — author (angle)\n\nDiskussionsfragen:\n1. question\n2. question\n...`

---

### TELCAdmin.tsx

Full 398-line file for CMS management. **Key change:** Now manages `TopicPair` objects (with `variante`, `topic_a` {title, prompt, tips}, `topic_b` {title, prompt, tips}) instead of individual `PraesentationTopic` objects. localStorage key changed from `'telc_topics'` to `'telc_topic_pairs'`. The add/edit forms now show two side-by-side columns (Thema A / Thema B) with separate title, prompt, and tips inputs. List view shows each pair's variante name with both topics displayed in colored boxes (blue for A, green for B). Zitate CRUD section unchanged.

---

### PrepPhase.tsx

Unchanged structurally. Accepts `PraesentationTopic` (constructed by IdlePhase from pair selection) and `Zitat`. Shows 20min timer, topic details, Zitat, tips list.

---

### Teil1APhase.tsx

Unchanged. Candidate's 3min presentation recording with debug panel, media error handling, fallback textarea. Same interface.

---

### EvaluationPhase.tsx

```typescript
const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];
```

**Change:** Criteria array uses 5 new keys instead of old 7.

---

### ResultsPhase.tsx

```typescript
const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];
```

**Changes:** Criteria array uses 5 new keys. Score display shows `/40` instead of `/48`.

---

### SelfAssessPhase.tsx

```typescript
const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];
```

**Change:** Criteria array uses 5 new keys for optional self-grading.

---

### GradeCard.tsx

```typescript
  const max = maxPointsFor();
```

**Change:** `maxPointsFor()` called without argument (was `maxPointsFor(criterion)`).

---

### ScoreBar.tsx

Unchanged. Imports `TOTAL_MAX` (now 40) and `PASS_THRESHOLD` (now 24) from scoring.ts — updates automatically.

---

### TTSSpeaker.tsx

Unchanged. Self-contained TTS with "Anhören"/"Stop" button, speaking wave animation.

---

### RecordButton.tsx

Unchanged. 4 states: idle, recording, processing, done. Pulse animation during recording.

---

### Timer.tsx

Unchanged. MM:SS countdown, green→yellow→red as time runs low.

---

### TranscriptViewer.tsx

Unchanged. Collapsible transcript display with chevron toggle.

---

### useTTS.ts

Unchanged. `getGermanVoice()` async Promise waiting for `voiceschanged`, sentence-chunked `speak()` with sequential utterance chain, `cancelledRef` for stop.

---

### useSTT.ts

Unchanged. MediaRecorder → `/api/transcribe` → Groq. MIME fallback chain, 100ms timeslice, empty blob check, error states, debug info.

---

### useTELCSession.ts

Unchanged. localStorage persistence for `telc_session_current` and `telc_history` (now also references `telc_topic_pairs` and `telc_zitate` via `LOCAL_STORAGE_KEYS`).

---

### api/anthropic.mjs

Unchanged. Vercel Edge → OpenRouter, model `anthropic/claude-sonnet-4`, GET diagnostic endpoint returning env var visibility.

---

### api/transcribe.mjs

Unchanged. Vercel Edge → Groq `whisper-large-v3`, language `de`, debug logging.

---

## Exam Flow (12 phases)

```
IDLE
  ↓ user selects topic pair A/B + Zitat + clicks "Prüfung starten"
PREP
  ↓ 20min countdown, user clicks "Bereit"
TEIL_1A_CANDIDATE
  ↓ candidate records 3min presentation → transcript saved
TEIL_1B_AI_SUMMARIZES
  ↓ AI summarizes candidate's presentation + asks 1-2 questions (TTS)
  ↓ user clicks "Weiter — Fragen beantworten"
TEIL_1B_CANDIDATE_ANSWERS
  ↓ candidate records answers to AI's questions (60s) → transcript saved
TEIL_1A_AI_PRESENTS
  ↓ AI presents on topic from different angle (TTS)
  ↓ user clicks "Weiter — Zusammenfassung geben"
TEIL_1B_CANDIDATE_QUESTIONS
  ↓ candidate records summary + 1-2 questions about AI's presentation (60s) → transcript saved
TEIL_1B_AI_ANSWERS
  ↓ AI answers candidate's questions concisely (TTS)
  ↓ user clicks "Weiter zur Diskussion"
TEIL_2_DISKUSSION
  ↓ 6min discussion with 4 fixed questions shown, turn-based
  ↓ user clicks "Auswertung anzeigen"
EVALUATION
  ↓ AI evaluates using 5 criteria → grade cards + score bar
  ↓ user clicks "Weiter zur Selbsteinschätzung"
SELF_ASSESSMENT
  ↓ user rates impression, optional self-grades
  ↓ user clicks "Ergebnisse anzeigen"
RESULTS
  ↓ full results: scores, feedback, transcripts
  ↓ "Erneut versuchen" or "Prüfungsverlauf anzeigen"
```

## Grading System

- 5 official TELC C1 Hauptkriterien: Aufgabengerechtheit, Flüssigkeit, Repertoire, Grammatische Richtigkeit, Aussprache
- Each criterion: A=8, B=5, C=2, D=0
- Total max: 40 points
- Pass threshold: 24 points (60%)
- AI evaluates via `/api/anthropic` with structured JSON prompt

## localStorage Keys

- `telc_topic_pairs`: TopicPair[] — managed via CMS, candidate picks A or B
- `telc_zitate`: Zitat[] — managed via CMS
- `telc_session_current`: Current active TELCSession
- `telc_history`: TELCSession[] — up to 50 entries
