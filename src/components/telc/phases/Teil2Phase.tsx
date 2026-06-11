import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import TTSSpeaker from '../components/TTSSpeaker';
import { DURATION } from '../types';
import type { Zitat, DiscussionTurn } from '../types';
import useAIPartner from '../useAIPartner';

interface Teil2PhaseProps {
  zitat: Zitat;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function Teil2Phase({
  zitat,
  recording, processing, transcript, fallbackMode,
  startRecording, stopRecording,
  onTurnsReady,
}: Teil2PhaseProps) {
  const ai = useAIPartner();
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [discussionDone, setDiscussionDone] = useState(false);
  const [waitingForCandidate, setWaitingForCandidate] = useState(false);
  const [fallbackText, setFallbackText] = useState('');
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const mountedRef = useRef(true);
  const endedRef = useRef(false);
  const processedTranscriptRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  const addTurn = useCallback((role: 'ai' | 'candidate', text: string) => {
    const turn: DiscussionTurn = { role, text };
    setTurns(prev => {
      const next = [...prev, turn];
      turnsRef.current = next;
      return next;
    });
    return turn;
  }, []);

  const handleEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (recording) stopRecording();
    setDiscussionDone(true);
    setWaitingForCandidate(false);
    onTurnsReady(turnsRef.current);
  }, [recording, stopRecording, onTurnsReady]);

  // STEP 1: Leila opens the discussion
  useEffect(() => {
    let cancelled = false;
    const open = async () => {
      const response = await ai.openDiscussion(
        zitat.text, zitat.author, zitat.discussion_angle, zitat.discussion_questions,
      );
      if (!mountedRef.current || cancelled || !response) return;
      addTurn('ai', response);
      setWaitingForCandidate(true);
    };
    open();
    return () => { cancelled = true; };
  }, []);

  // STEP 2: When candidate speaks, Leila responds
  useEffect(() => {
    if (!transcript || processing || fallbackMode || discussionDone) return;
    if (transcript === processedTranscriptRef.current) return;
    processedTranscriptRef.current = transcript;

    setWaitingForCandidate(false);
    addTurn('candidate', transcript);

    let cancelled = false;
    const respond = async () => {
      const response = await ai.respondInDiscussion(
        zitat.text, zitat.discussion_angle, zitat.discussion_questions,
        turnsRef.current.map(t => ({ role: t.role, text: t.text })),
        transcript,
      );
      if (!mountedRef.current || cancelled || discussionDone) return;
      if (response) {
        addTurn('ai', response);
        setWaitingForCandidate(true);
      }
    };
    respond();
    return () => { cancelled = true; };
  }, [transcript, processing, fallbackMode, discussionDone]);

  // Fallback: candidate types instead of recording
  const handleFallbackSend = useCallback(() => {
    const text = fallbackText.trim();
    if (!text || discussionDone) return;
    setFallbackText('');
    setWaitingForCandidate(false);
    processedTranscriptRef.current = text;
    addTurn('candidate', text);

    let cancelled = false;
    const respond = async () => {
      const response = await ai.respondInDiscussion(
        zitat.text, zitat.discussion_angle, zitat.discussion_questions,
        turnsRef.current.map(t => ({ role: t.role, text: t.text })),
        text,
      );
      if (!mountedRef.current || cancelled || discussionDone) return;
      if (response) {
        addTurn('ai', response);
        setWaitingForCandidate(true);
      }
    };
    respond();
    return () => { cancelled = true; };
  }, [fallbackText, discussionDone, zitat, ai, addTurn]);

  const isCandidateTurn = waitingForCandidate && !ai.loading && !discussionDone;
  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : STATES.IDLE;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie mit Leila über das Zitat (6 Minuten)
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
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 280, overflowY: 'auto', marginBottom: 14,
        paddingRight: 4,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '10px 12px', borderRadius: 10,
            background: turn.role === 'ai'
              ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'ai'
              ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, marginBottom: 4,
              color: turn.role === 'ai' ? '#60a5fa' : '#4ade80',
            }}>
              {turn.role === 'ai' ? 'Leila' : 'Sie'}
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.6, color: '#f1f5f9',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <span style={{ flex: 1 }}>{turn.text}</span>
              {turn.role === 'ai' && <TTSSpeaker text={turn.text} compact />}
            </div>
          </div>
        ))}

        {ai.loading && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(59,130,246,0.04)',
            border: '1px solid rgba(59,130,246,0.1)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>
              Leila
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#3b82f6',
                  animation: `telc-bounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {ai.error && (
        <div style={{
          padding: 10, borderRadius: 8, marginBottom: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#fca5a5', fontSize: 12,
        }}>
          {ai.error}
        </div>
      )}

      {isCandidateTurn && !discussionDone && (
        <div style={{ marginBottom: 12 }}>
          {!fallbackMode ? (
            <div style={{
              display: 'flex', justifyContent: 'center', flexDirection: 'column',
              alignItems: 'center', gap: 8,
            }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                Ihre Antwort
              </p>
              <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} />
            </div>
          ) : (
            <div>
              <textarea
                value={fallbackText}
                onChange={e => setFallbackText(e.target.value)}
                placeholder="Ihr Diskussionsbeitrag auf Deutsch..."
                style={{
                  width: '100%', minHeight: 70, padding: 10, borderRadius: 8,
                  border: '1px solid rgba(100,116,139,0.3)',
                  background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
                  fontSize: 13, lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box',
                }}
              />
              <button
                onClick={handleFallbackSend}
                disabled={!fallbackText.trim()}
                style={{
                  marginTop: 8, padding: '10px 20px', borderRadius: 8,
                  border: 'none',
                  background: fallbackText.trim() ? '#3b82f6' : 'rgba(100,116,139,0.2)',
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

      <style>{`
        @keyframes telc-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
