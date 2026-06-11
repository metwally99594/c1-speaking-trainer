import { useState, useCallback } from 'react';

export default function useAIPartner() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callAI = useCallback(async (systemPrompt: string, userMessage: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`API error ${response.status}: ${text}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('[TELC AI] Error:', err);
      setError(err instanceof Error ? err.message : 'AI-Anfrage fehlgeschlagen');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const callPartner = useCallback(async (phase: string, content: string, candidateInput: string): Promise<string | null> => {
    const systemPrompt = `You are a German C1-level exam partner in a TELC C1 Mündlicher Ausdruck simulation.
Your role changes per phase:

TEIL 1B (after candidate's Präsentation):
- Give a 3-4 sentence Zusammenfassung of what the candidate said
- Ask 1-2 genuine follow-up questions related to their presentation
- Speak naturally at C1 level — not too formal, not casual
- Language: German only

TEIL 1A (your own Präsentation):
- Present on the topic from a different angle than the candidate
- 90-120 words, structured with a thesis, 2 arguments, conclusion
- Language: German only

TEIL 2 (Diskussion):
- You have a genuine opinion on the Zitat
- Defend your position with arguments
- Challenge the candidate's view politely but firmly
- Ask follow-up questions to deepen the discussion
- Vary your reactions: agree partially, disagree, ask for clarification
- Never be neutral or passive
- Language: German only

Current phase: ${phase}
Current topic/Zitat: ${content}
Candidate's last input: ${candidateInput}`;

    return callAI(systemPrompt, `Continue the exam as described. Current phase: ${phase}.`);
  }, [callAI]);

  const evaluateExam = useCallback(async (
    topic: { title: string },
    zitat: { text: string },
    transcripts: {
      teil_1a?: string;
      teil_1b_answers?: string;
      teil_1b_questions?: string;
      teil_2_turns?: { role: string; text: string }[];
    },
  ): Promise<Record<string, unknown> | null> => {
    const prompt = `You are an official TELC C1 German oral exam examiner.
Evaluate the following exam transcripts using the official TELC C1 grading scale.

EXAM CONTENT:
- Präsentation Topic: ${topic.title}
- Zitat for Diskussion: ${zitat.text}

TRANSCRIPTS:
[Teil 1A — Candidate Präsentation]
${transcripts.teil_1a || '[Keine Aufzeichnung]'}

[Teil 1B — Candidate answers to AI questions]
${transcripts.teil_1b_answers || '[Keine Aufzeichnung]'}

[Teil 1B — Candidate questions about AI presentation]
${transcripts.teil_1b_questions || '[Keine Aufzeichnung]'}

[Teil 2 — Diskussion (all turns)]
${(transcripts.teil_2_turns || []).map(t => `[${t.role === 'candidate' ? 'Kandidat' : 'Prüfer'}]: ${t.text}`).join('\n') || '[Keine Aufzeichnung]'}

GRADING SCALE:
A = Excellent (native-like / very strong)
B = Good (clear C1 level)
C = Adequate (B2 level, meets minimum)
D = Insufficient (below B2)

IMPORTANT: "Aussprache und Intonation" CANNOT be properly evaluated from text transcripts.
Give a default B unless obvious phonetic spelling errors indicate mispronunciation.

Respond ONLY with a JSON object, no markdown, no explanation outside the JSON:
{
  "aufgabengerechtheit_1a": "A|B|C|D",
  "aufgabengerechtheit_1b": "A|B|C|D",
  "diskussionsfuehrung": "A|B|C|D",
  "fluessigkeit": "A|B|C|D",
  "repertoire": "A|B|C|D",
  "grammatische_richtigkeit": "A|B|C|D",
  "aussprache": "A|B|C|D",
  "feedback": {
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "overall_comment": "2-3 sentences in German"
  },
  "note": "any caveats about transcript-based evaluation"
}`;

    const result = await callAI(prompt, 'Evaluate the exam transcripts according to the TELC C1 grading scale.');
    if (!result) return null;

    try {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[TELC AI] Parse error:', e, 'Raw:', result);
      setError('Auswertung konnte nicht gelesen werden');
      return null;
    }
  }, [callAI]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return { loading, error, callPartner, evaluateExam, callAI, reset };
}
