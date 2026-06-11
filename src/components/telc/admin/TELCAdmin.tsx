import { useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Zitat } from '../types';

const PAIRS_KEY = 'telc_topic_pairs';
const ZITATE_KEY = 'telc_zitate';

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `id_${Date.now()}_${idCounter}`;
}

function loadFromStorage<T>(key: string): T[] {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function saveToStorage<T>(key: string, data: T[]) { localStorage.setItem(key, JSON.stringify(data)); }

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

const smallInput: CSSProperties = { ...inputStyle, fontSize: 12 };

const btnPrimary: CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  color: '#06081a', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

export default function TELCAdmin({ onBack }: { onBack: () => void }) {
  const [pairs, setPairs] = useState(() => loadFromStorage<any>(PAIRS_KEY));
  const [zitate, setZitate] = useState<Zitat[]>(() => loadFromStorage<Zitat>(ZITATE_KEY));

  // ---------- Pair form state ----------
  const [showAddPair, setShowAddPair] = useState(false);
  const [addVariante, setAddVariante] = useState('');
  const [addATitle, setAddATitle] = useState('');
  const [addAPrompt, setAddAPrompt] = useState('');
  const [addATips, setAddATips] = useState<string[]>([]);
  const [addATipInput, setAddATipInput] = useState('');
  const [addBTitle, setAddBTitle] = useState('');
  const [addBPrompt, setAddBPrompt] = useState('');
  const [addBTips, setAddBTips] = useState<string[]>([]);
  const [addBTipInput, setAddBTipInput] = useState('');

  const resetAddPair = () => {
    setShowAddPair(false); setAddVariante(''); setAddATitle(''); setAddAPrompt(''); setAddATips([]); setAddATipInput('');
    setAddBTitle(''); setAddBPrompt(''); setAddBTips([]); setAddBTipInput('');
  };

  const handleAddPair = () => {
    if (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) return;
    const pair = {
      id: generateId(), variante: addVariante.trim(),
      topic_a: { title: addATitle.trim(), prompt: addAPrompt.trim(), tips: [...addATips] },
      topic_b: { title: addBTitle.trim(), prompt: addBPrompt.trim(), tips: [...addBTips] },
    };
    const next = [...pairs, pair];
    saveToStorage(PAIRS_KEY, next); setPairs(next); resetAddPair();
  };

  // ---------- Pair edit ----------
  const [editPairId, setEditPairId] = useState<string | null>(null);
  const [editVariante, setEditVariante] = useState('');
  const [editATitle, setEditATitle] = useState('');
  const [editAPrompt, setEditAPrompt] = useState('');
  const [editATips, setEditATips] = useState<string[]>([]);
  const [editATipInput, setEditATipInput] = useState('');
  const [editBTitle, setEditBTitle] = useState('');
  const [editBPrompt, setEditBPrompt] = useState('');
  const [editBTips, setEditBTips] = useState<string[]>([]);
  const [editBTipInput, setEditBTipInput] = useState('');

  const startEditPair = (p: any) => {
    setEditPairId(p.id); setEditVariante(p.variante);
    setEditATitle(p.topic_a.title); setEditAPrompt(p.topic_a.prompt); setEditATips([...(p.topic_a.tips || [])]); setEditATipInput('');
    setEditBTitle(p.topic_b.title); setEditBPrompt(p.topic_b.prompt); setEditBTips([...(p.topic_b.tips || [])]); setEditBTipInput('');
  };

  const cancelEditPair = () => { setEditPairId(null); };

  const saveEditPair = () => {
    if (!editPairId || !editVariante.trim() || !editATitle.trim() || !editAPrompt.trim() || !editBTitle.trim() || !editBPrompt.trim()) return;
    const next = pairs.map((p: any) => p.id === editPairId ? {
      ...p, variante: editVariante.trim(),
      topic_a: { title: editATitle.trim(), prompt: editAPrompt.trim(), tips: editATips },
      topic_b: { title: editBTitle.trim(), prompt: editBPrompt.trim(), tips: editBTips },
    } : p);
    saveToStorage(PAIRS_KEY, next); setPairs(next); setEditPairId(null);
  };

  const [deletePairId, setDeletePairId] = useState<string | null>(null);

  const cardStyle: CSSProperties = {
    padding: 14, borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)',
    background: 'rgba(100,116,139,0.04)',
  };

  // ---------- Zitate (same as before) ----------
  const [showAddZitat, setShowAddZitat] = useState(false);
  const [addZitatText, setAddZitatText] = useState('');
  const [addZitatAuthor, setAddZitatAuthor] = useState('');
  const [addZitatAngle, setAddZitatAngle] = useState('');
  const resetAddZitat = () => { setAddZitatText(''); setAddZitatAuthor(''); setAddZitatAngle(''); setShowAddZitat(false); };
  const handleAddZitat = () => {
    if (!addZitatText.trim() || !addZitatAuthor.trim()) return;
    const z: Zitat = { id: generateId(), text: addZitatText.trim(), author: addZitatAuthor.trim(), discussion_angle: addZitatAngle.trim() };
    const next = [...zitate, z]; saveToStorage(ZITATE_KEY, next); setZitate(next); resetAddZitat();
  };
  const [editZitatId, setEditZitatId] = useState<string | null>(null);
  const [editZitatText, setEditZitatText] = useState('');
  const [editZitatAuthor, setEditZitatAuthor] = useState('');
  const [editZitatAngle, setEditZitatAngle] = useState('');
  const startEditZitat = (z: Zitat) => { setEditZitatId(z.id); setEditZitatText(z.text); setEditZitatAuthor(z.author); setEditZitatAngle(z.discussion_angle || ''); };
  const cancelEditZitat = () => { setEditZitatId(null); };
  const saveEditZitat = () => {
    if (!editZitatId || !editZitatText.trim() || !editZitatAuthor.trim()) return;
    const next = zitate.map(z => z.id === editZitatId ? { ...z, text: editZitatText.trim(), author: editZitatAuthor.trim(), discussion_angle: editZitatAngle.trim() } : z);
    saveToStorage(ZITATE_KEY, next); setZitate(next); setEditZitatId(null);
  };
  const [deleteZitatId, setDeleteZitatId] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px 40px', minHeight: '100vh' }}>
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

      {/* ============ TOPIC PAIRS ============ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
            Themenvarianten
          </h3>
          <button onClick={() => setShowAddPair(true)} style={{
            ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
          }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {showAddPair && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Variante</label>
              <input value={addVariante} onChange={e => setAddVariante(e.target.value)} placeholder="Variante 1" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>Thema A — Titel</label>
                <input value={addATitle} onChange={e => setAddATitle(e.target.value)} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Thema A — Aufgabenstellung</label>
                <textarea value={addAPrompt} onChange={e => setAddAPrompt(e.target.value)} rows={3} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Tipps A</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={addATipInput} onChange={e => setAddATipInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = addATipInput.trim(); if (!v) return; setAddATips(prev => [...prev, v]); setAddATipInput(''); } }}
                    placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                  <button onClick={() => { const v = addATipInput.trim(); if (!v) return; setAddATips(prev => [...prev, v]); setAddATipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                </div>
                {addATips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setAddATips(prev => prev.filter((_, j) => j !== i))} />)}
              </div>
              <div>
                <label style={labelStyle}>Thema B — Titel</label>
                <input value={addBTitle} onChange={e => setAddBTitle(e.target.value)} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Thema B — Aufgabenstellung</label>
                <textarea value={addBPrompt} onChange={e => setAddBPrompt(e.target.value)} rows={3} style={smallInput} />
                <label style={{ ...labelStyle, marginTop: 8 }}>Tipps B</label>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={addBTipInput} onChange={e => setAddBTipInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = addBTipInput.trim(); if (!v) return; setAddBTips(prev => [...prev, v]); setAddBTipInput(''); } }}
                    placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                  <button onClick={() => { const v = addBTipInput.trim(); if (!v) return; setAddBTips(prev => [...prev, v]); setAddBTipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                </div>
                {addBTips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setAddBTips(prev => prev.filter((_, j) => j !== i))} />)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddPair} style={{
                ...btnPrimary, opacity: (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) ? 0.4 : 1,
                cursor: (!addVariante.trim() || !addATitle.trim() || !addAPrompt.trim() || !addBTitle.trim() || !addBPrompt.trim()) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Check size={14} /> Speichern
              </button>
              <button onClick={resetAddPair} style={cancelBtnStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {pairs.length === 0 && !showAddPair && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>
            Noch keine Themenvarianten. Fügen Sie Ihre erste Variante hinzu.
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pairs.map((p: any) => (
            <div key={p.id} style={cardStyle}>
              {editPairId === p.id ? (
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Variante</label>
                    <input value={editVariante} onChange={e => setEditVariante(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={labelStyle}>Thema A — Titel</label>
                      <input value={editATitle} onChange={e => setEditATitle(e.target.value)} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Aufgabenstellung A</label>
                      <textarea value={editAPrompt} onChange={e => setEditAPrompt(e.target.value)} rows={3} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Tipps A</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input value={editATipInput} onChange={e => setEditATipInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editATipInput.trim(); if (!v) return; setEditATips(prev => [...prev, v]); setEditATipInput(''); } }}
                          placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                        <button onClick={() => { const v = editATipInput.trim(); if (!v) return; setEditATips(prev => [...prev, v]); setEditATipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                      </div>
                      {editATips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setEditATips(prev => prev.filter((_, j) => j !== i))} />)}
                    </div>
                    <div>
                      <label style={labelStyle}>Thema B — Titel</label>
                      <input value={editBTitle} onChange={e => setEditBTitle(e.target.value)} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Aufgabenstellung B</label>
                      <textarea value={editBPrompt} onChange={e => setEditBPrompt(e.target.value)} rows={3} style={smallInput} />
                      <label style={{ ...labelStyle, marginTop: 6 }}>Tipps B</label>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        <input value={editBTipInput} onChange={e => setEditBTipInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = editBTipInput.trim(); if (!v) return; setEditBTips(prev => [...prev, v]); setEditBTipInput(''); } }}
                          placeholder="Tipp..." style={{ ...smallInput, flex: 1 }} />
                        <button onClick={() => { const v = editBTipInput.trim(); if (!v) return; setEditBTips(prev => [...prev, v]); setEditBTipInput(''); }} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>+</button>
                      </div>
                      {editBTips.map((tip, i) => <TipChip key={i} tip={tip} onRemove={() => setEditBTips(prev => prev.filter((_, j) => j !== i))} />)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditPair} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Speichern</button>
                    <button onClick={cancelEditPair} style={cancelBtnStyle}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{p.variante}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => startEditPair(p)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}><Pencil size={16} /></button>
                      <button onClick={() => setDeletePairId(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>Thema A</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{p.topic_a.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{p.topic_a.prompt}</div>
                      {p.topic_a.tips?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                          {p.topic_a.tips.map((t: string, i: number) => <span key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.1)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>Thema B</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{p.topic_b.title}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{p.topic_b.prompt}</div>
                      {p.topic_b.tips?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                          {p.topic_b.tips.map((t: string, i: number) => <span key={i} style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                  {deletePairId === p.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const next = pairs.filter((x: any) => x.id !== p.id); saveToStorage(PAIRS_KEY, next); setPairs(next); setDeletePairId(null); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeletePairId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ============ ZITATE ============ */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f1f5f9' }}>Diskussionszitate</h3>
          <button onClick={() => setShowAddZitat(true)} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px' }}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {showAddZitat && (
          <div style={{ ...cardStyle, marginBottom: 12 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Zitat</label>
              <textarea value={addZitatText} onChange={e => setAddZitatText(e.target.value)} rows={2} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Autor</label>
              <input value={addZitatAuthor} onChange={e => setAddZitatAuthor(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>Diskussionswinkel (optional)</label>
              <input value={addZitatAngle} onChange={e => setAddZitatAngle(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddZitat} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4, opacity: (!addZitatText.trim() || !addZitatAuthor.trim()) ? 0.4 : 1, cursor: (!addZitatText.trim() || !addZitatAuthor.trim()) ? 'not-allowed' : 'pointer' }}><Check size={14} /> Speichern</button>
              <button onClick={resetAddZitat} style={cancelBtnStyle}>Abbrechen</button>
            </div>
          </div>
        )}

        {zitate.length === 0 && !showAddZitat && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: 20 }}>Noch keine Zitate. Fügen Sie Ihr erstes Zitat hinzu.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {zitate.map(z => (
            <div key={z.id} style={cardStyle}>
              {editZitatId === z.id ? (
                <div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Zitat</label><textarea value={editZitatText} onChange={e => setEditZitatText(e.target.value)} rows={2} style={inputStyle} /></div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Autor</label><input value={editZitatAuthor} onChange={e => setEditZitatAuthor(e.target.value)} style={inputStyle} /></div>
                  <div style={{ marginBottom: 8 }}><label style={labelStyle}>Diskussionswinkel (optional)</label><input value={editZitatAngle} onChange={e => setEditZitatAngle(e.target.value)} style={inputStyle} /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveEditZitat} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Speichern</button>
                    <button onClick={cancelEditZitat} style={cancelBtnStyle}>Abbrechen</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontStyle: 'italic', color: '#f1f5f9', lineHeight: 1.6, marginBottom: 2 }}>„{z.text}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>— {z.author}</div>
                      {z.discussion_angle && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{z.discussion_angle}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                      <button onClick={() => startEditZitat(z)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 4 }}><Pencil size={16} /></button>
                      <button onClick={() => setDeleteZitatId(z.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {deleteZitatId === z.id && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#ef4444' }}>Wirklich löschen?</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { const next = zitate.filter(x => x.id !== z.id); saveToStorage(ZITATE_KEY, next); setZitate(next); setDeleteZitatId(null); }} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Ja</button>
                        <button onClick={() => setDeleteZitatId(null)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(100,116,139,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Nein</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const cancelBtnStyle: CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(100,116,139,0.2)',
  background: 'transparent', color: '#94a3b8', fontSize: 13, cursor: 'pointer',
};

function TipChip({ tip, onRemove }: { tip: string; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: 'rgba(100,116,139,0.08)', fontSize: 12, color: '#f1f5f9', marginBottom: 2 }}>
      <span style={{ flex: 1 }}>{tip}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}><X size={12} /></button>
    </div>
  );
}
