import type { TelcEvaluation, TelcLanguageAnalysis } from '../models/types';
import type { TelcBenchmark } from '../data/telcBenchmarks';
import { evaluateTelcPresentation, OpenRouterError } from '../services/openRouter';
import { analyzeRedemittel } from './redemittelAnalyzer';
import { analyzeVocabulary } from './vocabularyAnalyzer';
import { analyzeArgumentation } from './argumentationAnalyzer';
import { telcBenchmarks } from '../data/telcBenchmarks';

export interface BenchmarkGradeResult {
  expected: string;
  actual: string;
  match: boolean;
}

export interface BenchmarkComparison {
  aufgabengerechtheit: BenchmarkGradeResult;
  flüssigkeit: BenchmarkGradeResult;
  repertoire: BenchmarkGradeResult;
  grammatischeRichtigkeit: BenchmarkGradeResult;
  ausspracheUndIntonation: BenchmarkGradeResult;
  readinessScore: { expected: number[]; actual: number; match: boolean };
  level: { expected: string; actual: string; match: boolean };
}

export interface BenchmarkResult {
  benchmark: TelcBenchmark;
  aiEvaluation: TelcEvaluation | null;
  languageAnalysis: TelcLanguageAnalysis | null;
  comparison: BenchmarkComparison | null;
  accuracy: number;
  error?: string;
  timestamp: number;
}

export interface BenchmarkRunReport {
  results: BenchmarkResult[];
  overallAccuracy: number;
  strictCount: number;
  generousCount: number;
  accurateCount: number;
  totalComparisons: number;
}

const GRADE_VALUES: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

function gradeValue(g: string): number {
  return GRADE_VALUES[g] ?? 0;
}

function compareGrade(expected: string, actual: string): boolean {
  return expected === actual;
}

function compareReadiness(score: number, min: number, max: number): boolean {
  return score >= min && score <= max;
}

function compareLevel(expected: string, actual: string): boolean {
  return expected === actual;
}

function calculateAccuracy(comparison: BenchmarkComparison): number {
  let correct = 0;
  let total = 0;

  for (const key of ['aufgabengerechtheit', 'flüssigkeit', 'repertoire', 'grammatischeRichtigkeit', 'ausspracheUndIntonation'] as const) {
    total++;
    if (comparison[key].match) correct++;
  }
  total++;
  if (comparison.readinessScore.match) correct++;
  total++;
  if (comparison.level.match) correct++;

  return Math.round((correct / total) * 100);
}

function detectBias(comparison: BenchmarkComparison): 'strict' | 'generous' | 'accurate' {
  let strictCount = 0;
  let generousCount = 0;

  for (const key of ['aufgabengerechtheit', 'flüssigkeit', 'repertoire', 'grammatischeRichtigkeit', 'ausspracheUndIntonation'] as const) {
    const expectedVal = gradeValue(comparison[key].expected);
    const actualVal = gradeValue(comparison[key].actual);
    if (actualVal < expectedVal) strictCount++;
    if (actualVal > expectedVal) generousCount++;
  }

  if (strictCount > generousCount && strictCount >= 2) return 'strict';
  if (generousCount > strictCount && generousCount >= 2) return 'generous';
  return 'accurate';
}

export async function runSingleBenchmark(
  benchmark: TelcBenchmark,
  config: { apiKey: string; model?: string }
): Promise<BenchmarkResult> {
  const timestamp = Date.now();

  // Run local analyzers
  const redemittel = analyzeRedemittel(benchmark.transcript);
  const vocabulary = analyzeVocabulary(benchmark.transcript);
  const argumentation = analyzeArgumentation(benchmark.transcript);
  const languageAnalysis: TelcLanguageAnalysis = { redemittel, vocabulary, argumentation };

  if (!config.apiKey) {
    return {
      benchmark,
      aiEvaluation: null,
      languageAnalysis,
      comparison: null,
      accuracy: 0,
      error: 'AI API key not configured. Set it in Settings first.',
      timestamp,
    };
  }

  // Run AI evaluator
  try {
    const result = await evaluateTelcPresentation(
      { apiKey: config.apiKey, model: config.model },
      benchmark.topic,
      benchmark.transcript,
      benchmark.duration,
      benchmark.wpm
    );

    const clean = result.replace(/```(?:json)?\s*/gi, '').trim();
    const parsed: TelcEvaluation = JSON.parse(clean);

    // Build comparison
    const comparison: BenchmarkComparison = {
      aufgabengerechtheit: {
        expected: benchmark.expectedGrades.aufgabengerechtheit,
        actual: parsed.aufgabengerechtheit,
        match: compareGrade(benchmark.expectedGrades.aufgabengerechtheit, parsed.aufgabengerechtheit),
      },
      flüssigkeit: {
        expected: benchmark.expectedGrades.flüssigkeit,
        actual: parsed.flüssigkeit,
        match: compareGrade(benchmark.expectedGrades.flüssigkeit, parsed.flüssigkeit),
      },
      repertoire: {
        expected: benchmark.expectedGrades.repertoire,
        actual: parsed.repertoire,
        match: compareGrade(benchmark.expectedGrades.repertoire, parsed.repertoire),
      },
      grammatischeRichtigkeit: {
        expected: benchmark.expectedGrades.grammatischeRichtigkeit,
        actual: parsed.grammatischeRichtigkeit,
        match: compareGrade(benchmark.expectedGrades.grammatischeRichtigkeit, parsed.grammatischeRichtigkeit),
      },
      ausspracheUndIntonation: {
        expected: benchmark.expectedGrades.ausspracheUndIntonation,
        actual: parsed.ausspracheUndIntonation,
        match: compareGrade(benchmark.expectedGrades.ausspracheUndIntonation, parsed.ausspracheUndIntonation),
      },
      readinessScore: {
        expected: [benchmark.expectedReadinessMin, benchmark.expectedReadinessMax],
        actual: parsed.readinessScore,
        match: compareReadiness(parsed.readinessScore, benchmark.expectedReadinessMin, benchmark.expectedReadinessMax),
      },
      level: {
        expected: benchmark.expectedLevel,
        actual: parsed.likelyExamLevel,
        match: compareLevel(benchmark.expectedLevel, parsed.likelyExamLevel),
      },
    };

    const accuracy = calculateAccuracy(comparison);

    return {
      benchmark,
      aiEvaluation: parsed,
      languageAnalysis,
      comparison,
      accuracy,
      timestamp,
    };
  } catch (err) {
    let errorMsg = 'Unknown error';
    if (err instanceof OpenRouterError) {
      errorMsg = err.message;
    } else if (err instanceof Error) {
      errorMsg = err.message;
    }
    return {
      benchmark,
      aiEvaluation: null,
      languageAnalysis,
      comparison: null,
      accuracy: 0,
      error: errorMsg,
      timestamp,
    };
  }
}

export async function runAllBenchmarks(
  config: { apiKey: string; model?: string }
): Promise<BenchmarkRunReport> {
  const results: BenchmarkResult[] = [];

  for (const benchmark of telcBenchmarks) {
    const result = await runSingleBenchmark(benchmark, config);
    results.push(result);
  }

  // Calculate overall stats
  const completedResults = results.filter((r) => r.comparison !== null);
  const totalComparisons = completedResults.length;
  const overallAccuracy = completedResults.length > 0
    ? Math.round(completedResults.reduce((sum, r) => sum + r.accuracy, 0) / completedResults.length)
    : 0;

  let strictCount = 0;
  let generousCount = 0;
  let accurateCount = 0;

  for (const r of completedResults) {
    if (!r.comparison) continue;
    const bias = detectBias(r.comparison);
    if (bias === 'strict') strictCount++;
    else if (bias === 'generous') generousCount++;
    else accurateCount++;
  }

  return {
    results,
    overallAccuracy,
    strictCount,
    generousCount,
    accurateCount,
    totalComparisons,
  };
}
