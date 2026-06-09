const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 60000;
const MAX_RETRIES = 2;

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  error?: {
    message: string;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  model?: string;
}

class OpenRouterError extends Error {
  code: 'NO_KEY' | 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'NETWORK' | 'PARSE';
  status?: number;

  constructor(
    message: string,
    code: 'NO_KEY' | 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'NETWORK' | 'PARSE',
    status?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
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

async function makeRequest(config: OpenRouterConfig, body: OpenRouterRequest, retries = MAX_RETRIES): Promise<string> {
  if (!config.apiKey) {
    throw new OpenRouterError('OpenRouter API key is not configured', 'NO_KEY');
  }

  const model = config.model || DEFAULT_MODEL;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        OPENROUTER_URL,
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
        throw new OpenRouterError('Rate limit exceeded', 'RATE_LIMIT', 429);
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new OpenRouterError(
          `API returned status ${response.status}: ${errorBody}`,
          'API_ERROR',
          response.status
        );
      }

      const data: OpenRouterResponse = await response.json();

      if (data.error) {
        throw new OpenRouterError(
          data.error.message || 'Unknown API error',
          'API_ERROR'
        );
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new OpenRouterError('Empty response from API', 'PARSE');
      }

      return content;
    } catch (err) {
      lastError = err;
      if (err instanceof OpenRouterError && err.code === 'NO_KEY') throw err;
      if (err instanceof OpenRouterError && err.code === 'RATE_LIMIT') break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  if (lastError instanceof OpenRouterError) throw lastError;
  throw new OpenRouterError('Request failed after retries', 'NETWORK');
}

export async function evaluateTelcPresentation(
  config: OpenRouterConfig,
  topic: string,
  transcript: string,
  duration: number,
  wpm: number,
  discussionTurns?: { role: string; text: string }[]
): Promise<string> {
  const discussionSection = discussionTurns && discussionTurns.length > 0
    ? `\n\nDiscussion transcript:\n${discussionTurns.map((t) => `${t.role === 'examiner' ? 'Examiner' : 'Candidate'}: ${t.text}`).join('\n')}`
    : '';

  const systemPrompt = `You are an official TELC C1 examiner evaluating a German speaking exam.

The candidate gave a presentation and then participated in an interactive discussion with the examiner.

Evaluate BOTH the presentation AND discussion according to these official TELC C1 criteria and return a JSON object (no markdown, no code fences):

1. aufgabengerechtheit (task completion): A/B/C/D — Did the user answer the topic? Was the presentation structured? Were examples provided? Was it coherent? How well did they handle the discussion?

2. flüssigkeit (fluency): A/B/C/D — Natural flow, hesitation, long pauses, communication continuity. Use transcript and timing metrics (duration: ${duration}s, WPM: ${wpm}). Also assess discussion spontaneity.

3. repertoire (range): A/B/C/D — Vocabulary range, variety of expressions, connectors (darüber hinaus, außerdem, einerseits, andererseits, folglich etc.), repetition. Assess both presentation and discussion.

4. grammatischeRichtigkeit (grammatical accuracy): A/B/C/D — Sentence structure, verb placement, weil/dass clauses, tense usage, article usage.

5. ausspracheUndIntonation (pronunciation and intonation): A/B/C/D — AI estimate based on transcript quality and recognition consistency. Note: This is an AI estimate, not a certified pronunciation score.

Also generate:
- estimatedPoints: number (0-100)
- strengths: string[] (array of strengths in German, include discussion performance)
- weaknesses: string[] (array of weaknesses in German, include discussion performance)
- detailedFeedback: string (detailed feedback in German covering both presentation and discussion)
- improvementSuggestions: string[] (array of practical improvement suggestions in German, e.g. "Use more connectors like 'darüber hinaus' and 'außerdem'", "Give more concrete examples", "Reduce repetition of the same words", "Improve sentence complexity with subordinate clauses")
- readinessScore: number (0-100)
- likelyExamLevel: "Strong Pass" | "Pass" | "Borderline"

Return valid JSON with these exact keys (camelCase as shown).`;

  const userPrompt = `Topic: ${topic}\n\nPresentation transcript: ${transcript}\n\nDuration: ${duration} seconds\nSpeaking pace: ${wpm} WPM${discussionSection}`;

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

export async function generateDiscussionResponse(
  config: OpenRouterConfig,
  topic: string,
  transcript: string,
  discussionTurns: { role: string; text: string }[],
  turnIndex: number
): Promise<string> {
  const totalTurns = 5;
  const isLastTurn = turnIndex >= totalTurns - 1;

  const discussionHistory = discussionTurns
    .map((t) => `${t.role === 'examiner' ? 'Examiner' : 'Candidate'}: ${t.text}`)
    .join('\n');

  const systemPrompt = `You are an official TELC C1 examiner conducting an interactive discussion.

The candidate has just given a presentation on the topic. Now you are having a discussion with them.

${
  isLastTurn
    ? 'This is your LAST turn. Wrap up the discussion naturally and signal that the discussion phase is complete.'
    : 'Ask a relevant follow-up question or challenge based on what the candidate said. Relate your question to the specific topic and the candidate\'s arguments.'
}

Rules:
- Questions MUST be related to the specific topic, not generic
- Challenge the candidate's观点 where appropriate
- Ask for examples, counterarguments, or personal experience
- Respond naturally as an examiner would
- Keep responses concise (1-2 sentences)
- Speak in German

Return a JSON object (no markdown, no code fences) with key "response" containing your examiner message.`;

  const userPrompt = `Topic: ${topic}\n\nCandidate's presentation: ${transcript}\n\nDiscussion so far:\n${discussionHistory || 'No discussion yet.'}\n\nTurn ${turnIndex + 1} of ${totalTurns}: Provide your examiner response.`;

  return makeRequest(config, {
    model: config.model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 300,
  });
}

export async function generateFollowUpQuestions(
  config: OpenRouterConfig,
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
  config: OpenRouterConfig,
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

  const systemPrompt = `You are an official TELC C1 examiner evaluating a complete exam.

The candidate gave a presentation, participated in an interactive discussion, and answered follow-up questions.

Return a FINAL evaluation JSON with these exact keys:
- aufgabengerechtheit, flüssigkeit, repertoire, grammatischeRichtigkeit, ausspracheUndIntonation (each A/B/C/D)
- estimatedPoints (number 0-100)
- strengths (string[])
- weaknesses (string[])
- detailedFeedback (string)
- improvementSuggestions (string[], practical suggestions like "Use more connectors", "Give concrete examples", "Reduce repetition", "Improve sentence complexity")
- readinessScore (number 0-100)
- likelyExamLevel ("Strong Pass" | "Pass" | "Borderline")

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

export { OpenRouterError };
