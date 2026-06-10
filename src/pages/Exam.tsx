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

export default function Exam() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === topicId));
  const addExamSession = useTopicStore((state) => state.addExamSession);

  const [phase, setPhase] = useState<'intro' | 'presentation' | 'questions' | 'result'>('intro');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [examResult, setExamResult] = useState<ExamSession | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  // -----------------------------------------------------------------
  // Random examiner questions (once on mount)
  // -----------------------------------------------------------------
  useEffect(() => {
    const shuffled = [...EXAMINER_QUESTIONS].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 3));

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
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
  const keepAliveRef = useRef(false);

  const startNewSession = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript((prev) => prev + result);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
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
        setTimeout(startNewSession, 200);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const startRecording = useCallback(() => {
    keepAliveRef.current = true;
    startNewSession();
  }, [startNewSession]);

  const stopRecording = useCallback(() => {
    keepAliveRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
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

  const nextPhase = () => {
    if (phase === 'presentation') {
      stopRecording();
      setPhase('questions');
      startRecording();
    } else if (phase === 'questions') {
      if (currentQuestionIdx < questions.length - 1) {
        stopRecording();
        setCurrentQuestionIdx((prev) => prev + 1);
        startRecording();
      } else {
        finishExam();
      }
    }
  };

  const finishExam = () => {
    stopRecording();
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

  if (!topic) return <div className="text-center py-20">Topic not found</div>;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader title={`Prüfungsmodus: ${topic.title}`} showBack />

      {phase === 'intro' && (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-10 text-center shadow-2xl">
          <div className="bg-blue-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-blue-500" size={40} />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">Bereit für die Prüfung?</h2>
          <div className="space-y-4 text-gray-400 max-w-lg mx-auto mb-10 text-lg leading-relaxed">
            <p>In diesem Modus simulieren wir die C1-Prüfung.</p>
            <ul className="text-left space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Teil 1: Freie Präsentation (Ihr Text wird ausgeblendet)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Teil 2: Anschlussfragen vom Prüfer
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Auswertung: Abdeckung der Kernpunkte & Wortanzahl
              </li>
            </ul>
          </div>
          <button
            onClick={startExam}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
          >
            Prüfung starten
          </button>
        </div>
      )}

      {(phase === 'presentation' || phase === 'questions') && (
        <div className="space-y-8">
          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
            {isRecording && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 animate-pulse"></div>
            )}

            <div className="flex justify-between items-start mb-8">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                  {phase === 'presentation'
                    ? 'Phase 1: Präsentation'
                    : `Phase 2: Fragen (${currentQuestionIdx + 1}/${questions.length})`}
                </span>
                <h2 className="text-3xl font-black text-white">
                  {phase === 'presentation'
                    ? 'Bitte präsentieren Sie Ihr Thema.'
                    : questions[currentQuestionIdx]}
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-black border border-gray-800 px-4 py-2 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="font-mono text-xl text-white">
                  {Math.floor(elapsedTime / 60)}:
                  {(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="bg-black/50 border border-gray-800 rounded-2xl p-6 min-h-[200px] mb-8">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-gray-500" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Live Transkript
                </span>
              </div>
              <p className="text-xl text-gray-300 leading-relaxed italic">
                {transcript || (isRecording ? 'Höre zu...' : '')}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={nextPhase}
                className="flex-1 bg-white text-black py-5 rounded-2xl font-black text-lg transition-all hover:bg-gray-200 active:scale-95"
              >
                {phase === 'presentation'
                  ? 'Präsentation beenden & Fragen starten'
                  : currentQuestionIdx < questions.length - 1
                  ? 'Nächste Frage'
                  : 'Prüfung abschließen'}
              </button>
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-gray-500">
              <AlertCircle size={16} />
              <p className="text-sm">
                Hinweis: Sprechen Sie deutlich
                und versuchen Sie, alle vorbereiteten Punkte abzudecken.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && examResult && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-white">Prüfungsergebnis</h2>
            <p className="text-gray-500">Gut gearbeitet! Hier ist Ihre Analyse.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-gray-950 border border-gray-900 p-8 rounded-3xl text-center shadow-xl">
              <BarChart3 className="mx-auto text-blue-500 mb-4" size={32} />
              <div className="text-4xl font-black text-white mb-1">{examResult.coverageScore}%</div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Abdeckung</div>
            </div>
            <div className="bg-gray-950 border border-gray-900 p-8 rounded-3xl text-center shadow-xl">
              <FileText className="mx-auto text-purple-500 mb-4" size={32} />
              <div className="text-4xl font-black text-white mb-1">{examResult.wordCount}</div>
              <div className="-xs font-bold text-gray-500 uppercase tracking-widest">Wörter</div>
            </div>
            <div className="bg-gray-950 border border-gray-900 p-8 rounded-3xl text-center shadow-xl">
              <Clock className="mx-auto text-green-500 mb-4" size={32} />
              <div className="text-4xl font-black text-white mb-1">
                {Math.floor(examResult.duration / 60)}:
                {(examResult.duration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dauer</div>
            </div>
            <div className="bg-gray-950 border border-gray-900 p-8 rounded-3xl text-center shadow-xl">
              <Gauge className="mx-auto text-cyan-500 mb-4" size={32} />
              <div
                className={cn(
                  'text-4xl font-black mb-1',
                  examResult.speakingWPM < 100
                    ? 'text-red-400'
                    : examResult.speakingWPM <= 140
                    ? 'text-green-400'
                    : 'text-yellow-400',
                )}
              >
                {examResult.speakingWPM}
              </div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                {examResult.speakingWPM < 100
                  ? 'Zu langsam'
                  : examResult.speakingWPM <= 140
                  ? 'Gutes Tempo'
                  : 'Zu schnell'}
              </div>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-10 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <HelpCircle size={20} className="text-blue-500" />
              Detaillierte Analyse
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb3">
                  Vollständigkeits-Check
                </p>
                <div className="space-y-2">
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
                          'flex items-center gap-3 p-3 rounded-xl border text-sm transition-all',
                          isMentioned
                            ? 'bg-green-500/5 border-green-500/20 text-green-400/80'
                            : 'bg-red-500/5 border-red-500/20 text-red-400/80',
                        )}
                      >
                        {isMentioned ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertCircle size={16} />
                        )}
                        <p className="flex-1 truncate">{s.text}</p>
                        <span className="text-[10px] font-black uppercase tracking-widest">
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xl transition-all shadow-xl shadow-blue-900/20"
            >
              Zum Dashboard
            </button>
            <button
              onClick={() => {
                setPhase('intro');
                setTranscript('');
                setElapsedTime(0);
              }}
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white py-5 rounded-2xl font-black text-xl transition-all border border-gray-800"
            >
              Prüfung wiederholen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
