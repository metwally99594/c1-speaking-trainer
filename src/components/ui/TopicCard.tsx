import { Trash2, ChevronRight, Play } from 'lucide-react';
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
    e.stopPropagation();
    if (confirm('Möchten Sie dieses Thema wirklich löschen?')) {
      deleteTopic(topic.id);
    }
  };

  return (
    <Link 
      to={`/topic/${topic.id}`}
      className="block group glass-panel glass-panel-hover p-6 rounded-3xl shadow-lg border border-slate-900 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600 opacity-80"></div>
      
      <div className="flex justify-between items-start mb-4 pl-1">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
            {topic.title}
          </h3>
          <p className="text-xs text-slate-500">
            Erstellt: {new Date(topic.createdAt).toLocaleDateString()} • {topic.sentences.length} Sätze
          </p>
        </div>
        <button 
          onClick={handleDelete}
          className="text-slate-600 hover:text-red-400 p-2 rounded-xl hover:bg-slate-900/60 transition-all border border-transparent hover:border-slate-800"
          title="Thema löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>
      
      <div className="space-y-2 mb-6 pl-1">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
          <span className="text-slate-500">Fortschritt</span>
          <span className="text-blue-400">{progress}%</span>
        </div>
        <ProgressBar progress={progress} className="h-2 rounded-full" />
      </div>

      <div className="flex items-center justify-between pl-1 border-t border-slate-900/60 pt-4">
        <span className="flex items-center text-xs font-black uppercase tracking-widest text-blue-500 group-hover:text-blue-400 transition-colors">
          Üben <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </span>
        {progress > 0 && progress < 100 && (
          <button
            onClick={(e) => { 
              e.preventDefault(); 
              e.stopPropagation(); 
              navigate(`/practice/${topic.id}?remaining=true`); 
            }}
            className="flex items-center gap-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <Play size={12} fill="currentColor" />
            <span>Fortsetzen</span>
          </button>
        )}
      </div>
    </Link>
  );
}
