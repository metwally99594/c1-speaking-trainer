import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Topic, Sentence, ExamSession, VoiceSettings, WordStat, ChunkData, ApiKeys, User } from '../models/types';
import type { ComparedWord } from '../utils/accuracyEngine';

interface TopicState {
  topics: Topic[];
  examHistory: ExamSession[];
  voiceSettings: VoiceSettings;
  wordStats: Record<string, WordStat>;
  sentenceChunks: Record<string, ChunkData[]>;
  apiKeys: ApiKeys;
  currentUser: User | null;
  users: Record<string, string>; // email -> password
  userProfiles: Record<string, User>; // email -> User
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'sentences'>, sentences: Sentence[]) => void;
  deleteTopic: (id: string) => void;
  toggleSentence: (topicId: string, sentenceId: string) => void;
  updateSentenceScore: (topicId: string, sentenceId: string, score: number) => void;
  getTopicProgress: (topicId: string) => number;
  addExamSession: (session: ExamSession) => void;
  updateTopicSentences: (topicId: string, sentences: Sentence[]) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  updateWordScore: (word: string, score: number) => void;
  recordWordResults: (words: ComparedWord[]) => void;
  updateSentenceChunks: (sentenceId: string, chunks: ChunkData[]) => void;
  getSentenceChunks: (sentenceId: string) => ChunkData[];
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
  registerUser: (name: string, email: string, password: string) => { success: boolean; error?: string };
  loginUser: (email: string, password: string) => { success: boolean; error?: string };
  logoutUser: () => void;
  updateUserProfile: (name: string, avatar?: string) => void;
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
      apiKeys: { openrouter: '', groq: '' },
      currentUser: null,
      users: {},
      userProfiles: {},

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
      setApiKeys: (keys) => {
        set((state) => ({ apiKeys: { ...state.apiKeys, ...keys } }));
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
            if (w.status === 'extra') continue;
            const normalized = normalizeWord(w.text);
            const existing = state.wordStats[normalized];
            if (w.status === 'correct' && !existing) continue;
            const score = w.status === 'correct' ? 100 : Math.round(w.similarity * 100);
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
      exportData: () => {
        const data = {
          topics: get().topics,
          examHistory: get().examHistory,
          wordStats: get().wordStats,
          sentenceChunks: get().sentenceChunks,
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
              wordStats: data.wordStats || {},
              sentenceChunks: data.sentenceChunks || {},
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
      registerUser: (name, email, password) => {
        const normalizedEmail = email.toLowerCase().trim();
        const existing = get().users[normalizedEmail];
        if (existing) {
          return { success: false, error: 'Diese E-Mail-Adresse wird bereits verwendet.' };
        }
        const newUser: User = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
          createdAt: Date.now(),
        };
        set((state) => ({
          users: { ...state.users, [normalizedEmail]: password },
          userProfiles: { ...state.userProfiles, [normalizedEmail]: newUser },
          currentUser: newUser,
        }));
        return { success: true };
      },
      loginUser: (email, password) => {
        const normalizedEmail = email.toLowerCase().trim();
        const savedPassword = get().users[normalizedEmail];
        if (!savedPassword || savedPassword !== password) {
          return { success: false, error: 'Ungültige E-Mail-Adresse oder Passwort.' };
        }
        const profile = get().userProfiles[normalizedEmail];
        set({ currentUser: profile });
        return { success: true };
      },
      logoutUser: () => {
        set({ currentUser: null });
      },
      updateUserProfile: (name, avatar) => {
        const user = get().currentUser;
        if (!user) return;
        const updatedUser = { ...user, name: name.trim(), avatar };
        const normalizedEmail = user.email.toLowerCase();
        set((state) => ({
          currentUser: updatedUser,
          userProfiles: { ...state.userProfiles, [normalizedEmail]: updatedUser },
        }));
      },
    }),
    {
      name: 'c1-speaking-trainer-storage',
    }
  )
);
