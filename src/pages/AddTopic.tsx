import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { splitIntoSentences } from '../utils/sentenceSplitter';

type SplitMethod = 'auto' | 'punctuation' | 'newline' | 'manual';

const SPLIT_OPTIONS: { value: SplitMethod; label: string; description: string }[] = [
  { value: 'auto', label: 'Auto', description: 'Smart detection of lists, lines, and punctuation.' },
  { value: 'manual', label: 'Manual', description: 'One sentence per line. No automatic splitting.' },
  { value: 'punctuation', label: 'Punctuation', description: 'Splits only at . ? and ! symbols.' },
  { value: 'newline', label: 'Newline', description: 'Creates a sentence for every line break.' },
];

export default function AddTopic() {
  const navigate = useNavigate();
  const addTopic = useTopicStore((state) => state.addTopic);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('auto');

  const previewSentences = useMemo(() => {
    if (!content.trim()) return [];
    const result = splitIntoSentences(content, splitMethod);
    return result.sentences;
  }, [content, splitMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const { title: extractedTitle, sentences } = splitIntoSentences(content, splitMethod);
    const finalTitle = title.trim() || extractedTitle || 'Untitled Topic';

    addTopic(
      {
        title: finalTitle,
        rawContent: content,
        splitMethod,
      },
      sentences
    );

    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="Add New Topic" showBack />
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-gray-950 border border-gray-900 p-8 rounded-2xl shadow-xl">
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-400">
            Topic Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Tierschutz in Deutschland"
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="content" className="block text-sm font-medium text-gray-400">
            Speaking Text
          </label>
          <textarea
            id="content"
            rows={10}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={splitMethod === 'manual' ? 'Enter one sentence per line...' : 'Paste your speaking text here...'}
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none font-mono"
            required
          />
        </div>

        {previewSentences.length > 0 && (
          <div className="space-y-3 bg-black/50 border border-gray-800 rounded-xl p-5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
              Preview ({previewSentences.length} sentence{previewSentences.length !== 1 ? 's' : ''})
            </span>
            <div className="space-y-2">
              {previewSentences.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 text-sm">
                  <span className="text-[10px] font-bold text-gray-600 mt-0.5 shrink-0 w-6 text-right">
                    {i + 1}.
                  </span>
                  <span className="text-gray-300">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Sentence Splitting Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SPLIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSplitMethod(opt.value)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                  splitMethod === opt.value
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {SPLIT_OPTIONS.find(o => o.value === splitMethod)?.description}
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
        >
          Create Topic
        </button>
      </form>
    </div>
  );
}
