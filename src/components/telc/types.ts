export type Grade = 'A' | 'B' | 'C' | 'D';

export type GradeCriterion =
  | 'aufgabengerechtheit_1a'
  | 'aufgabengerechtheit_1b'
  | 'diskussionsfuehrung'
  | 'fluessigkeit'
  | 'repertoire'
  | 'grammatische_richtigkeit'
  | 'aussprache';

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

export interface TelcContent {
  praesentation_topics: PraesentationTopic[];
  zitate: Zitat[];
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
  aufgabengerechtheit_1a: Grade;
  aufgabengerechtheit_1b: Grade;
  diskussionsfuehrung: Grade;
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
  | 'TEIL_1B_AI_LISTENS'
  | 'TEIL_1A_AI_PRESENTS'
  | 'TEIL_1B_CANDIDATE_LISTENS'
  | 'TEIL_2_DISKUSSION'
  | 'EVALUATION'
  | 'SELF_ASSESSMENT'
  | 'RESULTS';

export const PHASES: Record<Phase, Phase> = {
  IDLE: 'IDLE',
  PREP: 'PREP',
  TEIL_1A_CANDIDATE: 'TEIL_1A_CANDIDATE',
  TEIL_1B_AI_LISTENS: 'TEIL_1B_AI_LISTENS',
  TEIL_1A_AI_PRESENTS: 'TEIL_1A_AI_PRESENTS',
  TEIL_1B_CANDIDATE_LISTENS: 'TEIL_1B_CANDIDATE_LISTENS',
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
  aufgabengerechtheit_1a: 'Aufgabengerechtheit (Teil 1A)',
  aufgabengerechtheit_1b: 'Aufgabengerechtheit (Teil 1B)',
  diskussionsfuehrung: 'Diskussionsführung',
  fluessigkeit: 'Flüssigkeit',
  repertoire: 'Repertoire',
  grammatische_richtigkeit: 'Grammatische Richtigkeit',
  aussprache: 'Aussprache und Intonation',
};

export const LOCAL_STORAGE_KEYS = {
  CONTENT: 'telc_content',
  CURRENT_SESSION: 'telc_session_current',
  HISTORY: 'telc_history',
} as const;

export const DURATION = {
  PREP: 20 * 60,
  TEIL_1A: 3 * 60,
  TEIL_1B_ANSWERS: 60,
  TEIL_1B_QUESTIONS: 90,
  TEIL_2: 6 * 60,
} as const;
