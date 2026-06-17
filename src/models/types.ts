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

export interface ApiKeys {
  openrouter: string;
  groq: string;
}

export interface Topic {
  id: string;
  title: string;
  rawContent: string;
  splitMethod: 'auto' | 'punctuation' | 'newline' | 'manual';
  sentences: Sentence[];
  createdAt: number;
}


