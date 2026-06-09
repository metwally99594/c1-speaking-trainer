import { useState, useCallback } from 'react';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { cn } from '../utils/cn';
import { telcBenchmarks, type TelcBenchmark } from '../data/telcBenchmarks';
import { runSingleBenchmark, type BenchmarkResult } from '../utils/benchmarkRunner';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle, BarChart3,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  Brain, BookOpen, MessageSquare,
} from 'lucide-react';

type RunState = 'idle' | 'running' | 'done' | 'error';

const GRADE_ORDER: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };

function getGradeColor(g: string) {
  switch (g) {
    case 'A': return 'text-green-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-yellow-400';
    case 'D': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function MatchIcon({ match }: { match: boolean }) {
  return match
    ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
    : <XCircle size={16} className="text-red-500 shrink-0" />;
}

export default function TelcBenchmark() {
  const telcSettings = useTopicStore((state) => state.telcSettings);

  const [state, setState] = useState<RunState>('idle');
  const [results, setResults] = useState<Map<string, BenchmarkResult>>(new Map());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runBenchmarks = useCallback(async () => {
    setState('running');
    setErrorMsg('');

    for (const benchmark of telcBenchmarks) {
      const result = await runSingleBenchmark(benchmark, {
        apiKey: telcSettings.apiKey,
        model: telcSettings.model,
      });
      setResults((prev) => {
        const next = new Map(prev);
        next.set(benchmark.id, result);
        return next;
      });
    }

    setState('done');
  }, [telcSettings.apiKey, telcSettings.model]);

  const runBenchmark = useCallback(async (benchmark: TelcBenchmark) => {
    setState('running');
    setErrorMsg('');

    const result = await runSingleBenchmark(benchmark, {
      apiKey: telcSettings.apiKey,
      model: telcSettings.model,
    });
    setResults((prev) => {
      const next = new Map(prev);
      next.set(benchmark.id, result);
      return next;
    });

    setState('done');
  }, [telcSettings.apiKey, telcSettings.model]);

  // Scoring stability analysis
  const gradeKeys = ['aufgabengerechtheit', 'flüssigkeit', 'repertoire', 'grammatischeRichtigkeit', 'ausspracheUndIntonation'] as const;

  const completedResults = Array.from(results.values()).filter(r => r.comparison !== null);
  const overallAccuracy = completedResults.length > 0
    ? Math.round(completedResults.reduce((sum, r) => sum + r.accuracy, 0) / completedResults.length)
    : 0;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <PageHeader title="TELC Benchmark & Validation" showBack />

      {/* Summary */}
      <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6 mb-6 shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <Brain size={24} className="text-blue-500" />
          <h2 className="text-xl font-black text-white">KI-Validierung</h2>
        </div>
        <p className="text-sm text-gray-400 mb-6">
          Vergleicht KI-Bewertungen mit Referenzbewertungen, um die Genauigkeit des TELC Examiners zu validieren.
          {!telcSettings.apiKey && (
            <span className="block mt-2 text-yellow-500 font-bold">
              ⚠ API-Schlüssel erforderlich. Fügen Sie ihn in den Einstellungen hinzu.
            </span>
          )}
        </p>

        {state === 'idle' && (
          <div className="flex gap-4">
            <button
              onClick={runBenchmarks}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              Alle Benchmarks ausführen
            </button>
            {telcBenchmarks.map(b => (
              <button
                key={b.id}
                onClick={() => runBenchmark(b)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-3 rounded-xl font-bold text-sm transition-all border border-gray-700"
              >
                {b.name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {state === 'running' && (
          <div className="flex items-center gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span className="text-sm">Benchmarks werden ausgeführt...</span>
          </div>
        )}

        {state === 'done' && (
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-500" />
            <span className="text-sm text-green-400 font-bold">Benchmark abgeschlossen</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
            <AlertTriangle size={16} />
            {errorMsg}
          </div>
        )}
      </div>

      {/* Results Summary */}
      {results.size > 0 && (
        <>
          {/* Overall stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
              <BarChart3 size={20} className="mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-black text-white">{overallAccuracy}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Gesamtgenauigkeit</p>
            </div>
            <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
              <CheckCircle2 size={20} className="mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-black text-white">{completedResults.length}/{telcBenchmarks.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Abgeschlossen</p>
            </div>
            <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
              <ThumbsUp size={20} className="mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-black text-white">
                {completedResults.filter(r => {
                  if (!r.comparison) return false;
                  let strict = 0, generous = 0;
                  for (const k of gradeKeys) {
                    const ev = GRADE_ORDER[r.comparison[k].expected] || 0;
                    const av = GRADE_ORDER[r.comparison[k].actual] || 0;
                    if (av < ev) strict++;
                    if (av > ev) generous++;
                  }
                  return generous > strict && generous >= 2;
                }).length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Zu großzügig</p>
            </div>
            <div className="bg-gray-950 border border-gray-900 rounded-2xl p-5 text-center">
              <ThumbsDown size={20} className="mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-black text-white">
                {completedResults.filter(r => {
                  if (!r.comparison) return false;
                  let strict = 0, generous = 0;
                  for (const k of gradeKeys) {
                    const ev = GRADE_ORDER[r.comparison[k].expected] || 0;
                    const av = GRADE_ORDER[r.comparison[k].actual] || 0;
                    if (av < ev) strict++;
                    if (av > ev) generous++;
                  }
                  return strict > generous && strict >= 2;
                }).length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Zu streng</p>
            </div>
          </div>

          {/* Per-benchmark results */}
          <div className="space-y-4">
            {telcBenchmarks.map((benchmark) => {
              const result = results.get(benchmark.id);
              const isExpanded = expanded === benchmark.id;

              return (
                <div key={benchmark.id} className="bg-gray-950 border border-gray-900 rounded-3xl overflow-hidden shadow-xl">
                  {/* Header */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : benchmark.id)}
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-900/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-3 h-3 rounded-full shrink-0",
                        benchmark.level === 'Excellent' ? 'bg-green-500' :
                        benchmark.level === 'Good' ? 'bg-blue-500' :
                        benchmark.level === 'Borderline' ? 'bg-yellow-500' : 'bg-red-500'
                      )} />
                      <div>
                        <p className="text-base font-bold text-white">{benchmark.name}</p>
                        <p className="text-xs text-gray-600">{benchmark.level} · {benchmark.topic.substring(0, 40)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {result?.comparison ? (
                        <span className={cn(
                          "text-lg font-black",
                          result.accuracy >= 70 ? 'text-green-400' :
                          result.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {result.accuracy}%
                        </span>
                      ) : result?.error ? (
                        <span className="text-xs text-red-400">Fehler</span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-gray-600" /> : <ChevronDown size={16} className="text-gray-600" />}
                    </div>
                  </button>

                  {/* Expanded body */}
                  {isExpanded && result && (
                    <div className="px-6 pb-6 border-t border-gray-900 pt-4">
                      {result.error ? (
                        <div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-600/5 rounded-xl border border-red-500/10">
                          <AlertTriangle size={16} />
                          {result.error}
                        </div>
                      ) : result.comparison ? (
                        <div className="space-y-4">
                          {/* Grade comparison table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-gray-600 border-b border-gray-800">
                                  <th className="text-left py-2 font-bold uppercase tracking-widest text-[10px]">Kriterium</th>
                                  <th className="text-center py-2 font-bold uppercase tracking-widest text-[10px]">Erwartet</th>
                                  <th className="text-center py-2 font-bold uppercase tracking-widest text-[10px]">Tatsächlich</th>
                                  <th className="text-center py-2 font-bold uppercase tracking-widest text-[10px]">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {gradeKeys.map((key) => {
                                  const g = result.comparison![key];
                                  return (
                                    <tr key={key} className="border-b border-gray-900">
                                      <td className="py-3 text-gray-300 font-medium">
                                        {key === 'aufgabengerechtheit' ? 'Aufgabengerechtheit' :
                                         key === 'flüssigkeit' ? 'Flüssigkeit' :
                                         key === 'repertoire' ? 'Repertoire' :
                                         key === 'grammatischeRichtigkeit' ? 'Grammatik' : 'Aussprache'}
                                      </td>
                                      <td className="text-center py-3">
                                        <span className={cn("font-black", getGradeColor(g.expected))}>{g.expected}</span>
                                      </td>
                                      <td className="text-center py-3">
                                        <span className={cn("font-black", getGradeColor(g.actual))}>{g.actual}</span>
                                      </td>
                                      <td className="text-center py-3">
                                        <div className="flex justify-center">
                                          <MatchIcon match={g.match} />
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {/* Readiness row */}
                                <tr className="border-b border-gray-900">
                                  <td className="py-3 text-gray-300 font-medium">Readiness</td>
                                  <td className="text-center py-3 text-gray-400">
                                    {result.comparison.readinessScore.expected[0]}–{result.comparison.readinessScore.expected[1]}
                                  </td>
                                  <td className="text-center py-3">
                                    <span className="font-black text-white">{result.comparison.readinessScore.actual}</span>
                                  </td>
                                  <td className="text-center py-3">
                                    <div className="flex justify-center">
                                      <MatchIcon match={result.comparison.readinessScore.match} />
                                    </div>
                                  </td>
                                </tr>
                                {/* Level row */}
                                <tr>
                                  <td className="py-3 text-gray-300 font-medium">Niveau</td>
                                  <td className="text-center py-3 text-gray-400">{result.comparison.level.expected}</td>
                                  <td className="text-center py-3">
                                    <span className="font-black text-white">{result.comparison.level.actual}</span>
                                  </td>
                                  <td className="text-center py-3">
                                    <div className="flex justify-center">
                                      <MatchIcon match={result.comparison.level.match} />
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Bias detection */}
                          <div className={cn(
                            "rounded-xl p-4 border flex items-center gap-3",
                            result.accuracy >= 70 ? "bg-green-600/5 border-green-500/10" :
                            result.accuracy >= 40 ? "bg-yellow-600/5 border-yellow-500/10" :
                            "bg-red-600/5 border-red-500/10"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              result.accuracy >= 70 ? "bg-green-600/20" :
                              result.accuracy >= 40 ? "bg-yellow-600/20" : "bg-red-600/20"
                            )}>
                              <span className={cn(
                                "text-lg font-black",
                                result.accuracy >= 70 ? "text-green-400" :
                                result.accuracy >= 40 ? "text-yellow-400" : "text-red-400"
                              )}>
                                {result.accuracy}%
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Genauigkeit: {result.accuracy}%</p>
                              <p className="text-xs text-gray-500">
                                {result.accuracy >= 70 ? 'KI-Bewertung liegt im akzeptablen Bereich.' :
                                 result.accuracy >= 40 ? 'KI-Bewertung weicht teilweise ab. Überprüfung empfohlen.' :
                                 'KI-Bewertung weicht erheblich ab. Prompt-Anpassung erforderlich.'}
                              </p>
                            </div>
                          </div>

                          {/* Language Analysis summary */}
                          {result.languageAnalysis && (
                            <details className="bg-gray-900 rounded-xl border border-gray-800">
                              <summary className="p-4 cursor-pointer text-sm font-bold text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-2">
                                <Brain size={14} />
                                Lokale Analyse
                              </summary>
                              <div className="px-4 pb-4 space-y-3">
                                <div className="flex gap-4">
                                  <div className="flex items-center gap-2">
                                    <BookOpen size={14} className="text-cyan-500" />
                                    <span className="text-xs text-gray-400">Redemittel: {result.languageAnalysis.redemittel.score}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-orange-500" />
                                    <span className="text-xs text-gray-400">Wortschatz: {result.languageAnalysis.vocabulary.level}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <BookOpen size={14} className="text-green-500" />
                                    <span className="text-xs text-gray-400">Argumentation: {result.languageAnalysis.argumentation.score}</span>
                                  </div>
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {results.size === 0 && (
        <div className="text-center py-16">
          <BarChart3 size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-500 mb-2">Noch keine Benchmarks ausgeführt</p>
          <p className="text-sm text-gray-600 mb-6">
            Führen Sie die Benchmarks aus, um die Genauigkeit des TELC KI-Examiners zu überprüfen.
          </p>
        </div>
      )}
    </div>
  );
}
