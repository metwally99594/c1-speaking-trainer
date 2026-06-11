const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log('[TELC Transcribe] GROQ_API_KEY present:', !!GROQ_API_KEY);

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
    console.error('[TELC Transcribe] GROQ_API_KEY not configured');
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
    const contentType = req.headers.get('content-type') || 'unknown';
    console.log('[TELC Transcribe] incoming Content-Type:', contentType);

    const clientFormData = await req.formData();
    const file = clientFormData.get('file');

    console.log('[TELC Transcribe] file field present:', !!file);

    if (!file) {
      // Log all fields for debugging
      const allKeys = Array.from(clientFormData.keys());
      console.error('[TELC Transcribe] no "file" field found, available keys:', allKeys);
      return new Response(
        JSON.stringify({
          error: 'No audio file provided',
          hint: 'FormData must contain a "file" field with the audio blob',
          receivedKeys: allKeys,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    console.log('[TELC Transcribe] file details:', {
      name: file.name || '(unnamed)',
      type: file.type || '(unknown)',
      size: file.size || 0,
    });

    if (!file.size || file.size === 0) {
      console.error('[TELC Transcribe] file is empty (0 bytes)');
      return new Response(
        JSON.stringify({ error: 'Audio file is empty (0 bytes)' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const groqFormData = new FormData();
    groqFormData.append('file', file);
    groqFormData.append('model', 'whisper-large-v3');
    groqFormData.append('language', 'de');
    groqFormData.append('response_format', 'json');

    console.log('[TELC Transcribe] sending to Groq, model: whisper-large-v3, language: de');

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    console.log('[TELC Transcribe] Groq response status:', groqRes.status);

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[TELC Transcribe] Groq error body:', errText);
      return new Response(
        JSON.stringify({ error: `Groq API error (${groqRes.status})`, details: errText }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const data = await groqRes.json();
    console.log('[TELC Transcribe] Groq success, text length:', (data.text || '').length);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[TELC Transcribe] unhandled error:', err.message, err.stack);
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
