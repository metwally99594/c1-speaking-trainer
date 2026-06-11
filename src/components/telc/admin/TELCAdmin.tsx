import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { PraesentationTopic, Zitat } from '../types';

const TOPICS_KEY = 'telc_topics';
const ZITATE_KEY = 'telc_zitate';

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `id_${Date.now()}_${idCounter}`;
}

function loadTopics(): PraesentationTopic[] {
  try { const r = localStorage.getItem(TOPICS_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveTopics(data: PraesentationTopic[]) { localStorage.setItem(TOPICS_KEY, JSON.stringify(data)); }

function loadZitate(): Zitat[] {
  try { const r = localStorage.getItem(ZITATE_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveZitate(data: Zitat[]) { localStorage.setItem(ZITATE_KEY, JSON.stringify(data)); }

const inputStyle: CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid rgba(100,116,139,0.2)',
  background: 'rgba(0,0,0,0.25)', color: '#f1f5f9',
  fontSize: 13, lineHeight: '1.5',
  boxSizing: 'border-box',
};

const labelStyle: CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 4, display: 'block',
};

const btnPrimary: CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  color: '#06081a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default function TELCAdmin({ onBack }: { onBack: () => void }) {
  const [topics, setTopics] = useState<PraesentationTopic[]>(loadTopics);
  const [zitate, setZitate] = useState<Zitat[]>(loadZitate);

  // ---- Topic add form ----
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addPrompt, setAddPrompt] = useState('');
  const [addTips, setAddTips] = useState<string[]>([]);
  const [addTipInput, setAddTipInput] = useState('');

  const resetAddTopic = () => {
    setAddTitle(''); setAddPrompt(''); setAddTips([]); setAddTipInput(''); setShowAddTopic(false);
  };

  const handleAddTopic = () => {
    if (!addTitle.trim() || !addPrompt.trim()) return;
    const topic: PraesentationTopic = { id: generateId(), title: addTitle.trim(), prompt: addPrompt.trim(), tips: addTips };
    const next = [...topics, topic];
    saveTopics(next); setTopics(next); resetAddTopic();
  };

  const addTopicTip = () => {
    const v = addTipInput.trim(); if (!v) return;
    setAddTips(prev => [...prev, v]); setAddTipInput('');
  };

  // ---- Topic edit ----
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editTips, setEditTips] = useState<string[]>([]);
  const [editTipInput, setEditTipInput] = useState('');

  const startEditTopic = (t: PraesentationTopic) => {
    setEditTopicId(t.id); setEditTitle(t.title); setEditPrompt(t.prompt); setEditTips([...t.tips]); setEditTipInput('');
  };

  const cancelEditTopic = () => { setEditTopicId(null); };

  const saveEditTopic = () => {
    if (!editTopicId || !editTitle.trim() || !editPrompt.trim()) return;
    const next = topics.map(t => t.id === editTopicId ? { ...t, title: editTitle.trim(), prompt: editPrompt.trim(), tips: editTips } : t);
    saveTopics(next); setTopics(next); setEditTopicId(null);
  };

  const addEditTip = () => {
    const v = editTipInput.trim(); if (!v) return;
    setEditTips(prev => [...prev, v]); setEditTipInput('');
  };

  // ---- Topic delete ----
  const [deleteTopicId, setDeleteTopicId] = useState<string | null>(null);

  const confirmDeleteTopic = (id: string) => {
    const next = topics.filter(t => t.id !== id);
    saveTopics(next); setTopics(next); setDeleteTopicId(null);
  };

  // ---- Zitat add ----
  const [showAddZitat, setShowAddZitat] = useState(false);
  const [addZitatText, setAddZitatText] = useState('');
  const [addZitatAuthor, setAddZitatAuthor] = useState('');
  const [addZitatAngle, setAddZitatAngle] = useState('');

  const resetAddZitat = () => {
    setAddZitatText(''); setAddZitatAuthor(''); setAddZitatAngle(''); setShowAddZitat(false);
  };

  const handleAddZitat = () => {
    if (!addZitatText.trim() || !addZitatAuthor.trim()) return;
    const z: Zitat = { id: generateId(), text: addZitatText.trim(), author: addZitatAuthor.trim(), discussion_angle: addZitatAngle.trim() };
    const next = [...zitate, z];
    saveZitate(next); setZitate(next); resetAddZitat();
  };

  // ---- Zitat edit ----
  const [editZitatId, setEditZitatId] = useState<string | null>(null);
  const [editZitatText, setEditZitatText] = useState('');
  const [editZitatAuthor, setEditZitatAuthor] = useState('');
  const [editZitatAngle, setEditZitatAngle] = useState('');

  const startEditZitat = (z: Zitat) => {
    setEditZitatId(z.id); setEditZitatText(z.text); setEditZitatAuthor(z.author); setEditZitatAngle(z.discussion_angle || '');
  };

  const cancelEditZitat = () => { setEditZitatId(null); };

  const saveEditZitat = () => {
    if (!editZitatId || !editZitatText.trim() || !editZitatAuthor.trim()) return;
    const next = zitate.map(z => z.id === editZitatId ? { ...z, text: editZitatText.trim(), author: editZitatAuthor.trim(), discussion_angle: editZitatAngle.trim() } : z);
    saveZitate(next); setZitate(next); setEditZitatId(null);
  };

  // ---- Zitat delete ----
  const [deleteZitatId, setDeleteZitatId] = useState<string | null>(null);

  const confirmDeleteZitat = (id: string) => {
    const next = zitate.filter(z => z.id !== id);
    saveZitate(next); setZitate(next); setDeleteZitatId(null);
  };

  const cardStyle: CSSProperties = {
    padding: 14, borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)',
    background: 'rgba(100,116,139,0.04)',
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh' }}>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', color: '#94a3b8',
        fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16,
      }}>
        <ArrowLeft size={16} /> Zurück zur Prüfung
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 20px', color: '#f1f5f9' }}>
        Inhalte verwalten
      </h2>

      {/* ============ TOPICS ============ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
            Präsentationsthemen
          </h3>
          <button onClick={() => setShowAddTopic(true)} style={{
            ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
          }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {/* Add Topic Form */}
        {showAddTopic && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Titel</label>
              <input value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="z.B. Digitalisierung und Bildung" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Aufgabenstellung</label>
              <textarea value={addPrompt} onChange={e => setAddPrompt(e.target.value)} placeholder="Stellen Sie dar, welchen Einfluss..." rows={3} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Tipps</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={addTipInput} onChange={e => setAddTipInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopicTip(); } }}
                  placeholder="Tipp eingeben..." style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addTopicTip} style={{ ...btnPrimary, padding: '8px 12px' }}>+</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {addTips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(100,116,139,0.08)', fontSize: 13, color: '#f1f5f9' }}>
                    <span style={{ flex: 1 }}>{tip}</span>
                    <button onClick={() => setAddTips(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddTopic} disabled={!addTitle.trim() || !addPrompt.trim()} style={{
                ...btnPrimary, opacity: (!addTitle.trim() || !addPrompt.trim()) ? 0.4 : 1,
                cursor: (!addTitle.trim() || !addPrompt.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Check size={14} /> Speichern
              </button>
              <button onClick={resetAddTopic} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
                background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
              }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Topic List */}
        {topics.length === 0 && !showAddTopic && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
            Noch keine Inhalte. Fügen Sie Ihr erstes Thema hinzu.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {topics.map(topic => (
            <div key={topic.id} style={cardStyle}>
              {editTopicId === topic.id ? (
                /* Edit mode */
                <>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Titel</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Aufgabenstellung</label>
                    <textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} rows={3} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Tipps</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input value={editTipInput} onChange={e => setEditTipInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditTip(); } }}
                        placeholder="Tipp eingeben..." style={{ ...inputStyle, flex: 1 }} />
                      <button onClick={addEditTip} style={{ ...btnPrimary, padding: '8px 12px' }}>+</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {editTips.map((tip, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: 'rgba(100,116,139,0.08)', fontSize: 13, color: '#f1f5f9' }}>
                          <span style={{ flex: 1 }}>{tip}</span>
                          <button onClick={() => setEditTips(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditTopic} disabled={!editTitle.trim() || !editPrompt.trim()} style={{
                      ...btnPrimary, opacity: (!editTitle.trim() || !editPrompt.trim()) ? 0.4 : 1,
                      cursor: (!editTitle.trim() || !editPrompt.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Check size={14} /> Speichern
                    </button>
                    <button onClick={cancelEditTopic} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
                      background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
                    }}>
                      Abbrechen
                    </button>
                  </div>
                </>
              ) : (
                /* Display mode */
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{topic.title}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{topic.prompt}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => startEditTopic(topic)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }} title="Bearbeiten"><Pencil size={16} /></button>
                      <button onClick={() => setDeleteTopicId(topic.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Löschen"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {topic.tips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {topic.tips.map((tip, i) => (
                        <span key={i} style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{tip}</span>
                      ))}
                    </div>
                  )}
                  {deleteTopicId === topic.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => confirmDeleteTopic(topic.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeleteTopicId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ ZITATE ============ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
            Diskussionszitate
          </h3>
          <button onClick={() => setShowAddZitat(true)} style={{
            ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
          }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {/* Add Zitat Form */}
        {showAddZitat && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Zitat</label>
              <textarea value={addZitatText} onChange={e => setAddZitatText(e.target.value)} placeholder="Der Mensch ist nur da ganz Mensch, wo er spielt." rows={2} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Autor</label>
              <input value={addZitatAuthor} onChange={e => setAddZitatAuthor(e.target.value)} placeholder="Friedrich Schiller" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Diskussionswinkel (optional)</label>
              <input value={addZitatAngle} onChange={e => setAddZitatAngle(e.target.value)} placeholder="Bildung, Kreativität, Work-Life-Balance" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddZitat} disabled={!addZitatText.trim() || !addZitatAuthor.trim()} style={{
                ...btnPrimary, opacity: (!addZitatText.trim() || !addZitatAuthor.trim()) ? 0.4 : 1,
                cursor: (!addZitatText.trim() || !addZitatAuthor.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Check size={14} /> Speichern
              </button>
              <button onClick={resetAddZitat} style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
                background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
              }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Zitat List */}
        {zitate.length === 0 && !showAddZitat && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
            Noch keine Inhalte. Fügen Sie Ihr erstes Zitat hinzu.
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zitate.map(z => (
            <div key={z.id} style={cardStyle}>
              {editZitatId === z.id ? (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Zitat</label>
                    <textarea value={editZitatText} onChange={e => setEditZitatText(e.target.value)} rows={2} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Autor</label>
                    <input value={editZitatAuthor} onChange={e => setEditZitatAuthor(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Diskussionswinkel (optional)</label>
                    <input value={editZitatAngle} onChange={e => setEditZitatAngle(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditZitat} disabled={!editZitatText.trim() || !editZitatAuthor.trim()} style={{
                      ...btnPrimary, opacity: (!editZitatText.trim() || !editZitatAuthor.trim()) ? 0.4 : 1,
                      cursor: (!editZitatText.trim() || !editZitatAuthor.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <Check size={14} /> Speichern
                    </button>
                    <button onClick={cancelEditZitat} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
                      background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
                    }}>
                      Abbrechen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontStyle: 'italic', color: '#f1f5f9', lineHeight: 1.6, marginBottom: 2 }}>
                        „{z.text}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>— {z.author}</div>
                      {z.discussion_angle && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          {z.discussion_angle}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => startEditZitat(z)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }} title="Bearbeiten"><Pencil size={16} /></button>
                      <button onClick={() => setDeleteZitatId(z.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }} title="Löschen"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {deleteZitatId === z.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => confirmDeleteZitat(z.id)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeleteZitatId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
