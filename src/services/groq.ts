const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  error?: {
    message: string;
  };
}

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

class GroqError extends Error {
  code: 'NO_KEY' | 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'NETWORK' | 'PARSE';
  status?: number;

  constructor(
    message: string,
    code: 'NO_KEY' | 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'NETWORK' | 'PARSE',
    status?: number
  ) {
    super(message);
    this.name = 'GroqError';
    this.code = code;
    this.status = status;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function makeRequest(config: GroqConfig, body: GroqRequest, retries = MAX_RETRIES): Promise<string> {
  if (!config.apiKey) {
    throw new GroqError('Groq API key is not configured', 'NO_KEY');
  }

  const model = config.model || DEFAULT_MODEL;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        GROQ_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({ ...body, model }),
        },
        TIMEOUT_MS
      );

      if (response.status === 429) {
        throw new GroqError('Rate limit exceeded', 'RATE_LIMIT', 429);
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new GroqError(
          `API returned status ${response.status}: ${errorBody}`,
          'API_ERROR',
          response.status
        );
      }

      const data: GroqResponse = await response.json();

      if (data.error) {
        throw new GroqError(
          data.error.message || 'Unknown API error',
          'API_ERROR'
        );
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new GroqError('Empty response from API', 'PARSE');
      }

      return content;
    } catch (err) {
      lastError = err;
      if (err instanceof GroqError && err.code === 'NO_KEY') throw err;
      if (err instanceof GroqError && err.code === 'RATE_LIMIT') break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError instanceof GroqError) throw lastError;
  throw new GroqError('Request failed after retries', 'NETWORK');
}

export async function evaluateTelcPresentation(
  config: GroqConfig,
  topic: string,
  transcript: string,
  duration: number,
  wpm: number,
  discussionTurns?: { role: string; text: string }[]
): Promise<string> {
  const discussionSection = discussionTurns && discussionTurns.length > 0
    ? `\n\nDiscussion transcript:\n${discussionTurns.map((t) => `${t.role === 'examiner' ? 'Examiner' : 'Candidate'}: ${t.text}`).join('\n')}`
    : '';

  const userPrompt = `Topic: ${topic}\n\nPresentation transcript: ${transcript}\n\nDuration: ${duration} seconds\nSpeaking pace: ${wpm} WPM${discussionSection}`;

  const systemPrompt = `You are an official TELC C1 examiner evaluating a German speaking exam. The candidate gave a presentation and then participated in an interactive discussion with the examiner.

CALIBRATION INSTRUCTION: Use the FULL grading scale A-D. A = excellent C1+, B = solid C1, C = weak/passable C1, D = below C1. Do NOT inflate scores. Be honest and critical. A score of D does NOT mean failure — it means the candidate needs improvement in that area. Use D when criteria clearly are not at C1 level.

Evaluate BOTH the presentation AND discussion according to these official TELC C1 criteria. Return a JSON object (no markdown, no code fences) with camelCase keys.

CRITERION 1 — aufgabengerechtheit (Aufgabenbewältigung):
How well does the candidate handle the task? Structure, relevance, coherence.
- A: Excellent task handling. Clear structure (Einleitung, Hauptteil, Schluss). All aspects of the topic covered. Relevant examples and well-integrated discussion responses.
- B: Good task handling. Mostly clear structure. Most aspects covered. Some examples. Discussion responses are relevant but could be deeper.
- C: Adequate but incomplete. Loose structure. Some aspects missing or superficial. Few examples. Discussion responses are short or generic.
- D: Weak. No clear structure. Topic barely addressed. No examples. Discussion responses are minimal or off-topic.

CRITERION 2 — flüssigkeit (Sprechflüssigkeit):
Natural flow, hesitation, pauses. Use WPM as an indicator.
- A: Fluent and effortless. No hesitation. WPM 110-140+. Smooth discussion interaction.
- B: Generally fluent with minor hesitation. WPM 95-109. Discussion has some pauses but continues naturally.
- C: Noticeable hesitation and pauses. WPM 80-94. Discussion responses are slow or fragmented.
- D: Frequent long pauses and stumbling. WPM below 80. Discussion is halting or struggles to continue.

Current speaking pace: ${wpm} WPM, duration: ${duration}s. Adjust based on transcript fluency cues.

CRITERION 3 — repertoire (Spektrum / Wortschatz & Ausdruck):
Vocabulary range, variety of connectors, expression.
- A: Broad vocabulary range. Uses multiple advanced connectors (darüber hinaus, außerdem, einerseits...andererseits, folglich, dennoch, demgegenüber, hingegen etc.). No significant repetition. C1+ level expression.
- B: Good vocabulary. Uses some connectors (außerdem, zum Beispiel, also). Some variety but occasional repetition. Solid B2/C1.
- C: Limited vocabulary. Few connectors (und, aber, auch). Noticeable repetition of basic words. Below C1 range.
- D: Very limited vocabulary. Only basic connectors or none. Heavy repetition (gut, schlecht, wichtig, viel). Well below C1.

CRITERION 4 — grammatischeRichtigkeit (Grammatikalische Korrektheit):
Sentence structure, verb placement, subordinate clauses, articles, tenses.
- A: Consistently correct grammar. Confident use of subordinate clauses (weil...dass, obwohl, wenn). Correct verb placement in main and subordinate clauses. Virtually no errors.
- B: Mostly correct grammar. Some minor errors in complex structures. Generally correct verb placement. Errors do not impede understanding.
- C: Frequent grammar errors. Problems with verb placement in Nebensätze. Article or tense errors noticeable. Errors sometimes impede clarity.
- D: Pervasive grammar errors. Basic sentence structure problems. Verb placement frequently wrong. Errors significantly impede understanding.

CRITERION 5 — ausspracheUndIntonation (Aussprache und Intonation):
AI estimate based on transcript quality, recognition consistency, and word-level accuracy data.
- A: Clear and confident. Recognition was consistent with no corrections needed.
- B: Generally clear. Minor recognition inconsistencies suggesting slight pronunciation issues.
- C: Noticeable recognition issues. Multiple unclear segments in transcript suggesting pronunciation problems.
- D: Significant recognition difficulties. Large portions unclear or unintelligible. Note: This is an AI estimate, not a certified assessment.

DURATION EVALUATION (${duration}s): Duration affects aufgabengerechtheit and readinessScore.
- < 90 seconds: strong penalty — too short for C1
- 90-150 seconds: moderate penalty — slightly short
- 150-210 seconds: ideal range — optimal C1 presentation length
- 210-240 seconds: acceptable — slightly long but ok
- > 240 seconds: slight penalty — too long

DISCUSSION PERFORMANCE: Evaluate how well the candidate handled the interactive discussion.
- abilityToAnswer: Did they answer objections directly?
- abilityToDefend: Did they defend their opinions with reasoning?
- abilityToReact: Did they react spontaneously and naturally?
Grade A-D based on: A = handled objections well, defended clearly, spontaneous. D = could not answer objections, no defense, struggled.

Also generate these additional fields:
- estimatedPoints: number (0-100) — Overall score mapping: A average = 85-100, B average = 65-84, C average = 40-64, D average = 0-39
- strengths: string[] (array in German)
- weaknesses: string[] (array in German)
- detailedFeedback: string (detailed German feedback covering presentation and discussion)
- improvementSuggestions: string[] (practical German suggestions, e.g. "Use more connectors like 'darüber hinaus' and 'außerdem'", "Give concrete examples to support arguments", "Reduce repetition of 'gut' and 'wichtig'", "Use more complex sentence structures with subordinate clauses", "Structure your presentation with clear introduction and conclusion")
- readinessScore: number (0-100) — Calibrated: 85-100 = Strong Pass, 65-84 = Pass, 0-64 = Borderline
- likelyExamLevel: "Strong Pass" | "Pass" | "Borderline" — Must match readinessScore ranges above
- discussionPerformance: { grade: "A"|"B"|"C"|"D", abilityToAnswer: boolean, abilityToDefend: boolean, abilityToReact: boolean, description: string }
- discussionManagementScore: { grade: "A"|"B"|"C"|"D", description: string } — Evaluate overall discussion management: agreement/disagreement ability, reacting to partner, defending opinions, conversation management, spontaneous interaction. Provide a detailed description in German.
- examinerNotes: { strengths: string[], weaknesses: string[], criticalErrors: string[] } — Dedicated examiner assessment section (separate from the normal feedback text). strengths = what the candidate did well, weaknesses = areas needing improvement, criticalErrors = serious or recurring mistakes that cost points.

Return valid JSON only. No markdown, no code fences, no explanation outside JSON.`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });
}

export async function generateAiSummary(
  config: GroqConfig,
  topic: string,
  transcript: string
): Promise<string> {
  const systemPrompt = `You are an official TELC C1 examiner. Summarize the candidate's presentation in 1-2 German sentences.

Start with "Sie haben erklärt, dass" or "Sie haben dargelegt, dass" or "Sie haben ausgeführt, dass".

Return a JSON object (no markdown, no code fences) with key "summary" containing the German summary string.`;

  const userPrompt = `Topic: ${topic}\n\nPresentation transcript: ${transcript}`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 200,
  });
}

export async function generatePresentationQuestions(
  config: GroqConfig,
  topic: string,
  transcript: string
): Promise<string> {
  const systemPrompt = `You are a TELC C1 examiner. Based on the candidate's presentation, generate 2-3 natural follow-up questions in German.

Questions should be specific to the presentation content, not generic.

Examples:
- Können Sie das genauer erklären?
- Warum vertreten Sie diese Meinung?
- Haben Sie konkrete Beispiele?
- Wie ist die Situation in Ihrem Heimatland?
- Was meinen Sie mit ...?
- Könnten Sie Ihren Standpunkt näher erläutern?

Return a JSON object (no markdown, no code fences) with key "questions" containing an array of strings.`;

  const userPrompt = `Topic: ${topic}\n\nPresentation transcript: ${transcript}`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 500,
  });
}

export async function generateDiscussionStatement(): Promise<string> {
  const statements = [
    'Fernsehen ist reine Zeitverschwendung.',
    'Erfolg ist planbar.',
    'Universitätsbildung sollte kostenlos sein.',
    'Soziale Medien richten mehr Schaden als Nutzen an.',
    'Tierversuche sollten komplett verboten werden.',
    'Homeoffice sollte zur Regel werden.',
    'Künstliche Intelligenz gefährdet Arbeitsplätze.',
    'Das deutsche Bildungssystem braucht eine grundlegende Reform.',
    'Kernenergie ist eine sinnvolle Alternative zu fossilen Brennstoffen.',
    'Die Schuldenbremse sollte abgeschafft werden.',
    'Ein bedingungsloses Grundeinkommen wäre sinnvoll.',
    'Die Legalisierung von Cannabis war ein Fehler.',
    'Impfungen sollten verpflichtend sein.',
    'Deutschland sollte mehr in die Bundeswehr investieren.',
    'Die 4-Tage-Woche sollte eingeführt werden.',
    'Tempolimit auf Autobahnen ist überfällig.',
    'Private Krankenversicherungen sollten abgeschafft werden.',
    'Studieren sollte nur mit Abitur erlaubt sein.',
    'Rauchen in der Öffentlichkeit sollte verboten werden.',
    'Die Rente mit 67 ist ein Fehler.',
  ];

  const randomStatement = statements[Math.floor(Math.random() * statements.length)];

  return JSON.stringify({ statement: randomStatement });
}

export async function generateDiscussionResponse(
  config: GroqConfig,
  topic: string,
  transcript: string,
  discussionTurns: { role: string; text: string }[],
  turnIndex: number,
  discussionStatement?: string
): Promise<string> {
  const totalTurns = 6;
  const isLastTurn = turnIndex >= totalTurns - 1;

  const discussionHistory = discussionTurns
    .map((t) => `${t.role === 'partner_a' || t.role === 'candidate' ? 'Teilnehmer A (Sie)' : 'Teilnehmer B (KI)'}: ${t.text}`)
    .join('\n');

  const stmt = discussionStatement || 'das Präsentationsthema';
  const systemPrompt = `You are Teilnehmer B in a TELC C1 discussion. This is NOT an examiner interview. You are a discussion partner, like a fellow candidate.

Discussion statement (These): "${stmt}"

CRITICAL: You must take a CLEAR POSITION on this statement — either agree OR disagree. Choose one side and DEFEND it consistently throughout the entire discussion. Do NOT stay neutral. Do NOT change your position.

${
  isLastTurn
    ? 'This is your LAST turn. Wrap up the discussion naturally and signal that the discussion phase is complete.'
    : 'Discuss the statement with the candidate. React to what they said.'
}

RULES FOR REAL DISCUSSION BEHAVIOR:
- DEFEND your opinion consistently — keep the same position throughout
- CHALLENGE weak arguments from the other participant
- REACT to what the other person said specifically
- PROVIDE counterarguments
- ASK for clarification or examples
- Use natural discussion language:
  • "Da stimme ich Ihnen nicht zu."
  • "Das überzeugt mich noch nicht."
  • "Könnten Sie dafür ein Beispiel nennen?"
  • "Ich sehe das anders. Meiner Meinung nach ..."
  • "Darf ich kurz einhaken?"
  • "Da stimme ich Ihnen zu, aber ..."
  • "Ich verstehe Ihren Punkt, allerdings ..."
  • "Ein wichtiger Aspekt, den Sie übersehen, ist ..."
  • "Das kann ich so nicht stehen lassen."
  • "Sehen Sie, das Problem ist ..."
- Interrupt naturally about 20-30% of the time
- Keep responses concise (1-3 sentences)
- Speak in German throughout

This must feel like two candidates discussing the statement, NOT an examiner asking questions. Your job is to debate the statement, challenge the other person's views, and defend your own position.`;

  const userPrompt = `Topic: ${topic}\n\nCandidate's presentation: ${transcript}\n\nDiscussion so far:\n${discussionHistory || 'No discussion yet.'}\n\nTurn ${turnIndex + 1} of ${totalTurns}: Provide your response as Teilnehmer B.`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });
}

export async function generateAIPresentation(
  config: GroqConfig,
  topic: string
): Promise<string> {
  const systemPrompt = `You are a TELC C1 candidate giving a short presentation in German.

Generate a 2-3 minute presentation (about 200-300 words) on the given topic.

The presentation should be suitable for C1 level:
- Clear structure (Einleitung, Hauptteil, Schluss)
- Good vocabulary and connectors
- Well-reasoned arguments
- Natural speaking style

Return a JSON object (no markdown, no code fences) with key "presentation" containing the German text.`;

  const userPrompt = `Topic: ${topic}\n\nGenerate a C1-level German presentation.`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 800,
  });
}

export async function evaluateUserSummary(
  config: GroqConfig,
  topic: string,
  aiPresentation: string,
  userSummary: string
): Promise<string> {
  const systemPrompt = `You are a TELC C1 examiner. Evaluate the user's summary of an AI presentation.

The AI gave a presentation. The user summarized it.

Evaluate:
- completeness (how complete is the summary? 0-100)
- accuracy (how accurate is the summary? 0-100)
- clarity (how clear is the summary? 0-100)
- grade: A/B/C/D
- feedback: German feedback on what was good and what was missing

Return a JSON object (no markdown, no code fences) with keys: grade, completeness (number), accuracy (number), clarity (number), feedback (string).`;

  const userPrompt = `Presentation topic: ${topic}\n\nAI presentation: ${aiPresentation}\n\nUser summary: ${userSummary}`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });
}

export async function generateFollowUpQuestions(
  config: GroqConfig,
  topic: string,
  transcript: string
): Promise<string> {
  const systemPrompt = `You are an official TELC C1 examiner conducting a follow-up discussion.

Based on the user's presentation, generate 3-4 natural follow-up questions in German that an examiner would ask.

Return a JSON object (no markdown, no code fences) with key "questions" containing an array of question strings.

Examples of good questions:
- Was halten Sie persönlich davon?
- Wie ist die Situation in Ihrem Heimatland?
- Welche Nachteile sehen Sie?
- Haben Sie persönliche Erfahrungen damit?
- Können Sie ein Beispiel nennen?
- Wie könnte man dieses Problem Ihrer Meinung nach lösen?`;

  const userPrompt = `Topic: ${topic}\n\nUser's presentation: ${transcript}`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });
}

export async function evaluateFollowUpAnswers(
  config: GroqConfig,
  topic: string,
  transcript: string,
  questionsAndAnswers: { question: string; answer: string }[],
  discussionTurns?: { role: string; text: string }[]
): Promise<string> {
  const qaText = questionsAndAnswers
    .map((qa, i) => `Question ${i + 1}: ${qa.question}\nAnswer ${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const discussionSection = discussionTurns && discussionTurns.length > 0
    ? `\n\nInteractive discussion:\n${discussionTurns.map((t) => `${t.role === 'examiner' ? 'Examiner' : 'Candidate'}: ${t.text}`).join('\n')}`
    : '';

  const systemPrompt = `You are an official TELC C1 examiner producing a FINAL evaluation for a complete exam. The candidate gave a presentation, participated in an interactive discussion, and answered follow-up questions.

CALIBRATION INSTRUCTION: Use the FULL grading scale A-D. A = excellent C1+, B = solid C1, C = weak/passable C1, D = below C1. Do NOT inflate. Be honest. D means improvement needed, not failure.

GRADE RUBRICS:

aufgabengerechtheit (Aufgabenbewältigung):
- A: Excellent. Clear structure (Einleitung, Hauptteil, Schluss). All aspects covered with depth. Good examples and discussion integration.
- B: Good. Mostly clear structure. Most aspects covered. Some depth. Relevant discussion.
- C: Adequate. Loose structure. Superficial coverage. Few examples. Short discussion.
- D: Weak. No structure. Topic barely addressed. No examples. Minimal discussion.

flüssigkeit (Sprechflüssigkeit):
- A: Fluent, effortless, no hesitation. Smooth throughout.
- B: Generally fluent, minor hesitation.
- C: Noticeable pauses, fragmented delivery.
- D: Frequent long pauses, halting.

repertoire (Spektrum):
- A: Broad vocabulary, multiple advanced connectors (darüber hinaus, außerdem, einerseits...andererseits, folglich, dennoch, hingegen), no repetition.
- B: Good vocabulary, some connectors, occasional repetition.
- C: Limited vocabulary, few connectors (und, aber, auch), noticeable repetition.
- D: Very limited, only basic connectors, heavy repetition.

grammatischeRichtigkeit:
- A: Consistently correct. Subordinate clauses used correctly. No errors.
- B: Mostly correct. Minor errors in complex structures.
- C: Frequent errors. Verb placement problems. Errors impede clarity sometimes.
- D: Pervasive errors. Basic structures wrong. Understanding significantly impeded.

ausspracheUndIntonation:
- A: Clear, consistent recognition.
- B: Generally clear, minor issues.
- C: Noticeable recognition problems.
- D: Significant recognition difficulties.

Also generate:
- estimatedPoints: number (0-100) — A avg=85-100, B avg=65-84, C avg=40-64, D avg=0-39
- strengths: string[]
- weaknesses: string[]
- detailedFeedback: string
- improvementSuggestions: string[] (practical, specific German suggestions)
- readinessScore: number (0-100) — 85-100=Strong Pass, 65-84=Pass, 0-64=Borderline
- likelyExamLevel: "Strong Pass" | "Pass" | "Borderline" — must match readinessScore
- discussionManagementScore: { grade: "A"|"B"|"C"|"D", description: string } — Evaluate overall discussion management: agreement/disagreement ability, reacting to partner, defending opinions, conversation management, spontaneous interaction. Provide a detailed description in German.
- examinerNotes: { strengths: string[], weaknesses: string[], criticalErrors: string[] } — Dedicated examiner assessment section (separate from the normal feedback text). strengths = what the candidate did well, weaknesses = areas needing improvement, criticalErrors = serious or recurring mistakes that cost points.

No markdown, no code fences. Return valid JSON only.`;

  const userPrompt = `Topic: ${topic}\n\nPresentation: ${transcript}\n\nFollow-up:\n${qaText}${discussionSection}`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });
}

export { GroqError };
