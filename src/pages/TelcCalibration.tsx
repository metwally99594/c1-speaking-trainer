import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '../utils/cn';

export default function TelcCalibration() {
  const telcHistory = useTopicStore((state) => state.telcHistory);
  const telcFeedback = useTopicStore((state) => state.telcFeedback);
  const getCalibrationStats = useTopicStore((state) => state.getCalibrationStats);

  const stats = getCalibrationStats();
  const totalFeedback = telcFeedback.length;

  const accuracyRate = totalFeedback > 0
    ? Math.round((stats.accurate / totalFeedback) * 100)
    : 0;

  const tooStrictRate = totalFeedback > 0
    ? Math.round((stats.tooStrict / totalFeedback) * 100)
    : 0;

  const tooGenerousRate = totalFeedback > 0
    ? Math.round((stats.tooGenerous / totalFeedback) * 100)
    : 0;

  // Feedback breakdown per session
  const feedbackMap = new Map<string, typeof telcFeedback[0]>();
  for (const fb of telcFeedback) {
    feedbackMap.set(fb.sessionId, fb);
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <PageHeader title="TELC Kalibrierung" showBack />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <BarChart3 size={24} className="mx-auto text-purple-500 mb-2" />
          <p className="text-3xl font-black text-white">{stats.totalEvaluations}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Auswertungen</p>
        </div>
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <ThumbsUp size={24} className="mx-auto text-green-500 mb-2" />
          <p className="text-3xl font-black text-white">{totalFeedback}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Feedback</p>
        </div>
        <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
          <AlertCircle size={24} className="mx-auto text-blue-500 mb-2" />
          <p className="text-3xl font-black text-white">{accuracyRate}%</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Genauigkeit</p>
        </div>
      </div>

      {/* Distribution */}
      <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 mb-6 shadow-xl">
        <h3 className="text-lg font-black text-white mb-6">Feedback-Verteilung</h3>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ThumbsUp size={16} className="text-green-500" />
                <span className="text-sm font-bold text-green-400">Accurate</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.accurate} ({accuracyRate}%)</span>
            </div>
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(accuracyRate, totalFeedback > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ThumbsDown size={16} className="text-red-500" />
                <span className="text-sm font-bold text-red-400">Zu streng</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.tooStrict} ({tooStrictRate}%)</span>
            </div>
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(tooStrictRate, totalFeedback > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ThumbsDown size={16} className="text-yellow-500" />
                <span className="text-sm font-bold text-yellow-400">Zu großzügig</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.tooGenerous} ({tooGenerousRate}%)</span>
            </div>
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(tooGenerousRate, totalFeedback > 0 ? 3 : 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {telcFeedback.length > 0 && (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-black text-white mb-6">Feedback-Verlauf</h3>
          <div className="space-y-3">
            {telcFeedback.map((fb) => {
              const session = telcHistory.find((s) => s.id === fb.sessionId);
              const voteLabels: Record<string, { label: string; color: string }> = {
                'accurate': { label: 'Accurate', color: 'text-green-400' },
                'too-strict': { label: 'Zu streng', color: 'text-red-400' },
                'too-generous': { label: 'Zu großzügig', color: 'text-yellow-400' },
              };
              const v = voteLabels[fb.vote] || { label: fb.vote, color: 'text-gray-400' };
              return (
                <div key={fb.sessionId} className="flex items-center justify-between bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{session?.topic || 'Unbekannt'}</p>
                    <p className="text-xs text-gray-600">{new Date(fb.timestamp).toLocaleDateString('de-DE')}</p>
                  </div>
                  <span className={cn("text-sm font-bold ml-4", v.color)}>{v.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalFeedback === 0 && (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 mb-2">Noch kein Feedback vorhanden</p>
          <p className="text-sm text-gray-600 mb-6">Bewerten Sie Ihre TELC Auswertungen, um die Kalibrierung zu starten.</p>
          <Link
            to="/telc-exam"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all"
          >
            Zur TELC Prüfung
          </Link>
        </div>
      )}
    </div>
  );
}
