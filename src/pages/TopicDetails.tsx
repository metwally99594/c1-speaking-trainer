import { useParams, Link } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CheckCircle2, Circle, ArrowRight, PlayCircle, GraduationCap } from 'lucide-react';

export default function TopicDetails() {
  const { id } = useParams<{ id: string }>();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === id));
  const toggleSentence = useTopicStore((state) => state.toggleSentence);
  const progress = useTopicStore((state) => (id ? state.getTopicProgress(id) : 0));

  if (!topic) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Topic not found</h2>
        <Link to="/" className="text-blue-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={topic.title} showBack>
        <div className="flex gap-3">
          <Link 
            to={`/exam/${topic.id}`}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/40"
          >
            <GraduationCap size={20} />
            <span>Start Exam</span>
          </Link>
          <Link 
            to={`/practice/${topic.id}`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40"
          >
            <PlayCircle size={20} />
            <span>Start Practice</span>
          </Link>
        </div>
      </PageHeader>

      <div className="sticky top-20 z-40 bg-black/80 backdrop-blur-md py-4 mb-8 border-b border-gray-900">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-400">Mastery Progress</span>
          <span className="text-lg font-bold text-blue-500">{progress}%</span>
        </div>
        <ProgressBar progress={progress} className="h-3" />
      </div>

      <div className="space-y-4">
        {topic.sentences.map((sentence) => (
          <button
            key={sentence.id}
            onClick={() => toggleSentence(topic.id, sentence.id)}
            className={`w-full text-left p-6 rounded-2xl border transition-all flex items-start gap-4 group ${
              sentence.isCompleted
                ? 'bg-blue-600/5 border-blue-500/30'
                : 'bg-gray-950 border-gray-900 hover:border-gray-700'
            }`}
          >
            <div className="mt-1">
              {sentence.isCompleted ? (
                <CheckCircle2 className="text-blue-500" size={22} />
              ) : (
                <Circle className="text-gray-700 group-hover:text-gray-500 transition-colors" size={22} />
              )}
            </div>
            <div className="flex-1">
              <p className={`text-lg leading-relaxed transition-colors ${
                sentence.isCompleted ? 'text-gray-400 line-through decoration-blue-500/50' : 'text-gray-100'
              }`}>
                {sentence.text}
              </p>
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Sentence {sentence.order}</span>
                <ArrowRight size={10} className="text-gray-700" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500/50">
                  {sentence.isCompleted ? 'Mark as incomplete' : 'Mark as learned'}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-12 bg-green-600/10 border border-green-500/30 p-8 rounded-3xl text-center">
          <h3 className="text-xl font-bold text-green-400 mb-2">Topic Mastered! 🎉</h3>
          <p className="text-green-500/70">You've practiced every sentence in this topic. Great job!</p>
          <Link to="/" className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all">
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
