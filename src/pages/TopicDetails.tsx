import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTopicStore } from '../store/useTopicStore';
import { PageHeader } from '../components/ui/PageHeader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { CheckCircle2, Circle, ArrowRight, PlayCircle, GraduationCap, GripVertical, Edit3, Save, X, Plus, RefreshCw } from 'lucide-react';
import type { Sentence } from '../models/types';

export default function TopicDetails() {
  const { id } = useParams<{ id: string }>();
  const topic = useTopicStore((state) => state.topics.find((t) => t.id === id));
  const toggleSentence = useTopicStore((state) => state.toggleSentence);
  const updateTopicSentences = useTopicStore((state) => state.updateTopicSentences);
  const progress = useTopicStore((state) => (id ? state.getTopicProgress(id) : 0));

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editSentences, setEditSentences] = useState<Sentence[]>([]);
  const dragIndexRef = useRef<number | null>(null);

  const startEditing = () => {
    if (!topic) return;
    setEditText(topic.sentences.map(s => s.text).join('\n'));
    setEditSentences([...topic.sentences]);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditText('');
    setEditSentences([]);
  };

  const handleEditTextChange = (text: string) => {
    setEditText(text);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    // Update existing sentences or create new ones
    setEditSentences((prev) => {
      const updated = lines.map((line, i) => {
        const existing = prev[i];
        if (existing) {
          return { ...existing, text: line, order: i + 1 };
        }
        return {
          id: crypto.randomUUID(),
          text: line,
          order: i + 1,
          isCompleted: false,
        };
      });
      return updated;
    });
  };

  const saveEditing = () => {
    if (!topic) return;
    const finalSentences = editSentences.map((s, i) => ({
      ...s,
      order: i + 1,
      text: s.text.trim(),
    })).filter(s => s.text.length > 0);
    updateTopicSentences(topic.id, finalSentences);
    setIsEditing(false);
  };

  const addSentence = () => {
    const newSentence: Sentence = {
      id: crypto.randomUUID(),
      text: '',
      order: editSentences.length + 1,
      isCompleted: false,
    };
    setEditSentences((prev) => {
      const updated = [...prev, newSentence];
      setEditText(updated.map(s => s.text).join('\n'));
      return updated;
    });
  };

  const removeSentence = (index: number) => {
    setEditSentences((prev) => {
      const updated = prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
      setEditText(updated.map(s => s.text).join('\n'));
      return updated;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    (e.currentTarget as HTMLElement).classList.add('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;

    setEditSentences((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);
      const reordered = updated.map((s, i) => ({ ...s, order: i + 1 }));
      setEditText(reordered.map(s => s.text).join('\n'));
      return reordered;
    });
    dragIndexRef.current = null;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('opacity-40');
    dragIndexRef.current = null;
  };

  if (!topic) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white mb-4">Topic not found</h2>
        <Link to="/" className="text-blue-500 hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  // Edit Mode
  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageHeader title={`Edit: ${topic.title}`} showBack />

        <div className="space-y-6">
          <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Sentences (one per line)
            </label>
            <textarea
              value={editText}
              onChange={(e) => handleEditTextChange(e.target.value)}
              rows={Math.max(8, editSentences.length + 2)}
              className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono resize-none"
              placeholder="Enter one sentence per line..."
            />
          </div>

          {/* Reorderable list */}
          {editSentences.length > 0 && (
            <div className="bg-gray-950 border border-gray-900 rounded-2xl p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-4">
                Drag to reorder ({editSentences.length} sentence{editSentences.length !== 1 ? 's' : ''})
              </span>
              <div className="space-y-2">
                {editSentences.map((s, i) => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, i)}
                    onDragEnd={handleDragEnd}
                    className="flex items-center gap-3 bg-black border border-gray-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-gray-700 transition-colors group"
                  >
                    <GripVertical size={18} className="text-gray-700 shrink-0" />
                    <span className="text-[10px] font-bold text-gray-600 shrink-0 w-6 text-right">{i + 1}.</span>
                    <span className="flex-1 text-sm text-gray-300 truncate">{s.text || <span className="text-gray-600 italic">Empty sentence</span>}</span>
                    <button
                      type="button"
                      onClick={() => removeSentence(i)}
                      className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Remove sentence"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSentence}
                className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-400 transition-colors px-1"
              >
                <Plus size={16} />
                Add sentence
              </button>
            </div>
          )}

          {/* Preview */}
          {editSentences.filter(s => s.text.trim()).length > 0 && (
            <div className="bg-black/50 border border-gray-800 rounded-2xl p-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-4">
                Preview in Practice Mode
              </span>
              <div className="space-y-3">
                {editSentences.filter(s => s.text.trim()).map((s, i) => (
                  <div key={s.id} className="flex items-start gap-3 p-3 bg-gray-950 border border-gray-800 rounded-xl">
                    <span className="text-xs font-bold text-blue-500 mt-0.5 shrink-0">S{i + 1}</span>
                    <p className="text-sm text-gray-300">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 sticky bottom-0 bg-black/80 backdrop-blur-xl py-4">
            <button
              onClick={saveEditing}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
            >
              <Save size={20} />
              Save Changes
            </button>
            <button
              onClick={cancelEditing}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl transition-all border border-gray-800"
            >
              <X size={20} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Read-only View
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title={topic.title} showBack>
        <div className="flex gap-3">
          <button
            onClick={startEditing}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl font-bold transition-all border border-gray-700"
          >
            <Edit3 size={18} />
            <span className="hidden sm:inline">Edit Sentences</span>
          </button>
          <Link
            to={`/exam/${topic.id}`}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-purple-900/40"
          >
            <GraduationCap size={18} />
            <span className="hidden sm:inline">Start Exam</span>
          </Link>
          <Link
            to={`/practice/${topic.id}`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40"
          >
            <PlayCircle size={18} />
            <span className="hidden sm:inline">Start Practice</span>
          </Link>
        </div>
      </PageHeader>

      {/* Stats + Continue Remaining */}
      {(() => {
        const completed = topic.sentences.filter(s => s.isCompleted).length;
        const remaining = topic.sentences.length - completed;
        return (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-center">
              <p className="text-2xl font-black text-white">{topic.sentences.length}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-center">
              <p className="text-2xl font-black text-green-500">{completed}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Completed</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl text-center">
              <p className="text-2xl font-black text-orange-400">{remaining}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Remaining</p>
            </div>
            {remaining > 0 && (
              <div className="col-span-3">
                <Link
                  to={`/practice/${topic.id}?remaining=true`}
                  className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/30"
                >
                  <RefreshCw size={18} />
                  Continue Remaining ({remaining})
                </Link>
              </div>
            )}
          </div>
        );
      })()}

      <div className="sticky top-20 z-40 bg-black/80 backdrop-blur-md py-4 mb-8 border-b border-gray-900">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-medium text-gray-400">Mastery Progress</span>
          <span className="text-lg font-bold text-blue-500">{progress}%</span>
        </div>
        <ProgressBar progress={progress} className="h-3" />
      </div>

      <div className="space-y-4">
        {topic.sentences.map((sentence) => (
          <div
            key={sentence.id}
            className={`p-6 rounded-2xl border transition-all flex items-start gap-4 group ${
              sentence.isCompleted
                ? 'bg-blue-600/5 border-blue-500/30'
                : 'bg-gray-950 border-gray-900'
            }`}
          >
            <button
              onClick={() => toggleSentence(topic.id, sentence.id)}
              className="mt-1 cursor-pointer shrink-0"
              title={sentence.isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
            >
              {sentence.isCompleted ? (
                <CheckCircle2 className="text-blue-500 hover:text-blue-400 transition-colors" size={22} />
              ) : (
                <Circle className="text-gray-600 hover:text-gray-300 transition-colors" size={22} />
              )}
            </button>
            <Link
              to={`/practice/${topic.id}?sentenceId=${sentence.id}`}
              className="flex-1 block cursor-pointer hover:bg-white/[0.02] rounded-xl -mx-2 px-2 py-1 transition-colors"
            >
              <p className={`text-lg leading-relaxed transition-colors ${
                sentence.isCompleted ? 'text-gray-400 line-through decoration-blue-500/50' : 'text-gray-100'
              }`}>
                {sentence.text}
              </p>
              <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Sentence {sentence.order}</span>
                <ArrowRight size={10} className="text-gray-700" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-500/50">
                  Click to practice this sentence
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-12 bg-green-600/10 border border-green-500/30 p-8 rounded-3xl text-center">
          <h3 className="text-xl font-bold text-green-400 mb-2">Topic Mastered! 🎉</h3>
          <p className="text-green-500/70">You've practiced every sentence in this topic. Great job!</p>
          <Link to="/" className="inline-block mt-6 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all">
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
