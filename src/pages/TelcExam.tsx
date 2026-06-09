import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Mic, MicOff, Clock, Trophy, ChevronDown, ChevronUp,
  Loader2, AlertCircle, MessageSquare, Gauge, BookOpen,
  CheckCircle2, XCircle, HelpCircle, RefreshCw,
  FolderOpen, Edit3, Sparkles, ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';
import { evaluateTelcPresentation, generateFollowUpQuestions, evaluateFollowUpAnswers, OpenRouterError } from '../services/openRouter';
import type { TelcEvaluation, FollowUpQA, TelcExamSession } from '../models/types';

const TELC_TOPICS = [
  'Welche Berufsgruppe halten Sie für besonders wichtig?',
  'Wie kann Architektur das Aussehen von Städten prägen?',
  'Sollte Plastik komplett verboten werden?',
  'Welche Rolle spielen soziale Medien in der modernen Gesellschaft?',
  'Wie kann man den öffentlichen Nahverkehr verbessern?',
  'Was sind die Vor- und Nachteile von Homeoffice?',
  'Wie wichtig ist Ihrer Meinung nach Umweltschutz?',
  'Sollten traditionelle Feste und Bräuche bewahrt werden?',
  'Welche Auswirkungen hat die Digitalisierung auf die Arbeitswelt?',
  'Wie kann man junge Menschen für Politik interessieren?',
  'Was verstehen Sie unter einem gesunden Lebensstil?',
  'Welche Bedeutung hat Bildung in der heutigen Gesellschaft?',
  'Sollte Tierversuche verboten werden?',
  'Wie kann man die Integration von Migranten verbessern?',
  'Welche Rolle spielen Museen und Kultur in unserer Gesellschaft?',
];

const TELC_DURATION = 180; // 3 minutes

type Phase = 'topic-select' | 'preparation' | 'presentation' | 'completed' | 'followup' | 'evaluating' | 'evaluation-done' | 'error';
type TopicSource = 'existing' | 'custom' | 'random';

export default function TelcExam() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicIdParam = searchParams.get('topicId');
  const topics = useTopicStore((state) => state.topics);
  const telcSettings = useTopicStore((state) => state.telcSettings);
  const addTelcSession = useTopicStore((state) => state.addTelcSession);
  const updateTelcEvaluation = useTopicStore((state) => state.updateTelcEvaluation);
  const updateTelcFollowUpQA = useTopicStore((state) => state.updateTelcFollowUpQA);

  // Derive initial state from URL param (Zustand loads synchronously from localStorage)
  const initialTopic = topicIdParam ? topics.find((t) => t.id === topicIdParam) : null;
  const [phase, setPhase] = useState<Phase>(initialTopic ? 'preparation' : 'topic-select');
  const [topicSource, setTopicSource] = useState<TopicSource>('existing');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>(topicIdParam || '');
  const [topic, setTopic] = useState(initialTopic?.title || '');

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Speech
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Structure helper
  const [structureOpen, setStructureOpen] = useState(true);

  // Follow-up
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<string[]>([]);
  const [currentFQIndex] = useState(0);

  // Evaluation
  const [evaluation, setEvaluation] = useState<TelcEvaluation | null>(null);
  const [aiError, setAiError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startTimeRef = useRef(0);
  const transcriptRef = useRef('');

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTimerAndRecording = useRef<() => void>(() => {});

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - (elapsed * 1000);
    timerRef.current = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(newElapsed);
      if (newElapsed >= TELC_DURATION) {
        stopTimerAndRecording.current();
      }
    }, 200);
  }, [elapsed]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [stopTimer]);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsRecording(false);
    stopTimer();
    setTranscript(transcriptRef.current.trim());
    setPhase('completed');
  }, [stopTimer]);

  // Update ref so auto-timer can trigger stop
  useEffect(() => {
    stopTimerAndRecording.current = handleStopRecording;
  }, [handleStopRecording]);

  const startRecording = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setAiError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'de-DE';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      setWordCount(0);
      setWpm(0);
      transcriptRef.current = '';
      startTimeRef.current = Date.now();
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let full = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          full += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const finalText = full || transcriptRef.current;
      transcriptRef.current = finalText;
      setTranscript(finalText.trim());
      setInterimTranscript(interim);

      const words = finalText.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      if (elapsedSec > 0) {
        setWpm(Math.round((words / elapsedSec) * 60));
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    startTimer();
  }, [startTimer]);

  const handleStartExam = () => {
    setPhase('presentation');
    startRecording();
  };

  const handleSelectTopic = () => {
    if (topicSource === 'custom') {
      if (!customTopic.trim()) return;
      setTopic(customTopic.trim());
    } else if (topicSource === 'random') {
      setTopic(TELC_TOPICS[Math.floor(Math.random() * TELC_TOPICS.length)]);
    } else if (topicSource === 'existing') {
      const found = topics.find((t) => t.id === selectedTopicId);
      if (!found) return;
      setTopic(found.title);
    }
    setPhase('preparation');
  };

  const handleRunEvaluation = async () => {
    const session: TelcExamSession = {
      id: crypto.randomUUID(),
      topic,
      transcript: transcriptRef.current.trim(),
      duration: elapsed,
      wordCount,
      wpm,
      timestamp: Date.now(),
      followUpQA: [],
      evaluation: null,
      aiAvailable: false,
    };
    addTelcSession(session);
    setSessionId(session.id);

    if (!telcSettings.aiEnabled || !telcSettings.apiKey) {
      setAiError('AI evaluation is not configured. Enable it in Settings and add an API key.');
      setPhase('error');
      return;
    }

    setPhase('evaluating');
    setAiError('');

    try {
      const result = await evaluateTelcPresentation(
        { apiKey: telcSettings.apiKey, model: telcSettings.model },
        topic,
        session.transcript,
        session.duration,
        session.wpm
      );

      const clean = result.replace(/```(?:json)?\s*/gi, '').trim();
      const parsed: TelcEvaluation = JSON.parse(clean);

      setEvaluation(parsed);
      updateTelcEvaluation(session.id, parsed);

      // Generate follow-up questions
      try {
        const questionsResult = await generateFollowUpQuestions(
          { apiKey: telcSettings.apiKey, model: telcSettings.model },
          topic,
          session.transcript
        );
        const qClean = questionsResult.replace(/```(?:json)?\s*/gi, '').trim();
        const qParsed = JSON.parse(qClean);
        const questions: string[] = qParsed.questions || [];
        setFollowUpQuestions(questions);
        setFollowUpAnswers(new Array(questions.length).fill(''));
        setPhase('followup');
      } catch {
        // Follow-up generation failed, show evaluation directly
        setPhase('evaluation-done');
      }
    } catch (err) {
      if (err instanceof OpenRouterError) {
        if (err.code === 'NO_KEY') setAiError('API key is missing. Add it in Settings.');
        else if (err.code === 'RATE_LIMIT') setAiError('Rate limit exceeded. Please try again later.');
        else if (err.code === 'TIMEOUT') setAiError('Request timed out. Please try again.');
        else setAiError(`AI evaluation error: ${err.message}`);
      } else {
        setAiError('AI evaluation is currently unavailable. The exam has been saved locally.');
      }
      setPhase('error');
    }
  };

  const handleSubmitFollowUp = async () => {
    if (!sessionId) return;
    const qa: FollowUpQA[] = followUpQuestions.map((q, i) => ({
      question: q,
      answer: followUpAnswers[i] || '',
    }));
    updateTelcFollowUpQA(sessionId, qa);

    setPhase('evaluating');
    setAiError('');

    try {
      const result = await evaluateFollowUpAnswers(
        { apiKey: telcSettings.apiKey, model: telcSettings.model },
        topic,
        transcriptRef.current.trim(),
        qa
      );

      const clean = result.replace(/```(?:json)?\s*/gi, '').trim();
      const parsed: TelcEvaluation = JSON.parse(clean);
      setEvaluation(parsed);
      updateTelcEvaluation(sessionId, parsed);
    } catch {
      // Keep previous evaluation if follow-up refinement fails
    }

    setPhase('evaluation-done');
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-yellow-400';
      case 'D': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case 'A': return 'Hervorragend';
      case 'B': return 'Gut';
      case 'C': return 'Ausreichend';
      case 'D': return 'Mangelhaft';
      default: return '';
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const remaining = Math.max(0, TELC_DURATION - elapsed);

  // Topic Selection phase
  if (phase === 'topic-select') {
    const existingTopics = topics;

    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="TELC C1 Prüfungssimulation" showBack />

        {/* Info Banner */}
        <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-6 mb-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={24} className="text-purple-500" />
            <h2 className="text-xl font-black text-white">Thema auswählen</h2>
          </div>
          <p className="text-gray-400 text-sm">Wählen Sie ein Thema für Ihre TELC-Präsentation. Sie haben <strong className="text-white">3 Minuten</strong> Zeit, um frei zu sprechen.</p>
        </div>

        {/* Topic Source Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'existing' as TopicSource, label: 'Eigene Themen', icon: FolderOpen },
            { key: 'custom' as TopicSource, label: 'Eigenes Thema', icon: Edit3 },
            { key: 'random' as TopicSource, label: 'Zufallsthema', icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTopicSource(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 justify-center",
                topicSource === key
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20"
                  : "bg-gray-900 text-gray-500 hover:text-white border border-gray-800"
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Existing Topics */}
        {topicSource === 'existing' && (
          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-6 shadow-xl">
            {existingTopics.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen size={32} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-500">Keine Themen vorhanden.</p>
                <Link to="/topic/new" className="text-purple-500 hover:underline mt-2 inline-block text-sm font-bold">
                  Neues Thema erstellen
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {existingTopics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTopicId(t.id); setTopic(t.title); }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all",
                      selectedTopicId === t.id
                        ? "border-purple-500/30 bg-purple-500/10"
                        : "border-gray-800 bg-gray-900 hover:bg-gray-800"
                    )}
                  >
                    <p className="text-sm font-bold text-white">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{t.sentences.length} Sätze · {Math.round((t.sentences.filter(s => s.isCompleted).length / Math.max(t.sentences.length, 1)) * 100)}% abgeschlossen</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Topic */}
        {topicSource === 'custom' && (
          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-6 shadow-xl">
            <label className="block text-sm font-medium text-gray-400 mb-3">Thema eingeben</label>
            <textarea
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="z.B. Welche Rolle spielen soziale Medien in der modernen Gesellschaft?"
              rows={3}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-sm"
            />
            <p className="text-xs text-gray-600 mt-2">Geben Sie eine vollständige Themenfrage ein, wie sie in einer TELC-Prüfung gestellt werden könnte.</p>
          </div>
        )}

        {/* Random Topic */}
        {topicSource === 'random' && (
          <div className="bg-gray-950 border border-gray-900 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-purple-500" />
              <span className="text-sm font-bold text-gray-400">Zufälliges TELC-Thema</span>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 min-h-[80px]">
              <p className="text-white font-bold text-base">{topic || TELC_TOPICS[0]}</p>
            </div>
            <button
              onClick={() => setTopic(TELC_TOPICS[Math.floor(Math.random() * TELC_TOPICS.length)])}
              className="mt-3 flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-gray-800"
            >
              <RefreshCw size={14} />
              Neues Thema
            </button>
          </div>
        )}

        {/* Confirm Button */}
        <div className="mt-8">
          <button
            onClick={handleSelectTopic}
            disabled={
              (topicSource === 'existing' && !selectedTopicId) ||
              (topicSource === 'custom' && !customTopic.trim())
            }
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/30 text-lg"
          >
            <ArrowRight size={24} />
            Weiter zur Prüfung
          </button>
        </div>
      </div>
    );
  }

  // Preparation phase
  if (phase === 'preparation') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="TELC C1 Prüfung" showBack />
        <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-8 shadow-xl text-center">
          <BookOpen size={48} className="mx-auto text-purple-500 mb-6" />
          <div className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-3">Ihr Thema</div>
          <h2 className="text-2xl font-bold text-white leading-tight mb-8">{topic}</h2>

          <div className="grid grid-cols-1 gap-3 mb-8 text-left">
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
              <Clock size={20} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-sm text-white font-bold">3 Minuten</p>
                <p className="text-xs text-gray-500">Sprechzeit</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
              <BookOpen size={20} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-sm text-white font-bold">Freie Rede</p>
                <p className="text-xs text-gray-500">Keine vorbereiteten Sätze</p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex items-center gap-3">
              <MessageSquare size={20} className="text-purple-500 shrink-0" />
              <div>
                <p className="text-sm text-white font-bold">Folgefragen</p>
                <p className="text-xs text-gray-500">Nach der Präsentation</p>
              </div>
            </div>
          </div>

          {!telcSettings.aiEnabled && (
            <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl mb-8">
              <AlertCircle size={18} />
              <span className="text-sm font-bold">KI-Bewertung ist deaktiviert.</span>
            </div>
          )}

          <button
            onClick={handleStartExam}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/30 text-lg"
          >
            <Mic size={24} />
            Prüfung starten
          </button>
        </div>
      </div>
    );
  }

  // Presentation phase
  if (phase === 'presentation') {
    return (
      <div className="max-w-3xl mx-auto pb-20">
        <PageHeader title="TELC C1 — Präsentation" showBack />

        {/* Timer */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-purple-500" />
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block">Verstrichen</span>
                <span className="text-2xl font-black text-white">{formatTime(elapsed)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block">Verbleibend</span>
              <span className={cn(
                "text-2xl font-black",
                remaining <= 30 ? 'text-red-500 animate-pulse' :
                remaining <= 60 ? 'text-yellow-500' : 'text-blue-500'
              )}>{formatTime(remaining)}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                remaining <= 30 ? 'bg-red-500' :
                remaining <= 60 ? 'bg-yellow-500' : 'bg-purple-600'
              )}
              style={{ width: `${(elapsed / TELC_DURATION) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-600 font-bold uppercase tracking-widest">
            <span>Zu kurz (&lt;2 Min)</span>
            <span className="text-green-500">Ideal (~3 Min)</span>
          </div>
        </div>

        {/* Topic Card */}
        <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-8 mb-6 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-3">Ihr Thema</div>
          <p className="text-2xl font-bold text-white leading-tight">{topic}</p>
        </div>

        {/* Structure Helper */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl mb-6 shadow-xl overflow-hidden">
          <button
            onClick={() => setStructureOpen(!structureOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-900 transition-colors"
          >
            <span className="text-sm font-bold text-gray-400">Aufbaustruktur</span>
            {structureOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
          </button>
          {structureOpen && (
            <div className="px-4 pb-4 space-y-2">
              {[
                { step: '1. Einleitung', desc: 'Thema vorstellen, These formulieren' },
                { step: '2. Hauptteil', desc: 'Argumente, Begründungen, Beispiele' },
                { step: '3. Beispiele', desc: 'Persönliche Erfahrungen, Fakten, Studien' },
                { step: '4. Schluss / Fazit', desc: 'Zusammenfassung, Ausblick, eigene Meinung' },
              ].map((item) => (
                <div key={item.step} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                  <p className="text-sm font-bold text-white">{item.step}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              ))}
              <p className="text-[10px] text-gray-600 italic mt-2">Nur als Orientierungshilfe — sprechen Sie frei.</p>
            </div>
          )}
        </div>

        {/* Live Stats */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-gray-950 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Wörter</span>
            <span className="text-xl font-black text-white">{wordCount}</span>
          </div>
          <div className="flex-1 bg-gray-950 border border-gray-900 rounded-xl p-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">WPM</span>
            <span className="text-xl font-black text-white">{wpm}</span>
          </div>
        </div>

        {/* Transcript Display */}
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 mb-6 shadow-xl min-h-[120px]">
          <p className="text-sm text-gray-300 leading-relaxed">
            {transcript || interimTranscript || (
              <span className="text-gray-600 italic">Ihre Rede erscheint hier...</span>
            )}
          </p>
        </div>

        {/* Recording Controls */}
        <div className="flex gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={elapsed >= TELC_DURATION}
              className="flex-1 flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50"
            >
              <Mic size={24} />
              Mikrofon einschalten
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex-1 flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white py-5 rounded-2xl font-bold transition-all shadow-lg shadow-red-900/20"
            >
              <MicOff size={24} />
              Präsentation beenden
            </button>
          )}
        </div>
      </div>
    );
  }

  // Completed phase - wait for user to trigger evaluation
  if (phase === 'completed') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="Präsentation beendet" showBack />
        <div className="bg-gradient-to-br from-green-600/10 to-blue-600/10 border border-green-500/20 rounded-3xl p-8 shadow-xl text-center">
          <Trophy size={64} className="mx-auto text-green-500 mb-6" />
          <h2 className="text-3xl font-black text-white mb-4">Präsentation abgeschlossen!</h2>
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Dauer</p>
              <p className="text-xl font-black text-white mt-1">{formatTime(elapsed)}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Wörter</p>
              <p className="text-xl font-black text-white mt-1">{wordCount}</p>
            </div>
            <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">WPM</p>
              <p className="text-xl font-black text-white mt-1">{wpm}</p>
            </div>
          </div>
          <button
            onClick={handleRunEvaluation}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/30 text-lg"
          >
            <MessageSquare size={24} />
            KI-Auswertung starten
          </button>
        </div>
      </div>
    );
  }

  // Evaluating phase
  if (phase === 'evaluating') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="KI-Auswertung" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-12 shadow-xl text-center">
          <Loader2 size={48} className="mx-auto text-purple-500 animate-spin mb-6" />
          <h2 className="text-2xl font-black text-white mb-3">
            {evaluation ? 'Auswertung wird verfeinert...' : 'Ihre Präsentation wird bewertet'}
          </h2>
          <p className="text-gray-500">Dies kann einen Moment dauern.</p>
        </div>
      </div>
    );
  }

  // Follow-up phase
  if (phase === 'followup') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="Verständnisfragen" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle size={24} className="text-purple-500" />
            <h2 className="text-xl font-black text-white">Folgefragen des Prüfers</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">Beantworten Sie die Fragen des Prüfers zu Ihrer Präsentation.</p>

          {followUpQuestions.map((question, idx) => (
            <div key={idx} className={cn(
              "mb-6 p-5 rounded-xl border transition-all",
              idx === currentFQIndex ? "border-purple-500/30 bg-purple-500/5" : "border-gray-800 bg-gray-900"
            )}>
              <p className="text-white font-bold mb-3">{idx + 1}. {question}</p>
              <textarea
                value={followUpAnswers[idx] || ''}
                onChange={(e) => {
                  const newAnswers = [...followUpAnswers];
                  newAnswers[idx] = e.target.value;
                  setFollowUpAnswers(newAnswers);
                }}
                placeholder="Ihre Antwort..."
                rows={3}
                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-sm"
              />
            </div>
          ))}

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold hover:bg-gray-900 transition-colors"
            >
              Überspringen
            </button>
            <button
              onClick={handleSubmitFollowUp}
              className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/20"
            >
              <CheckCircle2 size={20} />
              Ergebnisse anzeigen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error phase
  if (phase === 'error') {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="Auswertung" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 text-yellow-500">
            <AlertCircle size={24} />
            <h2 className="text-xl font-black text-white">KI-Auswertung nicht verfügbar</h2>
          </div>
          <p className="text-gray-400 mb-6">{aiError}</p>
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
            <p className="text-sm font-bold text-gray-400 mb-3">Ihre Präsentation wurde gespeichert:</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-600">Dauer</p>
                <p className="text-lg font-bold text-white">{formatTime(elapsed)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Wörter</p>
                <p className="text-lg font-bold text-white">{wordCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">WPM</p>
                <p className="text-lg font-bold text-white">{wpm}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => { setPhase('completed'); setAiError(''); }}
              className="flex-1 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold hover:bg-gray-900 transition-colors"
            >
              <RefreshCw size={18} className="inline mr-2" />
              Erneut versuchen
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-4 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors border border-gray-800"
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Evaluation done - show report
  if (!evaluation) {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="TELC C1 Auswertung" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl text-center">
          <XCircle size={48} className="mx-auto text-yellow-500 mb-4" />
          <p className="text-gray-400">Keine Auswertung verfügbar.</p>
          <Link to="/" className="text-purple-500 hover:underline mt-4 inline-block">Zurück zum Dashboard</Link>
        </div>
      </div>
    );
  }

  const gradeKeys = [
    { key: 'aufgabengerechtheit' as const, label: 'Aufgabengerechtheit' },
    { key: 'flüssigkeit' as const, label: 'Flüssigkeit' },
    { key: 'repertoire' as const, label: 'Repertoire' },
    { key: 'grammatischeRichtigkeit' as const, label: 'Grammatische Richtigkeit' },
    { key: 'ausspracheUndIntonation' as const, label: 'Aussprache & Intonation' },
  ];

  const examLevelColor = {
    'Strong Pass': 'text-green-400 border-green-500/30 bg-green-500/10',
    'Pass': 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    'Borderline': 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <PageHeader title="TELC C1 Prüfungsergebnis" showBack />

      {/* Readiness Score */}
      <div className="bg-gradient-to-br from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-3xl p-8 mb-6 shadow-xl text-center">
        <div className="text-6xl font-black text-white mb-2">{evaluation.readinessScore}%</div>
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">TELC Readiness</p>
        <div className={cn(
          "inline-flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold border",
          examLevelColor[evaluation.likelyExamLevel]
        )}>
          <Trophy size={18} />
          {evaluation.likelyExamLevel}
        </div>
      </div>

      {/* Grades */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-6">TELC C1 Bewertung</h3>
        <div className="space-y-4">
          {gradeKeys.map(({ key, label }) => {
            const grade = evaluation[key];
            return (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
                <div>
                  <p className="text-sm font-bold text-white">{label}</p>
                  <p className={cn("text-xs font-bold mt-1", getGradeColor(grade))}>{getGradeLabel(grade)}</p>
                </div>
                <span className={cn("text-3xl font-black", getGradeColor(grade))}>{grade}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-between p-4 bg-gray-900 rounded-xl border border-gray-800">
          <p className="text-sm font-bold text-white">Geschätzte Punktzahl</p>
          <span className="text-3xl font-black text-white">{evaluation.estimatedPoints}/100</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <Gauge size={20} className="mx-auto text-cyan-500 mb-2" />
          <p className="text-lg font-black text-white">{formatTime(elapsed)}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Dauer</p>
        </div>
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <p className="text-lg font-black text-white">{wordCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Wörter</p>
        </div>
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <p className="text-lg font-black text-white">{wpm} WPM</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Sprechtempo</p>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Stärken
          </h4>
          <ul className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-green-500 mt-1 shrink-0">•</span>
                {s}
              </li>
            ))}
            {evaluation.strengths.length === 0 && (
              <li className="text-sm text-gray-600 italic">Keine spezifischen Stärken identifiziert</li>
            )}
          </ul>
        </div>
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
            <XCircle size={16} />
            Schwächen
          </h4>
          <ul className="space-y-2">
            {evaluation.weaknesses.map((w, i) => (
              <li key={i} className="text-sm text-gray-300 flex gap-2">
                <span className="text-red-500 mt-1 shrink-0">•</span>
                {w}
              </li>
            ))}
            {evaluation.weaknesses.length === 0 && (
              <li className="text-sm text-gray-600 italic">Keine spezifischen Schwächen identifiziert</li>
            )}
          </ul>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare size={16} className="text-purple-500" />
          Detailliertes Feedback
        </h4>
        <p className="text-gray-300 leading-relaxed text-sm">{evaluation.detailedFeedback}</p>
      </div>

      {/* Improvement Suggestions */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
        <h4 className="text-sm font-bold text-blue-400 mb-4 flex items-center gap-2">
          <RefreshCw size={16} />
          Verbesserungsvorschläge
        </h4>
        <ul className="space-y-2">
          {evaluation.improvementSuggestions.map((s, i) => (
            <li key={i} className="text-sm text-gray-300 flex gap-2">
              <span className="text-blue-500 mt-1 shrink-0">→</span>
              {s}
            </li>
          ))}
          {evaluation.improvementSuggestions.length === 0 && (
            <li className="text-sm text-gray-600 italic">Keine Verbesserungsvorschläge</li>
          )}
        </ul>
      </div>

      {/* Transcript */}
      <details className="bg-gray-950 border border-gray-900 rounded-3xl overflow-hidden mb-6 shadow-xl">
        <summary className="p-6 cursor-pointer hover:bg-gray-900 transition-colors text-sm font-bold text-gray-400">
          Transkript anzeigen
        </summary>
        <div className="px-6 pb-6">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{transcript}</p>
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/telc-history')}
          className="flex-1 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold hover:bg-gray-900 transition-colors"
        >
          Verlauf anzeigen
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all shadow-lg shadow-purple-900/20"
        >
          Zum Dashboard
        </button>
      </div>
    </div>
  );
}
