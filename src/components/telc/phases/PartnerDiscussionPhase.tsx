import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import type { Zitat, DiscussionTurn } from '../types';
import { DURATION } from '../types';
import useSTT from '../useSTT';

interface PartnerDiscussionPhaseProps {
  zitat: Zitat;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function PartnerDiscussionPhase({
  zitat, onTurnsReady,
}: PartnerDiscussionPhaseProps) {
  const stt = useSTT();
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [activeRole, setActiveRole] = useState<'person_a' | 'person_b'>('person_a');
  const [fallbackText, setFallbackText] = useState('');
  const [discussionDone, setDiscussionDone] = useState(false);
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processedTranscriptRef = useRef('');
  const fallbackTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    transcript, processing, fallbackMode, recording, error,
    startRecording, stopRecording, reset: sttReset,
  } = stt;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const addTurn = useCallback((role: 'person_a' | 'person_b', text: string) => {
    const turn: DiscussionTurn = { role, text };
    const next = [...turnsRef.current, turn];
    turnsRef.current = next;
    setTurns(next);
  }, []);

  // When STT finishes, attribute the transcript to the active role
  useEffect(() => {
    if (!transcript || processing || fallbackMode || discussionDone) return;
    if (transcript === processedTranscriptRef.current) return;
    processedTranscriptRef.current = transcript;
    addTurn(activeRole, transcript);
    sttReset();
  }, [transcript, processing, fallbackMode, discussionDone, activeRole, addTurn, sttReset]);

  const handleFallbackSend = useCallback(() => {
    const text = fallbackTextareaRef.current?.value?.trim() || '';
    if (!text || discussionDone) return;
    addTurn(activeRole, text);
    setFallbackText('');
    if (fallbackTextareaRef.current) fallbackTextareaRef.current.value = '';
    sttReset();
  }, [activeRole, discussionDone, addTurn, sttReset]);

  const handleEnd = useCallback(() => {
    if (discussionDone) return;
    if (recording) stopRecording();
    setDiscussionDone(true);
    onTurnsReady(turnsRef.current);
  }, [discussionDone, recording, stopRecording, onTurnsReady]);

  const roleLabel = (r: DiscussionTurn['role']) => r === 'person_a' ? 'Person A' : r === 'person_b' ? 'Person B' : '';
  const activeColor = activeRole === 'person_a' ? '#3b82f6' : '#22c55e';
  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : STATES.IDLE;

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

      {error && !fallbackMode && (
        <div style={{
          padding: 10, borderRadius: 8, marginBottom: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {!discussionDone && (
        <div>
          <div style={{
            display: 'flex', gap: 10, marginBottom: 12,
          }}>
            <button
              onClick={() => setActiveRole('person_a')}
              disabled={recording || processing}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_a'
                  ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_a' ? '#60a5fa' : '#64748b',
                fontSize: 13, fontWeight: 700,
                cursor: (recording || processing) ? 'not-allowed' : 'pointer',
                opacity: (recording || processing) ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              Person A spricht
            </button>
            <button
              onClick={() => setActiveRole('person_b')}
              disabled={recording || processing}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                background: activeRole === 'person_b'
                  ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.08)',
                color: activeRole === 'person_b' ? '#4ade80' : '#64748b',
                fontSize: 13, fontWeight: 700,
                cursor: (recording || processing) ? 'not-allowed' : 'pointer',
                opacity: (recording || processing) ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              Person B spricht
            </button>
          </div>

          {!fallbackMode ? (
            <div style={{
              display: 'flex', justifyContent: 'center', flexDirection: 'column',
              alignItems: 'center', gap: 8, marginBottom: 12,
            }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {roleLabel(activeRole)} aufnehmen
              </p>
              <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} />
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <textarea
                ref={fallbackTextareaRef}
                onChange={e => setFallbackText(e.target.value)}
                placeholder={`${roleLabel(activeRole)} schreibt hier...`}
                rows={2}
                style={{
                  width: '100%', padding: 10, borderRadius: 8, resize: 'none',
                  border: `1px solid ${activeColor}33`,
                  background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
                  fontSize: 13, lineHeight: 1.6, boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleFallbackSend}
                disabled={!fallbackText.trim()}
                style={{
                  marginTop: 8, padding: '10px 16px', borderRadius: 8, border: 'none',
                  background: fallbackText.trim() ? activeColor : 'rgba(100,116,139,0.15)',
                  color: fallbackText.trim() ? '#fff' : '#64748b',
                  fontSize: 13, fontWeight: 600,
                  cursor: fallbackText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Senden
              </button>
            </div>
          )}
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
