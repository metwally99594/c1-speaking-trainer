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
  const [completedInSession, setCompletedInSession] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [focusWord, setFocusWord] = useState<{ word: string; sentence: string; status: string } | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [chunkMode, setChunkMode] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);

  const allSentences = topic?.sentences || [];
  const sentences = remainingMode
    ? allSentences.filter(s => !s.isCompleted)
    : allSentences;
  const currentSentence = sentences[currentIndex];
  const chunks = currentSentence ? (sentenceChunks[currentSentence.id] || []) : [];
  const currentText = chunkMode && chunks.length > 0
    ? chunks[chunkIndex]?.text ?? ''
    : currentSentence?.text ?? '';
  const isComplete = remainingMode && sentences.length > 0 && completedInSession >= sentences.length;

  const handleNext = useCallback(() => {
    if (chunkMode && chunks.length > 0) {
      if (chunkIndex < chunks.length - 1) {
        setChunkIndex((prev) => prev + 1);
        return;
      }
      setChunkMode(false);
      setChunkIndex(0);
      if (currentIndex < sentences.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
      return;
    }
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [chunkMode, chunks.length, chunkIndex, currentIndex, sentences.length]);

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
      if (currentIndex < sentences.length - 1) {
        handleNext();
      }
    }
  }, [topicId, currentSentence, toggleSentence, currentIndex, handleNext, sentences.length, remainingMode]);

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

  if (sentences.length === 0) {
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
    <div className="max-w-3xl mx-auto pb-20">
      <PageHeader title={`Practice: ${topic.title}`} showBack />

      {/* Progress Section */}
      <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">
              {remainingMode ? 'Remaining Session' : 'Session Progress'}
            </span>
            <span className="text-2xl font-black text-white">
              {currentIndex + 1} <span className="text-gray-600 font-normal">of</span> {sentences.length}
              {chunkMode && chunks.length > 0 && (
                <span className="text-base text-gray-500"> — Chunk {chunkIndex + 1} of {chunks.length}</span>
              )}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Mastery</span>
            <span className="text-2xl font-black text-blue-500">{progress}%</span>
          </div>
        </div>
        <ProgressBar progress={remainingMode ? Math.round((completedInSession / sentences.length) * 100) : progress} className="h-2" />
      </div>

      {/* Mode Toggle + Split Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setChunkMode(false); setChunkIndex(0); }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              !chunkMode ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-500 hover:text-white border border-gray-800"
            )}
          >
            Full Sentence
          </button>
          <button
            onClick={() => { if (chunks.length > 0) { setChunkMode(true); setChunkIndex(0); } }}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              chunkMode ? "bg-blue-600 text-white" : "bg-gray-900 text-gray-500 hover:text-white border border-gray-800",
              chunks.length === 0 && "opacity-40 cursor-not-allowed"
            )}
            disabled={chunks.length === 0}
          >
            Chunk Mode
          </button>
        </div>
        <button
          onClick={() => setShowSplitModal(true)}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
        >
          <Scissors size={14} />
          Split Sentence
        </button>
      </div>

      {/* Main Content Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-black border border-gray-800 rounded-3xl p-10 min-h-[300px] flex flex-col justify-between shadow-2xl">
          <div className="space-y-4">
             <div className="flex justify-between items-start">
               <div className="inline-block bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-blue-500/20">
                 {chunkMode ? `Chunk ${chunkIndex + 1}` : `Sentence ${currentSentence.order}`}
               </div>
               {currentSentence.attempts ? (
                 <div className="flex gap-4">
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Best</p>
                     <p className="text-sm font-black text-green-500">{currentSentence.bestScore}%</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Attempts</p>
                     <p className="text-sm font-black text-white">{currentSentence.attempts}</p>
                   </div>
                 </div>
               ) : null}
             </div>
             <p className="text-3xl md:text-4xl font-bold text-white leading-tight">
               {currentText}
             </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
             <button
               onClick={handleMarkAsMastered}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-5 rounded-2xl font-bold transition-all transform active:scale-[0.98]",
                 currentSentence.isCompleted
                   ? "bg-green-600/10 border border-green-500/30 text-green-400"
                   : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
               )}
             >
               <CheckCircle2 size={24} />
               <span>{currentSentence.isCompleted ? 'Mastered!' : 'Mark as Mastered'}</span>
             </button>
          </div>
        </div>
      </div>

      {/* TTS Controls */}
      <div className="mt-8">
        <SpeechControls text={currentText} />
      </div>

      {/* Speech Recognition Controls */}
      <div className="mt-8">
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            Previous Chunk
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all text-sm"
          >
            {chunkIndex < chunks.length - 1 ? (
              <>Next Chunk <ChevronRight size={16} /></>
            ) : 'Finish Chunks'}
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

      {/* Navigation Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-gray-900 p-6 z-50">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0 && !(chunkMode && chunkIndex > 0)}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === sentences.length - 1 && !(chunkMode && chunkIndex < chunks.length - 1)}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Mastery Celebration */}
      {(progress === 100 || isComplete) && (
        <div className="mt-12 bg-gradient-to-br from-green-600/20 to-cyan-600/20 border border-green-500/30 p-10 rounded-3xl text-center shadow-2xl overflow-hidden relative">
          <Trophy size={80} className="absolute -right-4 -bottom-4 text-green-500/10 transform rotate-12" />
           <h3 className="text-3xl font-black text-white mb-3">
            {remainingMode ? 'Topic Completed Successfully!' : 'Mastery Achieved!'} 🎉
          </h3>
          <p className="text-gray-400 text-lg mb-8">
            {remainingMode
              ? "You've completed all remaining sentences in this topic. Great progress!"
              : "You've successfully practiced all sentences in this topic."}
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-white text-black px-10 py-4 rounded-2xl font-black transition-all hover:scale-105 active:scale-95"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
