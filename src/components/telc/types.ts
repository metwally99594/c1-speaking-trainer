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
