/**
 * Vercel Edge Function — Proxy to OpenRouter.
 *
 * Accepts JSON with { messages } array (OpenAI-compatible format).
 * Forwards to OpenRouter with model claude-sonnet-4-20250514.
 *
 * POST /api/anthropic
 * Headers: Content-Type: application/json
 * Body: { messages: [{ role, content }] }
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return new Response(JSON.stringify({
        error: `OpenRouter API error: ${response.status}`,
        detail: errorText,
      }), {
        status: response.status,
        headers: { 'content-type': 'application/json' },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
