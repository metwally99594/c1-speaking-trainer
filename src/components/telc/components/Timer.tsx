import { useState, useEffect, useRef } from 'react';

interface TimerProps {
  totalSeconds: number;
  running?: boolean;
  onEnd?: () => void;
  paused?: boolean;
}

export default function Timer({ totalSeconds, running = true, onEnd, paused = false }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(totalSeconds);
    endedRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!running || paused) return;

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (!endedRef.current) {
            endedRef.current = true;
            onEnd?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, paused, onEnd]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let color = '#22c55e';
  if (remaining <= 20) color = '#ef4444';
  else if (remaining <= 60) color = '#f59e0b';

  return (
    <div style={{
      fontFamily: 'monospace',
      fontSize: 'clamp(2rem, 8vw, 3.5rem)',
      fontWeight: 700,
      color,
      textAlign: 'center',
      padding: '12px 0',
      transition: 'color 0.3s',
      letterSpacing: '0.05em',
    }}>
      {display}
    </div>
  );
}
