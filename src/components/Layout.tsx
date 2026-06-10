import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Settings, AlertTriangle, Star } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black text-gray-200 selection:bg-blue-500 selection:text-white flex flex-col">
      <nav className="border-b border-gray-900 bg-gray-950 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl hover:text-blue-400 transition-colors shrink-0">
            <BookOpen className="text-blue-500" />
            <span className="hidden sm:inline">C1 Speaking Trainer</span>
            <span className="sm:hidden">C1 Trainer</span>
          </Link>
          <div className="flex gap-4 sm:gap-6 items-center">
            <Link to="/" className="text-sm font-medium hover:text-white transition-colors">Dashboard</Link>
            <Link to="/telc" className="flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
              <Star size={14} />
              TELC
            </Link>
            <Link to="/words" className="flex items-center gap-1 text-sm font-medium text-orange-400 hover:text-orange-300 transition-colors">
              <AlertTriangle size={14} />
              Words
            </Link>
            <Link to="/settings" className="p-2 text-gray-500 hover:text-white transition-colors">
              <Settings size={20} />
            </Link>
            <Link to="/topic/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-900/20">
              New Topic
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full">
        {children}
      </main>
      <footer className="border-t border-gray-900 py-8 mt-12 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} C1 Speaking Trainer. Built for mastery.</p>
      </footer>
    </div>
  );
}
