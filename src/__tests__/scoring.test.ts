import { describe, it, expect } from 'vitest';
import {
  gradeToPoints,
  calculateOfficialTotal,
  hasPassed,
  buildEvaluation,
  TOTAL_MAX,
  PASS_THRESHOLD,
} from '../components/telc/scoring';

describe('gradeToPoints', () => {
  it('maps teil_1a/teil_2 grades to max 6', () => {
    expect(gradeToPoints('A', 'teil_1a')).toBe(6);
    expect(gradeToPoints('B', 'teil_1a')).toBe(4);
    expect(gradeToPoints('C', 'teil_1a')).toBe(2);
    expect(gradeToPoints('D', 'teil_1a')).toBe(0);
    expect(gradeToPoints('A', 'teil_2')).toBe(6);
  });

  it('maps teil_1b grades to max 4', () => {
    expect(gradeToPoints('A', 'teil_1b')).toBe(4);
    expect(gradeToPoints('B', 'teil_1b')).toBe(3);
    expect(gradeToPoints('C', 'teil_1b')).toBe(1);
    expect(gradeToPoints('D', 'teil_1b')).toBe(0);
  });

  it('maps language quality grades to max 8', () => {
    expect(gradeToPoints('A')).toBe(8);
    expect(gradeToPoints('B')).toBe(5);
    expect(gradeToPoints('C')).toBe(2);
    expect(gradeToPoints('D')).toBe(0);
  });
});

describe('calculateOfficialTotal', () => {
  it('sums all criteria to 48 for all-A', () => {
    const total = calculateOfficialTotal('A', 'A', 'A', 'A', 'A', 'A', 'A');
    // teil_1a=6, teil_1b=4, teil_2=6, flu=8, rep=8, gram=8, aus=8 = 48
    expect(total).toBe(48);
    expect(TOTAL_MAX).toBe(48);
  });

  it('returns 0 for all-D', () => {
    expect(calculateOfficialTotal('D', 'D', 'D', 'D', 'D', 'D', 'D')).toBe(0);
  });

  it('computes a mixed realistic score', () => {
    // teil_1a=B(4), teil_1b=A(4), teil_2=B(4), flu=B(5), rep=B(5), gram=C(2), aus=B(5)
    const total = calculateOfficialTotal('B', 'A', 'B', 'B', 'B', 'C', 'B');
    expect(total).toBe(4 + 4 + 4 + 5 + 5 + 2 + 5);
  });
});

describe('hasPassed', () => {
  it('passes at threshold', () => {
    expect(hasPassed(PASS_THRESHOLD)).toBe(true);
    expect(hasPassed(48)).toBe(true);
  });

  it('fails below threshold', () => {
    expect(hasPassed(PASS_THRESHOLD - 1)).toBe(false);
    expect(hasPassed(0)).toBe(false);
  });
});

describe('buildEvaluation', () => {
  const raw = {
    aufgabengerechtheit: 'B' as const,
    fluessigkeit: 'A' as const,
    repertoire: 'B' as const,
    grammatische_richtigkeit: 'C' as const,
    aussprache: 'B' as const,
    feedback: {
      strengths: ['Gute Struktur'],
      improvements: ['Mehr Vokabular'],
      overall_comment: 'Solide Leistung.',
    },
    note: '',
    per_part: {
      teil_1a: { grade: 'A' as const, content_notes: ['Klar'], language_notes: ['Flüssig'] },
      teil_1b: { grade: 'B' as const, content_notes: ['OK'], language_notes: [] },
      teil_2: {
        grade: 'C' as const,
        inhalt: 'Flach', argumentation: 'Fehlt', reaktion: 'OK',
        sprache: 'B2', interaktion: 'OK', gesamtkommentar: 'Verbesserungsbedarf',
      },
    },
  };

  it('computes total_points correctly from per_part grades', () => {
    const ev = buildEvaluation(raw);
    // teil_1a=A(6), teil_1b=B(3), teil_2=C(2), flu=A(8), rep=B(5), gram=C(2), aus=B(5) = 31
    expect(ev.total_points).toBe(6 + 3 + 2 + 8 + 5 + 2 + 5);
  });

  it('sets passed correctly', () => {
    const ev = buildEvaluation(raw);
    expect(ev.passed).toBe(hasPassed(ev.total_points));
  });

  it('preserves feedback strings', () => {
    const ev = buildEvaluation(raw);
    expect(ev.feedback.strengths).toEqual(['Gute Struktur']);
    expect(ev.feedback.overall_comment).toBe('Solide Leistung.');
  });

  it('defaults missing grades to B', () => {
    const ev = buildEvaluation({});
    expect(ev.aufgabengerechtheit).toBe('B');
    expect(ev.fluessigkeit).toBe('B');
  });
});
