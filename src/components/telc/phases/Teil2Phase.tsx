import { useState, useEffect, useCallback, useRef } from 'react';
import Timer from '../components/Timer';
import RecordButton, { STATES } from '../components/RecordButton';
import { DURATION } from '../types';
import type { Zitat, DiscussionTurn } from '../types';

const DISCUSSION_QUESTIONS = [
  'Inwieweit stimmen Sie der Aussage zu?',
  'Welche Erfahrungen haben Sie persönlich mit diesem Thema gemacht?',
  'Sehen Sie Vor- oder Nachteile in der dargestellten Position?',
  'Welche Rolle spielt dieses Thema Ihrer Meinung nach in der heutigen Gesellschaft?',
];

interface Teil2PhaseProps {
  zitat: Zitat;
  callPartner: (phase: string, content: string, candidateInput: string) => Promise<string | null>;
  recording: boolean;
  processing: boolean;
  transcript: string;
  fallbackMode: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  onTurnsReady: (turns: DiscussionTurn[]) => void;
}

export default function Teil2Phase({
  zitat, callPartner,
  recording, processing, transcript, fallbackMode,
  startRecording, stopRecording,
  onTurnsReady,
}: Teil2PhaseProps) {
  const [turns, setTurns] = useState<DiscussionTurn[]>([]);
  const [discussionDone, setDiscussionDone] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const turnsRef = useRef<DiscussionTurn[]>([]);
  const mountedRef = useRef(true);
  const endedRef = useRef(false);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const addTurn = useCallback((role: 'ai' | 'candidate', text: string) => {
    setTurns(prev => {
      const next = [...prev, { role, text }];
      turnsRef.current = next;
      return next;
    });
  }, []);

  const handleTimerEnd = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (recording) stopRecording();
    setDiscussionDone(true);
    onTurnsReady(turnsRef.current);
  }, [recording, stopRecording, onTurnsReady]);

  useEffect(() => {
    if (turns.length >= 6 && turns[turns.length - 1]?.role === 'ai' && !endedRef.current) {
      handleTimerEnd();
    }
  }, [turns, handleTimerEnd]);

  useEffect(() => {
    let cancelled = false;
    const openDiscussion = async () => {
      setAiLoading(true);
      try {
        const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
        const response = await callPartner(
          'TEIL_2',
          `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
          '',
        );
        if (!mountedRef.current || cancelled) return;
        if (response) addTurn('ai', response);
      } catch (err) {
        if (!mountedRef.current || cancelled) return;
        setAiError(err instanceof Error ? err.message : 'Fehler');
      } finally {
        if (mountedRef.current && !cancelled) setAiLoading(false);
      }
    };
    openDiscussion();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!transcript || processing || fallbackMode || discussionDone) return;
    addTurn('candidate', transcript);

    let cancelled = false;
    const getAiResponse = async () => {
      setAiLoading(true);
      setAiError(null);
      try {
        const lastCandidate = turnsRef.current.filter(t => t.role === 'candidate').pop()?.text || '';
        const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
        const response = await callPartner(
          'TEIL_2',
          `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
          lastCandidate,
        );
        if (!mountedRef.current || cancelled) return;
        if (response) addTurn('ai', response);
      } catch (err) {
        if (!mountedRef.current || cancelled) return;
        setAiError(err instanceof Error ? err.message : 'Fehler');
      } finally {
        if (mountedRef.current && !cancelled) setAiLoading(false);
      }
    };
    getAiResponse();
    return () => { cancelled = true; };
  }, [transcript, processing, fallbackMode, discussionDone]);

  const isCandidateTurn = !aiLoading && !discussionDone && turns.length > 0
    && turns[turns.length - 1]?.role === 'ai';
  const btnState = recording ? STATES.RECORDING : processing ? STATES.PROCESSING : transcript ? STATES.DONE : STATES.IDLE;

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>
          Teil 2 — Diskussion
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Diskutieren Sie über das Zitat (6 Minuten)
        </p>
      </div>

      {!discussionDone && (
        <Timer totalSeconds={DURATION.TEIL_2} running={!discussionDone} onEnd={handleTimerEnd} />
      )}

      <div style={{
        background: 'rgba(245,158,11,0.08)', borderRadius: 10,
        border: '1px solid rgba(245,158,11,0.2)', padding: 14, marginBottom: 12,
      }}>
        <p style={{ fontSize: 13, fontStyle: 'italic', margin: '0 0 4px', color: '#f1f5f9' }}>
          „{zitat.text}
        </p>
        <p style={{ fontSize: 12, margin: 0, color: '#94a3b8' }}>
          — {zitat.author}
        </p>
      </div>

      <div style={{
        background: 'rgba(59,130,246,0.05)', borderRadius: 10,
        border: '1px solid rgba(59,130,246,0.15)', padding: 12, marginBottom: 12,
      }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', margin: '0 0 6px' }}>
          Diskussionsfragen
        </p>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
          {DISCUSSION_QUESTIONS.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        maxHeight: 200, overflowY: 'auto', marginBottom: 16,
      }}>
        {turns.map((turn, i) => (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 8,
            background: turn.role === 'ai' ? 'rgba(59,130,246,0.08)' : 'rgba(34,197,94,0.08)',
            border: `1px solid ${turn.role === 'ai' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)'}`,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, marginBottom: 2,
              color: turn.role === 'ai' ? '#3b82f6' : '#22c55e',
            }}>
              {turn.role === 'ai' ? 'Partner' : 'Sie'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#f1f5f9' }}>
              {turn.text}
            </div>
          </div>
        ))}
      </div>

      {isCandidateTurn && !transcript && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
          <RecordButton state={btnState} onStart={startRecording} onStop={stopRecording} />
        </div>
      )}

      {aiLoading && (
        <div style={{ textAlign: 'center', padding: 12 }}>
          <p style={{ color: '#94a3b8', fontSize: 13 }}>Partner antwortet...</p>
        </div>
      )}

      {aiError && (
        <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>
          {aiError}
        </div>
      )}

      {fallbackMode && isCandidateTurn && !discussionDone && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', borderRadius: 10,
          border: '1px solid rgba(245,158,11,0.2)', padding: 14,
        }}>
          <textarea
            placeholder="Ihr Diskussionsbeitrag..."
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 8,
              border: '1px solid rgba(100,116,139,0.2)',
              background: 'rgba(0,0,0,0.2)', color: '#f1f5f9',
              fontSize: 13, lineHeight: 1.6, resize: 'vertical',
            }}
          />
          <button
            onClick={() => {
              const ta = document.querySelector('.telc-teil2 textarea') as HTMLTextAreaElement | null;
              const val = ta?.value || '';
              if (!val.trim()) return;
              addTurn('candidate', val);
              const getResponse = async () => {
                setAiLoading(true);
                setAiError(null);
                try {
                  const questionsText = DISCUSSION_QUESTIONS.map((q, i) => `${i + 1}. ${q}`).join('\n');
                  const response = await callPartner(
                    'TEIL_2',
                    `Zitat: "${zitat.text}" — ${zitat.author} (${zitat.discussion_angle})\n\nDiskussionsfragen:\n${questionsText}`,
                    val,
                  );
                  if (!mountedRef.current) return;
                  if (response) addTurn('ai', response);
                } catch (err) {
                  if (!mountedRef.current) return;
                  setAiError(err instanceof Error ? err.message : 'Fehler');
                } finally {
                  if (mountedRef.current) setAiLoading(false);
                }
              };
              getResponse();
            }}
            style={{
              marginTop: 8, padding: '10px 20px', borderRadius: 8,
              border: 'none', background: '#3b82f6', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Senden
          </button>
        </div>
      )}

      {discussionDone && (
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
