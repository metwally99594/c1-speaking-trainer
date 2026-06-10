const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log('GROQ_API_KEY present:', !!GROQ_API_KEY);

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Health-check ping via GET
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        keyConfigured: !!GROQ_API_KEY,
        runtime: 'edge',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GROQ_API_KEY) {
    return new Response(
      JSON.stringify({
        error: 'GROQ_API_KEY not configured',
        hint: 'Set GROQ_API_KEY in Vercel project → Settings → Environment Variables',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  try {
    const clientFormData = await req.formData();
    const file = clientFormData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'de');
    groqFormData.append('response_format', 'json');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(
        JSON.stringify({ error: `Groq API error (${groqRes.status})`, details: errText }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await groqRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
