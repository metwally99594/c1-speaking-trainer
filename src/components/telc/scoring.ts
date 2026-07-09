import type { Grade, AIEvaluation, GradeCriterion, DetailedEvaluation, Teil2DetailedEvaluation } from './types';

export const TOTAL_MAX = 48; // Official max points for TELC C1 Hochschule speaking exam
export const PASS_THRESHOLD = 29; // Official pass threshold (60% of 48 = 28.8, rounded up to 29)

export function gradeToPoints(grade: Grade, criterion?: string): number {
  if (criterion === 'teil_1a' || criterion === 'teil_2') {
    // Max 6 points
    const points: Record<Grade, number> = { A: 6, B: 4, C: 2, D: 0 };
    return points[grade] ?? 0;
  }
  if (criterion === 'teil_1b') {
    // Max 4 points
    const points: Record<Grade, number> = { A: 4, B: 3, C: 1, D: 0 };
    return points[grade] ?? 0;
  }
  // Language Quality (Max 8 points)
  const points: Record<Grade, number> = { A: 8, B: 5, C: 2, D: 0 };
  return points[grade] ?? 0;
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

export function calculateOfficialTotal(
  teil1a: Grade,
  teil1b: Grade,
  teil2: Grade,
  fluessigkeit: Grade,
  repertoire: Grade,
  grammatik: Grade,
  aussprache: Grade
): number {
  const p1a = gradeToPoints(teil1a, 'teil_1a');
  const p1b = gradeToPoints(teil1b, 'teil_1b');
  const p2 = gradeToPoints(teil2, 'teil_2');
  
  const pFlu = gradeToPoints(fluessigkeit);
  const pRep = gradeToPoints(repertoire);
  const pGra = gradeToPoints(grammatik);
  const pAus = gradeToPoints(aussprache);

  return p1a + p1b + p2 + pFlu + pRep + pGra + pAus;
}

export function hasPassed(totalPoints: number): boolean {
  return totalPoints >= PASS_THRESHOLD;
}

export function maxPointsFor(criterion?: string): number {
  if (criterion === 'teil_1a' || criterion === 'teil_2') return 6;
  if (criterion === 'teil_1b') return 4;
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

  const t1aGrade = raw.per_part?.teil_1a?.grade || 'B';
  const t1bGrade = raw.per_part?.teil_1b?.grade || 'B';
  const t2Grade = raw.per_part?.teil_2?.grade || 'B';

  evaluation.total_points = calculateOfficialTotal(
    t1aGrade,
    t1bGrade,
    t2Grade,
    evaluation.fluessigkeit,
    evaluation.repertoire,
    evaluation.grammatische_richtigkeit,
    evaluation.aussprache
  );
  
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
