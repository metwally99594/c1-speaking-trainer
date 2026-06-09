import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Mic, MicOff, Clock, Trophy, ChevronDown, ChevronUp,
  Loader2, AlertCircle, MessageSquare, Gauge, BookOpen,
  CheckCircle2, XCircle, HelpCircle, RefreshCw,
  FolderOpen, Edit3, Sparkles, ArrowRight,
  MessageCircle, Send
} from 'lucide-react';
import { cn } from '../utils/cn';
import { evaluateTelcPresentation, generateFollowUpQuestions, evaluateFollowUpAnswers, generateDiscussionResponse, OpenRouterError } from '../services/openRouter';
import type { TelcEvaluation, FollowUpQA, DiscussionTurn, TelcExamSession, TelcFeedback, TelcLanguageAnalysis } from '../models/types';
import { analyzeRedemittel } from '../utils/redemittelAnalyzer';
import { analyzeVocabulary } from '../utils/vocabularyAnalyzer';
import { analyzeArgumentation } from '../utils/argumentationAnalyzer';

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

type Phase = 'topic-select' | 'preparation' | 'presentation' | 'completed' | 'discussion' | 'followup' | 'evaluating' | 'evaluation-done' | 'error';
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
  const addTelcFeedback = useTopicStore((state) => state.addTelcFeedback);
  const updateTelcLanguageAnalysis = useTopicStore((state) => state.updateTelcLanguageAnalysis);

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

  // Discussion
  const [discussionTurns, setDiscussionTurns] = useState<DiscussionTurn[]>([]);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [discussionInput, setDiscussionInput] = useState('');
  const DISCUSSION_MAX_TURNS = 5;

  // Audio Recording
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Evaluation
  const [evaluation, setEvaluation] = useState<TelcEvaluation | null>(null);
  const [aiError, setAiError] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackVote, setFeedbackVote] = useState<TelcFeedback['vote'] | null>(null);
  const [languageAnalysis, setLanguageAnalysis] = useState<TelcLanguageAnalysis | null>(null);

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
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [stopTimer]);

  const handleStopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
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

  const startRecording = useCallback(async () => {
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

    // Start audio recording
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
    } catch {
      // Audio recording not critical, continue without it
    }

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
    const audioBase64 = audioBlob ? await blobToBase64(audioBlob) : undefined;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();

    const session: TelcExamSession = {
      id: crypto.randomUUID(),
      topic,
      transcript: transcriptRef.current.trim(),
      duration: elapsed,
      wordCount,
      wpm,
      timestamp: now,
      discussionTurns,
      followUpQA: [],
      evaluation: null,
      aiAvailable: false,
      audioBlob: audioBase64,
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
        session.wpm,
        discussionTurns
      );

      const clean = result.replace(/```(?:json)?\s*/gi, '').trim();
      const parsed: TelcEvaluation = JSON.parse(clean);

      setEvaluation(parsed);
      updateTelcEvaluation(session.id, parsed);

      // Run language analysis
      const redemittel = analyzeRedemittel(session.transcript);
      const vocabulary = analyzeVocabulary(session.transcript);
      const argumentation = analyzeArgumentation(session.transcript);
      const analysis: TelcLanguageAnalysis = { redemittel, vocabulary, argumentation };
      setLanguageAnalysis(analysis);
      updateTelcLanguageAnalysis(session.id, analysis);

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
        qa,
        discussionTurns
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

  const handleStartDiscussion = async () => {
    setPhase('discussion');
    setDiscussionTurns([]);

    // Generate first examiner question
    await generateNextDiscussionTurn([]);
  };

  const generateNextDiscussionTurn = async (existingTurns: DiscussionTurn[]) => {
    setDiscussionLoading(true);
    try {
      const result = await generateDiscussionResponse(
        { apiKey: telcSettings.apiKey, model: telcSettings.model },
        topic,
        transcriptRef.current.trim(),
        existingTurns,
        existingTurns.length
      );
      const clean = result.replace(/```(?:json)?\s*/gi, '').trim();
      const parsed = JSON.parse(clean);
      const examinerResponse = parsed.response || parsed.text || '';
      if (examinerResponse) {
        const newTurn: DiscussionTurn = { role: 'examiner', text: examinerResponse };
        const updated = [...existingTurns, newTurn];
        setDiscussionTurns(updated);
      }
    } catch {
      // Discussion generation failed, proceed to evaluation
      setDiscussionTurns(existingTurns);
    }
    setDiscussionLoading(false);
  };

  const handleDiscussionAnswer = async () => {
    if (!discussionInput.trim() || discussionLoading) return;
    const candidateTurn: DiscussionTurn = { role: 'candidate', text: discussionInput.trim() };
    const updated = [...discussionTurns, candidateTurn];
    setDiscussionTurns(updated);
    setDiscussionInput('');

    // Check if we've had enough turns
    const examinerTurns = updated.filter((t) => t.role === 'examiner').length;
    if (examinerTurns >= DISCUSSION_MAX_TURNS) {
      // Proceed to evaluation after discussion
      setPhase('completed');
      return;
    }

    await generateNextDiscussionTurn(updated);
  };

  const handleFeedback = (vote: TelcFeedback['vote']) => {
    if (feedbackVote || !sessionId) return;
    setFeedbackVote(vote);
    addTelcFeedback({ sessionId, vote, timestamp: Date.now() });
  };

  const handleSkipDiscussion = () => {
    setPhase('completed');
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

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

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

  // Completed phase
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
          <div className="space-y-4">
            <button
              onClick={handleStartDiscussion}
              disabled={!telcSettings.aiEnabled || !telcSettings.apiKey}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/30 text-lg"
            >
              <MessageCircle size={24} />
              Interaktive Diskussion starten
            </button>
            <button
              onClick={handleRunEvaluation}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-900/20"
            >
              <MessageSquare size={20} />
              Direkt zur Auswertung
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Discussion phase
  if (phase === 'discussion') {
    const examinerTurns = discussionTurns.filter((t) => t.role === 'examiner');
    const isLastExaminerTurn = examinerTurns.length >= DISCUSSION_MAX_TURNS;

    return (
      <div className="max-w-3xl mx-auto pb-20">
        <PageHeader title="TELC C1 — Diskussion" showBack />
        <div className="bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20 rounded-3xl p-6 mb-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle size={24} className="text-indigo-500" />
            <h2 className="text-xl font-black text-white">Diskussion mit dem Prüfer</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Der Prüfer stellt Ihnen Fragen zu Ihrer Präsentation. Antworten Sie frei.
          </p>
        </div>

        {/* Discussion turns */}
        <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
          {discussionTurns.map((turn, idx) => (
            <div key={idx} className={cn(
              "flex gap-3",
              turn.role === 'examiner' ? "justify-start" : "justify-end"
            )}>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-5 py-3",
                turn.role === 'examiner'
                  ? "bg-gray-800 border border-gray-700 text-gray-200"
                  : "bg-indigo-600/20 border border-indigo-500/30 text-white"
              )}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">
                  {turn.role === 'examiner' ? 'Prüfer' : 'Sie'}
                </p>
                <p className="text-sm leading-relaxed">{turn.text}</p>
              </div>
            </div>
          ))}
          {discussionLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 border border-gray-700 rounded-2xl px-5 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  <span className="text-sm text-gray-400">Prüfer überlegt...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Answer input */}
        {!discussionLoading && !isLastExaminerTurn && (
          <div className="bg-gray-950 border border-gray-900 rounded-2xl p-4 shadow-xl">
            <textarea
              value={discussionInput}
              onChange={(e) => setDiscussionInput(e.target.value)}
              placeholder="Ihre Antwort..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleDiscussionAnswer();
                }
              }}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSkipDiscussion}
                className="flex-1 py-3 rounded-xl border border-gray-800 bg-gray-950 text-gray-400 font-bold hover:bg-gray-900 transition-colors text-sm"
              >
                Diskussion überspringen
              </button>
              <button
                onClick={handleDiscussionAnswer}
                disabled={!discussionInput.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold transition-all text-sm"
              >
                <Send size={16} />
                Senden
              </button>
            </div>
          </div>
        )}

        {/* End discussion button */}
        {!discussionLoading && isLastExaminerTurn && (
          <button
            onClick={handleSkipDiscussion}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-900/30 text-lg"
          >
            <MessageSquare size={24} />
            Zur Auswertung
          </button>
        )}
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

      {/* Language Analysis — Redemittel */}
      {languageAnalysis && (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
          <h4 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <BookOpen size={16} />
            Redemittel Analyse
          </h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className="text-xl font-black text-white">{languageAnalysis.redemittel.totalConnectors}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Konnektoren</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className="text-xl font-black text-white">{languageAnalysis.redemittel.uniqueConnectors}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Einzigartige</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", getGradeColor(languageAnalysis.redemittel.score))}>{languageAnalysis.redemittel.score}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Niveau</p>
            </div>
          </div>
          {languageAnalysis.redemittel.matches.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {languageAnalysis.redemittel.matches.slice(0, 8).map((m) => (
                <span key={m.connector} className="text-xs bg-cyan-600/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full">
                  {m.connector} ({m.count})
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">{languageAnalysis.redemittel.levelEstimation}</p>
        </div>
      )}

      {/* Language Analysis — Vocabulary */}
      {languageAnalysis && (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
          <h4 className="text-sm font-bold text-orange-400 mb-4 flex items-center gap-2">
            <BookOpen size={16} />
            Wortschatz Analyse
          </h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className="text-xl font-black text-white">{languageAnalysis.vocabulary.uniqueWords}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Einzigartige Wörter</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className="text-xl font-black text-white">{(languageAnalysis.vocabulary.diversity * 100).toFixed(0)}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Diversität</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", getGradeColor(languageAnalysis.vocabulary.level))}>{languageAnalysis.vocabulary.level}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Niveau</p>
            </div>
          </div>
          {languageAnalysis.vocabulary.advancedCount > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 mb-1">Fortgeschrittene Vokabeln: {languageAnalysis.vocabulary.advancedCount}</p>
            </div>
          )}
          {languageAnalysis.vocabulary.basicWords.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-bold text-gray-500 mb-1">Übermäßig genutzte Basisvokabeln:</p>
              <div className="flex flex-wrap gap-2">
                {languageAnalysis.vocabulary.basicWords.map((bw) => (
                  <span key={bw.word} className="text-xs bg-yellow-600/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full">
                    {bw.word} ({bw.count}x)
                  </span>
                ))}
              </div>
            </div>
          )}
          {languageAnalysis.vocabulary.overusedWords.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Wiederholungen:</p>
              <div className="flex flex-wrap gap-2">
                {languageAnalysis.vocabulary.overusedWords.map((ow) => (
                  <span key={ow.word} className="text-xs bg-red-600/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full">
                    {ow.word} ({ow.count}x)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Language Analysis — Argumentation */}
      {languageAnalysis && (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
          <h4 className="text-sm font-bold text-green-400 mb-4 flex items-center gap-2">
            <BookOpen size={16} />
            Argumentationsanalyse
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", languageAnalysis.argumentation.hasExamples ? 'text-green-400' : 'text-gray-600')}>
                {languageAnalysis.argumentation.hasExamples ? '✓' : '✗'}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Beispiele</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", languageAnalysis.argumentation.hasJustification ? 'text-green-400' : 'text-gray-600')}>
                {languageAnalysis.argumentation.hasJustification ? '✓' : '✗'}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Begründung</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", languageAnalysis.argumentation.hasCounterarguments ? 'text-green-400' : 'text-gray-600')}>
                {languageAnalysis.argumentation.hasCounterarguments ? '✓' : '✗'}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Gegenargumente</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
              <p className={cn("text-xl font-black", languageAnalysis.argumentation.hasConclusion ? 'text-green-400' : 'text-gray-600')}>
                {languageAnalysis.argumentation.hasConclusion ? '✓' : '✗'}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Fazit</p>
            </div>
          </div>
          <div className="mb-3">
            <p className="text-sm font-bold text-gray-400">
              Argumentation: <span className={cn(getGradeColor(languageAnalysis.argumentation.score))}>{languageAnalysis.argumentation.score}</span>
            </p>
          </div>
          {languageAnalysis.argumentation.patternsFound.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {languageAnalysis.argumentation.patternsFound.slice(0, 6).map((p) => (
                <span key={p} className="text-xs bg-green-600/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Evaluation Feedback */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
        <h4 className="text-sm font-bold text-gray-400 mb-4">War diese Bewertung hilfreich?</h4>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleFeedback('accurate')}
            disabled={feedbackVote !== null}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
              feedbackVote === 'accurate'
                ? "bg-green-600/20 text-green-400 border border-green-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white"
            )}
          >
            👍 Accurate
          </button>
          <button
            onClick={() => handleFeedback('too-strict')}
            disabled={feedbackVote !== null}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
              feedbackVote === 'too-strict'
                ? "bg-red-600/20 text-red-400 border border-red-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white"
            )}
          >
            👎 Zu streng
          </button>
          <button
            onClick={() => handleFeedback('too-generous')}
            disabled={feedbackVote !== null}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
              feedbackVote === 'too-generous'
                ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"
                : "bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white"
            )}
          >
            👎 Zu großzügig
          </button>
        </div>
        {feedbackVote && (
          <p className="text-center text-xs text-gray-600 mt-3">Danke für Ihr Feedback!</p>
        )}
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
