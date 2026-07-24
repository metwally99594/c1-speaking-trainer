import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, TrendingUp, BookOpen, Mic, MessageSquare } from 'lucide-react';
import useTELCSession from '../components/telc/useTELCSession';
import useTrainingPlan from '../components/telc/useTrainingPlan';
import type { TrainingTask, WeeklyGoal } from '../components/telc/useTrainingPlan';
import type { Grade } from '../components/telc/types';
import { PageHeader } from '../components/ui/PageHeader';

const GRADE_COLOR: Record<Grade, string> = {
  A: '#22c55e', B: '#60a5fa', C: '#f59e0b', D: '#ef4444',
};

const TEIL_ICON: Record<TrainingTask['teil'], React.ReactNode> = {
  teil_1a: <Mic size={16} />,
  teil_1b: <MessageSquare size={16} />,
  teil_2: <MessageSquare size={16} />,
  redemittel: <BookOpen size={16} />,
  general: <Target size={16} />,
};

const PRIORITY_BADGE: Record<TrainingTask['priority'], { label: string; color: string; bg: string }> = {
  high:   { label: 'Wichtig',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: 'Mittel',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low:    { label: 'Optional', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
};

function TaskCard({ task, onAction }: { task: TrainingTask; onAction: (task: TrainingTask) => void }) {
  const badge = PRIORITY_BADGE[task.priority];
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      border: `1px solid ${badge.color}33`,
      background: badge.bg,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)', color: badge.color,
      }}>
        {TEIL_ICON[task.teil]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{task.title}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, flexShrink: 0,
            background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44`,
          }}>
            {badge.label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px', lineHeight: 1.5 }}>
          {task.description}
        </p>
        <button
          onClick={() => onAction(task)}
          style={{
            padding: '7px 16px', borderRadius: 8, border: `1px solid ${badge.color}44`,
            background: 'rgba(255,255,255,0.04)', color: badge.color,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {task.action === 'start_exam' ? 'Prüfung starten' :
           task.action === 'review_redemittel' ? 'Redemittel ansehen' :
           task.action === 'review_errors' ? 'Fehler ansehen' :
           'Vokabeln üben'}
        </button>
      </div>
    </div>
  );
}

function GoalRow({ goal }: { goal: WeeklyGoal }) {
  if (goal.criterion === 'sessions') {
    const pct = Math.min(100, Math.round((goal.sessionsThisWeek / goal.targetSessions) * 100));
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: '#cbd5e1' }}>{goal.label}</span>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{goal.sessionsThisWeek} / {goal.targetSessions}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(100,116,139,0.2)' }}>
          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: '#60a5fa', transition: 'width 0.4s' }} />
        </div>
      </div>
    );
  }
  const grade = goal.currentGrade;
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.15)', marginBottom: 6,
    }}>
      <span style={{ fontSize: 12, color: '#cbd5e1' }}>{goal.label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {grade ? (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
            background: `${GRADE_COLOR[grade]}22`, color: GRADE_COLOR[grade],
          }}>
            {grade}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: '#475569' }}>—</span>
        )}
        <span style={{ fontSize: 12, color: '#475569' }}>→</span>
        <span style={{
          fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 6,
          background: `${GRADE_COLOR[goal.targetGrade]}11`, color: `${GRADE_COLOR[goal.targetGrade]}aa`,
          border: `1px dashed ${GRADE_COLOR[goal.targetGrade]}44`,
        }}>
          {goal.targetGrade}
        </span>
      </div>
    </div>
  );
}

const C1_REDEMITTEL = [
  { category: 'Präsentation einleiten', examples: ['Ich möchte heute über … sprechen.', 'Im Folgenden werde ich … erläutern.', 'Mein Thema lautet …'] },
  { category: 'Argumente einführen', examples: ['Zunächst möchte ich darauf hinweisen, dass …', 'Ein weiterer Aspekt ist …', 'Des Weiteren lässt sich feststellen, dass …'] },
  { category: 'Standpunkt vertreten', examples: ['Meiner Meinung nach …', 'Ich bin der Überzeugung, dass …', 'Meines Erachtens …'] },
  { category: 'Widersprechen / Einschränken', examples: ['Das sehe ich etwas anders, weil …', 'Allerdings muss man bedenken, dass …', 'Dem muss ich entgegenhalten, dass …'] },
  { category: 'Zustimmen und ergänzen', examples: ['Da gebe ich Ihnen vollkommen Recht.', 'Das stimmt, ich würde jedoch ergänzen …', 'Einerseits … andererseits …'] },
  { category: 'Schluss / Fazit', examples: ['Zusammenfassend lässt sich sagen, dass …', 'Abschließend möchte ich betonen …', 'Insgesamt bin ich der Ansicht, dass …'] },
];

export default function TrainingPlan() {
  const navigate = useNavigate();
  const sessionHook = useTELCSession();
  const plan = useTrainingPlan(sessionHook.history);
  const [activeTab, setActiveTab] = useState<'tasks' | 'goals' | 'redemittel'>('tasks');

  useEffect(() => {
    sessionHook.getHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = (task: TrainingTask) => {
    if (task.action === 'start_exam') {
      navigate('/telc');
    } else if (task.action === 'review_errors' || task.action === 'review_redemittel') {
      setActiveTab(task.action === 'review_redemittel' ? 'redemittel' : 'tasks');
    } else if (task.action === 'practice_vocab') {
      navigate('/words');
    }
  };

  const tabStyle = (active: boolean, color: string) => ({
    flex: 1 as const, padding: '8px 12px', borderRadius: 8, border: 'none',
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#94a3b8',
    fontSize: 13, fontWeight: 600 as const, cursor: 'pointer' as const,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Trainingsplan" />

      {/* Summary bar */}
      {plan.hasData && (
        <div style={{
          display: 'flex', gap: 10, flexWrap: 'wrap',
          padding: 14, borderRadius: 12,
          background: 'rgba(100,116,139,0.06)',
          border: '1px solid rgba(100,116,139,0.15)',
        }}>
          <Stat label="Sitzungen gesamt" value={String(plan.sessionCount)} />
          {plan.recentScore !== null && (
            <Stat
              label="Letzter Score"
              value={`${plan.recentScore}/48`}
              color={plan.recentPassed ? '#22c55e' : '#ef4444'}
            />
          )}
          {plan.weakestCriterion && (
            <Stat label="Schwächstes Kriterium" value={plan.weakestCriterion.replace(/_/g, ' ')} color="#f59e0b" />
          )}
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: 4, borderRadius: 10,
        background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.15)',
      }}>
        <button style={tabStyle(activeTab === 'tasks', '#60a5fa')} onClick={() => setActiveTab('tasks')}>
          <Target size={12} style={{ display: 'inline', marginRight: 4 }} />Heute
        </button>
        <button style={tabStyle(activeTab === 'goals', '#22c55e')} onClick={() => setActiveTab('goals')}>
          <TrendingUp size={12} style={{ display: 'inline', marginRight: 4 }} />Ziele
        </button>
        <button style={tabStyle(activeTab === 'redemittel', '#a78bfa')} onClick={() => setActiveTab('redemittel')}>
          <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }} />Redemittel
        </button>
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {plan.dailyTasks.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>
              Keine Aufgaben. Starte deine erste TELC-Prüfung!
            </p>
          ) : (
            plan.dailyTasks.map(task => (
              <TaskCard key={task.id} task={task} onAction={handleAction} />
            ))
          )}
        </div>
      )}

      {/* Goals tab */}
      {activeTab === 'goals' && (
        <div>
          {!plan.hasData ? (
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: 24 }}>
              Schließe eine Prüfung ab, um Ziele zu sehen.
            </p>
          ) : (
            plan.weeklyGoals.map(goal => (
              <GoalRow key={goal.criterion} goal={goal} />
            ))
          )}
        </div>
      )}

      {/* Redemittel tab */}
      {activeTab === 'redemittel' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {C1_REDEMITTEL.map(section => (
            <div key={section.category} style={{
              padding: 14, borderRadius: 12,
              background: 'rgba(100,116,139,0.05)',
              border: '1px solid rgba(100,116,139,0.15)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {section.category}
              </div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {section.examples.map((ex, i) => (
                  <li key={i} style={{
                    fontSize: 13, color: '#e2e8f0', lineHeight: 1.5,
                    padding: '6px 10px', borderRadius: 6,
                    background: 'rgba(167,139,250,0.06)',
                    borderLeft: '2px solid rgba(167,139,250,0.3)',
                  }}>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: '1 1 120px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color ?? '#f1f5f9' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
    </div>
  );
}
