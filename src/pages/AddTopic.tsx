import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { splitIntoSentences } from '../utils/sentenceSplitter';

export default function AddTopic() {
  const navigate = useNavigate();
  const addTopic = useTopicStore((state) => state.addTopic);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [splitMethod, setSplitMethod] = useState<'auto' | 'punctuation' | 'newline'>('auto');

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
            placeholder="Paste your speaking text here..."
            className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Sentence Splitting Method
          </label>
          <div className="grid grid-cols-3 gap-4">
            {(['auto', 'punctuation', 'newline'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setSplitMethod(method)}
                className={`py-2 px-4 rounded-lg text-sm font-medium border transition-all ${
                  splitMethod === method
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'bg-black border-gray-800 text-gray-500 hover:border-gray-700'
                }`}
              >
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {splitMethod === 'auto' && 'Smart detection of lists, lines, and punctuation.'}
            {splitMethod === 'punctuation' && 'Splits only at . ? and ! symbols.'}
            {splitMethod === 'newline' && 'Creates a sentence for every line break.'}
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
