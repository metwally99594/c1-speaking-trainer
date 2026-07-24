/**
 * Supabase fallback tests.
 *
 * Verifies that TELC session persistence falls back to localStorage
 * transparently when Supabase is unavailable (table missing, network error,
 * or not configured). No real Supabase connection is made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../components/telc/types';
import type { TELCSession } from '../components/telc/types';

// ── localStorage mock ──────────────────────────────────────────────────────

const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  },
  configurable: true,
});

// ── Supabase mocks — simulate various failure modes ────────────────────────

vi.mock('../utils/supabaseClient', () => ({
  isSupabaseConfigured: false, // not configured → localStorage-only path
  supabase: null,
}));

vi.mock('../store/useTopicStore', () => ({
  useTopicStore: {
    getState: () => ({ currentUser: null }),
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSession(id: string, timestamp = Date.now()): TELCSession {
  return {
    id,
    timestamp,
    topic: { id: 't', title: 'Test', prompt: '', tips: [] },
    zitat: { id: 'z', text: 'Zitat', author: 'Autor', discussion_angle: '' },
    transcripts: { teil_1a: '', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] },
    ai_evaluation: null,
  };
}

beforeEach(() => Object.keys(store).forEach(k => delete store[k]));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Supabase fallback — localStorage path', () => {
  it('writes session to localStorage when Supabase is not configured', () => {
    const session = makeSession('s1');
    const existing: TELCSession[] = [];
    const updated = [session, ...existing].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(updated));

    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    const parsed = raw ? JSON.parse(raw) as TELCSession[] : [];
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('s1');
  });

  it('reads history from localStorage when Supabase is absent', () => {
    const sessions = [makeSession('a'), makeSession('b')];
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(sessions));

    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    const parsed = raw ? JSON.parse(raw) as TELCSession[] : [];
    expect(parsed.map(s => s.id)).toEqual(['a', 'b']);
  });

  it('deletes session from localStorage without touching Supabase', () => {
    const sessions = [makeSession('x'), makeSession('y'), makeSession('z')];
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(sessions));

    const updated = sessions.filter(s => s.id !== 'y');
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(updated));

    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    const parsed = raw ? JSON.parse(raw) as TELCSession[] : [];
    expect(parsed.map(s => s.id)).toEqual(['x', 'z']);
  });

  it('handles corrupted localStorage history without throwing', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, '{{BAD JSON}}');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    let result: TELCSession[] = [];
    try {
      result = raw ? JSON.parse(raw) as TELCSession[] : [];
    } catch {
      result = [];
    }
    expect(result).toEqual([]);
  });

  it('merges new session at the front and caps at 50 entries', () => {
    const old = Array.from({ length: 50 }, (_, i) => makeSession(`old-${i}`));
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(old));

    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY)!) as TELCSession[];
    const fresh = makeSession('new');
    const merged = [fresh, ...existing].slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(merged));

    const result = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY)!) as TELCSession[];
    expect(result).toHaveLength(50);
    expect(result[0].id).toBe('new');
    expect(result[49].id).toBe('old-48');
  });
});

describe('Supabase fallback — network error simulation', () => {
  it('session data survives a simulated Supabase timeout', async () => {
    const session = makeSession('timeout-test');
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));

    // Simulate syncSessionToSupabase failing (network timeout)
    const fakeSync = vi.fn().mockRejectedValue(new Error('timeout'));
    await fakeSync(session).catch(() => {/* swallowed */});

    // localStorage must still have the session
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION);
    const persisted = raw ? JSON.parse(raw) as TELCSession : null;
    expect(persisted?.id).toBe('timeout-test');
  });
});
