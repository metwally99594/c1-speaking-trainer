import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TranscriptViewerProps {
  label: string;
  text: string;
  defaultOpen?: boolean;
}

export default function TranscriptViewer({ label, text, defaultOpen = false }: TranscriptViewerProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (!text) return null;

  return (
    <div style={{
      border: '1px solid rgba(100,116,139,0.2)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'rgba(100,116,139,0.08)',
          border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          color: '#f1f5f9', textAlign: 'left',
        }}
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {label}
      </button>
      {open && (
        <div style={{
          padding: '10px 14px', fontSize: 13, lineHeight: 1.7,
          color: '#94a3b8', whiteSpace: 'pre-wrap',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}
