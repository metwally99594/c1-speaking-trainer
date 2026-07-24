import { useState, useCallback } from 'react';
import { LOCAL_STORAGE_KEYS } from './types';
import type { TELCSession, PraesentationTopic, Zitat } from './types';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import { useTopicStore } from '../../store/useTopicStore';

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

async function syncSessionToSupabase(session: TELCSession): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const userId = useTopicStore.getState().currentUser?.id;
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('telc_sessions')
      .upsert(
        { id: session.id, user_id: userId, session_json: session, created_at: new Date(session.timestamp).toISOString() },
        { onConflict: 'id' },
      );
    if (error) console.warn('[TELC] Supabase session sync warning:', error.message);
  } catch (err) {
    console.warn('[TELC] Supabase session sync failed:', err);
  }
}

async function fetchSessionsFromSupabase(): Promise<TELCSession[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const userId = useTopicStore.getState().currentUser?.id;
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('telc_sessions')
      .select('session_json')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      console.warn('[TELC] Supabase fetch sessions warning:', error.message);
      return null;
    }
    return (data ?? []).map((row: { session_json: TELCSession }) => row.session_json);
  } catch (err) {
    console.warn('[TELC] Supabase fetch sessions failed:', err);
    return null;
  }
}

async function deleteSessionFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const userId = useTopicStore.getState().currentUser?.id;
  if (!userId) return;
  try {
    await supabase.from('telc_sessions').delete().eq('id', id).eq('user_id', userId);
  } catch (err) {
    console.warn('[TELC] Supabase delete session failed:', err);
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
  getHistory: () => void;
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
    syncSessionToSupabase(session);
  }, []);

  const getHistory = useCallback((): void => {
    fetchSessionsFromSupabase().then(remote => {
      if (remote && remote.length > 0) {
        const merged = remote;
        safeSet(LOCAL_STORAGE_KEYS.HISTORY, merged.slice(0, 50));
        setHistory(merged);
      } else {
        const local = safeGet<TELCSession[]>(LOCAL_STORAGE_KEYS.HISTORY) || [];
        setHistory(local);
      }
    });
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(s => s.id !== id);
      safeSet(LOCAL_STORAGE_KEYS.HISTORY, updated);
      return updated;
    });
    deleteSessionFromSupabase(id);
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
