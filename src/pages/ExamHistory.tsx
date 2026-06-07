import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { Clock, FileText, BarChart3, Calendar } from 'lucide-react';

export default function ExamHistory() {
  const examHistory = useTopicStore((state) => state.examHistory);

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader title="Prüfungshistorie" showBack />

      {examHistory.length === 0 ? (
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-20 text-center">
          <Calendar className="mx-auto text-gray-700 mb-6" size={64} />
          <h2 className="text-2xl font-black text-white mb-2">Keine Prüfungen gefunden</h2>
          <p className="text-gray-500">Schließen Sie Ihre erste Prüfung ab, um Statistiken zu sehen.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {examHistory.map((session) => (
            <div key={session.id} className="bg-gray-950 border border-gray-900 rounded-3xl p-8 shadow-xl hover:border-gray-800 transition-all">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-500">
                    <Calendar size={14} />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      {new Date(session.date).toLocaleDateString()} um {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white">{session.topicTitle}</h3>
                </div>

                <div className="grid grid-cols-3 gap-8">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Abdeckung</p>
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <BarChart3 size={16} className="text-blue-500" />
                      <span className="text-xl font-black text-white">{session.coverageScore}%</span>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Wörter</p>
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <FileText size={16} className="text-purple-500" />
                      <span className="text-xl font-black text-white">{session.wordCount}</span>
                    </div>
                  </div>
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Dauer</p>
                    <div className="flex items-center gap-2 justify-center md:justify-end">
                      <Clock size={16} className="text-green-500" />
                      <span className="text-xl font-black text-white">
                        {Math.floor(session.duration / 60)}:{(session.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {session.transcript && (
                <div className="mt-8 pt-8 border-t border-gray-900">
                   <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-4">Transkript-Auszug</p>
                   <p className="text-gray-400 text-sm italic leading-relaxed line-clamp-3">
                     "{session.transcript}"
                   </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
