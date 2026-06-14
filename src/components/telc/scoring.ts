import type { Grade, AIEvaluation, GradeCriterion, DetailedEvaluation, Teil2DetailedEvaluation } from './types';

const POINTS: Record<Grade, number> = {
  A: 8,
  B: 5,
  C: 2,
  D: 0,
};

export const TOTAL_MAX = 40;
export const PASS_THRESHOLD = 29;

export function gradeToPoints(grade: Grade, _criterion?: string): number {
  return POINTS[grade] ?? 0;
}

const ALL_CRITERIA: GradeCriterion[] = [
  'aufgabengerechtheit',
  'fluessigkeit',
  'repertoire',
  'grammatische_richtigkeit',
  'aussprache',
];

export function calculateTotal(evaluation: Pick<AIEvaluation, GradeCriterion>): number {
  return ALL_CRITERIA.reduce((sum, key) => sum + gradeToPoints(evaluation[key] as Grade), 0);
}

export function hasPassed(totalPoints: number): boolean {
  return totalPoints >= PASS_THRESHOLD;
}

export function maxPointsFor(): number {
  return 8;
}

interface RawPart {
  grade?: Grade;
  content_notes?: string[];
  language_notes?: string[];
}

interface RawTeil2 extends RawPart {
  inhalt?: string;
  argumentation?: string;
  reaktion?: string;
  sprache?: string;
  interaktion?: string;
  gesamtkommentar?: string;
}

interface RawEval {
  aufgabengerechtheit?: Grade;
  fluessigkeit?: Grade;
  repertoire?: Grade;
  grammatische_richtigkeit?: Grade;
  aussprache?: Grade;
  feedback?: { strengths?: string[]; improvements?: string[]; overall_comment?: string };
  note?: string;
  per_part?: {
    teil_1a?: RawPart;
    teil_1b?: RawPart;
    teil_2?: RawTeil2;
  };
}

function buildPart(raw: RawPart | undefined): { grade: Grade; content_notes: string[]; language_notes: string[] } {
  return {
    grade: raw?.grade || 'B',
    content_notes: Array.isArray(raw?.content_notes) ? raw.content_notes : [],
    language_notes: Array.isArray(raw?.language_notes) ? raw.language_notes : [],
  };
}

function buildTeil2(raw: RawTeil2 | undefined): Teil2DetailedEvaluation {
  return {
    grade: raw?.grade || 'B',
    inhalt: typeof raw?.inhalt === 'string' ? raw.inhalt : '',
    argumentation: typeof raw?.argumentation === 'string' ? raw.argumentation : '',
    reaktion: typeof raw?.reaktion === 'string' ? raw.reaktion : '',
    sprache: typeof raw?.sprache === 'string' ? raw.sprache : '',
    interaktion: typeof raw?.interaktion === 'string' ? raw.interaktion : '',
    gesamtkommentar: typeof raw?.gesamtkommentar === 'string' ? raw.gesamtkommentar : '',
    content_notes: Array.isArray(raw?.content_notes) ? raw.content_notes : undefined,
    language_notes: Array.isArray(raw?.language_notes) ? raw.language_notes : undefined,
  };
}

export function buildEvaluation(raw: RawEval): AIEvaluation {
  const evaluation: AIEvaluation = {
    aufgabengerechtheit: raw.aufgabengerechtheit || 'B',
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
  if (raw.per_part) {
    const detailed: DetailedEvaluation = {
      teil_1a: buildPart(raw.per_part.teil_1a),
      teil_1b: buildPart(raw.per_part.teil_1b),
      teil_2: buildTeil2(raw.per_part.teil_2),
    };
    evaluation.per_part = detailed;
  }
  return evaluation;
}
