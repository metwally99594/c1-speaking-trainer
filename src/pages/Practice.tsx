import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar, cn } from '../components/ui/ProgressBar';
import { SpeechControls } from '../components/SpeechControls';
import { SpeechRecognition } from '../components/SpeechRecognition';
import { ChevronLeft, ChevronRight, CheckCircle2, Trophy } from 'lucide-react';

export default function Practice() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === topicId));
  const toggleSentence = useTopicStore((state) => state.toggleSentence);
  const updateSentenceScore = useTopicStore((state) => state.updateSentenceScore);
  const progress = useTopicStore((state) => (topicId ? state.getTopicProgress(topicId) : 0));

  const [currentIndex, setCurrentIndex] = useState(0);

  const sentences = topic?.sentences || [];
  const currentSentence = sentences[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, sentences.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleMarkAsMastered = useCallback(() => {
    if (topicId && currentSentence) {
      if (!currentSentence.isCompleted) {
        toggleSentence(topicId, currentSentence.id);
      }
      if (currentIndex < sentences.length - 1) {
        handleNext();
      }
    }
  }, [topicId, currentSentence, toggleSentence, currentIndex, handleNext, sentences.length]);

  const handleSpeechResult = (score: number) => {
    if (topicId && currentSentence) {
      updateSentenceScore(topicId, currentSentence.id, score);
    }
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
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">No sentences in this topic</h2>
        <p className="text-gray-500 mb-4">This topic has no sentences to practice. Add content to this topic first.</p>
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
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Session Progress</span>
            <span className="text-2xl font-black text-white">
              {currentIndex + 1} <span className="text-gray-600 font-normal">of</span> {sentences.length}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Mastery</span>
            <span className="text-2xl font-black text-blue-500">{progress}%</span>
          </div>
        </div>
        <ProgressBar progress={progress} className="h-2" />
      </div>

      {/* Main Content Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-black border border-gray-800 rounded-3xl p-10 min-h-[300px] flex flex-col justify-between shadow-2xl">
          <div className="space-y-4">
             <div className="flex justify-between items-start">
               <div className="inline-block bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-blue-500/20">
                 Sentence {currentSentence.order}
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
               {currentSentence.text}
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
        <SpeechControls text={currentSentence.text} />
      </div>

      {/* Speech Recognition Controls */}
      <div className="mt-8">
        <SpeechRecognition 
          originalText={currentSentence.text} 
          onResult={handleSpeechResult}
          key={currentSentence.id} // Re-mount when sentence changes to reset state
        />
      </div>

      {/* Navigation Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-gray-900 p-6 z-50">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
            <span>Previous</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === sentences.length - 1}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
          >
            <span>Next</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Mastery Celebration */}
      {progress === 100 && (
        <div className="mt-12 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-10 rounded-3xl text-center shadow-2xl overflow-hidden relative">
          <Trophy size={80} className="absolute -right-4 -bottom-4 text-blue-500/10 transform rotate-12" />
          <h3 className="text-3xl font-black text-white mb-3">Mastery Achieved! 🎉</h3>
          <p className="text-gray-400 text-lg mb-8">You've successfully practiced all sentences in this topic.</p>
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
