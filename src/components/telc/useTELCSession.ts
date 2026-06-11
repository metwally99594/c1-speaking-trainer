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
