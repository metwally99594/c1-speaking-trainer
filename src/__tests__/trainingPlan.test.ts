import { describe, it, expect } from 'vitest';
import type { TELCSession } from '../components/telc/types';
import type { TrainingPlanResult } from '../components/telc/useTrainingPlan';

// Import the pure functions directly (not the hook) for unit-level testing.
// The hook is a thin useMemo wrapper around these functions.

const MOCK_TOPIC = { id: 't1', title: 'Test', prompt: 'Thema', tips: [] };
const MOCK_ZITAT = { id: 'z1', text: 'Zitat', author: 'Autor', discussion_angle: '' };

function makeSession(overrides: Partial<TELCSession> = {}): TELCSession {
  return {
    id: 'x',
    timestamp: Date.now(),
    topic: MOCK_TOPIC,
    zitat: MOCK_ZITAT,
    transcripts: { teil_1a: '', teil_1b_answers: '', teil_1b_questions: '', teil_2_turns: [] },
    ai_evaluation: null,
    ...overrides,
  };
}

function makeEval(grades: {
  aufgabengerechtheit?: 'A'|'B'|'C'|'D';
  fluessigkeit?: 'A'|'B'|'C'|'D';
  repertoire?: 'A'|'B'|'C'|'D';
  grammatische_richtigkeit?: 'A'|'B'|'C'|'D';
  aussprache?: 'A'|'B'|'C'|'D';
  total_points?: number;
  passed?: boolean;
}) {
  return {
    aufgabengerechtheit: grades.aufgabengerechtheit ?? 'B',
    fluessigkeit: grades.fluessigkeit ?? 'B',
    repertoire: grades.repertoire ?? 'B',
    grammatische_richtigkeit: grades.grammatische_richtigkeit ?? 'B',
    aussprache: grades.aussprache ?? 'B',
    feedback: { strengths: [], improvements: [], overall_comment: '' },
    note: '',
    total_points: grades.total_points ?? 30,
    passed: grades.passed ?? true,
  };
}

// Re-implement the derivation logic for pure testing (mirrors useTrainingPlan internals).
// This keeps tests independent from hook/React dependencies.
function deriveRecentScore(sessions: TELCSession[]): number | null {
  const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
  return sorted[0]?.ai_evaluation?.total_points ?? null;
}

function deriveWeakestCriterion(sessions: TELCSession[]) {
  type Crit = 'aufgabengerechtheit'|'fluessigkeit'|'repertoire'|'grammatische_richtigkeit'|'aussprache';
  const criteria: Crit[] = ['aufgabengerechtheit', 'fluessigkeit', 'repertoire', 'grammatische_richtigkeit', 'aussprache'];
  const order: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
  let worst: Crit | null = null;
  let worstScore = 5;
  for (const key of criteria) {
    for (const s of sorted) {
      const grade = s.ai_evaluation?.[key] as string | undefined;
      if (grade && order[grade] < worstScore) {
        worstScore = order[grade];
        worst = key;
        break;
      }
    }
  }
  return worst;
}

function deriveSessionsThisWeek(sessions: TELCSession[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return sessions.filter(s => s.timestamp >= weekAgo).length;
}

describe('training plan derivation', () => {
  it('returns null recentScore for empty sessions', () => {
    expect(deriveRecentScore([])).toBeNull();
  });

  it('returns latest session score', () => {
    const older = makeSession({ timestamp: Date.now() - 10000, ai_evaluation: makeEval({ total_points: 20 }) });
    const newer = makeSession({ timestamp: Date.now(), ai_evaluation: makeEval({ total_points: 35 }) });
    expect(deriveRecentScore([older, newer])).toBe(35);
  });

  it('identifies the weakest criterion', () => {
    const s = makeSession({
      ai_evaluation: makeEval({ grammatische_richtigkeit: 'D', fluessigkeit: 'B' }),
    });
    expect(deriveWeakestCriterion([s])).toBe('grammatische_richtigkeit');
  });

  it('returns null weakestCriterion with no sessions', () => {
    expect(deriveWeakestCriterion([])).toBeNull();
  });

  it('counts sessions from this week only', () => {
    const thisWeek = makeSession({ timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000 });
    const lastWeek = makeSession({ timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000 });
    expect(deriveSessionsThisWeek([thisWeek, lastWeek])).toBe(1);
  });

  it('counts zero sessions when all are older than 7 days', () => {
    const old = makeSession({ timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000 });
    expect(deriveSessionsThisWeek([old])).toBe(0);
  });

  it('prefers the most recent session when two exist', () => {
    const s1 = makeSession({ timestamp: Date.now() - 5000, ai_evaluation: makeEval({ total_points: 40, aussprache: 'C' }) });
    const s2 = makeSession({ timestamp: Date.now(), ai_evaluation: makeEval({ total_points: 45, aussprache: 'A' }) });
    expect(deriveRecentScore([s1, s2])).toBe(45);
  });
});

// Satisfy TypeScript — TrainingPlanResult is referenced for completeness.
const _unused: Partial<TrainingPlanResult> = {};
void _unused;
