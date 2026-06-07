import { useState } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import { cn } from '../utils/cn';

interface SplitSentenceModalProps {
  sentenceId: string;
  sentenceText: string;
  initialChunks: string[];
  onSave: (sentenceId: string, chunks: string[]) => void;
  onClose: () => void;
}

export function SplitSentenceModal({ sentenceId, sentenceText, initialChunks, onSave, onClose }: SplitSentenceModalProps) {
  const [chunks, setChunks] = useState<string[]>(
    initialChunks.length > 0 ? initialChunks : [sentenceText]
  );

  const updateChunk = (index: number, value: string) => {
    const next = [...chunks];
    next[index] = value;
    setChunks(next);
  };

  const addChunk = () => {
    setChunks([...chunks, '']);
  };

  const removeChunk = (index: number) => {
    if (chunks.length <= 1) return;
    setChunks(chunks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(sentenceId, chunks.filter(c => c.trim().length > 0));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Split Sentence</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block mb-2">Original sentence</span>
            <p className="text-sm text-gray-400 leading-relaxed">{sentenceText}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Chunks ({chunks.length})</span>
              <button onClick={addChunk} className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                <Plus size={14} /> Add Chunk
              </button>
            </div>

            {chunks.map((chunk, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="text-xs font-bold text-gray-600 mt-3 min-w-[4rem]">Chunk {idx + 1}</span>
                <textarea
                  value={chunk}
                  onChange={(e) => updateChunk(idx, e.target.value)}
                  rows={2}
                  className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                  placeholder="Enter chunk text..."
                />
                <button
                  onClick={() => removeChunk(idx)}
                  disabled={chunks.length <= 1}
                  className={cn(
                    "p-2 mt-1 rounded-lg transition-colors",
                    chunks.length <= 1 ? "text-gray-800 cursor-not-allowed" : "text-red-400 hover:bg-red-400/10"
                  )}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-4">
          <button onClick={onClose} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
            <Save size={16} />
            Save Chunks
          </button>
        </div>
      </div>
    </div>
  );
}
