import { useState } from 'react';
import { Play, Settings } from 'lucide-react';
import type { TopicPair, PraesentationTopic, Zitat } from '../types';

interface IdlePhaseProps {
  onStart: (topic: PraesentationTopic, zitat: Zitat) => void;
  onNavigateToAdmin: () => void;
}

function loadFromStorage<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}

export default function IdlePhase({ onStart, onNavigateToAdmin }: IdlePhaseProps) {
  const [pairs] = useState<TopicPair[]>(() => loadFromStorage<TopicPair>('telc_topic_pairs'));
  const [zitate] = useState<Zitat[]>(() => loadFromStorage<Zitat>('telc_zitate'));
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<'a' | 'b' | null>(null);
  const [selectedZitat, setSelectedZitat] = useState<Zitat | null>(null);

  const hasContent = pairs.length > 0 && zitate.length > 0;
  const canStart = selectedPairId && selectedChoice && selectedZitat;

  const handleStart = () => {
    if (!canStart) return;
    const pair = pairs.find(p => p.id === selectedPairId);
    if (!pair) return;
    const side = selectedChoice === 'a' ? pair.topic_a : pair.topic_b;
    const topic: PraesentationTopic = {
      id: pair.id,
      title: side.title,
      prompt: side.prompt,
      tips: side.tips || [],
    };
    onStart(topic, selectedZitat);
  };

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
            Bitte fügen Sie zuerst Themenvarianten und Zitate hinzu.
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
          Wählen Sie eine Themenvariante und ein Zitat
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px', color: '#f1f5f9' }}>
          Themenvarianten
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pairs.map(pair => (
            <div key={pair.id} style={{
              padding: 12, borderRadius: 10,
              border: selectedPairId === pair.id
                ? '2px solid #3b82f6'
                : '1px solid rgba(100,116,139,0.2)',
              background: selectedPairId === pair.id
                ? 'rgba(59,130,246,0.08)'
                : 'rgba(100,116,139,0.04)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', marginBottom: 8 }}>
                {pair.variante}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <SelectionCard
                  label="Thema A"
                  title={pair.topic_a.title}
                  prompt={pair.topic_a.prompt}
                  selected={selectedPairId === pair.id && selectedChoice === 'a'}
                  onClick={() => { setSelectedPairId(pair.id); setSelectedChoice('a'); }}
                />
                <SelectionCard
                  label="Thema B"
                  title={pair.topic_b.title}
                  prompt={pair.topic_b.prompt}
                  selected={selectedPairId === pair.id && selectedChoice === 'b'}
                  onClick={() => { setSelectedPairId(pair.id); setSelectedChoice('b'); }}
                />
              </div>
            </div>
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
        onClick={handleStart}
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

function SelectionCard({
  label, title, prompt, selected, onClick,
}: {
  label: string; title: string; prompt: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: 10, borderRadius: 8, cursor: 'pointer',
        border: selected ? '2px solid #3b82f6' : '1px solid rgba(100,116,139,0.15)',
        background: selected ? 'rgba(59,130,246,0.1)' : 'rgba(100,116,139,0.03)',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 3 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
        {prompt}
      </div>
    </button>
  );
}
