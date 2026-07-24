/**
 * TTS Edge function — Fish Audio S2 Pro + Piper routing
 *
 * POST { text: string, provider: 'fish' | 'piper' } → audio binary
 * GET  → { ok, fish: boolean, piper: boolean } health-check
 *
 * Required Vercel env vars:
 *   FISH_API_KEY       — Fish Audio API key (server-only)
 *   FISH_VOICE_ID      — Fish Audio voice/reference ID (optional)
 *   PIPER_API_URL      — Base URL of the Piper REST server (server-only)
 *   PIPER_VOICE_MODEL  — Piper voice model name (optional, server default used otherwise)
 *
 * Client feature flags (set in Vercel → Settings → Environment Variables):
 *   VITE_FISH_ENABLED=true   — activates FishTTSProvider on the client
 *   VITE_PIPER_ENABLED=true  — activates PiperTTSProvider on the client
 *
 * OpenAI is permanently excluded from this project.
 */

export const config = { runtime: 'edge' };

// ---------------------------------------------------------------------------
// Fish Audio S2 Pro
// ---------------------------------------------------------------------------

async function handleFish(text, req) {
  const apiKey = process.env.FISH_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'FISH_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const voiceId = process.env.FISH_VOICE_ID || null;

  let fishRes;
  try {
    fishRes = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        ...(voiceId ? { reference_id: voiceId } : {}),
        format: 'mp3',
        mp3_bitrate: 128,
        normalize: true,
        latency: 'balanced',
      }),
    });
  } catch (err) {
    console.error('[TTS/Fish] fetch error:', err.message);
    return new Response(JSON.stringify({ error: 'Fish Audio unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!fishRes.ok) {
    const errText = await fishRes.text().catch(() => '');
    console.error('[TTS/Fish] error', fishRes.status, errText.slice(0, 200));
    return new Response(
      JSON.stringify({ error: `Fish Audio error (${fishRes.status})` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const audioBuffer = await fishRes.arrayBuffer();
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}

// ---------------------------------------------------------------------------
// Piper TTS
// ---------------------------------------------------------------------------

async function handlePiper(text) {
  const piperUrl = process.env.PIPER_API_URL;
  if (!piperUrl) {
    return new Response(
      JSON.stringify({ error: 'PIPER_API_URL not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const voiceModel = process.env.PIPER_VOICE_MODEL || null;

  let piperRes;
  try {
    piperRes = await fetch(`${piperUrl.replace(/\/$/, '')}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        ...(voiceModel ? { voice: voiceModel } : {}),
      }),
    });
  } catch (err) {
    console.error('[TTS/Piper] fetch error:', err.message);
    return new Response(JSON.stringify({ error: 'Piper server unreachable' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!piperRes.ok) {
    const errText = await piperRes.text().catch(() => '');
    console.error('[TTS/Piper] error', piperRes.status, errText.slice(0, 200));
    return new Response(
      JSON.stringify({ error: `Piper error (${piperRes.status})` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const audioBuffer = await piperRes.arrayBuffer();
  const contentType = piperRes.headers.get('Content-Type') || 'audio/wav';
  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(audioBuffer.byteLength),
      'Cache-Control': 'no-store',
    },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req) {
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        ok: true,
        fish: !!process.env.FISH_API_KEY,
        piper: !!process.env.PIPER_API_URL,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let text, provider;
  try {
    const body = await req.json();
    text = typeof body?.text === 'string' ? body.text.trim() : '';
    provider = body?.provider === 'piper' ? 'piper' : 'fish';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!text) {
    return new Response(JSON.stringify({ error: 'Missing or empty text field' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return provider === 'piper' ? handlePiper(text) : handleFish(text, req);
}
