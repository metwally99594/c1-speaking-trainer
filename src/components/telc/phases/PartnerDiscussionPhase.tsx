import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import type { Zitat, DiscussionTurn } from '../types';
import { DURATION } from '../types';

interface PartnerDiscussionPhaseProps {
  zitat: Zitat;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function PartnerDiscussionPhase({
  zitat, onTurnsReady,
}: PartnerDiscussionPhaseProps) {
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [activeRole, setActiveRole] = useState<'person_a' | 'person_b'>('person_a');
  const [inputText, setInputText] = useState('');
  const [discussionDone, setDiscussionDone] = useState(false);
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const addTurn = useCallback((role: 'person_a' | 'person_b', text: string) => {
    const turn: DiscussionTurn = { role, text };
    const next = [...turnsRef.current, turn];
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || discussionDone) return;
    setInputText('');
    addTurn(activeRole, text);
  }, [inputText, activeRole, discussionDone, addTurn]);

  const handleEnd = useCallback(() => {
    if (discussionDone) return;
    setDiscussionDone(true);
    onTurnsReady(turnsRef.current);
  }, [discussionDone, onTurnsReady]);

  const roleLabel = (r: DiscussionTurn['role']) => r === 'person_a' ? 'Person A' : r === 'person_b' ? 'Person B' : '';
  const activeColor = activeRole === 'person_a' ? '#3b82f6' : '#22c55e';

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Partner-Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie zu zweit über das Zitat (6 Minuten)
        </p>
      </div>

      {!discussionDone && (
        <Timer totalSeconds={DURATION.TEIL_2} running={!discussionDone} onEnd={handleEnd} />
      )}

      <div style={{
        background: 'rgba(245,158,11,0.08)', borderRadius: 10,
        border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}"
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>— {zitat.author}</p>
        {zitat.discussion_angle && (
          <p style={{ fontSize: 12, margin: '6px 0 0', color: '#64748b' }}>
            {zitat.discussion_angle}
          </p>
        )}
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 200, overflowY: 'auto', marginBottom: 14,
        paddingRight: 4,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: turn.role === 'person_a'
              ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'person_a'
              ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 4,
              color: turn.role === 'person_a' ? '#60a5fa' : '#4ade80',
            }}>
              {roleLabel(turn.role)}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: '#f1f5f9' }}>
              {turn.text}
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {!discussionDone && (
        <div>
          <div style={{
            display: 'flex', gap: 10, marginBottom: 10,
          }}>
            <button
              onClick={() => setActiveRole('person_a')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_a'
                  ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_a' ? '#60a5fa' : '#64748b',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Person A spricht
            </button>
            <button
              onClick={() => setActiveRole('person_b')}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_b'
                  ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_b' ? '#4ade80' : '#64748b',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              Person B spricht
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`${roleLabel(activeRole)} schreibt hier...`}
              rows={2}
              style={{
                flex: 1, padding: 10, borderRadius: 8, resize: 'none',
                border: `1px solid ${activeColor}33`,
                background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
                fontSize: 13, lineHeight: 1.6,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                padding: '10px 16px', borderRadius: 8, border: 'none',
                background: inputText.trim() ? activeColor : 'rgba(100,116,139,0.15)',
                color: inputText.trim() ? '#fff' : '#64748b',
                fontSize: 13, fontWeight: 600, cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                alignSelf: 'flex-end',
              }}
            >
              Senden
            </button>
          </div>
        </div>
      )}

      {!discussionDone ? (
        <button
          onClick={handleEnd}
          style={{
            width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none',
            background: 'rgba(100,116,139,0.15)', color: '#94a3b8',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Diskussion beenden
        </button>
      ) : (
        <button
          onClick={() => onTurnsReady(turnsRef.current)}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
            color: '#06081a', fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Auswertung anzeigen
        </button>
      )}
    </div>
  );
}
