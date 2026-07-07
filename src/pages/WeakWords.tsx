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
        <PageHeader title="Wortschatz im Fokus" showBack />
        <div className="glass-panel rounded-3xl p-20 text-center shadow-2xl border border-slate-900">
          <PartyPopper className="mx-auto text-green-400 mb-6 animate-bounce" size={60} />
          <h2 className="text-2xl font-black text-white mb-4">Hervorragend! Keine schwierigen Wörter gefunden.</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Machen Sie weiter so! Alle Wörter in Ihrem Wortschatz sind auf einem sehr guten Niveau.
          </p>
        </div>
      </div>
    );
  }

  if (reviewMode && currentReviewItem) {
    return (
      <div className="max-w-4xl mx-auto pb-20">
        <PageHeader title={`Tägliche Wiederholung (${reviewIndex + 1}/${reviewQueue.length})`} showBack />

        <div className="glass-panel rounded-3xl p-10 shadow-2xl border border-slate-800/85 text-center relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <Target className="mx-auto text-blue-400 mb-4 animate-pulse-subtle" size={36} />
          <p className="text-3xl font-black text-white tracking-tight mb-4">{currentReviewItem.word}</p>
          <div className="flex items-center justify-center gap-6 mt-4 border-t border-slate-900 pt-6 max-w-sm mx-auto">
            <span className="text-xs text-slate-500 font-medium">Avg: <strong className="text-white font-bold">{currentReviewItem.averageScore}%</strong></span>
            <span className="text-xs text-slate-500 font-medium">Missed: <strong className="text-red-400 font-bold">{currentReviewItem.missingCount}</strong></span>
            <span className="text-xs text-slate-500 font-medium">Versuche: <strong className="text-white font-bold">{currentReviewItem.attempts}</strong></span>
          </div>
        </div>

        <div className="mt-8">
          <WordFocusModal
            word={currentReviewItem.word}
            sentence={currentReviewItem.word}
            status={currentReviewItem.averageScore >= 90 ? 'near-match' : 'incorrect'}
            onClose={() => setReviewMode(false)}
          />
        </div>

        <div className="mt-8 flex gap-4">
          <button
            onClick={() => setReviewIndex((i) => Math.max(0, i - 1))}
            disabled={reviewIndex === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-300 font-bold disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-900 transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            Zurück
          </button>
          {reviewIndex < reviewQueue.length - 1 ? (
            <button
              onClick={() => setReviewIndex((i) => i + 1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all text-sm"
            >
              Weiter
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => setReviewMode(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold transition-all text-sm"
            >
              <Trophy size={16} />
              Wiederholung beenden
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <PageHeader title="Wortschatz-Analyse">
        <div className="flex gap-4">
          <button
            onClick={startReview}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-950/20"
          >
            <RefreshCw size={14} />
            Tägliche Wiederholung ({reviewQueue.length})
          </button>
        </div>
      </PageHeader>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-slate-900">
          <AlertTriangle className="text-red-400 mb-3" size={20} />
          <div className="text-2xl font-black text-white">{weakWords.length}</div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Schwere Wörter</div>
        </div>
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-slate-900">
          <BarChart3 className="text-orange-400 mb-3" size={20} />
          <div className="text-2xl font-black text-white">
            {weakWords.length > 0
              ? Math.round(weakWords.reduce((s, w) => s + (w.averageScore || 0), 0) / weakWords.length)
              : 0}%
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Durchschnitt</div>
        </div>
        <div className="glass-panel p-6 rounded-3xl shadow-md border border-slate-900">
          <AlertTriangle className="text-yellow-400 mb-3" size={20} />
          <div className="text-2xl font-black text-white">
            {weakWords.reduce((s, w) => s + (w.missingCount || 0) + (w.nearMatchCount || 0), 0)}
          </div>
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Gesamtfehler</div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-11 pr-4 py-3 text-white text-xs focus:outline-none transition-all placeholder-slate-600"
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-10 py-3 text-white text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-950">{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Words Table */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-900 bg-slate-900/30">
                <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Wort</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Versuche</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Bestes</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Letztes</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Avg</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Fehler</th>
                <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Zuletzt geübt</th>
                <th className="text-right px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.map((stat) => (
                <tr key={stat.word} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-extrabold text-white text-xs">{stat.word}</span>
                  </td>
                  <td className="px-4 py-4 text-center text-white text-xs font-bold">{stat.attempts}</td>
                  <td className={cn("px-4 py-4 text-center font-bold text-xs", stat.bestScore >= 90 ? 'text-green-400' : 'text-red-400')}>
                    {stat.bestScore}%
                  </td>
                  <td className={cn("px-4 py-4 text-center font-bold text-xs", (stat.lastScore || 0) >= 90 ? 'text-green-400' : 'text-red-400')}>
                    {stat.lastScore || 0}%
                  </td>
                  <td className={cn("px-4 py-4 text-center font-bold text-xs", (stat.averageScore || 0) >= 90 ? 'text-green-400' : 'text-orange-450')}>
                    {stat.averageScore || 0}%
                  </td>
                  <td className="px-4 py-4 text-center text-xs">
                    <span className="text-red-400 font-bold">{(stat.missingCount || 0) + (stat.nearMatchCount || 0)}</span>
                  </td>
                  <td className="px-4 py-4 text-center text-[10px] text-slate-500">
                    {stat.lastPracticedAt
                      ? new Date(stat.lastPracticedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setFocusWord({ word: stat.word, sentence: stat.word, status: (stat.averageScore || 0) >= 90 ? 'near-match' : 'incorrect' })}
                      className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all"
                    >
                      <BookOpen size={10} className="inline mr-1" />
                      Üben
                    </button>
                  </td>
                </tr>
              ))}
              {filteredWords.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 text-xs">
                    Keine Wörter entsprechen Ihrer Suche.
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
