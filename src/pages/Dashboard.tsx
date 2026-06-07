import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { TopicCard } from '../components/ui/TopicCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Plus, RefreshCw, BookOpen, CheckCircle2, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const topics = useTopicStore((state) => state.topics);
  
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
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
