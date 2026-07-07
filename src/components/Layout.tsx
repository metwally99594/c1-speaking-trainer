import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Settings, AlertTriangle, Star, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';
import { useTopicStore } from '../store/useTopicStore';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentUser = useTopicStore(state => state.currentUser);
  const logoutUser = useTopicStore(state => state.logoutUser);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white flex flex-col font-sans">
      {/* Floating Glassmorphic Navbar */}
      <nav className="glass-panel sticky top-0 z-50 border-b border-slate-800/60 shadow-lg shadow-slate-950/20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-extrabold text-xl hover:scale-102 transition-all shrink-0">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl shadow-md">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="hidden sm:inline">C1 <span className="gradient-text font-black">Trainer</span></span>
            <span className="sm:hidden font-black gradient-text">C1</span>
          </Link>

          <div className="flex gap-1 sm:gap-3 items-center">
            {/* Dashboard Link */}
            <Link 
              to="/" 
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                isActive('/') 
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
              )}
            >
              <LayoutDashboard size={14} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>

            {/* TELC Link */}
            <Link 
              to="/telc" 
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                isActive('/telc') 
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
              )}
            >
              <Star size={14} />
              <span>TELC</span>
            </Link>

            {/* Words Link */}
            <Link 
              to="/words" 
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
                isActive('/words') 
                  ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" 
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
              )}
            >
              <AlertTriangle size={14} />
              <span>Words</span>
            </Link>

            {/* Settings Link */}
            <Link 
              to="/settings" 
              className={cn(
                "p-2 rounded-xl transition-all",
                isActive('/settings')
                  ? "bg-slate-900 text-white border border-slate-800"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/40"
              )}
              title="Einstellungen"
            >
              <Settings size={16} />
            </Link>

            {/* Add Topic CTA */}
            <Link 
              to="/topic/new" 
              className="hidden sm:flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-900/30 hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle size={14} />
              <span>New Topic</span>
            </Link>

            {/* User Profile + Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 border-l border-slate-800/80 pl-3 sm:pl-4 ml-1">
                {/* User Info */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-lg select-none shadow-inner shadow-slate-950/20">
                    {currentUser.avatar || '🤖'}
                  </div>
                  <span className="hidden lg:block text-xs font-extrabold max-w-[80px] truncate text-slate-300">
                    {currentUser.name}
                  </span>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={logoutUser}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all ml-1"
                  title="Abmelden"
                >
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Layout */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full animate-fade-in-up">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 mt-12 text-center text-slate-500 text-xs">
        <p>© {new Date().getFullYear()} C1 Speaking Trainer. Built for mastery.</p>
      </footer>
    </div>
  );
}
