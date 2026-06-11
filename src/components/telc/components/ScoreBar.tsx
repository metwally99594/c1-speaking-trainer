import { TOTAL_MAX, PASS_THRESHOLD } from '../scoring';

interface ScoreBarProps {
  total: number;
}

export default function ScoreBar({ total }: ScoreBarProps) {
  const ratio = Math.min(total / TOTAL_MAX, 1);
  const passed = total >= PASS_THRESHOLD;

  const barColor = passed ? '#22c55e' : total >= PASS_THRESHOLD * 0.8 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6,
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>
          {total}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>
            / {TOTAL_MAX}
          </span>
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: passed ? '#22c55e' : '#ef4444',
          padding: '2px 8px', borderRadius: 6,
          background: passed ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        }}>
          {passed ? 'BESTANDEN' : 'NICHT BESTANDEN'}
        </div>
      </div>
      <div style={{
        width: '100%', height: 10, borderRadius: 5,
        background: 'rgba(100,116,139,0.2)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${(PASS_THRESHOLD / TOTAL_MAX) * 100}%`,
          height: '100%', position: 'absolute', top: 0, left: 0,
          borderRight: '2px dashed rgba(245,158,11,0.5)',
          opacity: 0.5,
        }} />
        <div style={{
          width: `${ratio * 100}%`,
          height: '100%', borderRadius: 5, background: barColor,
          transition: 'width 0.6s ease', position: 'relative', zIndex: 1,
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 4,
        fontSize: 11, color: '#94a3b8',
      }}>
        <span>0</span>
        <span style={{ color: 'rgba(245,158,11,0.6)' }}>Bestanden: {PASS_THRESHOLD}</span>
        <span>{TOTAL_MAX}</span>
      </div>
    </div>
  );
}
