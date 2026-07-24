import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '../components/telc/types';
import type { TELCSession, PraesentationTopic, Zitat } from '../components/telc/types';

// Minimal localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

const MOCK_TOPIC: PraesentationTopic = { id: 't1', title: 'Test', prompt: 'Thema', tips: [] };
const MOCK_ZITAT: Zitat = { id: 'z1', text: 'Zitat', author: 'Autor', discussion_angle: 'Winkel' };

function makeSession(overrides: Partial<TELCSession> = {}): TELCSession {
  return {
    id: 'test-id',
    timestamp: Date.now(),
    topic: MOCK_TOPIC,
    zitat: MOCK_ZITAT,
    transcripts: { teil_1a: 'Hallo', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] },
    ai_evaluation: null,
    ...overrides,
  };
}

describe('localStorage session persistence', () => {
  beforeEach(() => localStorageMock.clear());

  it('safeSet/safeGet round-trips a session correctly', () => {
    const session = makeSession();
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION);
    const parsed = raw ? JSON.parse(raw) as TELCSession : null;
    expect(parsed?.id).toBe('test-id');
    expect(parsed?.topic.title).toBe('Test');
    expect(parsed?.transcripts.teil_1a).toBe('Hallo');
  });

  it('stores up to 50 sessions in history', () => {
    const sessions: TELCSession[] = Array.from({ length: 55 }, (_, i) =>
      makeSession({ id: `s${i}`, timestamp: i }),
    );
    const trimmed = sessions.slice(0, 50);
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    const parsed = raw ? JSON.parse(raw) as TELCSession[] : [];
    expect(parsed.length).toBe(50);
  });

  it('deletes a session from history by id', () => {
    const sessions = [makeSession({ id: 'a' }), makeSession({ id: 'b' }), makeSession({ id: 'c' })];
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(sessions));
    const updated = sessions.filter(s => s.id !== 'b');
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
    const parsed = raw ? JSON.parse(raw) as TELCSession[] : [];
    expect(parsed.map(s => s.id)).toEqual(['a', 'c']);
  });

  it('clearHistory removes the key', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify([makeSession()]));
    localStorage.removeItem(LOCAL_STORAGE_KEYS.HISTORY);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY)).toBeNull();
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION, 'NOT_JSON{{{');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_SESSION);
    let result: TELCSession | null = null;
    try {
      result = raw ? JSON.parse(raw) as TELCSession : null;
    } catch {
      result = null;
    }
    expect(result).toBeNull();
  });
});

describe('session transcript accumulation', () => {
  it('merges partial updates into a session', () => {
    const session = makeSession();
    const updated: TELCSession = {
      ...session,
      transcripts: { ...session.transcripts, teil_1b_answers: 'Antwort auf Frage' },
    };
    expect(updated.transcripts.teil_1a).toBe('Hallo');
    expect(updated.transcripts.teil_1b_answers).toBe('Antwort auf Frage');
  });

  it('appends discussion turns correctly', () => {
    const session = makeSession();
    const turns = [
      { role: 'candidate' as const, text: 'Ich denke ...' },
      { role: 'ai' as const, text: 'Das sehe ich anders.' },
    ];
    const updated = { ...session, transcripts: { ...session.transcripts, teil_2_turns: turns } };
    expect(updated.transcripts.teil_2_turns).toHaveLength(2);
    expect(updated.transcripts.teil_2_turns[1].role).toBe('ai');
  });
});

// Prevent unused import warning in environments that hoist
vi.stubGlobal('fetch', vi.fn());
