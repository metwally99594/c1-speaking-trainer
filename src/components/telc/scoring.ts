import type { Grade, AIEvaluation, GradeCriterion } from './types';

const POINTS: Record<Grade, { teil_1a_disk: number; teil_1b: number; linguistic: number }> = {
  A: { teil_1a_disk: 6, teil_1b: 4, linguistic: 8 },
  B: { teil_1a_disk: 4, teil_1b: 2, linguistic: 5 },
  C: { teil_1a_disk: 2, teil_1b: 1, linguistic: 2 },
  D: { teil_1a_disk: 0, teil_1b: 0, linguistic: 0 },
};

export const TOTAL_MAX = 48;
export const PASS_THRESHOLD = 29;

export function gradeToPoints(grade: Grade, criterion: GradeCriterion): number {
  const g = POINTS[grade];
  if (!g) return 0;
  if (criterion === 'aufgabengerechtheit_1a') return g.teil_1a_disk;
  if (criterion === 'aufgabengerechtheit_1b') return g.teil_1b;
  if (criterion === 'diskussionsfuehrung') return g.teil_1a_disk;
  return g.linguistic;
}

const ALL_CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit_1a',
  'aufgabengerechtheit_1b',
  'diskussionsfuehrung',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];

export function calculateTotal(evaluation: Pick<AIEvaluation, GradeCriterion>): number {
  return ALL_CRITERIA.reduce((sum, key) => sum + gradeToPoints(evaluation[key] as Grade, key), 0);
}

export function hasPassed(totalPoints: number): boolean {
  return totalPoints >= PASS_THRESHOLD;
}

export function maxPointsFor(criterion: GradeCriterion): number {
  if (criterion === 'aufgabengerechtheit_1a') return 6;
  if (criterion === 'aufgabengerechtheit_1b') return 4;
  if (criterion === 'diskussionsfuehrung') return 6;
  return 8;
}

interface RawEval {
  aufgabengerechtheit_1a?: Grade;
  aufgabengerechtheit_1b?: Grade;
  diskussionsfuehrung?: Grade;
  fluessigkeit?: Grade;
  repertoire?: Grade;
  grammatische_richtigkeit?: Grade;
  aussprache?: Grade;
  feedback?: { strengths?: string[]; improvements?: string[]; overall_comment?: string };
  note?: string;
}

export function buildEvaluation(raw: RawEval): AIEvaluation {
  const evaluation: AIEvaluation = {
    aufgabengerechtheit_1a: raw.aufgabengerechtheit_1a || 'B',
    aufgabengerechtheit_1b: raw.aufgabengerechtheit_1b || 'B',
    diskussionsfuehrung: raw.diskussionsfuehrung || 'B',
    fluessigkeit: raw.fluessigkeit || 'B',
    repertoire: raw.repertoire || 'B',
    grammatische_richtigkeit: raw.grammatische_richtigkeit || 'B',
    aussprache: raw.aussprache || 'B',
    feedback: {
      strengths: raw.feedback?.strengths || [],
      improvements: raw.feedback?.improvements || [],
      overall_comment: raw.feedback?.overall_comment || '',
    },
    note: raw.note || '',
    total_points: 0,
    passed: false,
  };
  evaluation.total_points = calculateTotal(evaluation);
  evaluation.passed = hasPassed(evaluation.total_points);
  return evaluation;
}
