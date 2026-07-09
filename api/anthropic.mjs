console.log('[TELC AI] module loaded, runtime:', typeof process !== 'undefined' ? 'node/edge' : 'browser');
console.log('[TELC AI] OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);
console.log('[TELC AI] GROQ_API_KEY exists:', !!process.env.GROQ_API_KEY);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log('[TELC AI] handler called, method:', req.method);

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
    const { messages, type } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });
    }

    const clientKey = req.headers.get('x-api-key');

    if (type === 'chat') {
      // 1. Conversational partner: Use Llama 3.3 70B on Groq for ultra-low latency
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return new Response(JSON.stringify({
          error: 'GROQ_API_KEY not configured on server',
          hint: 'Set GROQ_API_KEY in Vercel project environment variables',
        }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }

      console.log('[TELC AI] Routing to Groq (llama-3.3-70b-versatile)');
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1000,
          temperature: 0.7,
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        return new Response(JSON.stringify({
          error: `Groq API error: ${response.status}`,
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

    } else {
      // 2. Exam Evaluation: Use DeepSeek Chat on OpenRouter for deep reasoning & JSON structure stability
      const openRouterKey = clientKey || process.env.OPENROUTER_API_KEY;
      if (!openRouterKey) {
        return new Response(JSON.stringify({
          error: 'OPENROUTER_API_KEY not configured on server',
          hint: 'Set OPENROUTER_API_KEY in Vercel project environment variables',
        }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }

      console.log('[TELC AI] Routing to OpenRouter (deepseek/deepseek-chat)');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          max_tokens: 2000,
          messages: messages.map(m => ({
            role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
        }),
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
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
}
