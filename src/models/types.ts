export interface ChunkData {
  id: string;
  text: string;
  order: number;
}

export interface Sentence {
  id: string;
  text: string;
  order: number;
  isCompleted: boolean;
  attempts?: number;
  bestScore?: number;
  lastScore?: number;
  lastReviewedAt?: number;
  nextReviewAt?: number;
  masteryLevel?: number; // 0-5
}

export interface ExamSession {
  id: string;
  topicId: string;
  topicTitle: string;
  date: number;
  coverageScore: number;
  wordCount: number;
  duration: number; // in seconds
  speakingWPM: number;
  transcript: string;
}

export interface WordStat {
  word: string;
  attempts: number;
  bestScore: number;
  lastScore: number;
  averageScore: number;
  lastPracticedAt: number;
  nearMatchCount: number;
  missingCount: number;
  incorrectCount: number;
}

export interface VoiceSettings {
  voiceURI: string;
  pitch: number;
  volume: number;
  rate: number;
}

export interface Topic {
  id: string;
  title: string;
  rawContent: string;
  splitMethod: 'auto' | 'punctuation' | 'newline' | 'manual';
  sentences: Sentence[];
  createdAt: number;
}

// --- TELC Types ---

export interface TelcSettings {
  aiEnabled: boolean;
  apiKey: string;
  model: string;
}

export interface TelcGrade {
  aufgabengerechtheit: 'A' | 'B' | 'C' | 'D';
  flüssigkeit: 'A' | 'B' | 'C' | 'D';
  repertoire: 'A' | 'B' | 'C' | 'D';
  grammatischeRichtigkeit: 'A' | 'B' | 'C' | 'D';
  ausspracheUndIntonation: 'A' | 'B' | 'C' | 'D';
}

export interface TelcEvaluation extends TelcGrade {
  estimatedPoints: number;
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  improvementSuggestions: string[];
  readinessScore: number;
  likelyExamLevel: 'Strong Pass' | 'Pass' | 'Borderline';
  discussionPerformance?: {
    grade: 'A' | 'B' | 'C' | 'D';
    abilityToAnswer: boolean;
    abilityToDefend: boolean;
    abilityToReact: boolean;
    description: string;
  };
}

export interface DiscussionTurn {
  role: 'examiner' | 'candidate';
  text: string;
}

export interface FollowUpQA {
  question: string;
  answer: string;
}

// --- Evaluation Feedback & Calibration ---

export type TelcFeedbackVote = 'accurate' | 'too-strict' | 'too-generous';

export interface TelcFeedback {
  sessionId: string;
  vote: TelcFeedbackVote;
  timestamp: number;
}

export interface CalibrationStats {
  totalEvaluations: number;
  accurate: number;
  tooStrict: number;
  tooGenerous: number;
}

// --- Language Analysis Results ---

export interface ConnectorMatch {
  connector: string;
  count: number;
}

export interface RedemittelResult {
  totalConnectors: number;
  uniqueConnectors: number;
  matches: ConnectorMatch[];
  score: 'A' | 'B' | 'C' | 'D';
  levelEstimation: string;
}

export interface VocabularyResult {
  uniqueWords: number;
  totalWords: number;
  diversity: number;
  advancedCount: number;
  overusedWords: { word: string; count: number }[];
  basicWords: { word: string; count: number }[];
  level: 'A' | 'B' | 'C' | 'D';
}

export interface ArgumentationResult {
  hasExamples: boolean;
  hasJustification: boolean;
  hasCounterarguments: boolean;
  hasConclusion: boolean;
  patternsFound: string[];
  score: 'A' | 'B' | 'C' | 'D';
}

// --- Language Analysis (stored per session) ---

export interface TelcLanguageAnalysis {
  redemittel: RedemittelResult;
  vocabulary: VocabularyResult;
  argumentation: ArgumentationResult;
}

export type SummaryFeedback = 'ja' | 'teilweise' | 'nein';

export interface DurationEvaluation {
  range: 'unter-90' | '90-150' | '150-210' | '210-240' | 'ueber-240';
  label: string;
  penalty: 'strong' | 'moderate' | 'none' | 'acceptable' | 'slight';
}

export interface DiscussionPerformance {
  grade: 'A' | 'B' | 'C' | 'D';
  abilityToAnswer: boolean;
  abilityToDefend: boolean;
  abilityToReact: boolean;
  description: string;
}

export interface TelcExamSession {
  id: string;
  topic: string;
  transcript: string;
  duration: number;
  wordCount: number;
  wpm: number;
  timestamp: number;
  discussionTurns: DiscussionTurn[];
  followUpQA: FollowUpQA[];
  evaluation: TelcEvaluation | null;
  aiAvailable: boolean;
  audioBlob?: string;
  languageAnalysis?: TelcLanguageAnalysis;
  aiSummary?: string;
  summaryFeedback?: SummaryFeedback;
  durationEvaluation?: DurationEvaluation;
  discussionPerformance?: DiscussionPerformance;
}
