import { useState, useMemo } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { WordFocusModal } from '../components/WordFocusModal';
import { Search, ArrowUpDown, Target, Trophy, AlertTriangle, BarChart3, BookOpen, RefreshCw, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react';
import { cn } from '../utils/cn';
import { isWeakWord } from '../utils/weakWords';

type SortKey = 'lowest-score' | 'most-attempts' | 'most-missed' | 'recently-practiced';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'lowest-score', label: 'Lowest Score First' },
  { value: 'most-attempts', label: 'Most Attempts First' },
  { value: 'most-missed', label: 'Most Missed First' },
  { value: 'recently-practiced', label: 'Recently Practiced' },
];

export default function WeakWords() {
  const wordStats = useTopicStore((state) => state.wordStats);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('lowest-score');
  const [focusWord, setFocusWord] = useState<{ word: string; sentence: string; status: string } | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const weakWords = useMemo(() => {
    return Object.values(wordStats).filter(isWeakWord);
  }, [wordStats]);

  const filteredWords = useMemo(() => {
    let list = [...weakWords];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.word.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      switch (sortBy) {
        case 'lowest-score': return (a.averageScore || 0) - (b.averageScore || 0);
        case 'most-attempts': return (b.attempts || 0) - (a.attempts || 0);
        case 'most-missed': return ((b.missingCount || 0) + (b.nearMatchCount || 0)) - ((a.missingCount || 0) + (a.nearMatchCount || 0));
        case 'recently-practiced': return (b.lastPracticedAt || 0) - (a.lastPracticedAt || 0);
        default: return 0;
      }
    });
    return list;
  }, [weakWords, search, sortBy]);

  const reviewQueue = useMemo(() => {
    return [...weakWords].sort((a, b) => {
      const avgA = a.averageScore || 0;
      const avgB = b.averageScore || 0;
      if (avgA !== avgB) return avgA - avgB;
      const missA = a.missingCount || 0;
      const missB = b.missingCount || 0;
      if (missA !== missB) return missB - missA;
      return (b.attempts || 0) - (a.attempts || 0);
    });
  }, [weakWords]);

  const currentReviewItem = reviewQueue[reviewIndex];

  const startReview = () => {
    setReviewIndex(0);
    setReviewMode(true);
  };

  if (weakWords.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <PageHeader title="Weak Words" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-20 text-center shadow-2xl">
          <PartyPopper className="mx-auto text-green-500 mb-6" size={64} />
          <h2 className="text-2xl font-black text-white mb-4">Excellent! No weak words detected.</h2>
          <p className="text-gray-500 text-lg max-w-md mx-auto">
            Keep practicing to maintain your streak. All words are at a good level!
          </p>
        </div>
      </div>
    );
  }

  if (reviewMode && currentReviewItem) {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <PageHeader title={`Daily Review (${reviewIndex + 1}/${reviewQueue.length})`} showBack />

        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-10 shadow-2xl">
          <div className="text-center mb-8">
            <Target className="mx-auto text-blue-500 mb-4" size={40} />
            <p className="text-4xl font-black text-white mb-2">{currentReviewItem.word}</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <span className="text-sm text-gray-500">Avg: <strong className="text-white">{currentReviewItem.averageScore}%</strong></span>
              <span className="text-sm text-gray-500">Missed: <strong className="text-red-400">{currentReviewItem.missingCount}</strong></span>
              <span className="text-sm text-gray-500">Attempts: <strong className="text-white">{currentReviewItem.attempts}</strong></span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <WordFocusModal
            word={currentReviewItem.word}
            sentence={currentReviewItem.word}
            status={currentReviewItem.averageScore >= 90 ? 'near-match' : 'incorrect'}
            onClose={() => setReviewMode(false)}
          />
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
            disabled={reviewIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border border-gray-800 bg-gray-950 text-white font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-900 transition-colors"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          {reviewIndex < reviewQueue.length - 1 ? (
            <button
              onClick={() => setReviewIndex((i) => i + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
            >
              Next
              <ChevronRight size={20} />
            </button>
          ) : (
            <button
              onClick={() => setReviewMode(false)}
              className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-all"
            >
              <Trophy size={20} />
              Complete Review
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <PageHeader title="Weak Words Dashboard">
        <div className="flex gap-4">
          <button
            onClick={startReview}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-orange-900/20"
          >
            <RefreshCw size={18} />
            Start Daily Review ({reviewQueue.length})
          </button>
        </div>
      </PageHeader>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <AlertTriangle className="text-red-500 mb-2" size={20} />
          <div className="text-2xl font-black text-white">{weakWords.length}</div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Weak Words</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <BarChart3 className="text-orange-500 mb-2" size={20} />
          <div className="text-2xl font-black text-white">
            {weakWords.length > 0
              ? Math.round(weakWords.reduce((s, w) => s + (w.averageScore || 0), 0) / weakWords.length)
              : 0}%
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Avg Score</div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
          <AlertTriangle className="text-yellow-500 mb-2" size={20} />
          <div className="text-2xl font-black text-white">
            {weakWords.reduce((s, w) => s + (w.missingCount || 0) + (w.nearMatchCount || 0), 0)}
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Errors</div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-gray-900 border border-gray-800 rounded-xl pl-11 pr-10 py-3 text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Words Table */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-900 bg-gray-900/50">
                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Word</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Attempts</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Best</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Last</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Avg</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Missed</th>
                <th className="text-center px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Last Practiced</th>
                <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((stat) => (
                <tr key={stat.word} className="border-b border-gray-900 hover:bg-gray-900/30 transition-colors">
                  <td className="px-6 py-5">
                    <span className="font-bold text-white">{stat.word}</span>
                  </td>
                  <td className="px-4 py-5 text-center text-white font-bold">{stat.attempts}</td>
                  <td className={cn("px-4 py-5 text-center font-bold", stat.bestScore >= 90 ? 'text-green-400' : 'text-red-400')}>
                    {stat.bestScore}%
                  </td>
                  <td className={cn("px-4 py-5 text-center font-bold", (stat.lastScore || 0) >= 90 ? 'text-green-400' : 'text-red-400')}>
                    {stat.lastScore || 0}%
                  </td>
                  <td className={cn("px-4 py-5 text-center font-bold", (stat.averageScore || 0) >= 90 ? 'text-green-400' : 'text-orange-400')}>
                    {stat.averageScore || 0}%
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="text-red-400 font-bold">{(stat.missingCount || 0) + (stat.nearMatchCount || 0)}</span>
                  </td>
                  <td className="px-4 py-5 text-center text-sm text-gray-500">
                    {stat.lastPracticedAt
                      ? new Date(stat.lastPracticedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setFocusWord({ word: stat.word, sentence: stat.word, status: (stat.averageScore || 0) >= 90 ? 'near-match' : 'incorrect' })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
                    >
                      <BookOpen size={14} className="inline mr-1" />
                      Practice
                    </button>
                  </td>
                </tr>
              ))}
              {filteredWords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No words match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Word Focus Modal */}
      {focusWord && (
        <WordFocusModal
          word={focusWord.word}
          sentence={focusWord.sentence}
          status={focusWord.status}
          onClose={() => setFocusWord(null)}
        />
      )}
    </div>
  );
}
