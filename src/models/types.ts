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
}

export interface DiscussionTurn {
  role: 'examiner' | 'candidate';
  text: string;
}

export interface FollowUpQA {
  question: string;
  answer: string;
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
}
