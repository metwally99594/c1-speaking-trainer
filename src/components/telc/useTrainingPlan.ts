import { useMemo } from 'react';
import type { TELCSession, Grade, GradeCriterion } from './types';
import { CRITERIA_LABELS } from './types';

export interface TrainingTask {
  id: string;
  teil: 'teil_1a' | 'teil_1b' | 'teil_2' | 'redemittel' | 'general';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  /** Route or action hint for the UI to link to */
  action: 'start_exam' | 'review_redemittel' | 'review_errors' | 'practice_vocab';
}

export interface WeeklyGoal {
  criterion: GradeCriterion | 'sessions';
  label: string;
  currentGrade: Grade | null;
  targetGrade: Grade;
  sessionsThisWeek: number;
  targetSessions: number;
}

export interface TrainingPlanResult {
  dailyTasks: TrainingTask[];
  weeklyGoals: WeeklyGoal[];
  weakestCriterion: GradeCriterion | null;
  recentScore: number | null;
  recentPassed: boolean | null;
  sessionCount: number;
  hasData: boolean;
}

const GRADE_ORDER: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1 };

function latestGradeFor(sessions: TELCSession[], key: GradeCriterion): Grade | null {
  for (const s of sessions) {
    if (s.ai_evaluation?.[key]) return s.ai_evaluation[key] as Grade;
  }
  return null;
}

function sessionsThisWeek(sessions: TELCSession[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return sessions.filter(s => s.timestamp >= weekAgo).length;
}

function findWeakestCriterion(sessions: TELCSession[]): GradeCriterion | null {
  const criteria: GradeCriterion[] = [
    'aufgabengerechtheit', 'fluessigkeit', 'repertoire',
    'grammatische_richtigkeit', 'aussprache',
  ];
  let worst: GradeCriterion | null = null;
  let worstScore = 5;
  for (const key of criteria) {
    const grade = latestGradeFor(sessions, key);
    if (grade && GRADE_ORDER[grade] < worstScore) {
      worstScore = GRADE_ORDER[grade];
      worst = key;
    }
  }
  return worst;
}

function buildDailyTasks(sessions: TELCSession[]): TrainingTask[] {
  const tasks: TrainingTask[] = [];
  const weekCount = sessionsThisWeek(sessions);
  const last = sessions[0] ?? null;
  const weakest = findWeakestCriterion(sessions);

  // Always suggest a practice session if below target frequency
  if (weekCount < 3) {
    tasks.push({
      id: 'do_exam',
      teil: 'general',
      title: 'TELC-Prüfung simulieren',
      description: weekCount === 0
        ? 'Diese Woche noch keine Prüfung — jetzt starten!'
        : `${weekCount} von 3 Prüfungen diese Woche — weiter so!`,
      priority: weekCount === 0 ? 'high' : 'medium',
      action: 'start_exam',
    });
  }

  // Weakest criterion-specific task
  if (weakest) {
    const grade = latestGradeFor(sessions, weakest);
    if (grade && grade !== 'A') {
      tasks.push({
        id: `improve_${weakest}`,
        teil: weakest === 'aufgabengerechtheit' ? 'general'
          : weakest === 'fluessigkeit' || weakest === 'aussprache' ? 'teil_1a'
          : 'general',
        title: `${CRITERIA_LABELS[weakest]} verbessern`,
        description: `Zuletzt bewertet mit Note ${grade}. Konzentriere dich in der nächsten Prüfung auf dieses Kriterium.`,
        priority: grade === 'D' ? 'high' : 'medium',
        action: 'start_exam',
      });
    }
  }

  // Language error review
  if (last?.language_errors) {
    const { grammatik, wortschatz, satzstruktur } = last.language_errors;
    const total = grammatik.length + wortschatz.length + satzstruktur.length;
    if (total > 0) {
      tasks.push({
        id: 'review_errors',
        teil: 'general',
        title: 'Sprachfehler wiederholen',
        description: `${total} Fehler aus der letzten Sitzung — gehe die Korrekturen durch, bevor du wieder aufnimmst.`,
        priority: total >= 5 ? 'high' : 'medium',
        action: 'review_errors',
      });
    }
  }

  // Teil 2 specific — check if Teil 2 grade is low
  const teil2Grade = last?.ai_evaluation?.per_part?.teil_2?.grade ?? null;
  if (teil2Grade && (teil2Grade === 'C' || teil2Grade === 'D')) {
    tasks.push({
      id: 'improve_teil2',
      teil: 'teil_2',
      title: 'Diskussionsstrategie üben',
      description: `Teil 2 (Diskussion) mit Note ${teil2Grade} bewertet. Übe Gegenargumente und Diskursmarker.`,
      priority: 'high',
      action: 'review_redemittel',
    });
  }

  // Redemittel review — always suggest at low priority as maintenance
  tasks.push({
    id: 'redemittel',
    teil: 'redemittel',
    title: 'Redemittel wiederholen',
    description: 'C1-Diskursmarker, Konnektoren und Redemittel für Präsentation und Diskussion.',
    priority: 'low',
    action: 'review_redemittel',
  });

  // Sort: high → medium → low
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => order[a.priority] - order[b.priority]);

  return tasks;
}

function buildWeeklyGoals(sessions: TELCSession[]): WeeklyGoal[] {
  const criteria: GradeCriterion[] = [
    'fluessigkeit', 'repertoire', 'grammatische_richtigkeit',
    'aussprache', 'aufgabengerechtheit',
  ];

  const goals: WeeklyGoal[] = criteria.map(key => {
    const current = latestGradeFor(sessions, key);
    const currentScore = current ? GRADE_ORDER[current] : 0;
    const target: Grade = currentScore >= 3 ? 'A' : currentScore >= 2 ? 'B' : 'B';
    return {
      criterion: key,
      label: CRITERIA_LABELS[key],
      currentGrade: current,
      targetGrade: target,
      sessionsThisWeek: sessionsThisWeek(sessions),
      targetSessions: 3,
    };
  });

  goals.push({
    criterion: 'sessions',
    label: 'Prüfungen pro Woche',
    currentGrade: null,
    targetGrade: 'A',
    sessionsThisWeek: sessionsThisWeek(sessions),
    targetSessions: 3,
  });

  return goals;
}

export default function useTrainingPlan(sessions: TELCSession[]): TrainingPlanResult {
  return useMemo(() => {
    const sorted = [...sessions].sort((a, b) => b.timestamp - a.timestamp);
    const last = sorted[0] ?? null;

    return {
      dailyTasks: buildDailyTasks(sorted),
      weeklyGoals: buildWeeklyGoals(sorted),
      weakestCriterion: findWeakestCriterion(sorted),
      recentScore: last?.ai_evaluation?.total_points ?? null,
      recentPassed: last?.ai_evaluation?.passed ?? null,
      sessionCount: sorted.length,
      hasData: sorted.length > 0,
    };
  }, [sessions]);
}
