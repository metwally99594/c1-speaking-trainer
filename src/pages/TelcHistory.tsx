import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Clock, MessageSquare, ChevronDown, ChevronUp,
  Star, BookOpen, Gauge, AlertCircle, Volume2, MessageCircle
} from 'lucide-react';
import { cn } from '../utils/cn';

function getGradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'text-green-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'Strong Pass': return 'text-green-400';
    case 'Pass': return 'text-blue-400';
    case 'Borderline': return 'text-yellow-400';
    default: return 'text-gray-400';
  }
}

export default function TelcHistory() {
  const telcHistory = useTopicStore((state) => state.telcHistory);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (telcHistory.length === 0) {
    return (
      <div className="max-w-2xl mx-auto pb-20">
        <PageHeader title="TELC Prüfungsverlauf" showBack />
        <div className="bg-gray-950 border border-gray-900 rounded-3xl p-12 shadow-xl text-center">
          <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
          <h2 className="text-2xl font-black text-white mb-3">Noch keine Prüfungen</h2>
          <p className="text-gray-500 mb-8">Sie haben noch keine TELC-Prüfungssimulation absolviert.</p>
          <Link
            to="/telc-exam"
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20"
          >
            <Star size={20} />
            Erste Prüfung starten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <PageHeader title="TELC Prüfungsverlauf" showBack />

      <div className="space-y-4">
        {telcHistory.map((session) => {
          const isExpanded = expandedId === session.id;
          const hasEval = session.evaluation !== null;

          return (
            <div
              key={session.id}
              className="bg-gray-950 border border-gray-900 rounded-3xl overflow-hidden shadow-xl transition-all"
            >
              {/* Summary */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : session.id)}
                className="w-full p-6 text-left hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{session.topic}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(session.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {hasEval && session.evaluation && (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Score</p>
                          <p className={cn("text-lg font-black", getLevelColor(session.evaluation.likelyExamLevel))}>
                            {session.evaluation.readinessScore}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">Level</p>
                          <p className={cn("text-xs font-bold", getLevelColor(session.evaluation.likelyExamLevel))}>
                            {session.evaluation.likelyExamLevel}
                          </p>
                        </div>
                      </>
                    )}
                    {!hasEval && (
                      <div className="flex items-center gap-1 text-yellow-500 text-xs">
                        <AlertCircle size={12} />
                        Keine KI-Bewertung
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-800 pt-4 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                      <Clock size={14} className="mx-auto text-gray-500 mb-1" />
                      <p className="text-sm font-bold text-white">{formatTime(session.duration)}</p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest">Dauer</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                      <MessageSquare size={14} className="mx-auto text-gray-500 mb-1" />
                      <p className="text-sm font-bold text-white">{session.wordCount}</p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest">Wörter</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
                      <Gauge size={14} className="mx-auto text-gray-500 mb-1" />
                      <p className="text-sm font-bold text-white">{session.wpm} WPM</p>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest">Tempo</p>
                    </div>
                  </div>

                  {/* Audio Playback */}
                  {session.audioBlob && (
                    <AudioPlayer audioBlob={session.audioBlob} />
                  )}

                  {/* AI Summary */}
                  {session.aiSummary && (
                    <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 mb-2">KI Zusammenfassung</p>
                      <p className="text-sm text-gray-300">{session.aiSummary}</p>
                      {session.summaryFeedback && (
                        <p className="text-xs text-gray-600 mt-2">
                          Feedback: <span className={cn(
                            "font-bold",
                            session.summaryFeedback === 'ja' ? 'text-green-400' :
                            session.summaryFeedback === 'teilweise' ? 'text-yellow-400' : 'text-red-400'
                          )}>
                            {session.summaryFeedback === 'ja' ? 'Korrekt' :
                             session.summaryFeedback === 'teilweise' ? 'Teilweise korrekt' : 'Nicht korrekt'}
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Duration Evaluation */}
                  {session.durationEvaluation && (
                    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-gray-500" />
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dauerbewertung</span>
                        </div>
                        <span className={cn(
                          "text-xs font-bold",
                          session.durationEvaluation.penalty === 'none' ? 'text-green-400' :
                          session.durationEvaluation.penalty === 'acceptable' ? 'text-blue-400' :
                          'text-yellow-400'
                        )}>
                          {session.durationEvaluation.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Discussion Performance */}
                  {'discussionPerformance' in session && session.discussionPerformance && (
                    <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Diskussionsleistung</p>
                        <span className={cn("text-lg font-black", getGradeColor(session.discussionPerformance.grade))}>
                          {session.discussionPerformance.grade}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={session.discussionPerformance.abilityToAnswer ? 'text-green-500' : 'text-gray-600'}>
                            {session.discussionPerformance.abilityToAnswer ? '✓' : '✗'}
                          </span>
                          <span className="text-gray-400">Auf Einwände reagiert</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={session.discussionPerformance.abilityToDefend ? 'text-green-500' : 'text-gray-600'}>
                            {session.discussionPerformance.abilityToDefend ? '✓' : '✗'}
                          </span>
                          <span className="text-gray-400">Meinung verteidigt</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={session.discussionPerformance.abilityToReact ? 'text-green-500' : 'text-gray-600'}>
                            {session.discussionPerformance.abilityToReact ? '✓' : '✗'}
                          </span>
                          <span className="text-gray-400">Spontan reagiert</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discussion Turns */}
                  {session.discussionTurns && session.discussionTurns.length > 0 && (
                    <details className="bg-gray-900 rounded-xl border border-gray-800">
                      <summary className="p-4 cursor-pointer text-sm font-bold text-gray-400 hover:text-gray-300 transition-colors">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={14} />
                          Diskussion ({session.discussionTurns.filter(t => t.role === 'examiner').length} Runden)
                        </div>
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        {session.discussionTurns.map((turn, i) => (
                          <div key={i} className={cn(
                            "rounded-xl p-3 border",
                            turn.role === 'examiner' ? "bg-gray-800 border-gray-700" : "bg-indigo-600/10 border-indigo-500/20"
                          )}>
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-widest mb-1",
                              turn.role === 'examiner' ? "text-gray-500" : "text-indigo-400"
                            )}>
                              {turn.role === 'examiner' ? 'Prüfer' : 'Sie'}
                            </p>
                            <p className="text-sm text-gray-300">{turn.text}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Evaluation */}
                  {hasEval && session.evaluation && (
                    <>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { key: 'aufgabengerechtheit', label: 'Aufgabe' },
                          { key: 'flüssigkeit', label: 'Flüssig' },
                          { key: 'repertoire', label: 'Repertoire' },
                          { key: 'grammatischeRichtigkeit', label: 'Grammatik' },
                          { key: 'ausspracheUndIntonation', label: 'Aussprache' },
                        ].map(({ key, label }) => {
                          const ev = session.evaluation;
                          const grade = ev ? (ev as unknown as Record<string, string>)[key] : '';
                          return (
                            <div key={key} className="bg-gray-900 rounded-xl p-2 text-center border border-gray-800">
                              <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                              <p className={cn("text-lg font-black", getGradeColor(grade))}>{grade}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Feedback excerpt */}
                      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                        <p className="text-xs font-bold text-gray-500 mb-2">Feedback</p>
                        <p className="text-sm text-gray-300 line-clamp-3">{session.evaluation.detailedFeedback}</p>
                      </div>
                    </>
                  )}

                  {/* Follow-up answers */}
                  {session.followUpQA.length > 0 && (
                    <details className="bg-gray-900 rounded-xl border border-gray-800">
                      <summary className="p-4 cursor-pointer text-sm font-bold text-gray-400 hover:text-gray-300 transition-colors">
                        Folgefragen ({session.followUpQA.length})
                      </summary>
                      <div className="px-4 pb-4 space-y-3">
                        {session.followUpQA.map((qa, i) => (
                          <div key={i} className="bg-black rounded-xl p-3 border border-gray-800">
                            <p className="text-xs font-bold text-purple-400 mb-1">Frage {i + 1}</p>
                            <p className="text-sm text-gray-300 mb-2">{qa.question}</p>
                            <p className="text-xs font-bold text-gray-500 mb-1">Antwort</p>
                            <p className="text-sm text-gray-300">{qa.answer || <span className="italic text-gray-600">Keine Antwort</span>}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Transcript */}
                  <details className="bg-gray-900 rounded-xl border border-gray-800">
                    <summary className="p-4 cursor-pointer text-sm font-bold text-gray-400 hover:text-gray-300 transition-colors">
                      Transkript anzeigen
                    </summary>
                    <div className="px-4 pb-4">
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{session.transcript}</p>
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New exam button */}
      <div className="mt-8">
        <Link
          to="/telc-exam"
          className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-2xl font-bold transition-all shadow-lg shadow-purple-900/20"
        >
          <Star size={24} />
          Neue TELC-Prüfung
        </Link>
      </div>
    </div>
  );
}

function AudioPlayer({ audioBlob }: { audioBlob: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setPlaying(false);
      } else {
        audioRef.current.play();
        setPlaying(true);
      }
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Volume2 size={16} className="text-cyan-500" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Audio-Aufnahme</span>
        </div>
        <button
          onClick={handlePlay}
          className="flex items-center gap-2 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-cyan-500/20"
        >
          {playing ? 'Stop' : 'Abspielen'}
        </button>
      </div>
      <audio
        ref={audioRef}
        src={audioBlob}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
