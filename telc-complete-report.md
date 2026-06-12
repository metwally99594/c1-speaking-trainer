# TELC C1 Mündlicher Ausdruck — Complete Project Report

## Overview

TELC C1 speaking exam simulation with:
- Topic pair selection + Zitate with discussion_questions
- 12-phase exam flow (IDLE → PREP → TEIL_1A_CANDIDATE → TEIL_1B_AI_SUMMARIZES → TEIL_1B_CANDIDATE_ANSWERS → TEIL_1A_AI_PRESENTS → TEIL_1B_CANDIDATE_QUESTIONS → TEIL_1B_AI_ANSWERS → DISCUSSION_MODE_SELECT → TEIL_2_DISKUSSION → EVALUATION → SELF_ASSESSMENT → RESULTS)
- AI partner "Leila" (personality-driven, opinionated, from Morocco, C1 German learner)
- Partner discussion mode (role toggle A/B with text input)
- Groq Whisper STT (MediaRecorder, 100ms timeslice)
- Claude Sonnet AI via OpenRouter
- Web Speech API TTS (de-DE, rate 0.9, pitch 1.0)
- Scoring: 5 criteria, A=8/B=5/C=2/D=0, 40 max, 24 pass
- CMS admin page with localStorage CRUD
- All state in localStorage

---

## Full Source Code


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
  discussion_questions: string[];
}

export interface EvalFeedback {
  strengths: string[];
  improvements: string[];
  overall_comment: string;
}

export type DiscussionRole = 'candidate' | 'ai' | 'person_a' | 'person_b';

export interface DiscussionTurn {
  role: DiscussionRole;
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
  | 'DISCUSSION_MODE_SELECT'
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
  DISCUSSION_MODE_SELECT: 'DISCUSSION_MODE_SELECT',
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

### useAIPartner.ts

```typescript
import { useState, useCallback } from 'react';

const LEILA_PERSONA = `Du bist Leila, eine C1-Deutschlernerin aus Marokko, die an derselben TELC C1 Hochschule Prüfung teilnimmt wie der Kandidat.

DEINE PERSÖNLICHKEIT:
- Du hast immer eine klare, eigene Meinung und vertrittst sie selbstbewusst
- Du widersprichst höflich, wenn du anderer Meinung bist
- Du verwendest natürliche Diskursmarker: "Ich würde sagen...", "Das sehe ich etwas anders...", "Einerseits... andererseits...", "Allerdings...", "Interessant, aber..."
- Du stellst Fragen, um die Diskussion zu vertiefen — nicht um Zeit zu füllen
- Du baust auf das auf, was der Kandidat gesagt hat — du hörst wirklich zu
- Deine Sätze sind kurz und direkt (2–4 Sätze pro Turn)
- Sprache: NUR Deutsch, C1-Niveau

DU BIST KEIN CHATBOT. Du bist ein Mensch der eine Prüfung ablegt.`;

const SUMMARIZE_PROMPT = (topic: string, candidateTranscript: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1B: Zusammenfassung + Frage

Der Kandidat hat gerade seine Präsentation zum Thema "${topic}" beendet.

Was der Kandidat gesagt hat:
"""
${candidateTranscript || '[Keine Aufzeichnung]'}
"""

Deine Aufgabe:
1. Fasse die wichtigsten Punkte des Kandidaten in 2–3 Sätzen zusammen (sachlich, nicht wertend)
2. Stelle EINE konkrete Folgefrage zum Inhalt — nicht generisch, sondern bezogen auf etwas Spezifisches, das der Kandidat erwähnt hat

Format: Erst Zusammenfassung, dann Frage. Kein Label davor.`;

const PRESENT_PROMPT = (topic: string, candidateTranscript: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1A: Deine eigene Präsentation

Das Thema ist: "${topic}"

Der Kandidat hat bereits präsentiert und dabei folgende Punkte angesprochen:
"""
${candidateTranscript?.slice(0, 300) || '[Keine Aufzeichnung]'}
"""

Halte jetzt DEINE eigene Präsentation zu demselben Thema — aber aus einem anderen Blickwinkel.
Struktur: Einleitung (Thema + deine These) → 2 Argumente → Schluss mit Fazit
Länge: 100–130 Wörter. Natürlich und fließend — keine Aufzählungspunkte, echte Sätze.`;

const ANSWER_QUESTIONS_PROMPT = (topic: string, candidateQuestions: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1B: Antwort auf Fragen des Kandidaten

Der Kandidat hat deine Präsentation zum Thema "${topic}" gehört und stellt jetzt Fragen oder gibt eine Zusammenfassung:
"""
${candidateQuestions || '[Keine Fragen]'}
"""

Antworte natürlich und konkret auf jede Frage (1–3 Sätze pro Frage).
Sei direkt. Kein Drumherumreden.`;

const DISCUSSION_OPEN_PROMPT = (zitatText: string, zitatAuthor: string, leilasAngle: string, questions: string[]) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 2: Diskussion eröffnen

Das Zitat für die Diskussion:
"${zitatText}" — ${zitatAuthor}

DEINE POSITION zu diesem Zitat:
${leilasAngle}

Fragen, die du im Laufe der Diskussion natürlich einbauen sollst (NICHT als Liste vorlesen — verwebe sie in deine Beiträge):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

JETZT: Eröffne die Diskussion.
- Erkläre kurz, wie DU das Zitat verstehst
- Äußere DEINE Meinung dazu (zustimmend oder ablehnend, klar und begründet)
- Ende mit einer Einladung an den Kandidaten, seine Meinung zu sagen
Länge: 3–5 Sätze. Natürlich und direkt.`;

const DISCUSSION_RESPOND_PROMPT = (
  zitatText: string, leilasAngle: string, unusedQuestions: string[],
  conversationHistory: Array<{ role: string; text: string }>, candidateLastTurn: string,
) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 2: Auf den Kandidaten reagieren

Das Zitat: "${zitatText}"
Deine Grundposition: ${leilasAngle}

Bisheriger Gesprächsverlauf:
${conversationHistory.map(t => `[${t.role === 'candidate' ? 'Kandidat' : 'Leila'}]: ${t.text}`).join('\n')}

Der Kandidat hat gerade gesagt:
"""
${candidateLastTurn}
"""

Fragen, die du NOCH NICHT gestellt hast und natürlich einbauen kannst:
${unusedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

DEINE REAKTION — wähle eine dieser Strategien je nach Situation:
- Wenn du zustimmst: "Da gebe ich Ihnen Recht, allerdings würde ich ergänzen..."
- Wenn du widersprichst: "Das sehe ich anders, weil..."
- Wenn du nachfragen willst: Verwende eine der obigen Fragen natürlich eingebettet
- Wenn du provozieren willst: "Meinen Sie wirklich, dass...?"

Reagiere auf das KONKRETE, was der Kandidat gesagt hat — nicht generisch.
Länge: 2–4 Sätze.`;

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

  const summarizeAndAsk = useCallback(async (
    topicTitle: string, candidateTranscript: string,
  ): Promise<string | null> => {
    return callAI(
      SUMMARIZE_PROMPT(topicTitle, candidateTranscript),
      'Gib jetzt deine Zusammenfassung und stelle eine Frage.',
    );
  }, [callAI]);

  const presentOnTopic = useCallback(async (
    topicTitle: string, topicPrompt: string, candidateTranscript: string,
  ): Promise<string | null> => {
    return callAI(
      PRESENT_PROMPT(`${topicTitle}: ${topicPrompt}`, candidateTranscript),
      'Halte jetzt deine Präsentation.',
    );
  }, [callAI]);

  const answerCandidateQuestions = useCallback(async (
    topicTitle: string, candidateQuestions: string,
  ): Promise<string | null> => {
    return callAI(
      ANSWER_QUESTIONS_PROMPT(topicTitle, candidateQuestions),
      'Beantworte die Fragen des Kandidaten.',
    );
  }, [callAI]);

  const openDiscussion = useCallback(async (
    zitatText: string, zitatAuthor: string, leilasAngle: string, discussionQuestions: string[],
  ): Promise<string | null> => {
    return callAI(
      DISCUSSION_OPEN_PROMPT(zitatText, zitatAuthor, leilasAngle, discussionQuestions),
      'Eröffne jetzt die Diskussion.',
    );
  }, [callAI]);

  const respondInDiscussion = useCallback(async (
    zitatText: string, leilasAngle: string, discussionQuestions: string[],
    conversationHistory: Array<{ role: string; text: string }>, candidateLastTurn: string,
  ): Promise<string | null> => {
    const usedQuestions = discussionQuestions.filter(q =>
      conversationHistory.some(t => t.role === 'ai' && t.text.toLowerCase().includes(q.slice(0, 20).toLowerCase()))
    );
    const unusedQuestions = discussionQuestions.filter(q => !usedQuestions.includes(q));
    return callAI(
      DISCUSSION_RESPOND_PROMPT(zitatText, leilasAngle, unusedQuestions, conversationHistory, candidateLastTurn),
      'Reagiere jetzt auf den Kandidaten.',
    );
  }, [callAI]);

  const evaluateExam = useCallback(async (
    topic: { title: string },
    zitat: { text: string },
    transcripts: {
      teil_1a?: string; teil_1b_answers?: string; teil_1b_questions?: string;
      teil_2_turns?: Array<{ role: string; text: string }>;
    },
  ): Promise<Record<string, unknown> | null> => {
    const prompt = `Du bist offizieller TELC C1 Hochschule Prüfer. Bewerte die folgende Prüfung nach den offiziellen TELC-Kriterien.

PRÜFUNGSINHALT:
- Präsentationsthema: ${topic.title}
- Zitat für Diskussion: ${zitat.text}

TRANSKRIPTE:
[Teil 1A — Präsentation des Kandidaten]
${transcripts.teil_1a || '[Keine Aufzeichnung]'}

[Teil 1B — Antworten des Kandidaten auf Fragen]
${transcripts.teil_1b_answers || '[Keine Aufzeichnung]'}

[Teil 1B — Fragen des Kandidaten zur Partnerpräsentation]
${transcripts.teil_1b_questions || '[Keine Aufzeichnung]'}

[Teil 2 — Diskussion (alle Turns)]
${(transcripts.teil_2_turns || []).map(t => `[${t.role === 'candidate' ? 'Kandidat' : 'Leila'}]: ${t.text}`).join('\n') || '[Keine Aufzeichnung]'}

BEWERTUNGSSKALA:
A = Hervorragend (C1 in jeder Hinsicht)
B = Gut (vorwiegend C1)
C = Ausreichend (vorwiegend nicht C1, B2-Niveau)
D = Mangelhaft (unter B2)

KRITERIEN (offizielle TELC C1 Hauptkriterien):
1. Aufgabengerechtheit — Hat der Kandidat die Aufgabe erfüllt?
2. Flüssigkeit — Redefluss und Kohärenz
3. Repertoire — Wortschatz und sprachliche Mittel
4. Grammatische Richtigkeit — Grammatikgenauigkeit
5. Aussprache — Aussprache und Intonation (aus Text: Standard B vergeben, außer offensichtliche Fehler)

Antworte NUR mit JSON, kein Markdown:
{
  "aufgabengerechtheit": "A|B|C|D",
  "fluessigkeit": "A|B|C|D",
  "repertoire": "A|B|C|D",
  "grammatische_richtigkeit": "A|B|C|D",
  "aussprache": "A|B|C|D",
  "feedback": {
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "overall_comment": "2–3 Sätze auf Deutsch"
  },
  "note": "Hinweis zur transkriptbasierten Bewertung"
}`;
    const result = await callAI(prompt, 'Bewerte die Prüfungstranskripte nach TELC C1 Bewertungsskala.');
    if (!result) return null;
    try {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[TELC AI] Parse error:', e);
      setError('Auswertung konnte nicht gelesen werden');
      return null;
    }
  }, [callAI]);

  const callPartner = useCallback(async (
    phase: string, content: string, candidateInput: string,
  ): Promise<string | null> => {
    return callAI(
      `${LEILA_PERSONA}\n\nPhase: ${phase}\nThema/Zitat: ${content}`,
      candidateInput || 'Beginne.',
    );
  }, [callAI]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading, error,
    summarizeAndAsk, presentOnTopic, answerCandidateQuestions,
    openDiscussion, respondInDiscussion,
    evaluateExam, callPartner, callAI, reset,
  };
}

```

### useSTT.ts

```typescript
import { useState, useCallback, useRef } from 'react';

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/webm',
];

function getSupportedMimeType(): string {
  return MIME_TYPES.find(m => MediaRecorder.isTypeSupported(m)) ?? '';
}

interface STTHook {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recording: boolean;
  processing: boolean;
  transcript: string;
  error: string | null;
  fallbackMode: boolean;
  setFallbackTranscript: (text: string) => void;
  reset: () => void;
  mediaError: string | null;
  debugInfo: Record<string, unknown>;
}

export default function useSTT(): STTHook {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef('');

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setFallbackMode(false);
    setMediaError(null);
    setDebugInfo({});
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('[TELC STT] getUserMedia succeeded');

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log('[TELC STT] MIME type selected:', mimeType || 'default (browser chooses)');

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 128000,
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          console.log('[TELC STT] ondataavailable chunk size:', e.data.size, 'total chunks:', chunksRef.current.length);
        } else {
          console.log('[TELC STT] ondataavailable EMPTY chunk — skipped');
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        console.log('[TELC STT] recording stopped, chunks:', chunksRef.current.length);

        const recordedMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: recordedMime });
        const totalSize = audioBlob.size;
        console.log('[TELC STT] total blob size:', totalSize, 'type:', recordedMime);

        if (totalSize === 0) {
          console.error('[TELC STT] EMPTY BLOB — no audio data captured');
          setError('Keine Audiodaten — bitte Mikrofon prüfen');
          setFallbackMode(true);
          setProcessing(false);
          setDebugInfo({ blobSize: 0, error: 'empty blob' });
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
          }
          return;
        }

        setProcessing(true);

        try {
          const formData = new FormData();
          const ext = recordedMime.includes('mp4') ? 'mp4'
            : recordedMime.includes('ogg') ? 'ogg'
            : 'webm';
          formData.append('file', audioBlob, `recording.${ext}`);

          console.log('[TELC STT] sending to /api/transcribe, file:', `recording.${ext}`, 'size:', totalSize);
          console.log('[TELC STT] FormData keys:', Array.from(formData.keys()));

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          console.log('[TELC STT] /api/transcribe status:', response.status);
          setDebugInfo(prev => ({ ...prev, apiStatus: response.status }));

          if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            console.error('[TELC STT] /api/transcribe error body:', errorBody);
            throw new Error(`Transkription fehlgeschlagen (${response.status}): ${errorBody}`);
          }

          const data = await response.json();
          console.log('[TELC STT] /api/transcribe response:', JSON.stringify(data).slice(0, 300));
          setDebugInfo(prev => ({ ...prev, apiResponse: { ...data, _truncated: true } }));

          const text = data.text || data.transcript || '';
          console.log('[TELC STT] transcript text length:', text.length);

          if (!text.trim()) {
            console.warn('[TELC STT] empty transcript from Groq');
            setFallbackMode(true);
            setError('Kein Text erkannt — bitte nochmals sprechen');
          } else {
            setTranscript(text);
          }
        } catch (err) {
          console.error('[TELC STT] Error:', err);
          const msg = err instanceof Error ? err.message : 'Transkription fehlgeschlagen';
          setError(msg);
          setFallbackMode(true);
          setDebugInfo(prev => ({ ...prev, fetchError: msg }));
        } finally {
          setProcessing(false);
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.onerror = () => {
        console.error('[TELC STT] MediaRecorder error');
        setRecording(false);
        setError('Aufnahmefehler');
        setFallbackMode(true);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start(100);
      setRecording(true);
      console.log('[TELC STT] MediaRecorder started with timeslice 100ms');
    } catch (err) {
      console.error('[TELC STT] getUserMedia error:', err);
      setMediaError(err instanceof Error ? err.message : 'Mikrofonzugriff verweigert');
      setFallbackMode(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const setFallbackTranscript = useCallback((text: string) => {
    setTranscript(text);
    setFallbackMode(false);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setRecording(false);
    setProcessing(false);
    setTranscript('');
    setError(null);
    setFallbackMode(false);
    setMediaError(null);
    setDebugInfo({});
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    recording,
    processing,
    transcript,
    error,
    fallbackMode,
    setFallbackTranscript,
    reset,
    mediaError,
    debugInfo,
  };
}

```

### useTTS.ts

```typescript
import { useState, useCallback, useRef } from 'react';

interface TTSHook {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  currentText: string;
}

function getGermanVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices.find(v => v.lang.startsWith('de')) ?? voices[0] ?? null);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      const v = window.speechSynthesis.getVoices();
      resolve(v.find(x => x.lang.startsWith('de')) ?? v[0] ?? null);
    };
    setTimeout(() => resolve(null), 3000);
  });
}

export default function useTTS(): TTSHook {
  const [speaking, setSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const cancelledRef = useRef(false);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      setCurrentText(text);
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setCurrentText(text);
    setSpeaking(true);

    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    let i = 0;

    const speakNext = () => {
      if (cancelledRef.current) return;
      if (i >= sentences.length) {
        setSpeaking(false);
        onEnd?.();
        return;
      }

      const chunk = sentences[i++].trim();
      if (!chunk) { speakNext(); return; }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      getGermanVoice().then(voice => {
        if (voice) utterance.voice = voice;
      });

      utterance.onend = speakNext;
      utterance.onerror = () => {
        console.warn('[TTS] chunk error, skipping:', chunk.slice(0, 30));
        speakNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCurrentText('');
  }, []);

  return { speak, stop, speaking, currentText };
}

```

### useTELCSession.ts

```typescript
import { useState, useCallback } from 'react';
import { LOCAL_STORAGE_KEYS } from './types';
import type { TELCSession, PraesentationTopic, Zitat } from './types';

function generateId(): string {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16),
  );
}

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[TELC] localStorage write error:', e);
    return false;
  }
}

interface TELCSessionHook {
  currentSession: TELCSession | null;
  history: TELCSession[];
  createSession: (topic: PraesentationTopic, zitat: Zitat) => TELCSession;
  saveSession: (updates: Partial<TELCSession>) => void;
  loadSession: () => TELCSession | null;
  clearCurrent: () => void;
  addToHistory: (session: TELCSession) => void;
  getHistory: () => TELCSession[];
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;
}

export default function useTELCSession(): TELCSessionHook {
  const [currentSession, setCurrentSession] = useState<TELCSession | null>(() =>
    safeGet<TELCSession>(LOCAL_STORAGE_KEYS.CURRENT_SESSION),
  );
  const [history, setHistory] = useState<TELCSession[]>(() =>
    safeGet<TELCSession[]>(LOCAL_STORAGE_KEYS.HISTORY) || [],
  );

  const createSession = useCallback((topic: PraesentationTopic, zitat: Zitat): TELCSession => {
    const session: TELCSession = {
      id: generateId(),
      timestamp: Date.now(),
      topic,
      zitat,
      transcripts: {
        teil_1a: '',
        teil_1b_answers: '',
        teil_1b_questions: '',
        teil_2_turns: [],
      },
      ai_evaluation: null,
    };
    safeSet(LOCAL_STORAGE_KEYS.CURRENT_SESSION, session);
    setCurrentSession(session);
    return session;
  }, []);

  const saveSession = useCallback((updates: Partial<TELCSession>) => {
    setCurrentSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      safeSet(LOCAL_STORAGE_KEYS.CURRENT_SESSION, updated);
      return updated;
    });
  }, []);

  const loadSession = useCallback((): TELCSession | null => {
    const session = safeGet<TELCSession>(LOCAL_STORAGE_KEYS.CURRENT_SESSION);
    setCurrentSession(session);
    return session;
  }, []);

  const clearCurrent = useCallback(() => {
    try { localStorage.removeItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION); } catch { /* ignore */ }
    setCurrentSession(null);
  }, []);

  const addToHistory = useCallback((session: TELCSession) => {
    const existing = safeGet<TELCSession[]>(LOCAL_STORAGE_KEYS.HISTORY) || [];
    const updated = [session, ...existing].slice(0, 50);
    safeSet(LOCAL_STORAGE_KEYS.HISTORY, updated);
    setHistory(updated);
    clearCurrent();
  }, [clearCurrent]);

  const getHistory = useCallback((): TELCSession[] => {
    const h = safeGet<TELCSession[]>(LOCAL_STORAGE_KEYS.HISTORY) || [];
    setHistory(h);
    return h;
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      safeSet(LOCAL_STORAGE_KEYS.HISTORY, updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    try { localStorage.removeItem(LOCAL_STORAGE_KEYS.HISTORY); } catch { /* ignore */ }
    setHistory([]);
  }, []);

  return {
    currentSession,
    history,
    createSession,
    saveSession,
    loadSession,
    clearCurrent,
    addToHistory,
    getHistory,
    deleteFromHistory,
    clearHistory,
  };
}

```

### TELCModule.tsx

```tsx
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
  const [discussionMode, setDiscussionMode] = useState<'ai' | 'partner' | null>(null);

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
    setPhase(PHASES.TEIL_1A_AI_PRESENTS);
  }, [transcripts, session]);

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
    setPhase(PHASES.TEIL_1B_AI_ANSWERS);
  }, [transcripts, session]);

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
    setPhase(PHASES.DISCUSSION_MODE_SELECT);
  }, []);

  const handleSelectDiscussionMode = useCallback((mode: 'ai' | 'partner') => {
    setDiscussionMode(mode);
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
      case PHASES.DISCUSSION_MODE_SELECT:
        return (
          <div style={{ padding: '0 4px' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', textAlign: 'center', color: '#f1f5f9' }}>
              Teil 2 — Diskussion
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', textAlign: 'center' }}>
              Wählen Sie Ihren Diskussionspartner
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => handleSelectDiscussionMode('ai')} style={{
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
                    Leila diskutiert mit Ihnen — simuliert eine echte Prüfungssituation
                  </div>
                </div>
              </button>
              <button onClick={() => handleSelectDiscussionMode('partner')} style={{
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
                    Diskutieren Sie mit einem Freund — tauschen Sie Rollen und lassen Sie sich bewerten
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
      case PHASES.TEIL_2_DISKUSSION:
        if (discussionMode === 'partner') {
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

### TELCAdmin.tsx

```tsx
import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Zitat } from '../types';

const PAIRS_KEY = 'telc_topic_pairs';
const ZITATE_KEY = 'telc_zitate';

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `id_${Date.now()}_${idCounter}`;
}

function loadFromStorage<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveToStorage<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(100,116,139,0.2)',
  background: 'rgba(0,0,0,0.25)', color: '#f1f5f9',
  fontSize: 13, lineHeight: '1.5',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4, display: 'block',
};

const smallInput: CSSProperties = { ...inputStyle, fontSize: 12 };

const btnPrimary: CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  color: '#06081a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default function TELCAdmin({ onBack }: { onBack: () => void }) {
  const [pairs, setPairs] = useState(() => loadFromStorage<any>(PAIRS_KEY));
  const [zitate, setZitate] = useState<Zitat[]>(() => loadFromStorage<Zitat>(ZITATE_KEY));

  // ---------- Pair form state ----------
  const [showAddPair, setShowAddPair] = useState(false);
  const [addVariante, setAddVariante] = useState('');
  const [addATitle, setAddATitle] = useState('');
  const [addAPrompt, setAddAPrompt] = useState('');
  const [addATips, setAddATips] = useState<string[]>([]);
  const [addATipInput, setAddATipInput] = useState('');
  const [addBTitle, setAddBTitle] = useState('');
  const [addBPrompt, setAddBPrompt] = useState('');
  const [addBTips, setAddBTips] = useState<string[]>([]);
  const [addBTipInput, setAddBTipInput] = useState('');

  const resetAddPair = () => {
    setShowAddPair(false); setAddVariante(''); setAddATitle(''); setAddAPrompt(''); setAddATips([]); setAddATipInput('');
    setAddBTitle(''); setAddBPrompt(''); setAddBTips([]); setAddBTipInput('');
  };

  const handleAddPair = () => {
    if (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) return;
    const pair = {
      id: generateId(), variante: addVariante.trim(),
      topic_a: { title: addATitle.trim(), prompt: addAPrompt.trim(), tips: [...addATips] },
      topic_b: { title: addBTitle.trim(), prompt: addBPrompt.trim(), tips: [...addBTips] },
    };
    const next = [...pairs, pair];
    saveToStorage(PAIRS_KEY, next); setPairs(next); resetAddPair();
  };

  // ---------- Pair edit ----------
  const [editPairId, setEditPairId] = useState<string | null>(null);
  const [editVariante, setEditVariante] = useState('');
  const [editATitle, setEditATitle] = useState('');
  const [editAPrompt, setEditAPrompt] = useState('');
  const [editATips, setEditATips] = useState<string[]>([]);
  const [editATipInput, setEditATipInput] = useState('');
  const [editBTitle, setEditBTitle] = useState('');
  const [editBPrompt, setEditBPrompt] = useState('');
  const [editBTips, setEditBTips] = useState<string[]>([]);
  const [editBTipInput, setEditBTipInput] = useState('');

  const startEditPair = (p: any) => {
    setEditPairId(p.id); setEditVariante(p.variante);
    setEditATitle(p.topic_a.title); setEditAPrompt(p.topic_a.prompt); setEditATips([...(p.topic_a.tips || [])]); setEditATipInput('');
    setEditBTitle(p.topic_b.title); setEditBPrompt(p.topic_b.prompt); setEditBTips([...(p.topic_b.tips || [])]); setEditBTipInput('');
  };

  const cancelEditPair = () => { setEditPairId(null); };

  const saveEditPair = () => {
    if (!editPairId || !editVariante.trim() || !editATitle.trim() || !editAPrompt.trim() || !editBTitle.trim() || !editBPrompt.trim()) return;
    const next = pairs.map((p: any) => p.id === editPairId ? {
      ...p, variante: editVariante.trim(),
      topic_a: { title: editATitle.trim(), prompt: editAPrompt.trim(), tips: editATips },
      topic_b: { title: editBTitle.trim(), prompt: editBPrompt.trim(), tips: editBTips },
    } : p);
    saveToStorage(PAIRS_KEY, next); setPairs(next); setEditPairId(null);
  };

  const [deletePairId, setDeletePairId] = useState<string | null>(null);

  const cardStyle: CSSProperties = {
    padding: 14, borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)',
    background: 'rgba(100,116,139,0.04)',
  };

  // ---------- Zitate ----------
  const [showAddZitat, setShowAddZitat] = useState(false);
  const [addZitatText, setAddZitatText] = useState('');
  const [addZitatAuthor, setAddZitatAuthor] = useState('');
  const [addZitatAngle, setAddZitatAngle] = useState('');
  const [addZitatQuestions, setAddZitatQuestions] = useState<string[]>([]);
  const [addZitatQInput, setAddZitatQInput] = useState('');
  const resetAddZitat = () => { setAddZitatText(''); setAddZitatAuthor(''); setAddZitatAngle(''); setAddZitatQuestions([]); setAddZitatQInput(''); setShowAddZitat(false); };
  const handleAddZitat = () => {
    if (!addZitatText.trim() || !addZitatAuthor.trim() || addZitatQuestions.length < 2) return;
    const z: Zitat = { id: generateId(), text: addZitatText.trim(), author: addZitatAuthor.trim(), discussion_angle: addZitatAngle.trim(), discussion_questions: [...addZitatQuestions] };
    const next = [...zitate, z]; saveToStorage(ZITATE_KEY, next); setZitate(next); resetAddZitat();
  };
  const [editZitatId, setEditZitatId] = useState<string | null>(null);
  const [editZitatText, setEditZitatText] = useState('');
  const [editZitatAuthor, setEditZitatAuthor] = useState('');
  const [editZitatAngle, setEditZitatAngle] = useState('');
  const [editZitatQuestions, setEditZitatQuestions] = useState<string[]>([]);
  const [editZitatQInput, setEditZitatQInput] = useState('');
  const startEditZitat = (z: Zitat) => { setEditZitatId(z.id); setEditZitatText(z.text); setEditZitatAuthor(z.author); setEditZitatAngle(z.discussion_angle || ''); setEditZitatQuestions([...(z.discussion_questions || [])]); setEditZitatQInput(''); };
  const cancelEditZitat = () => { setEditZitatId(null); };
  const saveEditZitat = () => {
    if (!editZitatId || !editZitatText.trim() || !editZitatAuthor.trim() || editZitatQuestions.length < 2) return;
    const next = zitate.map(z => z.id === editZitatId ? { ...z, text: editZitatText.trim(), author: editZitatAuthor.trim(), discussion_angle: editZitatAngle.trim(), discussion_questions: [...editZitatQuestions] } : z);
    saveToStorage(ZITATE_KEY, next); setZitate(next); setEditZitatId(null);
  };
  const [deleteZitatId, setDeleteZitatId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: '#94a3b8',
        fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16,
      }}>
        <ArrowLeft size={16} /> Zurück zur Prüfung
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px', color: '#f1f5f9' }}>
        Inhalte verwalten
      </h2>

      {/* ============ TOPIC PAIRS ============ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
            Themenvarianten
          </h3>
          <button onClick={() => setShowAddPair(true)} style={{
            ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
          }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {showAddPair && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Variante</label>
              <input value={addVariante} onChange={e => setAddVariante(e.target.value)} placeholder="Variante 1" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Thema A — Titel</label>
                <input value={addATitle} onChange={e => setAddATitle(e.target.value)} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Thema A — Aufgabenstellung</label>
                <textarea value={addAPrompt} onChange={e => setAddAPrompt(e.target.value)} rows={3} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Tipps A</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={addATipInput} onChange={e => setAddATipInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = addATipInput.trim(); if (!v) return; setAddATips(prev => [...prev, v]); setAddATipInput(''); } }}
                    placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                  <button onClick={() => { const v = addATipInput.trim(); if (!v) return; setAddATips(prev => [...prev, v]); setAddATipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                </div>
                {addATips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setAddATips(prev => prev.filter((_, j) => j !== i))} />)}
              </div>
              <div>
                <label style={labelStyle}>Thema B — Titel</label>
                <input value={addBTitle} onChange={e => setAddBTitle(e.target.value)} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Thema B — Aufgabenstellung</label>
                <textarea value={addBPrompt} onChange={e => setAddBPrompt(e.target.value)} rows={3} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Tipps B</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={addBTipInput} onChange={e => setAddBTipInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = addBTipInput.trim(); if (!v) return; setAddBTips(prev => [...prev, v]); setAddBTipInput(''); } }}
                    placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                  <button onClick={() => { const v = addBTipInput.trim(); if (!v) return; setAddBTips(prev => [...prev, v]); setAddBTipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                </div>
                {addBTips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setAddBTips(prev => prev.filter((_, j) => j !== i))} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddPair} style={{
                ...btnPrimary, opacity: (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) ? 0.4 : 1,
                cursor: (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Check size={14} /> Speichern
              </button>
              <button onClick={resetAddPair} style={cancelBtnStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {pairs.length === 0 && !showAddPair && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
            Noch keine Themenvarianten. Fügen Sie Ihre erste Variante hinzu.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pairs.map((p: any) => (
            <div key={p.id} style={cardStyle}>
              {editPairId === p.id ? (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Variante</label>
                    <input value={editVariante} onChange={e => setEditVariante(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={labelStyle}>Thema A — Titel</label>
                      <input value={editATitle} onChange={e => setEditATitle(e.target.value)} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Aufgabenstellung A</label>
                      <textarea value={editAPrompt} onChange={e => setEditAPrompt(e.target.value)} rows={3} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Tipps A</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input value={editATipInput} onChange={e => setEditATipInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editATipInput.trim(); if (!v) return; setEditATips(prev => [...prev, v]); setEditATipInput(''); } }}
                          placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                        <button onClick={() => { const v = editATipInput.trim(); if (!v) return; setEditATips(prev => [...prev, v]); setEditATipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                      </div>
                      {editATips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setEditATips(prev => prev.filter((_, j) => j !== i))} />)}
                    </div>
                    <div>
                      <label style={labelStyle}>Thema B — Titel</label>
                      <input value={editBTitle} onChange={e => setEditBTitle(e.target.value)} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Aufgabenstellung B</label>
                      <textarea value={editBPrompt} onChange={e => setEditBPrompt(e.target.value)} rows={3} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Tipps B</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input value={editBTipInput} onChange={e => setEditBTipInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editBTipInput.trim(); if (!v) return; setEditBTips(prev => [...prev, v]); setEditBTipInput(''); } }}
                          placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                        <button onClick={() => { const v = editBTipInput.trim(); if (!v) return; setEditBTips(prev => [...prev, v]); setEditBTipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                      </div>
                      {editBTips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setEditBTips(prev => prev.filter((_, j) => j !== i))} />)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditPair} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Speichern</button>
                    <button onClick={cancelEditPair} style={cancelBtnStyle}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{p.variante}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEditPair(p)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}><Pencil size={16} /></button>
                      <button onClick={() => setDeletePairId(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>Thema A</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{p.topic_a.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{p.topic_a.prompt}</div>
                      {p.topic_a.tips?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                          {p.topic_a.tips.map((t: string, i: number) => <span key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>Thema B</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{p.topic_b.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{p.topic_b.prompt}</div>
                      {p.topic_b.tips?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                          {p.topic_b.tips.map((t: string, i: number) => <span key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {deletePairId === p.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const next = pairs.filter((x: any) => x.id !== p.id); saveToStorage(PAIRS_KEY, next); setPairs(next); setDeletePairId(null); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeletePairId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ ZITATE ============ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>Diskussionszitate</h3>
          <button onClick={() => setShowAddZitat(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {showAddZitat && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Zitat</label>
              <textarea value={addZitatText} onChange={e => setAddZitatText(e.target.value)} rows={2} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Autor</label>
              <input value={addZitatAuthor} onChange={e => setAddZitatAuthor(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Diskussionswinkel (optional)</label>
              <input value={addZitatAngle} onChange={e => setAddZitatAngle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Diskussionsfragen (2-5, mind. 8 Zeichen)</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input value={addZitatQInput} onChange={e => setAddZitatQInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = addZitatQInput.trim(); if (v.length < 8 || addZitatQuestions.length >= 5) return; setAddZitatQuestions(prev => [...prev, v]); setAddZitatQInput(''); } }}
                  placeholder={addZitatQuestions.length < 2 ? 'Mindestens 2 Fragen...' : 'Weitere Frage...'}
                  style={{ ...smallInput, flex: 1 }} />
                <button onClick={() => { const v = addZitatQInput.trim(); if (v.length < 8 || addZitatQuestions.length >= 5) return; setAddZitatQuestions(prev => [...prev, v]); setAddZitatQInput(''); }}
                  style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12, opacity: (addZitatQInput.trim().length < 8 || addZitatQuestions.length >= 5) ? 0.4 : 1 }}>+</button>
              </div>
              {addZitatQuestions.map((q, i) => <TipChip key={i} tip={q} onRemove={() => setAddZitatQuestions(prev => prev.filter((_, j) => j !== i))} />)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddZitat} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, opacity: (!addZitatText.trim() || !addZitatAuthor.trim() || addZitatQuestions.length < 2) ? 0.4 : 1, cursor: (!addZitatText.trim() || !addZitatAuthor.trim() || addZitatQuestions.length < 2) ? 'not-allowed' : 'pointer' }}><Check size={14} /> Speichern</button>
              <button onClick={resetAddZitat} style={cancelBtnStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {zitate.length === 0 && !showAddZitat && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>Noch keine Zitate. Fügen Sie Ihr erstes Zitat hinzu.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zitate.map(z => (
            <div key={z.id} style={cardStyle}>
              {editZitatId === z.id ? (
                <div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Zitat</label><textarea value={editZitatText} onChange={e => setEditZitatText(e.target.value)} rows={2} style={inputStyle} /></div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Autor</label><input value={editZitatAuthor} onChange={e => setEditZitatAuthor(e.target.value)} style={inputStyle} /></div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Diskussionswinkel (optional)</label><input value={editZitatAngle} onChange={e => setEditZitatAngle(e.target.value)} style={inputStyle} /></div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Diskussionsfragen (2-5, mind. 8 Zeichen)</label>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <input value={editZitatQInput} onChange={e => setEditZitatQInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editZitatQInput.trim(); if (v.length < 8 || editZitatQuestions.length >= 5) return; setEditZitatQuestions(prev => [...prev, v]); setEditZitatQInput(''); } }}
                        placeholder={editZitatQuestions.length < 2 ? 'Mindestens 2 Fragen...' : 'Weitere Frage...'}
                        style={{ ...smallInput, flex: 1 }} />
                      <button onClick={() => { const v = editZitatQInput.trim(); if (v.length < 8 || editZitatQuestions.length >= 5) return; setEditZitatQuestions(prev => [...prev, v]); setEditZitatQInput(''); }}
                        style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12, opacity: (editZitatQInput.trim().length < 8 || editZitatQuestions.length >= 5) ? 0.4 : 1 }}>+</button>
                    </div>
                    {editZitatQuestions.map((q, i) => <TipChip key={i} tip={q} onRemove={() => setEditZitatQuestions(prev => prev.filter((_, j) => j !== i))} />)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditZitat} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Speichern</button>
                    <button onClick={cancelEditZitat} style={cancelBtnStyle}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontStyle: 'italic', color: '#f1f5f9', lineHeight: 1.6, marginBottom: 2 }}>„{z.text}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>— {z.author}</div>
                      {z.discussion_angle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{z.discussion_angle}</div>}
                      {z.discussion_questions?.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{z.discussion_questions.length} Frage{z.discussion_questions.length > 1 ? 'n' : ''}: </span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>{z.discussion_questions.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => startEditZitat(z)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}><Pencil size={16} /></button>
                      <button onClick={() => setDeleteZitatId(z.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {deleteZitatId === z.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const next = zitate.filter(x => x.id !== z.id); saveToStorage(ZITATE_KEY, next); setZitate(next); setDeleteZitatId(null); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeleteZitatId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const cancelBtnStyle: CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
  background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
};

function TipChip({ tip, onRemove }: { tip: string; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: 'rgba(100,116,139,0.08)', fontSize: 12, color: '#f1f5f9', marginBottom: 2 }}>
      <span style={{ flex: 1 }}>{tip}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
    </div>
  );
}

```

### Timer.tsx

```tsx
import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  totalSeconds: number;
  running?: boolean;
  onEnd?: () => void;
  paused?: boolean;
}

export default function Timer({ totalSeconds, running = true, onEnd, paused = false }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(totalSeconds);
    endedRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!running || paused) return;

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (!endedRef.current) {
            endedRef.current = true;
            onEnd?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, paused, onEnd]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let color = '#22c55e';
  if (remaining <= 20) color = '#ef4444';
  else if (remaining <= 60) color = '#f59e0b';

  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 'clamp(2rem, 8vw, 3.5rem)',
      fontWeight: 700,
      color,
      textAlign: 'center',
      padding: '12px 0',
      transition: 'color 0.3s',
      letterSpacing: '0.05em',
    }}>
      {display}
    </div>
  );
}

```

### RecordButton.tsx

```tsx
import { Mic, Square, Loader2, Check } from 'lucide-react';

// eslint-disable-next-line react-refresh/only-export-components
export const STATES = {
  IDLE: 'idle' as const,
  RECORDING: 'recording' as const,
  PROCESSING: 'processing' as const,
  DONE: 'done' as const,
};

type ButtonState = (typeof STATES)[keyof typeof STATES];

interface RecordButtonProps {
  state?: ButtonState;
  onStart?: () => void;
  onStop?: () => void;
  disabled?: boolean;
}

export default function RecordButton({
  state = STATES.IDLE,
  onStart,
  onStop,
  disabled = false,
}: RecordButtonProps) {
  if (state === STATES.PROCESSING) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.7,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(59,130,246,0.15)',
        }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6' }} />
        </div>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Transkribiere...</span>
      </div>
    );
  }

  if (state === STATES.DONE) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(34,197,94,0.15)',
          border: '2px solid rgba(34,197,94,0.3)',
        }}>
          <Check size={32} style={{ color: '#22c55e' }} />
        </div>
        <span style={{ fontSize: 13, color: '#22c55e' }}>Aufgenommen</span>
      </div>
    );
  }

  const isRecording = state === STATES.RECORDING;

  return (
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={disabled}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        background: 'none', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, padding: 0,
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.1)',
        border: isRecording ? '2px solid rgba(239,68,68,0.4)' : '2px solid rgba(59,130,246,0.2)',
        transition: 'all 0.2s',
        animation: isRecording ? 'telc-pulse 1.5s ease-in-out infinite' : 'none',
      }}>
        {isRecording
          ? <Square size={20} style={{ color: '#ef4444' }} fill="#ef4444" />
          : <Mic size={28} style={{ color: '#3b82f6' }} />
        }
      </div>
      <span style={{
        fontSize: 13,
        color: isRecording ? '#ef4444' : '#94a3b8',
        fontWeight: isRecording ? 600 : 400,
      }}>
        {isRecording ? 'Aufnehmen...' : 'Aufnahme starten'}
      </span>
      <style>{`
        @keyframes telc-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      `}</style>
    </button>
  );
}

```

### TTSSpeaker.tsx

```tsx
import { Volume2, Square } from 'lucide-react';
import useTTS from '../useTTS';

interface TTSSpeakerProps {
  text: string;
  compact?: boolean;
}

export default function TTSSpeaker({ text, compact }: TTSSpeakerProps) {
  const { speak, stop, speaking } = useTTS();

  if (compact) {
    return (
      <button
        onClick={speaking ? stop : () => speak(text)}
        title={speaking ? 'Stop' : 'Anhören'}
        style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: speaking
            ? '1px solid rgba(239,68,68,0.4)'
            : '1px solid rgba(100,116,139,0.3)',
          background: speaking
            ? 'rgba(239,68,68,0.15)'
            : 'rgba(100,116,139,0.1)',
          color: speaking ? '#ef4444' : '#94a3b8',
          cursor: 'pointer', padding: 0,
          transition: 'background 0.15s',
        }}
      >
        {speaking ? <Square size={12} /> : <Volume2 size={14} />}
      </button>
    );
  }

  return (
    <div style={{
      background: 'rgba(59,130,246,0.05)',
      borderRadius: 12,
      border: '1px solid rgba(59,130,246,0.1)',
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <button
          onClick={speaking ? stop : () => speak(text)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '8px 14px', borderRadius: 8, flexShrink: 0,
            border: speaking
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(59,130,246,0.3)',
            background: speaking
              ? 'rgba(239,68,68,0.1)'
              : 'rgba(59,130,246,0.1)',
            color: speaking ? '#ef4444' : '#3b82f6',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          {speaking ? <Square size={16} /> : <Volume2 size={16} />}
          {speaking ? 'Stop' : 'Anhören'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, lineHeight: 1.6, color: '#f1f5f9',
            margin: 0, whiteSpace: 'pre-wrap',
          }}>
            {text}
          </p>
        </div>
      </div>
      {speaking && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3, height: 20, paddingLeft: 0, marginTop: 4,
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 3, height: '60%', borderRadius: 2, background: '#3b82f6',
              animation: 'telc-wave 0.8s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }} />
          ))}
          <style>{`
            @keyframes telc-wave {
              0%, 100% { transform: scaleY(0.5); }
              50% { transform: scaleY(1.2); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

```

### IdlePhase.tsx

```tsx
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

### PrepPhase.tsx

```tsx
import Timer from '../components/Timer';
import { DURATION } from '../types';
import type { PraesentationTopic, Zitat } from '../types';

interface PrepPhaseProps {
  topic: PraesentationTopic;
  zitat: Zitat;
  onReady: () => void;
}

export default function PrepPhase({ topic, zitat, onReady }: PrepPhaseProps) {
  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Vorbereitungszeit
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Sie haben 20 Minuten Zeit, sich vorzubereiten
        </p>
      </div>

      <Timer totalSeconds={DURATION.PREP} running onEnd={onReady} />

      <div style={{
        background: 'rgba(59,130,246,0.05)', borderRadius: 12,
        border: '1px solid rgba(59,130,246,0.1)', padding: 16, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#3b82f6' }}>
          Ihr Thema
        </h3>
        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: '#f1f5f9' }}>
          {topic.title}
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: '#94a3b8' }}>
          {topic.prompt}
        </p>
      </div>

      <div style={{
        background: 'rgba(245,158,11,0.05)', borderRadius: 12,
        border: '1px solid rgba(245,158,11,0.1)', padding: 16, marginBottom: 16,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#f59e0b' }}>
          Zitat für die Diskussion
        </h3>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>
          — {zitat.author}
        </p>
      </div>

      <div style={{
        background: 'rgba(34,197,94,0.05)', borderRadius: 12,
        border: '1px solid rgba(34,197,94,0.1)', padding: 16, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px', color: '#22c55e' }}>
          Struktur-Tipps
        </h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: '#94a3b8' }}>
          {topic.tips?.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={onReady}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
          color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        Bereit — Prüfung beginnen
      </button>
    </div>
  );
}

```

### Teil1APhase.tsx

```tsx
import { useEffect, useState } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import { DURATION } from '../types';

interface Teil1APhaseProps {
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  mediaError: string | null;
  error: string | null;
  debugInfo: Record<string, unknown>;
  startRecording: () => void;
  stopRecording: () => void;
  setFallbackTranscript: (text: string) => void;
  onTranscriptReady: (text: string) => void;
}

export default function Teil1APhase({
  recording, processing, transcript, fallbackMode, mediaError,
  error, debugInfo,
  startRecording, stopRecording, setFallbackTranscript,
  onTranscriptReady,
}: Teil1APhaseProps) {
  const [showDebug, setShowDebug] = useState(false);

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
          Teil 1A — Präsentation
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Sie haben 3 Minuten Zeit für Ihre Präsentation
        </p>
      </div>

      {mediaError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#ef4444' }}>
            Mikrofonfehler
          </p>
          <p style={{ fontSize: 13, margin: '0 0 10px', color: '#fca5a5' }}>{mediaError}</p>
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

      {error && !mediaError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', borderRadius: 10,
          border: '1px solid rgba(239,68,68,0.2)', padding: 14, marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 4px', color: '#ef4444' }}>
            Fehler bei der Transkription
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
        <Timer totalSeconds={DURATION.TEIL_1A} running={recording} onEnd={handleTimerEnd} />
      )}

      <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
        <RecordButton
          state={btnState}
          onStart={startRecording}
          onStop={stopRecording}
          disabled={!!transcript}
        />
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
            placeholder="Geben Sie hier Ihre Präsentation ein..."
            onChange={e => setFallbackTranscript(e.target.value)}
            style={{
              width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const textarea = document.querySelector('.telc-teil1a textarea') as HTMLTextAreaElement | null;
              const text = textarea?.value || '';
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

      {Object.keys(debugInfo).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowDebug(!showDebug)}
            style={{
              padding: '4px 8px', borderRadius: 4,
              border: '1px solid rgba(100,116,139,0.15)',
              background: 'transparent', color: '#64748b',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            {showDebug ? 'Debug ausblenden' : 'Debug anzeigen'}
          </button>
          {showDebug && (
            <pre style={{
              marginTop: 6, padding: 10, borderRadius: 6,
              background: 'rgba(0,0,0,0.3)', color: '#94a3b8',
              fontSize: 11, lineHeight: 1.5, overflow: 'auto',
              maxHeight: 200,
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

```

### ListenPhase.tsx

```tsx
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

### RecordPhase.tsx

```tsx
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

### Teil2Phase.tsx

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import TTSSpeaker from '../components/TTSSpeaker';
import { DURATION } from '../types';
import type { Zitat, DiscussionTurn } from '../types';
import useAIPartner from '../useAIPartner';

interface Teil2PhaseProps {
  zitat: Zitat;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function Teil2Phase({
  zitat,
  recording, processing, transcript, fallbackMode,
  startRecording, stopRecording,
  onTurnsReady,
}: Teil2PhaseProps) {
  const ai = useAIPartner();
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [discussionDone, setDiscussionDone] = useState(false);
  const [waitingForCandidate, setWaitingForCandidate] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const mountedRef = useRef(true);
  const endedRef = useRef(false);
  const processedTranscriptRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const addTurn = useCallback((role: 'ai' | 'candidate', text: string) => {
    const turn: DiscussionTurn = { role, text };
    setTurns(prev => {
      const next = [...prev, turn];
      turnsRef.current = next;
      return next;
    });
    return turn;
  }, []);

  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (recording) stopRecording();
    setDiscussionDone(true);
    setWaitingForCandidate(false);
    onTurnsReady(turnsRef.current);
  }, [recording, stopRecording, onTurnsReady]);

  // STEP 1: Leila opens the discussion
  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      const response = await ai.openDiscussion(
        zitat.text, zitat.author, zitat.discussion_angle, zitat.discussion_questions,
      );
      if (!mountedRef.current || cancelled || !response) return;
      addTurn('ai', response);
      setWaitingForCandidate(true);
    };
    open();
    return () => { cancelled = true; };
  }, []);

  // STEP 2: When candidate speaks, Leila responds
  useEffect(() => {
    if (!transcript || processing || fallbackMode || discussionDone) return;
    if (transcript === processedTranscriptRef.current) return;
    processedTranscriptRef.current = transcript;

    setWaitingForCandidate(false);
    addTurn('candidate', transcript);

    let cancelled = false;
    const respond = async () => {
      const response = await ai.respondInDiscussion(
        zitat.text, zitat.discussion_angle, zitat.discussion_questions,
        turnsRef.current.map(t => ({ role: t.role, text: t.text })),
        transcript,
      );
      if (!mountedRef.current || cancelled || discussionDone) return;
      if (response) {
        addTurn('ai', response);
        setWaitingForCandidate(true);
      }
    };
    respond();
    return () => { cancelled = true; };
  }, [transcript, processing, fallbackMode, discussionDone]);

  // Fallback: candidate types instead of recording
  const handleFallbackSend = useCallback(() => {
    const text = fallbackText.trim();
    if (!text || discussionDone) return;
    setFallbackText('');
    setWaitingForCandidate(false);
    processedTranscriptRef.current = text;
    addTurn('candidate', text);

    let cancelled = false;
    const respond = async () => {
      const response = await ai.respondInDiscussion(
        zitat.text, zitat.discussion_angle, zitat.discussion_questions,
        turnsRef.current.map(t => ({ role: t.role, text: t.text })),
        text,
      );
      if (!mountedRef.current || cancelled || discussionDone) return;
      if (response) {
        addTurn('ai', response);
        setWaitingForCandidate(true);
      }
    };
    respond();
    return () => { cancelled = true; };
  }, [fallbackText, discussionDone, zitat, ai, addTurn]);

  const isCandidateTurn = waitingForCandidate && !ai.loading && !discussionDone;
  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : STATES.IDLE;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie mit Leila über das Zitat (6 Minuten)
        </p>
      </div>

      {!discussionDone && (
        <Timer totalSeconds={DURATION.TEIL_2} running={!discussionDone} onEnd={handleEnd} />
      )}

      <div style={{
        background: 'rgba(245,158,11,0.08)', borderRadius: 10,
        border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}"
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>— {zitat.author}</p>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 280, overflowY: 'auto', marginBottom: 14,
        paddingRight: 4,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: turn.role === 'ai'
              ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'ai'
              ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 4,
              color: turn.role === 'ai' ? '#60a5fa' : '#4ade80',
            }}>
              {turn.role === 'ai' ? 'Leila' : 'Sie'}
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.6, color: '#f1f5f9',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <span style={{ flex: 1 }}>{turn.text}</span>
              {turn.role === 'ai' && <TTSSpeaker text={turn.text} compact />}
            </div>
          </div>
        ))}

        {ai.loading && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.1)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
              Leila
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#3b82f6',
                  animation: `telc-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {ai.error && (
        <div style={{
          padding: 10, borderRadius: 8, marginBottom: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 12,
        }}>
          {ai.error}
        </div>
      )}

      {isCandidateTurn && !discussionDone && (
        <div style={{ marginBottom: 12 }}>
          {!fallbackMode ? (
            <div style={{
              display: 'flex', justifyContent: 'center', flexDirection: 'column',
              alignItems: 'center', gap: 8,
            }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Ihre Antwort
              </p>
              <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} />
            </div>
          ) : (
            <div>
              <textarea
                value={fallbackText}
                onChange={e => setFallbackText(e.target.value)}
                placeholder="Ihr Diskussionsbeitrag auf Deutsch..."
                style={{
                  width: '100%', minHeight: 70, padding: 10, borderRadius: 8,
                  border: '1px solid rgba(100,116,139,0.3)',
                  background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
                  fontSize: 13, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleFallbackSend}
                disabled={!fallbackText.trim()}
                style={{
                  marginTop: 8, padding: '10px 20px', borderRadius: 8,
                  border: 'none',
                  background: fallbackText.trim() ? '#3b82f6' : 'rgba(100,116,139,0.2)',
                  color: fallbackText.trim() ? '#fff' : '#64748b',
                  fontSize: 13, fontWeight: 600,
                  cursor: fallbackText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Senden
              </button>
            </div>
          )}
        </div>
      )}

      {!discussionDone ? (
        <button
          onClick={handleEnd}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
            background: 'rgba(100,116,139,0.15)', color: '#94a3b8',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Diskussion beenden
        </button>
      ) : (
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

      <style>{`
        @keyframes telc-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

```

### PartnerDiscussionPhase.tsx

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import type { Zitat, DiscussionTurn } from '../types';
import { DURATION } from '../types';

interface PartnerDiscussionPhaseProps {
  zitat: Zitat;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function PartnerDiscussionPhase({
  zitat, onTurnsReady,
}: PartnerDiscussionPhaseProps) {
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [activeRole, setActiveRole] = useState<'person_a' | 'person_b'>('person_a');
  const [inputText, setInputText] = useState('');
  const [discussionDone, setDiscussionDone] = useState(false);
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const addTurn = useCallback((role: 'person_a' | 'person_b', text: string) => {
    const turn: DiscussionTurn = { role, text };
    const next = [...turnsRef.current, turn];
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || discussionDone) return;
    setInputText('');
    addTurn(activeRole, text);
  }, [inputText, activeRole, discussionDone, addTurn]);

  const handleEnd = useCallback(() => {
    if (discussionDone) return;
    setDiscussionDone(true);
    onTurnsReady(turnsRef.current);
  }, [discussionDone, onTurnsReady]);

  const roleLabel = (r: DiscussionTurn['role']) => r === 'person_a' ? 'Person A' : r === 'person_b' ? 'Person B' : '';
  const activeColor = activeRole === 'person_a' ? '#3b82f6' : '#22c55e';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Partner-Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie zu zweit über das Zitat (6 Minuten)
        </p>
      </div>

      {!discussionDone && (
        <Timer totalSeconds={DURATION.TEIL_2} running={!discussionDone} onEnd={handleEnd} />
      )}

      <div style={{
        background: 'rgba(245,158,11,0.08)', borderRadius: 10,
        border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}"
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>— {zitat.author}</p>
        {zitat.discussion_angle && (
          <p style={{ fontSize: 12, margin: '6px 0 0', color: '#64748b' }}>
            {zitat.discussion_angle}
          </p>
        )}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 200, overflowY: 'auto', marginBottom: 14,
        paddingRight: 4,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: turn.role === 'person_a'
              ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'person_a'
              ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 4,
              color: turn.role === 'person_a' ? '#60a5fa' : '#4ade80',
            }}>
              {roleLabel(turn.role)}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#f1f5f9' }}>
              {turn.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {!discussionDone && (
        <div>
          <div style={{
            display: 'flex', gap: 10, marginBottom: 10,
          }}>
            <button
              onClick={() => setActiveRole('person_a')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_a'
                  ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_a' ? '#60a5fa' : '#64748b',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Person A spricht
            </button>
            <button
              onClick={() => setActiveRole('person_b')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_b'
                  ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_b' ? '#4ade80' : '#64748b',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Person B spricht
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`${roleLabel(activeRole)} schreibt hier...`}
              rows={2}
              style={{
                flex: 1, padding: 10, borderRadius: 8, resize: 'none',
                border: `1px solid ${activeColor}33`,
                background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
                fontSize: 13, lineHeight: 1.6,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: inputText.trim() ? activeColor : 'rgba(100,116,139,0.15)',
                color: inputText.trim() ? '#fff' : '#64748b',
                fontSize: 13, fontWeight: 600, cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                alignSelf: 'flex-end',
              }}
            >
              Senden
            </button>
          </div>
        </div>
      )}

      {!discussionDone ? (
        <button
          onClick={handleEnd}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
            background: 'rgba(100,116,139,0.15)', color: '#94a3b8',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Diskussion beenden
        </button>
      ) : (
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

### EvaluationPhase.tsx

```tsx
import { CRITERIA_LABELS } from '../types';
import type { AIEvaluation, GradeCriterion } from '../types';
import GradeCard from '../components/GradeCard';
import ScoreBar from '../components/ScoreBar';

interface EvaluationPhaseProps {
  evaluation: AIEvaluation | null;
  onContinue: () => void;
}

const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
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

```

### SelfAssessPhase.tsx

```tsx
import { useState } from 'react';
import { CRITERIA_LABELS, GRADES } from '../types';
import type { Grade, GradeCriterion, UserAssessment } from '../types';

interface SelfAssessPhaseProps {
  onComplete: (assessment: UserAssessment) => void;
}

const CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
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

```

### ResultsPhase.tsx

```tsx
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

```

### api/anthropic.mjs

```javascript
console.log('[TELC AI] module loaded, runtime:', typeof process !== 'undefined' ? 'node/edge' : 'browser');
console.log('[TELC AI] OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('[TELC AI] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log('[TELC AI] handler called, method:', req.method);
  console.log('[TELC AI] OPENROUTER_API_KEY inside handler:', !!process.env.OPENROUTER_API_KEY);

  // GET for diagnostics
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      status: 'diagnostic',
      env: {
        OPENROUTER_API_KEY_exists: !!process.env.OPENROUTER_API_KEY,
        GROQ_API_KEY_exists: !!process.env.GROQ_API_KEY,
        VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
        VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'not set',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const allVars = Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN'));
      return new Response(JSON.stringify({
        error: 'OPENROUTER_API_KEY not configured',
        hint: 'Set OPENROUTER_API_KEY in Vercel Dashboard → Settings → Environment Variables → Production',
        availableKeys: allVars,
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = {
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 4096,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return new Response(JSON.stringify({
        error: `OpenRouter API error: ${response.status}`,
        detail: errorText,
      }), {
        status: response.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}

```

### api/transcribe.mjs

```javascript
const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log('[TELC Transcribe] GROQ_API_KEY present:', !!GROQ_API_KEY);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Health-check ping via GET
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        keyConfigured: !!GROQ_API_KEY,
        runtime: 'edge',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GROQ_API_KEY) {
    console.error('[TELC Transcribe] GROQ_API_KEY not configured');
    return new Response(
      JSON.stringify({
        error: 'GROQ_API_KEY not configured',
        hint: 'Set GROQ_API_KEY in Vercel project → Settings → Environment Variables',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const contentType = req.headers.get('content-type') || 'unknown';
    console.log('[TELC Transcribe] incoming Content-Type:', contentType);

    const clientFormData = await req.formData();
    const file = clientFormData.get('file');

    console.log('[TELC Transcribe] file field present:', !!file);

    if (!file) {
      // Log all fields for debugging
      const allKeys = Array.from(clientFormData.keys());
      console.error('[TELC Transcribe] no "file" field found, available keys:', allKeys);
      return new Response(
        JSON.stringify({
          error: 'No audio file provided',
          hint: 'FormData must contain a "file" field with the audio blob',
          receivedKeys: allKeys,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    console.log('[TELC Transcribe] file details:', {
      name: file.name || '(unnamed)',
      type: file.type || '(unknown)',
      size: file.size || 0,
    });

    if (!file.size || file.size === 0) {
      console.error('[TELC Transcribe] file is empty (0 bytes)');
      return new Response(
        JSON.stringify({ error: 'Audio file is empty (0 bytes)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'de');
    groqFormData.append('response_format', 'json');

    console.log('[TELC Transcribe] sending to Groq, model: whisper-large-v3, language: de');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    console.log('[TELC Transcribe] Groq response status:', groqRes.status);

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[TELC Transcribe] Groq error body:', errText);
      return new Response(
        JSON.stringify({ error: `Groq API error (${groqRes.status})`, details: errText }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await groqRes.json();
    console.log('[TELC Transcribe] Groq success, text length:', (data.text || '').length);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[TELC Transcribe] unhandled error:', err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

```

## Key Design Decisions

1. **Leila Persona** — AI partner has a full backstory (Moroccan C1 learner) and specific personality traits: opinionated, uses discourse markers, listens to candidate, 2–4 sentence turns
2. **Own AI for Teil 1A** — Leila presents on the SAME topic as the candidate but from a DIFFERENT angle (not summarizing), via a dedicated prompt
3. **Zitat owns its questions** — Each Zitat stores its own discussion_angle and discussion_questions; unused questions tracked across turns to ensure natural embedding
4. **TTSSpeaker compact mode** — A 28px circular button for inline TTS in discussion turns, separate from the full speaker card with wave animation
5. **Partner mode** — User can choose between AI discussion (Leila) or human partner mode (Person A/B role toggle with text input, no STT/TTS)
6. **Scoring 40/24** — 5 criteria each 8/5/2/0 points, max 40, pass at 24 (60%), with fallback to 'B' if AI returns no grade
7. **localStorage as DB** — Topics, Zitate, current session, and history all persisted in localStorage; no backend database
8. **Fallback text input** — If STT fails, candidate can type their response instead of recording
9. **Debug panel** — Exposed debugInfo state with toggle in Teil1APhase for API troubleshooting
10. **All state in TELCModule** — Single parent component owns all phase/transcript/evaluation state; phases are pure presentational components

## Architecture Summary

### Phase Flow
IDLE → PREP (20min) → TEIL_1A_CANDIDATE (3min recording) → TEIL_1B_AI_SUMMARIZES (Leila summarizes + asks) → TEIL_1B_CANDIDATE_ANSWERS (1min recording) → TEIL_1A_AI_PRESENTS (Leila presents) → TEIL_1B_CANDIDATE_QUESTIONS (1min recording) → TEIL_1B_AI_ANSWERS (Leila answers) → DISCUSSION_MODE_SELECT (AI or partner) → TEIL_2_DISKUSSION (6min, turn-based) → EVALUATION → SELF_ASSESSMENT → RESULTS

### File Structure
`
src/components/telc/
├── types.ts              — All TypeScript interfaces, constants, phase enum
├── scoring.ts            — Grade→points mapping, total calculation, buildEvaluation
├── useAIPartner.ts       — Leila persona prompts + API calls via /api/anthropic
├── useSTT.ts             — MediaRecorder → Groq Whisper via /api/transcribe
├── useTTS.ts             — Web Speech API wrapper (de-DE, sentence chunking)
├── useTELCSession.ts     — localStorage persistence for current session + history
├── TELCModule.tsx         — Root orchestrator, phase routing, state management
├── admin/
│   └── TELCAdmin.tsx     — CRUD UI for topic pairs + zitate (localStorage)
├── components/
│   ├── Timer.tsx          — Countdown with color states (green→yellow→red)
│   ├── RecordButton.tsx   — 4-state button (idle/recording/processing/done)
│   ├── TTSSpeaker.tsx     — TTS with full card and compact variants
│   ├── GradeCard.tsx      — (supplementary) Grade display per criterion
│   ├── ScoreBar.tsx       — (supplementary) Score visualization
│   └── TranscriptViewer.tsx — (supplementary) Expandable transcript display
└── phases/
    ├── IdlePhase.tsx      — Topic + Zitat selection screen
    ├── PrepPhase.tsx      — 20min preparation with topic/zitat display
    ├── Teil1APhase.tsx    — 3min recording with debug panel
    ├── ListenPhase.tsx    — Generic "listen to AI" phase with TTS
    ├── RecordPhase.tsx    — Generic recording phase with timer
    ├── Teil2Phase.tsx     — AI discussion (Leila opens, responds to turns)
    ├── PartnerDiscussionPhase.tsx — Human partner mode (role toggle)
    ├── EvaluationPhase.tsx — AI evaluation display
    ├── SelfAssessPhase.tsx — User self-assessment form
    └── ResultsPhase.tsx   — Final results with transcripts + score
api/
├── anthropic.mjs         — Vercel Edge function: OpenRouter → Claude Sonnet
└── transcribe.mjs        — Vercel Edge function: Groq Whisper STT
`

### API Routes
- **POST /api/anthropic** — Accepts { messages } array, relays to OpenRouter (Claude Sonnet 4), returns standard OpenAI completion format
- **POST /api/transcribe** — Accepts FormData with ile blob, relays to Groq (whisper-large-v3, language=de), returns transcribed text
- Both routes also support GET for diagnostics (env var checks)
- Both use Vercel Edge runtime
