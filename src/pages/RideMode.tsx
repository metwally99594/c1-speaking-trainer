import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bike, ChevronLeft, Clock3, Pause, Play, RotateCcw, ShieldAlert, Square, Volume2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useTopicStore } from '../store/useTopicStore';
import { cn } from '../utils/cn';

const SPEEDS = [0.75, 1, 1.25];
const PAUSES = [1, 3, 5];
const REPEAT_OPTIONS = [3, 5, 7];

export default function RideMode() {
  const { topicId } = useParams<{ topicId: string }>();
  const topic = useTopicStore((state) => state.topics.find((item) => item.id === topicId));
  const voiceSettings = useTopicStore((state) => state.voiceSettings);

  const [rate, setRate] = useState(1);
  const [pauseSeconds, setPauseSeconds] = useState(3);
  const [repeatCount, setRepeatCount] = useState(5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused' | 'completed'>('idle');

  const statusRef = useRef(status);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const playSentenceRef = useRef<(index: number, repetition: number) => void>(() => {});

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const clearPending = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
    } catch {
      // The browser may release the lock automatically when the page is hidden.
    }
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Playback remains usable when Wake Lock is unavailable.
    }
  }, []);

  const stopPlayback = useCallback(() => {
    clearPending();
    window.speechSynthesis.cancel();
    setStatus('idle');
    setCurrentIndex(0);
    setCurrentRepetition(1);
    void releaseWakeLock();
  }, [clearPending, releaseWakeLock]);

  const playSentence = useCallback((index: number, repetition: number) => {
    if (!topic || statusRef.current !== 'playing') return;

    const sentence = topic.sentences[index];
    if (!sentence) return;

    setCurrentIndex(index);
    setCurrentRepetition(repetition);

    const utterance = new SpeechSynthesisUtterance(sentence.text);
    const voices = window.speechSynthesis.getVoices();
    const savedVoice = voiceSettings.voiceURI
      ? voices.find((voice) => voice.voiceURI === voiceSettings.voiceURI)
      : null;
    utterance.voice = savedVoice || voices.find((voice) => voice.lang.startsWith('de')) || null;
    utterance.lang = 'de-DE';
    utterance.rate = rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;

    utterance.onend = () => {
      if (statusRef.current !== 'playing') return;

      const hasAnotherRepetition = repetition < repeatCount;
      const hasNextSentence = index < topic.sentences.length - 1;

      if (!hasAnotherRepetition && !hasNextSentence) {
        setStatus('completed');
        void releaseWakeLock();
        return;
      }

      const nextIndex = hasAnotherRepetition ? index : index + 1;
      const nextRepetition = hasAnotherRepetition ? repetition + 1 : 1;
      timeoutRef.current = setTimeout(() => {
        playSentenceRef.current(nextIndex, nextRepetition);
      }, pauseSeconds * 1000);
    };

    utterance.onerror = () => {
      if (statusRef.current === 'playing') {
        timeoutRef.current = setTimeout(() => {
          playSentenceRef.current(index, repetition);
        }, 500);
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [pauseSeconds, rate, releaseWakeLock, repeatCount, topic, voiceSettings.pitch, voiceSettings.voiceURI, voiceSettings.volume]);

  useEffect(() => {
    playSentenceRef.current = playSentence;
  }, [playSentence]);

  const startPlayback = useCallback(() => {
    if (!topic?.sentences.length) return;
    clearPending();
    window.speechSynthesis.cancel();
    statusRef.current = 'playing';
    setStatus('playing');
    setCurrentIndex(0);
    setCurrentRepetition(1);
    void requestWakeLock();
    playSentenceRef.current(0, 1);
  }, [clearPending, requestWakeLock, topic]);

  const pausePlayback = useCallback(() => {
    clearPending();
    window.speechSynthesis.cancel();
    statusRef.current = 'paused';
    setStatus('paused');
  }, [clearPending]);

  const resumePlayback = useCallback(() => {
    statusRef.current = 'playing';
    setStatus('playing');
    void requestWakeLock();
    playSentenceRef.current(currentIndex, currentRepetition);
  }, [currentIndex, currentRepetition, requestWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'playing') {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [requestWakeLock]);

  useEffect(() => {
    return () => {
      clearPending();
      window.speechSynthesis.cancel();
      void releaseWakeLock();
    };
  }, [clearPending, releaseWakeLock]);

  if (!topic) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Topic not found</h2>
        <Link to="/" className="text-blue-400 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  const progress = topic.sentences.length > 0
    ? ((currentIndex + 1) / topic.sentences.length) * 100
    : 0;
  const isActive = status === 'playing' || status === 'paused';

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <PageHeader title={`Fahrmodus: ${topic.title}`} showBack />

      <div className="flex items-start gap-3 border border-amber-500/25 bg-amber-500/10 p-4 rounded-xl mb-6 text-amber-100">
        <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm leading-relaxed">
          Wiedergabe vor der Fahrt starten. Das Telefon während der Fahrt nicht bedienen.
        </p>
      </div>

      <section className="glass-panel border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Bike size={24} />
              </div>
              <div>
                <p className="font-bold text-white">{status === 'completed' ? 'Einheit abgeschlossen' : `Wiederholung ${currentRepetition} von ${repeatCount}`}</p>
                <p className="text-xs text-slate-500">{topic.sentences.length} Sätze</p>
              </div>
            </div>
            <span className="text-sm font-bold text-blue-400">{currentIndex + 1}/{topic.sentences.length}</span>
          </div>

          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="p-6 min-h-[180px] flex items-center justify-center text-center">
          <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed">
            {topic.sentences[currentIndex]?.text}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-slate-800 border-y border-slate-800">
          <SettingControl icon={<Volume2 size={14} />} label="Tempo">
            {SPEEDS.map((speed) => (
              <button key={speed} type="button" disabled={isActive} onClick={() => setRate(speed)} className={optionClass(rate === speed)}>
                {speed}x
              </button>
            ))}
          </SettingControl>

          <SettingControl icon={<Clock3 size={14} />} label="Pause">
            {PAUSES.map((seconds) => (
              <button key={seconds} type="button" disabled={isActive} onClick={() => setPauseSeconds(seconds)} className={optionClass(pauseSeconds === seconds)}>
                {seconds}s
              </button>
            ))}
          </SettingControl>

          <SettingControl icon={<RotateCcw size={14} />} label="Wdh.">
            {REPEAT_OPTIONS.map((count) => (
              <button key={count} type="button" disabled={isActive} onClick={() => setRepeatCount(count)} className={optionClass(repeatCount === count)}>
                {count}x
              </button>
            ))}
          </SettingControl>
        </div>

        <div className="p-6 flex items-center justify-center gap-3">
          {status === 'idle' || status === 'completed' ? (
            <button type="button" onClick={startPlayback} className="flex items-center justify-center gap-2 min-w-48 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-xl font-bold transition-colors">
              <Play size={20} fill="currentColor" />
              {status === 'completed' ? 'Erneut starten' : 'Wiedergabe starten'}
            </button>
          ) : (
            <>
              <button type="button" onClick={status === 'paused' ? resumePlayback : pausePlayback} className="w-14 h-14 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors" title={status === 'paused' ? 'Fortsetzen' : 'Pause'}>
                {status === 'paused' ? <Play size={22} fill="currentColor" /> : <Pause size={22} fill="currentColor" />}
              </button>
              <button type="button" onClick={stopPlayback} className="w-14 h-14 flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors" title="Stoppen">
                <Square size={20} fill="currentColor" />
              </button>
            </>
          )}
        </div>
      </section>

      <Link to={`/topic/${topic.id}`} className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-white transition-colors">
        <ChevronLeft size={16} />
        Zurück zum Thema
      </Link>
    </div>
  );
}

function SettingControl({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-950 p-3 min-w-0">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 mb-2">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center justify-center gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function optionClass(active: boolean) {
  return cn(
    'px-2 py-1 rounded-md text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    active ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white',
  );
}
