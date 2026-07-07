import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { cn } from '../utils/cn';
import { SpeechControls } from '../components/SpeechControls';
import { SpeechRecognition } from '../components/SpeechRecognition';
import { WordFocusModal } from '../components/WordFocusModal';
import { SplitSentenceModal } from '../components/SplitSentenceModal';
import { ChevronLeft, ChevronRight, CheckCircle2, Trophy, Scissors } from 'lucide-react';
import type { Sentence, Topic } from '../models/types';

function buildPracticeSentences(topic: Topic | undefined, remainingMode: boolean): Sentence[] {
  if (!topic) return [];
  return remainingMode ? topic.sentences.filter(s => !s.isCompleted) : topic.sentences;
}

function getInitialIndex(sentences: Sentence[], sentenceId: string | null): number {
  if (!sentenceId) return 0;
  const idx = sentences.findIndex(s => s.id === sentenceId);
  return idx >= 0 ? idx : 0;
}

export default function Practice() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === topicId));
  const toggleSentence = useTopicStore((state) => state.toggleSentence);
  const updateSentenceScore = useTopicStore((state) => state.updateSentenceScore);
  const progress = useTopicStore((state) => (topicId ? state.getTopicProgress(topicId) : 0));
  const sentenceChunks = useTopicStore((state) => state.sentenceChunks);
  const updateSentenceChunks = useTopicStore((state) => state.updateSentenceChunks);

  const remainingMode = searchParams.get('remaining') === 'true';
  const sentenceIdParam = searchParams.get('sentenceId');
  const [completedInSession, setCompletedInSession] = useState(0);

  const [sessionSentences, setSessionSentences] = useState<Sentence[]>(() => buildPracticeSentences(topic, remainingMode));
  const [currentIndex, setCurrentIndex] = useState(() => getInitialIndex(buildPracticeSentences(topic, remainingMode), sentenceIdParam));
  const [focusWord, setFocusWord] = useState<{ word: string; sentence: string; status: string } | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [chunkMode, setChunkMode] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);

  const allSentences = topic?.sentences || [];
  const sessionSentence = sessionSentences[currentIndex];
  const currentSentence = sessionSentence
    ? allSentences.find(s => s.id === sessionSentence.id) ?? sessionSentence
    : undefined;
  const chunks = currentSentence ? (sentenceChunks[currentSentence.id] || []) : [];
  const currentText = chunkMode && chunks.length > 0
    ? chunks[chunkIndex]?.text ?? ''
    : currentSentence?.text ?? '';
  const isComplete = remainingMode && sessionSentences.length > 0 && completedInSession >= sessionSentences.length;

  const handleNext = useCallback(() => {
    if (chunkMode && chunks.length > 0) {
      if (chunkIndex < chunks.length - 1) {
        setChunkIndex((prev) => prev + 1);
        return;
      }
      setChunkMode(false);
      setChunkIndex(0);
      if (currentIndex < sessionSentences.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      return;
    }
    if (currentIndex < sessionSentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [chunkMode, chunks.length, chunkIndex, currentIndex, sessionSentences.length]);

  const handlePrevious = useCallback(() => {
    if (chunkMode && chunks.length > 0) {
      if (chunkIndex > 0) {
        setChunkIndex((prev) => prev - 1);
        return;
      }
      setChunkMode(false);
      setChunkIndex(0);
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [chunkMode, chunks.length, chunkIndex, currentIndex]);

  const handleMarkAsMastered = useCallback(() => {
    if (topicId && currentSentence) {
      if (!currentSentence.isCompleted) {
        toggleSentence(topicId, currentSentence.id);
        if (remainingMode) setCompletedInSession((c) => c + 1);
      }
      if (currentIndex < sessionSentences.length - 1) {
        handleNext();
      }
    }
  }, [topicId, currentSentence, toggleSentence, currentIndex, handleNext, sessionSentences.length, remainingMode]);

  const handleSpeechResult = (score: number) => {
    if (topicId && currentSentence) {
      updateSentenceScore(topicId, currentSentence.id, score);
    }
  };

  const handleWordClick = (data: { word: string; sentence: string; status: string }) => {
    setFocusWord(data);
  };

  const handleSaveChunks = (sentenceId: string, chunkTexts: string[]) => {
    updateSentenceChunks(
      sentenceId,
      chunkTexts.map((text, idx) => ({ id: crypto.randomUUID(), text, order: idx + 1 }))
    );
    setShowSplitModal(false);
    setChunkMode(true);
    setChunkIndex(0);
  };

  useEffect(() => {
    if (sessionSentences.length > 0 || !topic) return;
    const timeout = window.setTimeout(() => {
      const initial = buildPracticeSentences(topic, remainingMode);
      if (initial.length === 0) return;
      setSessionSentences(initial);
      setCurrentIndex(getInitialIndex(initial, sentenceIdParam));
    }, 0);
    return () => clearTimeout(timeout);
  }, [topic, remainingMode, sentenceIdParam, sessionSentences.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Enter' && e.ctrlKey) handleMarkAsMastered();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrevious, handleMarkAsMastered]);

  if (!topic) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Topic not found</h2>
        <Link to="/" className="text-blue-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  if (sessionSentences.length === 0 || !currentSentence) {
    const message = remainingMode
      ? 'All sentences in this topic have been completed.'
      : 'No sentences in this topic. Add content to this topic first.';
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">
          {remainingMode ? 'Topic Completed Successfully!' : 'No sentences found'}
        </h2>
        <p className="text-gray-500 mb-4">{message}</p>
        <Link to="/" className="text-blue-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <PageHeader title={`Praxis: ${topic.title}`} showBack />

      {/* Progress Section */}
      <div className="glass-panel p-6 rounded-3xl mb-8 shadow-xl border border-slate-900">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">
              {remainingMode ? 'Verbleibende Sätze' : 'Sitzungsfortschritt'}
            </span>
            <span className="text-2xl font-black text-white">
              {currentIndex + 1} <span className="text-slate-500 font-normal">von</span> {sessionSentences.length}
              {chunkMode && chunks.length > 0 && (
                <span className="text-sm text-slate-400"> — Chunk {chunkIndex + 1} von {chunks.length}</span>
              )}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Mastery</span>
            <span className="text-2xl font-black text-blue-400">{progress}%</span>
          </div>
        </div>
        <ProgressBar progress={remainingMode ? Math.round((completedInSession / sessionSentences.length) * 100) : progress} className="h-2 rounded-full" />
      </div>

      {/* Mode Toggle + Split Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2 bg-slate-950/40 p-1 rounded-2xl border border-slate-900">
          <button
            onClick={() => { setChunkMode(false); setChunkIndex(0); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              !chunkMode 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            Ganzer Satz
          </button>
          <button
            onClick={() => { if (chunks.length > 0) { setChunkMode(true); setChunkIndex(0); } }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              chunkMode 
                ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                : "text-slate-500 hover:text-slate-300",
              chunks.length === 0 && "opacity-40 cursor-not-allowed"
            )}
            disabled={chunks.length === 0}
          >
            Chunk-Modus
          </button>
        </div>
        <button
          onClick={() => setShowSplitModal(true)}
          className="flex items-center gap-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <Scissors size={12} />
          Satz aufteilen
        </button>
      </div>

      {/* Main Content Card */}
      <div className="relative group mb-8">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[32px] blur opacity-10 group-hover:opacity-15 transition duration-1000"></div>
        <div className="relative glass-panel rounded-[32px] p-10 min-h-[280px] flex flex-col justify-between shadow-2xl border border-slate-800/80">
          <div className="space-y-6">
             <div className="flex justify-between items-center">
               <div className="inline-block bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-blue-500/20">
                 {chunkMode ? `Abschnitt ${chunkIndex + 1}` : `Satz ${currentSentence.order}`}
               </div>
               {currentSentence.attempts ? (
                 <div className="flex gap-4">
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bestes</p>
                     <p className="text-sm font-black text-green-400">{currentSentence.bestScore}%</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Versuche</p>
                     <p className="text-sm font-black text-white">{currentSentence.attempts}</p>
                   </div>
                 </div>
               ) : null}
             </div>
             <p className="text-2xl md:text-3xl font-bold text-white leading-snug">
               {currentText}
             </p>
          </div>

          <div className="mt-10">
             <button
               onClick={handleMarkAsMastered}
               className={cn(
                 "w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold transition-all transform active:scale-[0.98] text-sm",
                 currentSentence.isCompleted
                   ? "bg-green-500/10 border border-green-500/20 text-green-400"
                   : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 hover:shadow-blue-500/30"
               )}
             >
               <CheckCircle2 size={18} />
               <span>{currentSentence.isCompleted ? 'Meisterhaft gelernt!' : 'Als gelernt markieren'}</span>
             </button>
          </div>
        </div>
      </div>

      {/* TTS Controls */}
      <div className="space-y-6">
        <SpeechControls text={currentText} />

        {/* Speech Recognition Controls */}
        <SpeechRecognition 
          originalText={currentText}
          onResult={handleSpeechResult}
          onWordClick={handleWordClick}
          key={currentSentence.id + (chunkMode ? `-chunk-${chunkIndex}` : '-full')}
        />
      </div>

      {/* Chunk Navigation */}
      {chunkMode && chunks.length > 0 && (
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setChunkIndex((i) => Math.max(0, i - 1))}
            disabled={chunkIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-300 font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-900 transition-colors text-xs"
          >
            <ChevronLeft size={14} />
            Vorheriger Abschnitt
          </button>
          <button
            onClick={() => {
              if (chunkIndex < chunks.length - 1) {
                setChunkIndex((i) => i + 1);
              } else {
                setChunkMode(false);
                setChunkIndex(0);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-xs"
          >
            {chunkIndex < chunks.length - 1 ? (
              <>Nächster Abschnitt <ChevronRight size={14} /></>
            ) : 'Abschnitte beenden'}
          </button>
        </div>
      )}

      {/* Word Focus Modal */}
      {focusWord && (
        <WordFocusModal
          word={focusWord.word}
          sentence={focusWord.sentence}
          status={focusWord.status}
          onClose={() => setFocusWord(null)}
        />
      )}

      {/* Split Sentence Modal */}
      {showSplitModal && currentSentence && (
        <SplitSentenceModal
          sentenceId={currentSentence.id}
          sentenceText={currentSentence.text}
          initialChunks={chunks.map(c => c.text)}
          onSave={handleSaveChunks}
          onClose={() => setShowSplitModal(false)}
        />
      )}

      {/* Fixed Bottom Navigation Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-900/60 p-5 z-40">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 && !(chunkMode && chunkIndex > 0)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-300 font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-900 transition-all text-sm"
          >
            <ChevronLeft size={16} />
            <span>Zurück</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === sessionSentences.length - 1 && !(chunkMode && chunkIndex < chunks.length - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-850 bg-slate-900/40 text-slate-300 font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-900 transition-all text-sm"
          >
            <span>Weiter</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Mastery Celebration */}
      {(progress === 100 || isComplete) && (
        <div className="mt-12 bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20 p-10 rounded-3xl text-center shadow-2xl overflow-hidden relative">
          <Trophy size={80} className="absolute -right-4 -bottom-4 text-green-500/5 transform rotate-12" />
           <h3 className="text-2xl font-black text-white mb-3">
            {remainingMode ? 'Thema erfolgreich beendet!' : 'Herzlichen Glückwunsch!'} 🎉
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            {remainingMode
              ? "Sie haben alle verbleibenden Sätze in diesem Thema abgeschlossen. Weiter so!"
              : "Sie haben alle Sätze in diesem Thema erfolgreich gelernt."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-black px-8 py-3 rounded-xl font-bold transition-all hover:scale-103 active:scale-97 text-sm"
          >
            Zurück zur Übersicht
          </button>
        </div>
      )}
    </div>
  );
}
