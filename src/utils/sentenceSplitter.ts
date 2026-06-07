import type { Sentence } from '../models/types';

export interface SplitResult {
  title: string;
  sentences: Sentence[];
}

export const splitIntoSentences = (
  text: string,
  method: 'auto' | 'punctuation' | 'newline' | 'manual'
): SplitResult => {
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  
  if (lines.length === 0) {
    return { title: '', sentences: [] };
  }

  // First non-empty line is the title
  const title = lines[0];
  // The rest is content
  const contentLines = lines.slice(1);
  const contentText = contentLines.join('\n');

  let rawSentences: string[] = [];

  if (method === 'newline') {
    rawSentences = contentLines;
  } else if (method === 'manual') {
    rawSentences = contentLines.map(l => l.trim()).filter(Boolean);
  } else if (method === 'punctuation') {
    rawSentences = contentText.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  } else {
    // 'auto' mode
    contentLines.forEach(line => {
      const listMatch = line.match(/^(\d+[.)-]\s*)(.*)/);
      if (listMatch) {
        rawSentences.push(line);
      } else {
        const subSentences = line.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
        rawSentences.push(...subSentences);
      }
    });
  }

  return {
    title,
    sentences: rawSentences.map((text, index) => ({
      id: crypto.randomUUID(),
      text,
      order: index + 1,
      isCompleted: false,
    })),
  };
};
