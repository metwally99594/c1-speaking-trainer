import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../utils/cn';
import { CheckCircle2, AlertCircle, Clock, FileText, BarChart3, HelpCircle, Gauge } from 'lucide-react';
import type { ExamSession } from '../models/types';

const EXAMINER_QUESTIONS = [
  "Was halten Sie persönlich davon?",
  "Welche Vorteile sehen Sie?",
  "Welche Nachteile gibt es?",
  "Wie ist die Situation in Ihrem Heimatland?",
  "Welche Lösungen schlagen Sie vor?",
  "Welche Auswirkungen hat dieses Thema auf die Gesellschaft?"
];

interface SpeechRecognitionResultEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ExamSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: ((event: Event) => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => ExamSpeechRecognition;
  webkitSpeechRecognition?: new () => ExamSpeechRecognition;
}

export default function Exam() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === topicId));
  const addExamSession = useTopicStore((state) => state.addExamSession);

  const [phase, setPhase] = useState<'intro' | 'presentation' | 'questions' | 'result'>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questions] = useState<string[]>(() => {
    const shuffled = [...EXAMINER_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  });
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [examResult, setExamResult] = useState<ExamSession | null>(null);

  const recognitionRef = useRef<ExamSpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const keepAliveRef = useRef(false);
  const startNewSessionRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      keepAliveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_err) { void _err; }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------
  // Speech-recognition helpers (single-utterance, auto-restart)
  // Matches the pattern in SpeechRecognition.tsx.
  // continuous: false + interimResults: false is the only config that
  // works reliably on Android Chrome / Samsung devices.
  // -----------------------------------------------------------------
  const startNewSession = useCallback(() => {
    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognitionAPI =
      speechWindow.SpeechRecognition ||
      speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('SpeechRecognition not supported in this browser.');
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'de-DE';
    recognition.continuous = false;      // single-utterance mode — works on Android
    recognition.interimResults = false;  // final results only

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript((prev) => prev + result);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        keepAliveRef.current = false;
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (keepAliveRef.current) {
        // Restart immediately for the next utterance — accumulates transcript
        setTimeout(() => startNewSessionRef.current(), 200);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  useEffect(() => {
    startNewSessionRef.current = startNewSession;
  }, [startNewSession]);

  const startRecording = useCallback(() => {
    keepAliveRef.current = true;
    startNewSession();
  }, [startNewSession]);

  const stopRecording = useCallback((): Promise<void> => {
    keepAliveRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) return Promise.resolve();

    return new Promise<void>((resolve) => {
      let settled = false;
      const fallbackRef: { id?: number } = {};
      const previousOnEnd = recognition.onend;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (fallbackRef.id !== undefined) clearTimeout(fallbackRef.id);
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
        setIsRecording(false);
        resolve();
      };

      recognition.onend = (event) => {
        try { previousOnEnd?.(event); } catch (_err) { void _err; }
        finish();
      };

      fallbackRef.id = window.setTimeout(finish, 1000);

      try { recognition.stop(); } catch (_err) { void _err; finish(); }
    });
  }, []);

  // -----------------------------------------------------------------
  // Timer helpers
  // -----------------------------------------------------------------
  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // -----------------------------------------------------------------
  // Exam flow
  // -----------------------------------------------------------------
  const startExam = () => {
    setPhase('presentation');
    startRecording();
    startTimer();
  };

  const finishExam = async () => {
    await stopRecording();
    stopTimer();
    if (!topic) return;

    const normalizedTranscript = transcript.toLowerCase();
    const mentionedSentences = topic.sentences.filter((s) => {
      const words = s.text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      return words.some((w) => normalizedTranscript.includes(w));
    });

    const coverageScore = Math.round(
      (mentionedSentences.length / topic.sentences.length) * 100,
    );
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    const speakingWPM = elapsedTime > 0 ? Math.round((wordCount / elapsedTime) * 60) : 0;

    const result: ExamSession = {
      id: crypto.randomUUID(),
      topicId: topic.id,
      topicTitle: topic.title,
      date: Date.now(),
      coverageScore,
      wordCount,
      duration: elapsedTime,
      speakingWPM,
      transcript,
    };

    setExamResult(result);
    addExamSession(result);
    setPhase('result');
  };

  const nextPhase = async () => {
    if (phase === 'presentation') {
      await stopRecording();
      setPhase('questions');
      startRecording();
    } else if (phase === 'questions') {
      if (currentQuestionIdx < questions.length - 1) {
        await stopRecording();
        setCurrentQuestionIdx((prev) => prev + 1);
        startRecording();
      } else {
        await finishExam();
      }
    }
  };

  if (!topic) return <div className="text-center py-20">Topic not found</div>;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      <PageHeader title={`Prüfungsmodus: ${topic.title}`} showBack />

      {phase === 'intro' && (
        <div className="glass-panel rounded-3xl p-10 text-center shadow-2xl border border-slate-900">
          <div className="bg-blue-500/10 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
            <Clock className="text-blue-400" size={36} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Bereit für die Prüfung?</h2>
          <div className="space-y-4 text-slate-400 max-w-lg mx-auto mb-10 text-base leading-relaxed">
            <p>In diesem Modus simulieren wir die C1-Prüfung unter realen Bedingungen.</p>
            <ul className="text-left space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-slate-900/60 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 shrink-0"></span>
                <span><strong>Teil 1: Freie Präsentation:</strong> Ihr vorbereiteter Text wird ausgeblendet. Präsentieren Sie frei.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 shrink-0"></span>
                <span><strong>Teil 2: Anschlussfragen:</strong> Der Prüfer stellt Ihnen Verständnisfragen zum Thema.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 shrink-0"></span>
                <span><strong>Auswertung:</strong> Analyse Ihrer Wortabdeckung, Dauer und WPM-Sprechgeschwindigkeit.</span>
              </li>
            </ul>
          </div>
          <button
            onClick={startExam}
            className="px-10 py-4.5 rounded-2xl font-black text-lg gradient-btn text-white"
          >
            Prüfung starten
          </button>
        </div>
      )}

      {(phase === 'presentation' || phase === 'questions') && (
        <div className="space-y-8">
          <div className="glass-panel rounded-3xl p-10 shadow-2xl border border-slate-800/80 relative overflow-hidden">
            {isRecording && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse"></div>
            )}

            <div className="flex justify-between items-start mb-8 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                  {phase === 'presentation'
                    ? 'Phase 1: Präsentation'
                    : `Phase 2: Anschlussfragen (${currentQuestionIdx + 1}/${questions.length})`}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                  {phase === 'presentation'
                    ? 'Bitte präsentieren Sie Ihr Thema.'
                    : questions[currentQuestionIdx]}
                </h2>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-900 px-4 py-2 rounded-xl shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                <span className="font-mono text-xl font-bold text-white">
                  {Math.floor(elapsedTime / 60)}:
                  {(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 min-h-[200px] mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Live Transkription
                </span>
              </div>
              <p className="text-lg text-slate-300 leading-relaxed italic">
                {transcript || (isRecording ? 'Höre zu...' : '')}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={nextPhase}
                className="flex-1 bg-white text-black py-4.5 rounded-2xl font-black text-sm transition-all hover:bg-slate-100 active:scale-98 shadow-lg shadow-white/5"
              >
                {phase === 'presentation'
                  ? 'Präsentation beenden & Fragen starten'
                  : currentQuestionIdx < questions.length - 1
                  ? 'Nächste Frage'
                  : 'Prüfung abschließen'}
              </button>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4.5">
            <div className="flex items-center gap-2.5 text-slate-400">
              <AlertCircle size={16} className="text-slate-500 shrink-0" />
              <p className="text-xs">
                Hinweis: Sprechen Sie deutlich, flüssig und versuchen Sie, die relevanten Kernpunkte Ihres Themas abzudecken.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && examResult && (
        <div className="space-y-8 animate-fade-in-up">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-white">Prüfungsergebnis</h2>
            <p className="text-slate-400">Hervorragende Leistung! Hier ist Ihre detaillierte Analyse.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-6 rounded-3xl text-center shadow-lg border border-slate-900">
              <BarChart3 className="mx-auto text-blue-400 mb-4" size={28} />
              <div className="text-3xl font-black text-white mb-1">{examResult.coverageScore}%</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Abdeckung</div>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center shadow-lg border border-slate-900">
              <FileText className="mx-auto text-purple-400 mb-4" size={28} />
              <div className="text-3xl font-black text-white mb-1">{examResult.wordCount}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wörter</div>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center shadow-lg border border-slate-900">
              <Clock className="mx-auto text-green-400 mb-4" size={28} />
              <div className="text-3xl font-black text-white mb-1">
                {Math.floor(examResult.duration / 60)}:
                {(examResult.duration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Dauer</div>
            </div>
            <div className="glass-panel p-6 rounded-3xl text-center shadow-lg border border-slate-900">
              <Gauge className="mx-auto text-cyan-400 mb-4" size={28} />
              <div
                className={cn(
                  'text-3xl font-black mb-1',
                  examResult.speakingWPM < 100
                    ? 'text-red-400'
                    : examResult.speakingWPM <= 140
                    ? 'text-green-400'
                    : 'text-yellow-400',
                )}
              >
                {examResult.speakingWPM}
              </div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {examResult.speakingWPM < 100
                  ? 'Zu langsam'
                  : examResult.speakingWPM <= 140
                  ? 'Gutes Tempo'
                  : 'Zu schnell'}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 shadow-lg border border-slate-900">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <HelpCircle size={18} className="text-blue-400" />
              Detaillierte Analyse
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                  Satzabdeckungs-Check
                </p>
                <div className="space-y-3">
                  {topic.sentences.map((s, idx) => {
                    const words = s.text
                      .toLowerCase()
                      .split(/\s+/)
                      .filter((w) => w.length > 4);
                    const isMentioned = words.some((w) =>
                      transcript.toLowerCase().includes(w),
                    );
                    return (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-3.5 rounded-2xl border text-sm transition-all',
                          isMentioned
                            ? 'bg-green-500/5 border-green-500/20 text-green-400'
                            : 'bg-red-500/5 border-red-500/20 text-red-450',
                        )}
                      >
                        {isMentioned ? (
                          <CheckCircle2 size={16} className="shrink-0" />
                        ) : (
                          <AlertCircle size={16} className="shrink-0" />
                        )}
                        <p className="flex-1 truncate text-xs font-semibold">{s.text}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-black/40">
                          {isMentioned ? 'Erwähnt' : 'Gefehlt'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex-1 text-white py-4.5 rounded-2xl font-black text-sm transition-all gradient-btn"
            >
              Zum Dashboard
            </button>
            <button
              onClick={() => {
                setPhase('intro');
                setTranscript('');
                setElapsedTime(0);
              }}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4.5 rounded-2xl font-black text-sm transition-all border border-slate-800"
            >
              Prüfung wiederholen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
