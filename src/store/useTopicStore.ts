import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Topic, Sentence, ExamSession, VoiceSettings } from '../models/types';

interface TopicState {
  topics: Topic[];
  examHistory: ExamSession[];
  voiceSettings: VoiceSettings;
  addTopic: (topic: Omit<Topic, 'id' | 'createdAt' | 'sentences'>, sentences: Sentence[]) => void;
  deleteTopic: (id: string) => void;
  toggleSentence: (topicId: string, sentenceId: string) => void;
  updateSentenceScore: (topicId: string, sentenceId: string, score: number) => void;
  getTopicProgress: (topicId: string) => number;
  addExamSession: (session: ExamSession) => void;
  updateTopicSentences: (topicId: string, sentences: Sentence[]) => void;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
}

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
        set({ topics: [], examHistory: [] });
      },
    }),
    {
      name: 'c1-speaking-trainer-storage',
    }
  )
);
