import { GRADE_LABELS } from '../types';
import type { Grade, GradeCriterion } from '../types';
import { gradeToPoints, maxPointsFor } from '../scoring';

const GRADE_COLORS: Record<Grade, { bg: string; border: string; text: string }> = {
  A: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', text: '#22c55e' },
  B: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', text: '#3b82f6' },
  C: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
  D: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#ef4444' },
};

interface GradeCardProps {
  criterion: GradeCriterion;
  grade: Grade;
  label: string;
}

export default function GradeCard({ criterion, grade, label }: GradeCardProps) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.B;
  const points = gradeToPoints(grade, criterion);
  const max = maxPointsFor(criterion);

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {GRADE_LABELS[grade]}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.text, lineHeight: 1 }}>
          {grade}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {points}/{max}
        </div>
      </div>
    </div>
  );
}
