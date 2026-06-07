import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-gray-800 rounded-xl">
      <div className="bg-gray-800 p-4 rounded-full mb-4">
        <BookOpen size={48} className="text-gray-500" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{message}</h3>
      <p className="text-gray-400 mb-6 max-w-sm">
        Start by adding a new speaking topic to practice your C1 skills.
      </p>
      <Link 
        to="/topic/new"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Add Your First Topic
      </Link>
    </div>
  );
}
