import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { TopicCard } from '../components/ui/TopicCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, RefreshCw, BookOpen, CheckCircle2, GraduationCap, AlertTriangle, PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isWeakWord } from '../utils/weakWords';

export default function Dashboard() {
  const topics = useTopicStore((state) => state.topics);
  const wordStats = useTopicStore((state) => state.wordStats);
  
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

  return (
    <div>
      <PageHeader title="Speaking Trainer Dashboard">
        {topics.length > 0 && (
          <div className="flex gap-4">
            {stats.needReview > 0 && (
              <Link 
                to="/review"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-orange-900/20"
              >
                <RefreshCw size={18} />
                <span>Review ({stats.needReview})</span>
              </Link>
            )}
            <Link 
              to="/exam-history"
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-purple-900/20"
            >
              <GraduationCap size={18} />
              <span>History</span>
            </Link>
            <Link 
              to="/topic/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-900/20"
            >
              <Plus size={18} />
              <span>Add Topic</span>
            </Link>
          </div>
        )}
      </PageHeader>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Topics', value: stats.totalTopics, icon: <BookOpen size={20} />, color: 'text-blue-500' },
          { label: 'Sentences', value: stats.totalSentences, icon: <Plus size={20} />, color: 'text-purple-500' },
          { label: 'Mastered', value: stats.mastered, icon: <CheckCircle2 size={20} />, color: 'text-green-500' },
          { label: 'Need Review', value: stats.needReview, icon: <RefreshCw size={20} />, color: 'text-orange-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
            <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Weak Words Widget */}
      <Link
        to="/words"
        className="block bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg mb-10 hover:border-orange-500/30 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-orange-500">
              {weakWords.length === 0 ? <PartyPopper size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">Weak Words</h3>
              <p className="text-sm text-gray-500">
                {weakWords.length === 0
                  ? 'Excellent! No weak words detected.'
                  : worstWord
                    ? `Worst: "${worstWord.word}" (${worstWord.averageScore || 0}%)`
                    : `${weakWords.length} word${weakWords.length !== 1 ? 's' : ''} need attention`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-2xl font-black text-white">{weakWords.length}</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Weak</p>
            </div>
            {weakWords.length > 0 && (
              <div className="text-right">
                <p className="text-2xl font-black text-orange-400">{avgWeakScore}%</p>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Avg Score</p>
              </div>
            )}
            <span className="text-sm font-bold text-orange-400 group-hover:underline">Review Now →</span>
          </div>
        </div>
      </Link>

      {topics.length === 0 ? (
        <EmptyState message="No topics added yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}
