import { Trash2, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Topic } from '../../models/types';
import { ProgressBar } from './ProgressBar';
import { useTopicStore } from '../../store/useTopicStore';

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const navigate = useNavigate();
  const deleteTopic = useTopicStore(state => state.deleteTopic);
  const progress = useTopicStore(state => state.getTopicProgress(topic.id));

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete this topic?')) {
      deleteTopic(topic.id);
    }
  };

  return (
    <Link 
      to={`/topic/${topic.id}`}
      className="block group bg-gray-900 border border-gray-800 hover:border-gray-700 p-6 rounded-xl transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
            {topic.title}
          </h3>
          <p className="text-sm text-gray-500">
            {new Date(topic.createdAt).toLocaleDateString()} • {topic.sentences.length} sentences
          </p>
        </div>
        <button 
          onClick={handleDelete}
          className="text-gray-600 hover:text-red-500 p-2 rounded-lg hover:bg-gray-800 transition-all"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-gray-400">Progress</span>
          <span className="text-blue-400">{progress}%</span>
        </div>
        <ProgressBar progress={progress} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center text-sm font-medium text-blue-500">
          Start Practicing <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </span>
        {progress > 0 && progress < 100 && (
          <span
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/practice/${topic.id}?remaining=true`); }}
            className="text-sm font-medium text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
          >
            Resume Topic →
          </span>
        )}
      </div>
    </Link>
  );
}
