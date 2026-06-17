console.log('[TELC AI] module loaded, runtime:', typeof process !== 'undefined' ? 'node/edge' : 'browser');
console.log('[TELC AI] OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('[TELC AI] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log('[TELC AI] handler called, method:', req.method);
  console.log('[TELC AI] OPENROUTER_API_KEY inside handler:', !!process.env.OPENROUTER_API_KEY);

  // GET for diagnostics
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      ok: true,
      status: 'diagnostic',
      env: {
        OPENROUTER_API_KEY_exists: !!process.env.OPENROUTER_API_KEY,
        GROQ_API_KEY_exists: !!process.env.GROQ_API_KEY,
        VERCEL_ENV: process.env.VERCEL_ENV || 'not set',
        VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || 'not set',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }

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

    const clientKey = req.headers.get('x-api-key');
    const apiKey = clientKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      const allVars = Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN'));
      return new Response(JSON.stringify({
        error: 'OPENROUTER_API_KEY not configured',
        hint: 'Set OPENROUTER_API_KEY in Vercel Dashboard → Settings → Environment Variables → Production',
        availableKeys: allVars,
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
      }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    const body = {
      model: 'deepseek/deepseek-chat',
      max_tokens: 2000,
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
