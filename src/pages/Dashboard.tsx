import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { TopicCard } from '../components/ui/TopicCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, RefreshCw, BookOpen, CheckCircle2, GraduationCap, AlertTriangle, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';
import { isWeakWord } from '../utils/weakWords';

export default function Dashboard() {
  const topics = useTopicStore((state) => state.topics);
  const wordStats = useTopicStore((state) => state.wordStats);
  const currentUser = useTopicStore((state) => state.currentUser);
  
  const weakWords = Object.values(wordStats).filter(isWeakWord);
  
  const worstWord = weakWords.length > 0
    ? weakWords.reduce((a, b) => (a.averageScore || 0) < (b.averageScore || 0) ? a : b)
    : null;
    
  const avgWeakScore = weakWords.length > 0
    ? Math.round(weakWords.reduce((s, w) => s + (w.averageScore || 0), 0) / weakWords.length)
    : 0;

  const stats = {
    totalTopics: topics.length,
    totalSentences: topics.reduce((acc, t) => acc + t.sentences.length, 0),
    mastered: topics.reduce((acc, t) => acc + t.sentences.filter(s => s.isCompleted).length, 0),
    needReview: topics.reduce((acc, t) => acc + t.sentences.filter(s => s.nextReviewAt && s.nextReviewAt <= Date.now()).length, 0),
  };

  const welcomeMessage = currentUser 
    ? `Willkommen zurück, ${currentUser.name}! 👋` 
    : 'Speaking Trainer Dashboard';

  return (
    <div className="space-y-8">
      <PageHeader title={welcomeMessage}>
        {topics.length > 0 && (
          <div className="flex gap-3">
            {stats.needReview > 0 && (
              <Link 
                to="/review"
                className="flex items-center gap-2 bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '4s' }} />
                <span>Review ({stats.needReview})</span>
              </Link>
            )}
            <Link 
              to="/exam-history"
              className="flex items-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <GraduationCap size={14} />
              <span>Historie</span>
            </Link>
            <Link 
              to="/topic/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              <Plus size={14} />
              <span>Add Topic</span>
            </Link>
          </div>
        )}
      </PageHeader>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Themen', value: stats.totalTopics, icon: <BookOpen size={20} />, color: 'text-blue-400', glow: 'neon-border-blue' },
          { label: 'Sätze', value: stats.totalSentences, icon: <Plus size={20} />, color: 'text-purple-400', glow: 'neon-border-purple' },
          { label: 'Meisterhaft', value: stats.mastered, icon: <CheckCircle2 size={20} />, color: 'text-green-400', glow: 'neon-border-green' },
          { label: 'Wiederholen', value: stats.needReview, icon: <RefreshCw size={20} />, color: 'text-orange-400', glow: 'neon-border-orange' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className={cn(
              "glass-panel p-6 rounded-2xl shadow-md transition-all duration-300 flex flex-col justify-between min-h-[120px]",
              stat.glow
            )}
          >
            <div className={`mb-3 ${stat.color}`}>{stat.icon}</div>
            <div>
              <div className="text-3xl font-black text-white">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Weak Words Widget */}
      <Link
        to="/words"
        className="block glass-panel rounded-3xl p-6 shadow-md border border-slate-900 hover:border-orange-500/20 transition-all duration-300 group relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 text-orange-400">
              {weakWords.length === 0 ? <PartyPopper size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white group-hover:text-orange-400 transition-colors">Vokabeln im Fokus (Weak Words)</h3>
              <p className="text-sm text-slate-400 mt-1">
                {weakWords.length === 0
                  ? 'Hervorragend! Keine schwierigen Wörter gefunden.'
                  : worstWord
                    ? `Schwierigstes Wort: "${worstWord.word}" (${worstWord.averageScore || 0}%)`
                    : `${weakWords.length} Wort${weakWords.length !== 1 ? 'e' : ''} benötigt Aufmerksamkeit`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 self-stretch md:self-auto justify-between md:justify-end border-t border-slate-900 md:border-none pt-4 md:pt-0">
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-2xl font-black text-white">{weakWords.length}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wörter</p>
              </div>
              {weakWords.length > 0 && (
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-400">{avgWeakScore}%</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Durchschnitt</p>
                </div>
              )}
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-orange-400 group-hover:underline self-center bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-xl">
              Prüfen →
            </span>
          </div>
        </div>
      </Link>

      {/* Topics List */}
      {topics.length === 0 ? (
        <EmptyState message="Noch keine Themen hinzugefügt" />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" />
            Ihre Themenübersicht
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topics.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
