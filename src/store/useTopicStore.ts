import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Topic, Sentence, ExamSession, VoiceSettings, WordStat, ChunkData, TelcSettings, TelcExamSession, TelcEvaluation, FollowUpQA } from '../models/types';
import type { ComparedWord } from '../utils/accuracyEngine';

interface TopicState {
  topics: Topic[];
  examHistory: ExamSession[];
  voiceSettings: VoiceSettings;
  wordStats: Record<string, WordStat>;
  sentenceChunks: Record<string, ChunkData[]>;
  telcSettings: TelcSettings;
  telcHistory: TelcExamSession[];
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'sentences'>, sentences: Sentence[]) => void;
  deleteTopic: (id: string) => void;
  toggleSentence: (topicId: string, sentenceId: string) => void;
  updateSentenceScore: (topicId: string, sentenceId: string, score: number) => void;
  getTopicProgress: (topicId: string) => number;
  addExamSession: (session: ExamSession) => void;
  updateTopicSentences: (topicId: string, sentences: Sentence[]) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  updateWordScore: (word: string, score: number) => void;
  recordWordResults: (words: ComparedWord[]) => void;
  updateSentenceChunks: (sentenceId: string, chunks: ChunkData[]) => void;
  getSentenceChunks: (sentenceId: string) => ChunkData[];
  updateTelcSettings: (settings: Partial<TelcSettings>) => void;
  addTelcSession: (session: TelcExamSession) => void;
  updateTelcEvaluation: (sessionId: string, evaluation: TelcEvaluation) => void;
  updateTelcFollowUpQA: (sessionId: string, qa: FollowUpQA[]) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
}

const normalizeWord = (text: string) =>
  text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

export const useTopicStore = create<TopicState>()(
  persist(
    (set, get) => ({
      topics: [],
      examHistory: [],
      voiceSettings: {
        voiceURI: '',
        pitch: 1,
        volume: 1,
        rate: 1,
      },
      wordStats: {},
      sentenceChunks: {},
      telcSettings: {
        aiEnabled: false,
        apiKey: '',
        model: 'google/gemini-2.5-flash',
      },
      telcHistory: [],
      addTopic: (topicData, sentences) => {
        const newTopic: Topic = {
          ...topicData,
          id: crypto.randomUUID(),
          sentences,
          createdAt: Date.now(),
        };
        set((state) => ({ topics: [newTopic, ...state.topics] }));
      },
      deleteTopic: (id) => {
        set((state) => ({ topics: state.topics.filter((t) => t.id !== id) }));
      },
      toggleSentence: (topicId, sentenceId) => {
        set((state) => ({
          topics: state.topics.map((topic) =>
            topic.id === topicId
              ? {
                  ...topic,
                  sentences: topic.sentences.map((s) =>
                    s.id === sentenceId ? { ...s, isCompleted: !s.isCompleted } : s
                  ),
                }
              : topic
          ),
        }));
      },
      updateSentenceScore: (topicId, sentenceId, score) => {
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        
        let nextReviewDays = 0;
        if (score >= 95) nextReviewDays = 7;
        else if (score >= 90) nextReviewDays = 3;
        else if (score >= 80) nextReviewDays = 1;
        else nextReviewDays = 0;

        set((state) => ({
          topics: state.topics.map((topic) =>
            topic.id === topicId
              ? {
                  ...topic,
                  sentences: topic.sentences.map((s) =>
                    s.id === sentenceId
                      ? {
                          ...s,
                          attempts: (s.attempts || 0) + 1,
                          lastScore: score,
                          bestScore: Math.max(s.bestScore || 0, score),
                          lastReviewedAt: now,
                          nextReviewAt: now + (nextReviewDays * ONE_DAY),
                          masteryLevel: score >= 90 ? Math.min((s.masteryLevel || 0) + 1, 5) : s.masteryLevel,
                        }
                      : s
                  ),
                }
              : topic
          ),
        }));
      },
      getTopicProgress: (topicId) => {
        const topic = get().topics.find((t) => t.id === topicId);
        if (!topic || topic.sentences.length === 0) return 0;
        const completed = topic.sentences.filter((s) => s.isCompleted).length;
        return Math.round((completed / topic.sentences.length) * 100);
      },
      addExamSession: (session) => {
        set((state) => ({ examHistory: [session, ...state.examHistory] }));
      },
      updateTopicSentences: (topicId, sentences) => {
        set((state) => ({
          topics: state.topics.map((t) =>
            t.id === topicId ? { ...t, sentences } : t
          ),
        }));
      },
      updateVoiceSettings: (settings) => {
        set((state) => ({ voiceSettings: { ...state.voiceSettings, ...settings } }));
      },
      updateWordScore: (word, score) => {
        set((state) => {
          const normalized = normalizeWord(word);
          const existing = state.wordStats[normalized] || {
            word, attempts: 0, bestScore: 0, lastScore: 0,
            averageScore: 0, lastPracticedAt: 0,
            nearMatchCount: 0, missingCount: 0, incorrectCount: 0,
          };
          const newAttempts = existing.attempts + 1;
          const newAvg = Math.round(
            ((existing.averageScore * existing.attempts) + score) / newAttempts
          );
          return {
            wordStats: {
              ...state.wordStats,
              [normalized]: {
                ...existing,
                word,
                attempts: newAttempts,
                bestScore: Math.max(existing.bestScore, score),
                lastScore: score,
                averageScore: newAvg,
                lastPracticedAt: Date.now(),
              },
            },
          };
        });
      },

      recordWordResults: (words) => {
        set((state) => {
          const now = Date.now();
          const updates: Record<string, Partial<WordStat>> = {};

          for (const w of words) {
            if (w.status === 'correct' || w.status === 'extra') continue;
            const normalized = normalizeWord(w.text);
            const existing = state.wordStats[normalized];
            const score = Math.round(w.similarity * 100);
            const newAttempts = (existing?.attempts || 0) + 1;
            const oldAvg = existing?.averageScore || 0;
            const oldAttempts = existing?.attempts || 0;
            const newAvg = Math.round((oldAvg * oldAttempts + score) / newAttempts);

            const base = {
              word: w.text,
              attempts: newAttempts,
              bestScore: Math.max(existing?.bestScore || 0, score),
              lastScore: score,
              averageScore: newAvg,
              lastPracticedAt: now,
              nearMatchCount: existing?.nearMatchCount || 0,
              missingCount: existing?.missingCount || 0,
              incorrectCount: existing?.incorrectCount || 0,
            };

            if (w.status === 'near-match') base.nearMatchCount = (existing?.nearMatchCount || 0) + 1;
            if (w.status === 'missing') base.missingCount = (existing?.missingCount || 0) + 1;
            if (w.status === 'incorrect') base.incorrectCount = (existing?.incorrectCount || 0) + 1;

            updates[normalized] = base;
          }

          if (Object.keys(updates).length === 0) return state;

          return {
            wordStats: {
              ...state.wordStats,
              ...Object.fromEntries(
                Object.entries(updates).map(([key, val]) => [key, { ...state.wordStats[key], ...val }])
              ),
            },
          };
        });
      },
      updateSentenceChunks: (sentenceId, chunks) => {
        set((state) => ({
          sentenceChunks: { ...state.sentenceChunks, [sentenceId]: chunks },
        }));
      },

      getSentenceChunks: (sentenceId) => {
        return get().sentenceChunks[sentenceId] || [];
      },

      updateTelcSettings: (settings) => {
        set((state) => ({ telcSettings: { ...state.telcSettings, ...settings } }));
      },

      addTelcSession: (session) => {
        set((state) => ({ telcHistory: [session, ...state.telcHistory] }));
      },

      updateTelcEvaluation: (sessionId, evaluation) => {
        set((state) => ({
          telcHistory: state.telcHistory.map((s) =>
            s.id === sessionId ? { ...s, evaluation, aiAvailable: true } : s
          ),
        }));
      },

      updateTelcFollowUpQA: (sessionId, qa) => {
        set((state) => ({
          telcHistory: state.telcHistory.map((s) =>
            s.id === sessionId ? { ...s, followUpQA: qa } : s
          ),
        }));
      },

      exportData: () => {
        const data = {
          topics: get().topics,
          examHistory: get().examHistory,
          version: '1.0.0',
          exportedAt: Date.now(),
        };
        return JSON.stringify(data, null, 2);
      },
      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (data && Array.isArray(data.topics)) {
            set({
              topics: data.topics,
              examHistory: data.examHistory || [],
            });
            return true;
          }
          return false;
        } catch (e) {
          console.error('Import failed:', e);
          return false;
        }
      },
      resetAll: () => {
        set({ topics: [], examHistory: [], wordStats: {} });
      },
    }),
    {
      name: 'c1-speaking-trainer-storage',
    }
  )
);
