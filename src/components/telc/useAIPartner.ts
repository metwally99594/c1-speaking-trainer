import { useState, useCallback } from 'react';

export const FIXED_DISCUSSION_QUESTIONS = [
  'Wie verstehen Sie diese Aussage? Erklären Sie kurz Ihre Interpretation.',
  'Inwieweit stimmen Sie der Aussage zu oder lehnen Sie sie ab? Begründen Sie.',
  'Welche Argumente oder persönlichen Erfahrungen unterstützen Ihren Standpunkt?',
  'Wie reagieren Sie auf die Argumente Ihres Gesprächspartners?',
];

const LEILA_PERSONA = `Du bist Leila, eine C1-Deutschlernerin aus Marokko, die an derselben TELC C1 Hochschule Prüfung teilnimmt wie der Kandidat.

DEINE PERSÖNLICHKEIT:
- Du hast immer eine klare, eigene Meinung und vertrittst sie selbstbewusst
- Du widersprichst höflich, wenn du anderer Meinung bist
- Du verwendest natürliche Diskursmarker: "Ich würde sagen...", "Das sehe ich etwas anders...", "Einerseits... andererseits...", "Allerdings...", "Interessant, aber..."
- Du stellst Fragen, um die Diskussion zu vertiefen — nicht um Zeit zu füllen
- Du baust auf das auf, was der Kandidat gesagt hat — du hörst wirklich zu
- Deine Sätze sind kurz und direkt (2–4 Sätze pro Turn)
- Sprache: NUR Deutsch, C1-Niveau

DU BIST KEIN CHATBOT. Du bist ein Mensch der eine Prüfung ablegt.`;

const SUMMARIZE_PROMPT = (topic: string, candidateTranscript: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1B: Zusammenfassung + Frage

Der Kandidat hat gerade seine Präsentation zum Thema "${topic}" beendet.

Was der Kandidat gesagt hat:
"""
${candidateTranscript || '[Keine Aufzeichnung]'}
"""

Deine Aufgabe:
1. Fasse die wichtigsten Punkte des Kandidaten in 2–3 Sätzen zusammen (sachlich, nicht wertend)
2. Stelle EINE konkrete Folgefrage zum Inhalt — nicht generisch, sondern bezogen auf etwas Spezifisches, das der Kandidat erwähnt hat

Format: Erst Zusammenfassung, dann Frage. Kein Label davor.`;

const PRESENT_PROMPT = (topic: string, candidateTranscript: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1A: Deine eigene Präsentation

Das Thema ist: "${topic}"

Der Kandidat hat bereits präsentiert und dabei folgende Punkte angesprochen:
"""
${candidateTranscript?.slice(0, 300) || '[Keine Aufzeichnung]'}
"""

Halte jetzt DEINE eigene Präsentation zu demselben Thema — aber aus einem anderen Blickwinkel.
Struktur: Einleitung (Thema + deine These) → 2 Argumente → Schluss mit Fazit
Länge: 100–130 Wörter. Natürlich und fließend — keine Aufzählungspunkte, echte Sätze.`;

const ANSWER_QUESTIONS_PROMPT = (topic: string, candidateQuestions: string) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 1B: Antwort auf Fragen des Kandidaten

Der Kandidat hat deine Präsentation zum Thema "${topic}" gehört und stellt jetzt Fragen oder gibt eine Zusammenfassung:
"""
${candidateQuestions || '[Keine Fragen]'}
"""

Antworte natürlich und konkret auf jede Frage (1–3 Sätze pro Frage).
Sei direkt. Kein Drumherumreden.`;

const DISCUSSION_OPEN_PROMPT = (zitatText: string, zitatAuthor: string, leilasAngle: string, questions: string[]) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 2: Diskussion eröffnen

Das Zitat für die Diskussion:
"${zitatText}" — ${zitatAuthor}

DEINE POSITION zu diesem Zitat:
${leilasAngle}

Fragen, die du im Laufe der Diskussion natürlich einbauen sollst (NICHT als Liste vorlesen — verwebe sie in deine Beiträge):
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

JETZT: Eröffne die Diskussion.
- Erkläre kurz, wie DU das Zitat verstehst
- Äußere DEINE Meinung dazu (zustimmend oder ablehnend, klar und begründet)
- Ende mit einer Einladung an den Kandidaten, seine Meinung zu sagen
Länge: 3–5 Sätze. Natürlich und direkt.`;

const DISCUSSION_RESPOND_PROMPT = (
  zitatText: string, leilasAngle: string, unusedQuestions: string[],
  conversationHistory: Array<{ role: string; text: string }>, candidateLastTurn: string,
) =>
`${LEILA_PERSONA}

AKTUELLE AUFGABE — TEIL 2: Auf den Kandidaten reagieren

Das Zitat: "${zitatText}"
Deine Grundposition: ${leilasAngle}

Bisheriger Gesprächsverlauf:
${conversationHistory.map(t => `[${t.role === 'candidate' ? 'Kandidat' : 'Leila'}]: ${t.text}`).join('\n')}

Der Kandidat hat gerade gesagt:
"""
${candidateLastTurn}
"""

Fragen, die du NOCH NICHT gestellt hast und natürlich einbauen kannst:
${unusedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

DEINE REAKTION — wähle eine dieser Strategien je nach Situation:
- Wenn du zustimmst: "Da gebe ich Ihnen Recht, allerdings würde ich ergänzen..."
- Wenn du widersprichst: "Das sehe ich anders, weil..."
- Wenn du nachfragen willst: Verwende eine der obigen Fragen natürlich eingebettet
- Wenn du provozieren willst: "Meinen Sie wirklich, dass...?"

Reagiere auf das KONKRETE, was der Kandidat gesagt hat — nicht generisch.
Länge: 2–4 Sätze.`;

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

  const summarizeAndAsk = useCallback(async (
    topicTitle: string, candidateTranscript: string,
  ): Promise<string | null> => {
    return callAI(
      SUMMARIZE_PROMPT(topicTitle, candidateTranscript),
      'Gib jetzt deine Zusammenfassung und stelle eine Frage.',
    );
  }, [callAI]);

  const presentOnTopic = useCallback(async (
    topicTitle: string, topicPrompt: string, candidateTranscript: string,
  ): Promise<string | null> => {
    return callAI(
      PRESENT_PROMPT(`${topicTitle}: ${topicPrompt}`, candidateTranscript),
      'Halte jetzt deine Präsentation.',
    );
  }, [callAI]);

  const answerCandidateQuestions = useCallback(async (
    topicTitle: string, candidateQuestions: string,
  ): Promise<string | null> => {
    return callAI(
      ANSWER_QUESTIONS_PROMPT(topicTitle, candidateQuestions),
      'Beantworte die Fragen des Kandidaten.',
    );
  }, [callAI]);

  const openDiscussion = useCallback(async (
    zitatText: string, zitatAuthor: string, leilasAngle: string, _discussionQuestions: string[],
  ): Promise<string | null> => {
    return callAI(
      DISCUSSION_OPEN_PROMPT(zitatText, zitatAuthor, leilasAngle, FIXED_DISCUSSION_QUESTIONS),
      'Eröffne jetzt die Diskussion.',
    );
  }, [callAI]);

  const respondInDiscussion = useCallback(async (
    zitatText: string, leilasAngle: string, _discussionQuestions: string[],
    conversationHistory: Array<{ role: string; text: string }>, candidateLastTurn: string,
  ): Promise<string | null> => {
    const usedQuestions = FIXED_DISCUSSION_QUESTIONS.filter(q =>
      conversationHistory.some(t => t.role === 'ai' && t.text.toLowerCase().includes(q.slice(0, 20).toLowerCase()))
    );
    const unusedQuestions = FIXED_DISCUSSION_QUESTIONS.filter(q => !usedQuestions.includes(q));
    return callAI(
      DISCUSSION_RESPOND_PROMPT(zitatText, leilasAngle, unusedQuestions, conversationHistory, candidateLastTurn),
      'Reagiere jetzt auf den Kandidaten.',
    );
  }, [callAI]);

  const evaluateExam = useCallback(async (
    topic: { title: string },
    zitat: { text: string },
    transcripts: {
      teil_1a?: string; teil_1b_answers?: string; teil_1b_questions?: string;
      teil_2_turns?: Array<{ role: string; text: string }>;
    },
  ): Promise<Record<string, unknown> | null> => {
    const prompt = `Du bist offizieller TELC C1 Hochschule Prüfer. Bewerte die folgende Prüfung nach den offiziellen TELC-Kriterien.

PRÜFUNGSINHALT:
- Präsentationsthema: ${topic.title}
- Zitat für Diskussion: ${zitat.text}

TRANSKRIPTE:
[Teil 1A — Präsentation des Kandidaten]
${transcripts.teil_1a || '[Keine Aufzeichnung]'}

[Teil 1B — Antworten des Kandidaten auf Fragen]
${transcripts.teil_1b_answers || '[Keine Aufzeichnung]'}

[Teil 1B — Fragen des Kandidaten zur Partnerpräsentation]
${transcripts.teil_1b_questions || '[Keine Aufzeichnung]'}

[Teil 2 — Diskussion (alle Turns — WICHTIG für die Bewertung!)]
${(transcripts.teil_2_turns && transcripts.teil_2_turns.length > 0)
  ? transcripts.teil_2_turns.map(t => {
      const label = t.role === 'candidate' ? 'Kandidat'
        : t.role === 'ai' ? 'Leila (Partnerin)'
        : t.role === 'person_a' ? 'Person A (Kandidat)'
        : t.role === 'person_b' ? 'Person B (Partner)'
        : t.role;
      return `[${label}]: ${t.text}`;
    }).join('\n')
  : '[Keine Aufzeichnung der Diskussion]'}

WICHTIG: Teil 2 (Diskussion) ist ein zentraler Teil der TELC C1 Prüfung. Bewerte unbedingt die Beiträge des Kandidaten in der Diskussion mit.

BEWERTUNGSSKALA:
A = Hervorragend (C1 in jeder Hinsicht)
B = Gut (vorwiegend C1)
C = Ausreichend (vorwiegend nicht C1, B2-Niveau)
D = Mangelhaft (unter B2)

KRITERIEN (offizielle TELC C1 Hauptkriterien):
1. Aufgabengerechtheit — Hat der Kandidat die Aufgabe erfüllt?
2. Flüssigkeit — Redefluss und Kohärenz
3. Repertoire — Wortschatz und sprachliche Mittel
4. Grammatische Richtigkeit — Grammatikgenauigkeit
5. Aussprache — Aussprache und Intonation (aus Text: Standard B vergeben, außer offensichtliche Fehler)

Antworte NUR mit JSON, kein Markdown:
{
  "aufgabengerechtheit": "A|B|C|D",
  "fluessigkeit": "A|B|C|D",
  "repertoire": "A|B|C|D",
  "grammatische_richtigkeit": "A|B|C|D",
  "aussprache": "A|B|C|D",
  "feedback": {
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "overall_comment": "2–3 Sätze auf Deutsch"
  },
  "note": "Hinweis zur transkriptbasierten Bewertung"
}`;
    const result = await callAI(prompt, 'Bewerte die Prüfungstranskripte nach TELC C1 Bewertungsskala.');
    if (!result) return null;
    try {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error('[TELC AI] Parse error:', e);
      setError('Auswertung konnte nicht gelesen werden');
      return null;
    }
  }, [callAI]);

  const callPartner = useCallback(async (
    phase: string, content: string, candidateInput: string,
  ): Promise<string | null> => {
    return callAI(
      `${LEILA_PERSONA}\n\nPhase: ${phase}\nThema/Zitat: ${content}`,
      candidateInput || 'Beginne.',
    );
  }, [callAI]);

  const correctLanguage = useCallback(async (
    transcripts: {
      teil_1a?: string;
      teil_1b_answers?: string;
      teil_1b_questions?: string;
      teil_2_turns?: Array<{ role: string; text: string }>;
    }
  ): Promise<string | null> => {
    const allText = [
      transcripts.teil_1a,
      transcripts.teil_1b_answers,
      transcripts.teil_1b_questions,
      ...(transcripts.teil_2_turns || [])
        .filter(t => t.role === 'candidate')
        .map(t => t.text),
    ].filter(Boolean).join('\n\n');

    const prompt = `Du bist ein erfahrener C1-Deutschlehrer mit Spezialisierung auf detaillierte sprachliche Korrektur.

DEINE AUFGABE:
Analysiere JEDEN Satz des Kandidaten und gib eine ausführliche Korrektur.
Sei gründlich — übersehe keinen Fehler, auch keinen kleinen.

ANWEISUNGEN:
1. Korrigiere JEDE Aussage des Kandidaten, die einen Fehler enthält — egal wie klein (Grammatik, Wortstellung, Artikel, Endungen, Präpositionen, Konnektoren, Konjunktiv, Passiv, Verbvalenz, Adjektivdeklination, Idiomatik).
2. Bei jedem Fehler: erkläre AUSFÜHRLICH (2–3 Sätze auf Deutsch), was falsch war und WARUM — nicht nur die Regel nennen, sondern verstehen lassen.
3. Gib für jede Korrektur ein ZUSÄTZLICHES Beispiel, das dieselbe grammatische Struktur korrekt verwendet.
4. Wenn ein Satz vollständig korrekt ist, schreibe als eigene Zeile: "✅ Ausgezeichnet — [Satz]"

FOKUSBEREICHE:
- Grammatik (Verbformen, Tempora, Modi)
- Wortstellung (Hauptsatz, Nebensatz, Inversion)
- Konnektoren (weil, da, obwohl, trotzdem, deshalb, sodass etc.)
- Präpositionen (mit Kasus)
- Artikel (bestimmter/unbestimmter, Deklination)
- Konjunktiv I (indirekte Rede) und Konjunktiv II (Höflichkeit, Irrealis)
- Passiv (Vorgangs- und Zustandspassiv)
- Adjektivdeklination
- Verbvalenz und Rektion

FORMAT bei Fehlern:
❌ [Wörtlich falscher Satz/Phrase des Kandidaten]
✅ [Korrekte Version]
💡 [Ausführliche Erklärung: Was war der Fehler? Warum ist die Korrektur richtig? Welche Regel/Struktur liegt zugrunde?]
📝 Beispiel: [Ein zusätzlicher Beispielsatz, der dieselbe Struktur korrekt verwendet]

FORMAT bei korrekten Sätzen:
✅ Ausgezeichnet — [Der korrekte Satz wörtlich]

Text des Kandidaten:
"""
${allText}
"""

Antworte NUR mit den Korrekturen im obigen Format. Kein Intro, kein Outro, keine Zusammenfassung am Ende.`;

    return callAI(prompt, 'Korrigiere die Fehler.');
  }, [callAI]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading, error,
    summarizeAndAsk, presentOnTopic, answerCandidateQuestions,
    openDiscussion, respondInDiscussion,
    evaluateExam, correctLanguage, callPartner, callAI, reset,
  };
}
