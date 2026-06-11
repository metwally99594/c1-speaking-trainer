import { useState, useEffect } from 'react';
import { Play, Settings } from 'lucide-react';
import type { PraesentationTopic, Zitat } from '../types';

interface IdlePhaseProps {
  onStart: (topic: PraesentationTopic, zitat: Zitat) => void;
  onNavigateToAdmin: () => void;
}

function loadFromStorage<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export default function IdlePhase({ onStart, onNavigateToAdmin }: IdlePhaseProps) {
  const [topics, setTopics] = useState<PraesentationTopic[]>([]);
  const [zitate, setZitate] = useState<Zitat[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<PraesentationTopic | null>(null);
  const [selectedZitat, setSelectedZitat] = useState<Zitat | null>(null);

  useEffect(() => {
    setTopics(loadFromStorage<PraesentationTopic>('telc_topics'));
    setZitate(loadFromStorage<Zitat>('telc_zitate'));
  }, []);

  const canStart = selectedTopic && selectedZitat;
  const hasContent = topics.length > 0 && zitate.length > 0;

  if (!hasContent) {
    return (
      <div style={{ padding: '0 4px', textAlign: 'center', paddingTop: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#f1f5f9' }}>
          TELC C1 Mündlicher Ausdruck
        </h2>
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 12,
          border: '1px solid rgba(245,158,11,0.2)', padding: 20, marginBottom: 20, textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: '#f59e0b', margin: '0 0 12px', lineHeight: 1.6 }}>
            Bitte fügen Sie zuerst Themen und Zitate hinzu.
          </p>
          <button
            onClick={onNavigateToAdmin}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: '#06081a', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Inhalte verwalten
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={onNavigateToAdmin}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid rgba(100,116,139,0.2)',
            background: 'transparent', color: '#94a3b8',
            fontSize: 12, cursor: 'pointer',
          }}
        >
          <Settings size={14} /> Inhalte verwalten
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          TELC C1 Mündlicher Ausdruck
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Wählen Sie ein Thema und ein Zitat für die Prüfung
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Präsentationsthema
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map(topic => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                border: selectedTopic?.id === topic.id
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(100,116,139,0.2)',
                background: selectedTopic?.id === topic.id
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(100,116,139,0.04)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#f1f5f9' }}>
                {topic.title}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                {topic.prompt}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Zitat für die Diskussion
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zitate.map(z => (
            <button
              key={z.id}
              onClick={() => setSelectedZitat(z)}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: 10,
                border: selectedZitat?.id === z.id
                  ? '2px solid #3b82f6'
                  : '1px solid rgba(100,116,139,0.2)',
                background: selectedZitat?.id === z.id
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(100,116,139,0.04)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontStyle: 'italic', marginBottom: 4, color: '#f1f5f9' }}>
                „{z.text}
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                — {z.author}
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => canStart && onStart(selectedTopic!, selectedZitat!)}
        disabled={!canStart}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: canStart ? 'linear-gradient(135deg, #3b82f6, #60a5fa)' : 'rgba(100,116,139,0.2)',
          color: canStart ? '#06081a' : '#64748b',
          fontSize: 15, fontWeight: 600,
          cursor: canStart ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Play size={18} />
        Prüfung starten
      </button>
    </div>
  );
}
