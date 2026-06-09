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
  wpm: number
): Promise<string> {
  const systemPrompt = `You are an official TELC C1 examiner evaluating a German speaking exam presentation.

Evaluate the presentation according to these official TELC C1 criteria and return a JSON object (no markdown, no code fences):

1. aufgabengerechtheit (task completion): A/B/C/D — Did the user answer the topic? Was the presentation structured? Were examples provided? Was it coherent?

2. flüssigkeit (fluency): A/B/C/D — Natural flow, hesitation, long pauses, communication continuity. Use transcript and timing metrics (duration: ${duration}s, WPM: ${wpm}).

3. repertoire (range): A/B/C/D — Vocabulary range, variety of expressions, connectors (darüber hinaus, außerdem, einerseits, andererseits, folglich etc.), repetition.

4. grammatischeRichtigkeit (grammatical accuracy): A/B/C/D — Sentence structure, verb placement, weil/dass clauses, tense usage, article usage.

5. ausspracheUndIntonation (pronunciation and intonation): A/B/C/D — AI estimate based on transcript quality and recognition consistency. Note: This is an AI estimate, not a certified pronunciation score.

Also generate:
- estimatedPoints: number (0-100)
- strengths: string[] (array of strengths in German)
- weaknesses: string[] (array of weaknesses in German)
- detailedFeedback: string (detailed feedback in German)
- improvementSuggestions: string[] (array of improvement suggestions in German)
- readinessScore: number (0-100)
- likelyExamLevel: "Strong Pass" | "Pass" | "Borderline"

Return valid JSON with these exact keys (camelCase as shown).`;

  const userPrompt = `Topic: ${topic}\n\nTranscript: ${transcript}\n\nDuration: ${duration} seconds\nSpeaking pace: ${wpm} WPM`;

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
  questionsAndAnswers: { question: string; answer: string }[]
): Promise<string> {
  const qaText = questionsAndAnswers
    .map((qa, i) => `Question ${i + 1}: ${qa.question}\nAnswer ${i + 1}: ${qa.answer}`)
    .join('\n\n');

  const systemPrompt = `You are an official TELC C1 examiner evaluating follow-up answers.

Given the user's presentation and their answers to follow-up questions, provide a refined final evaluation.

Return the SAME JSON structure as the main evaluation. The follow-up answers may adjust the scores slightly.

Return valid JSON with these exact keys:
- aufgabengerechtheit, flüssigkeit, repertoire, grammatischeRichtigkeit, ausspracheUndIntonation (each A/B/C/D)
- estimatedPoints (number 0-100)
- strengths (string[])
- weaknesses (string[])
- detailedFeedback (string)
- improvementSuggestions (string[])
- readinessScore (number 0-100)
- likelyExamLevel ("Strong Pass" | "Pass" | "Borderline")`;

  const userPrompt = `Topic: ${topic}\n\nPresentation: ${transcript}\n\nFollow-up:\n${qaText}`;

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
