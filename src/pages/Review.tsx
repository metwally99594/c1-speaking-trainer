import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { cn } from '../utils/cn';
import { SpeechControls } from '../components/SpeechControls';
import { SpeechRecognition } from '../components/SpeechRecognition';
import { WordFocusModal } from '../components/WordFocusModal';
import { ChevronLeft, ChevronRight, CheckCircle2, Trophy, AlertCircle } from 'lucide-react';
import type { Sentence, Topic } from '../models/types';

interface ReviewItem extends Sentence {
  topicId: string;
}

function buildReviewQueue(topics: Topic[]): ReviewItem[] {
  const now = Date.now();
  const queue: ReviewItem[] = [];
  topics.forEach(topic => {
    topic.sentences.forEach(s => {
      if (s.nextReviewAt && s.nextReviewAt <= now) {
        queue.push({ ...s, topicId: topic.id });
      }
    });
  });
  queue.sort((a, b) => (a.bestScore || 0) - (b.bestScore || 0));
  return queue;
}

export default function Review() {
  const navigate = useNavigate();
  const topics = useTopicStore((state) => state.topics);
  const toggleSentence = useTopicStore((state) => state.toggleSentence);
  const updateSentenceScore = useTopicStore((state) => state.updateSentenceScore);

  const [reviewQueue] = useState<ReviewItem[]>(() => buildReviewQueue(topics));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [focusWord, setFocusWord] = useState<{ word: string; sentence: string; status: string } | null>(null);

  const reviewQueueRef = useRef(reviewQueue);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    reviewQueueRef.current = reviewQueue;
    currentIndexRef.current = currentIndex;
  }, [reviewQueue, currentIndex]);

  const currentItem = reviewQueue[currentIndex] || null;

  const handleNext = () => {
    const queue = reviewQueueRef.current;
    const idx = currentIndexRef.current;
    if (idx < queue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndexRef.current > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleMarkAsMastered = () => {
    const queue = reviewQueueRef.current;
    const idx = currentIndexRef.current;
    const item = queue[idx];
    if (item) {
      if (!item.isCompleted) {
        toggleSentence(item.topicId, item.id);
      }
      handleNext();
    }
  };

  const handleSpeechResult = (score: number) => {
    const queue = reviewQueueRef.current;
    const idx = currentIndexRef.current;
    const item = queue[idx];
    if (item) {
      updateSentenceScore(item.topicId, item.id, score);
    }
  };

  const handleWordClick = (data: { word: string; sentence: string; status: string }) => {
    setFocusWord(data);
  };

  // Keyboard navigation (stable refs, no re-subscription needed)
  const handleNextRef = useRef(handleNext);
  const handlePreviousRef = useRef(handlePrevious);
  const handleMarkAsMasteredRef = useRef(handleMarkAsMastered);

  useEffect(() => {
    handleNextRef.current = handleNext;
    handlePreviousRef.current = handlePrevious;
    handleMarkAsMasteredRef.current = handleMarkAsMastered;
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePreviousRef.current();
      if (e.key === 'ArrowRight') handleNextRef.current();
      if (e.key === 'Enter' && e.ctrlKey) handleMarkAsMasteredRef.current();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if ((reviewQueue.length === 0 || !currentItem) && !isFinished) {
    return (
      <div className="text-center py-20 bg-gray-950 border border-gray-900 rounded-3xl">
        <div className="bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-500" size={32} />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">You're All Caught Up!</h2>
        <p className="text-gray-400 mb-8 max-w-sm mx-auto">No sentences need review right now. Keep up the great work!</p>
        <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 bg-gradient-to-br from-green-600/10 to-blue-600/10 border border-green-500/20 rounded-3xl">
        <Trophy size={80} className="mx-auto text-yellow-500 mb-6" />
        <h2 className="text-3xl font-black text-white mb-2">Review Session Complete!</h2>
        <p className="text-gray-400 mb-10">You've cleared your review queue for today.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-white text-black px-10 py-4 rounded-2xl font-black transition-all hover:scale-105 active:scale-95"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <PageHeader title="Smart Review Session" showBack />

      <div className="bg-orange-600/10 border border-orange-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
        <AlertCircle className="text-orange-500" size={20} />
        <p className="text-sm font-medium text-orange-200">
          This sentence was difficult for you previously. Let's master it!
        </p>
      </div>

      <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex justify-between items-end mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Queue Progress</span>
            <span className="text-2xl font-black text-white">
              {currentIndex + 1} <span className="text-gray-600 font-normal">of</span> {reviewQueue.length}
            </span>
          </div>
          <div className="text-right">
             <span className="text-xs font-bold uppercase tracking-widest text-gray-500 block mb-1">Last Score</span>
             <span className="text-2xl font-black text-orange-500">{currentItem.lastScore || 0}%</span>
          </div>
        </div>
        <ProgressBar progress={((currentIndex + 1) / reviewQueue.length) * 100} className="h-2" />
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-black border border-gray-800 rounded-3xl p-10 min-h-[300px] flex flex-col justify-between shadow-2xl">
          <div className="space-y-4">
             <div className="flex justify-between items-start">
               <div className="inline-block bg-orange-600/10 text-orange-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-orange-500/20">
                 Mastery Level: {currentItem.masteryLevel || 0}/5
               </div>
               <div className="text-right">
                 <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Attempts</p>
                 <p className="text-sm font-black text-white">{currentItem.attempts}</p>
               </div>
             </div>
             <p className="text-3xl md:text-4xl font-bold text-white leading-tight">
               {currentItem.text}
             </p>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
             <button
               onClick={handleMarkAsMastered}
               className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-5 rounded-2xl font-bold transition-all transform active:scale-[0.98]",
                 currentItem.isCompleted
                   ? "bg-green-600/10 border border-green-500/30 text-green-400"
                   : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
               )}
             >
               <CheckCircle2 size={24} />
               <span>{currentItem.isCompleted ? 'Mastered!' : 'Mark as Mastered'}</span>
             </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SpeechControls text={currentItem.text} />
      </div>

      <div className="mt-8">
        <SpeechRecognition 
          originalText={currentItem.text} 
          onResult={handleSpeechResult}
          onWordClick={handleWordClick}
          key={currentItem.id}
        />
      </div>

      {focusWord && (
        <WordFocusModal
          word={focusWord.word}
          sentence={focusWord.sentence}
          status={focusWord.status}
          onClose={() => setFocusWord(null)}
        />
      )}

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
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold hover:bg-gray-900 transition-colors"
          >
            <span>{currentIndex === reviewQueue.length - 1 ? 'Finish' : 'Next'}</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
