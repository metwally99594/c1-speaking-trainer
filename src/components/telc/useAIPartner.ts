import { useState, useCallback } from 'react';
import type { LanguageErrors } from './types';

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
    const teil2Lines = (transcripts.teil_2_turns && transcripts.teil_2_turns.length > 0)
      ? transcripts.teil_2_turns.map(t => {
          const label = t.role === 'candidate' ? 'Kandidat'
            : t.role === 'ai' ? 'Leila (Partnerin)'
            : t.role === 'person_a' ? 'Person A (Kandidat)'
            : t.role === 'person_b' ? 'Person B (Partner)'
            : t.role;
          return `[${label}]: ${t.text}`;
        }).join('\n')
      : '[Keine Aufzeichnung der Diskussion]';

    const candidateTeil2Turns = (transcripts.teil_2_turns || [])
      .filter(t => t.role === 'candidate' || t.role === 'person_a')
      .map(t => t.text).join('\n— ');

    const prompt = `Du bist offizieller TELC C1 Hochschule Prüfer. Bewerte die folgende Prüfung nach den offiziellen TELC-Kriterien — bewerte ALLE drei Teile gleichgewichtig (Teil 1A, Teil 1B und Teil 2).

PRÜFUNGSINHALT:
- Präsentationsthema: ${topic.title}
- Zitat für Diskussion: ${zitat.text}

═══════════════════════════════════════════════
TRANSKRIPTE — bitte ALLE Teile in die Bewertung einbeziehen!
═══════════════════════════════════════════════

[Teil 1A — Präsentation des Kandidaten (3 Min.)]
${transcripts.teil_1a || '[Keine Aufzeichnung]'}

[Teil 1B — Antworten des Kandidaten auf Fragen (1 Min.)]
${transcripts.teil_1b_answers || '[Keine Aufzeichnung]'}

[Teil 1B — Fragen des Kandidaten zur Partnerpräsentation (1 Min.)]
${transcripts.teil_1b_questions || '[Keine Aufzeichnung]'}

[Teil 2 — DISKUSSION (6 Min.) — vollständiger Gesprächsverlauf]
${teil2Lines}

═══════════════════════════════════════════════
ZUSAMMENFASSUNG der Kandidaten-Beiträge in Teil 2 (zur Sicherheit nochmal isoliert):
${candidateTeil2Turns ? '— ' + candidateTeil2Turns : '[Keine Beiträge des Kandidaten in der Diskussion]'}
═══════════════════════════════════════════════

WICHTIG: Teil 2 (Diskussion) zählt gleichwertig zu Teil 1. Beziehe die Beiträge des Kandidaten in der Diskussion AUSDRÜCKLICH in deine Bewertung jedes Kriteriums ein. Erwähne im "overall_comment" konkret, wie der Kandidat in der Diskussion agiert hat.

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
    "overall_comment": "2–3 Sätze auf Deutsch — erwähne konkret die Diskussion (Teil 2)"
  },
  "note": "Hinweis zur transkriptbasierten Bewertung",
  "per_part": {
    "teil_1a": {
      "grade": "A|B|C|D",
      "content_notes": ["Detaillierte Beobachtung 1 zum Inhalt der Präsentation", "Beobachtung 2", "..."],
      "language_notes": ["Sprachliche Beobachtung 1 (Wortschatz, Stil, Kohärenz)", "Beobachtung 2", "..."]
    },
    "teil_1b": {
      "grade": "A|B|C|D",
      "content_notes": ["Inhaltliche Beobachtung zu Antworten und Fragen", "..."],
      "language_notes": ["Sprachliche Beobachtung zu Antworten und Fragen", "..."]
    },
    "teil_2": {
      "grade": "A|B|C|D",
      "content_notes": ["Beobachtung zur Argumentation in Turn 1", "Turn 2: ...", "Reaktion auf Partnerargumente", "..."],
      "language_notes": ["Sprachliche Stärken/Schwächen in der Diskussion", "..."]
    }
  }
}

WICHTIG: Das "per_part" Feld ist Pflicht. Gib in jedem Teil mindestens 2 content_notes und 2 language_notes.`;
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
  ): Promise<LanguageErrors | null> => {
    const allText = [
      transcripts.teil_1a,
      transcripts.teil_1b_answers,
      transcripts.teil_1b_questions,
      ...(transcripts.teil_2_turns || [])
        .filter(t => t.role === 'candidate' || t.role === 'person_a')
        .map(t => t.text),
    ].filter(Boolean).join('\n\n');

    const prompt = `Du bist ein erfahrener C1-Deutschlehrer mit Spezialisierung auf detaillierte sprachliche Fehleranalyse.

DEINE AUFGABE:
Analysiere den Text des Kandidaten und kategorisiere ALLE Fehler in drei Kategorien:
1. Grammatikfehler (Tempora, Modi, Konjunktiv, Passiv, Artikel-Deklination, Endungen, Verbvalenz)
2. Wortschatzfehler (falsche Wortwahl, ähnliche aber falsche Wörter, idiomatische Fehler)
3. Satzstrukturfehler (Wortstellung, Nebensätze, Konnektoren, Hauptsatz-Aufbau)

Sei GRÜNDLICH — übersehe keinen Fehler, auch keinen kleinen.

ANTWORTE NUR MIT JSON (kein Markdown, keine Erklärung davor/danach):
{
  "grammatik": [
    {
      "falsch": "Wörtlich falscher Satz oder Phrase",
      "richtig": "Korrigierte Version",
      "regel": "Name der grammatischen Regel (z.B. 'Konjunktiv II', 'Akkusativ nach Präposition durch')",
      "erklaerung": "Ausführliche Erklärung in 2-3 Sätzen: Was war falsch, welche Regel gilt, warum die Korrektur richtig ist",
      "beispiel": "Ein zusätzlicher Beispielsatz, der dieselbe Regel korrekt anwendet"
    }
  ],
  "wortschatz": [
    {
      "falsch": "Wörtlich falsches Wort/Phrase im Kontext",
      "richtig": "Bessere Alternative",
      "unterschied": "Erkläre den Unterschied zwischen den beiden Wörtern und warum die Alternative im Kontext passender ist"
    }
  ],
  "satzstruktur": [
    {
      "falsch": "Falsch strukturierter Satz",
      "richtig": "Korrekt strukturierter Satz",
      "regel": "Name der Strukturregel + kurze Erklärung (z.B. 'Verb-Endstellung im Nebensatz nach \\"dass\\"')"
    }
  ]
}

WICHTIG:
- Jede Kategorie muss ein Array sein (auch wenn leer: []).
- Wenn keine Fehler in einer Kategorie: leeres Array [].
- Identifiziere die spezifischste Kategorie pro Fehler — keine Doppel-Einträge.
- Fokus auf C1-Niveau-Fehler.

Text des Kandidaten:
"""
${allText}
"""`;

    const result = await callAI(prompt, 'Analysiere die Fehler und gib JSON zurück.');
    if (!result) return null;
    try {
      const cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      const parsed = JSON.parse(cleaned) as Partial<LanguageErrors>;
      return {
        grammatik: Array.isArray(parsed.grammatik) ? parsed.grammatik : [],
        wortschatz: Array.isArray(parsed.wortschatz) ? parsed.wortschatz : [],
        satzstruktur: Array.isArray(parsed.satzstruktur) ? parsed.satzstruktur : [],
      };
    } catch (e) {
      console.error('[TELC AI] correctLanguage parse error:', e);
      setError('Fehleranalyse konnte nicht gelesen werden');
      return null;
    }
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
