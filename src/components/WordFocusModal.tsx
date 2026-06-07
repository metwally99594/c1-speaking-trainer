import { useState, useCallback } from 'react';
import { X, Volume2, Mic, Target, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTopicStore } from '../store/useTopicStore';
import { SpeechRecognition } from './SpeechRecognition';

interface WordFocusModalProps {
  word: string;
  sentence: string;
  status: string;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  correct: { label: 'Correct', color: 'text-green-400' },
  'near-match': { label: 'Near Match', color: 'text-yellow-400' },
  incorrect: { label: 'Incorrect', color: 'text-red-400' },
  missing: { label: 'Missing', color: 'text-orange-400' },
  extra: { label: 'Extra', color: 'text-blue-400' },
};

const normalize = (text: string) =>
  text.toLowerCase().replace(/[.,!?;:]/g, '').trim();

export function WordFocusModal({ word, sentence, status, onClose }: WordFocusModalProps) {
  const wordStats = useTopicStore((state) => state.wordStats);
  const updateWordScore = useTopicStore((state) => state.updateWordScore);
  const voiceSettings = useTopicStore((state) => state.voiceSettings);

  const [localScore, setLocalScore] = useState<number | null>(null);

  const normalizedWord = normalize(word);
  const stat = wordStats[normalizedWord];

  const handlePlayWord = useCallback(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    const voices = window.speechSynthesis.getVoices();
    const savedVoice = voiceSettings.voiceURI
      ? voices.find(v => v.voiceURI === voiceSettings.voiceURI)
      : null;
    const germanVoice = savedVoice || voices.find(v => v.lang.startsWith('de')) || voices[0];
    if (germanVoice) utterance.voice = germanVoice;
    utterance.lang = 'de-DE';
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;
    window.speechSynthesis.speak(utterance);
  }, [word, voiceSettings]);

  const handleWordResult = (score: number) => {
    setLocalScore(score);
    updateWordScore(normalizedWord, score);
  };

  const statusInfo = STATUS_LABELS[status] || { label: status, color: 'text-gray-400' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Target className="text-blue-500" size={22} />
            <h2 className="text-lg font-bold text-white">Word Focus</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Word + Status */}
          <div className="bg-black border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-3xl font-black text-white mb-3">{word}</p>
            <span className={cn(
              "inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              status === 'correct' && "bg-green-500/10 text-green-500 border-green-500/20",
              status === 'near-match' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
              status === 'incorrect' && "bg-red-500/10 text-red-500 border-red-500/20",
              status === 'missing' && "bg-orange-500/10 text-orange-500 border-orange-500/20",
              status === 'extra' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
            )}>
              {statusInfo.label}
            </span>
          </div>

          {/* Context */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">From sentence</span>
            <p className="text-sm text-gray-400 leading-relaxed">{sentence}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-black border border-gray-800 rounded-xl p-4 text-center">
              <BarChart3 size={16} className="mx-auto text-gray-600 mb-1" />
              <p className="text-lg font-black text-white">{stat?.attempts || 0}</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Attempts</p>
            </div>
            <div className="bg-black border border-gray-800 rounded-xl p-4 text-center">
              <BarChart3 size={16} className="mx-auto text-green-600 mb-1" />
              <p className="text-lg font-black text-green-500">{stat?.bestScore || 0}%</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Best</p>
            </div>
            <div className="bg-black border border-gray-800 rounded-xl p-4 text-center">
              <BarChart3 size={16} className="mx-auto text-blue-600 mb-1" />
              <p className="text-lg font-black text-blue-500">{stat?.lastScore || 0}%</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Last</p>
            </div>
          </div>

          {/* TTS */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Pronunciation</span>
              </div>
              <button
                onClick={handlePlayWord}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              >
                <Volume2 size={16} />
                Hear Word
              </button>
            </div>
          </div>

          {/* Speech Recognition for word */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-red-400 mb-3">
              <Mic size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Practice This Word</span>
            </div>
            <SpeechRecognition
              originalText={word}
              onResult={handleWordResult}
              key={normalizedWord + (localScore ?? 'initial')}
            />
          </div>

          {/* Live score feedback */}
          {localScore !== null && (
            <div className={cn(
              "p-4 rounded-xl text-center border transition-all",
              localScore >= 95 ? "bg-green-500/10 border-green-500/20 text-green-400" :
              localScore >= 80 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" :
              "bg-red-500/10 border-red-500/20 text-red-400"
            )}>
              <p className="text-lg font-black">{localScore}% Accuracy</p>
              <p className="text-xs mt-1 opacity-70">
                {localScore >= 95 ? 'Excellent pronunciation!' :
                 localScore >= 80 ? 'Good, keep practicing.' :
                 'Try again, focus on the word.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} />
            Back to Practice
          </button>
        </div>
      </div>
    </div>
  );
}