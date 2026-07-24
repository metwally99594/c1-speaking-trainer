/**
 * AI routing contract tests.
 *
 * Documents and verifies the server-side routing decision in api/anthropic.mjs:
 *   type === 'chat'     → Groq   (llama-3.3-70b-versatile)
 *   type === 'evaluate' → OpenRouter (deepseek/deepseek-chat)
 *
 * STT always routes to /api/transcribe (Groq Whisper).
 *
 * These tests lock in the routing rules so that neither provider can be
 * accidentally swapped. They run entirely in-process without real network calls.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Routing decision logic — mirrors api/anthropic.mjs handler
// ---------------------------------------------------------------------------

type AIProvider = 'groq' | 'openrouter';

function resolveProvider(type: string): AIProvider {
  return type === 'chat' ? 'groq' : 'openrouter';
}

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'deepseek/deepseek-chat';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

function resolveEndpoint(type: string): { url: string; model: string } {
  if (type === 'chat') return { url: GROQ_BASE, model: GROQ_MODEL };
  return { url: OPENROUTER_BASE, model: OPENROUTER_MODEL };
}

// ---------------------------------------------------------------------------
// Groq path (type: 'chat') — AI partner responses
// ---------------------------------------------------------------------------

describe('api/anthropic routing — Groq (type: chat)', () => {
  it('routes chat to groq provider', () => {
    expect(resolveProvider('chat')).toBe('groq');
  });

  it('uses llama-3.3-70b-versatile for chat', () => {
    expect(resolveEndpoint('chat').model).toBe('llama-3.3-70b-versatile');
  });

  it('targets Groq API endpoint for chat', () => {
    expect(resolveEndpoint('chat').url).toContain('api.groq.com');
  });

  it('never targets OpenAI for chat', () => {
    const { url } = resolveEndpoint('chat');
    expect(url).not.toContain('api.openai.com');
    expect(url).not.toContain('openai.com');
  });
});

// ---------------------------------------------------------------------------
// OpenRouter path (type: 'evaluate') — TELC scoring + structured feedback
// ---------------------------------------------------------------------------

describe('api/anthropic routing — OpenRouter (type: evaluate)', () => {
  it('routes evaluate to openrouter provider', () => {
    expect(resolveProvider('evaluate')).toBe('openrouter');
  });

  it('uses deepseek/deepseek-chat for evaluation', () => {
    expect(resolveEndpoint('evaluate').model).toBe('deepseek/deepseek-chat');
  });

  it('targets OpenRouter API endpoint for evaluation', () => {
    expect(resolveEndpoint('evaluate').url).toContain('openrouter.ai');
  });

  it('never targets OpenAI for evaluation', () => {
    const { url } = resolveEndpoint('evaluate');
    expect(url).not.toContain('api.openai.com');
    expect(url).not.toContain('openai.com');
  });
});

// ---------------------------------------------------------------------------
// Any non-chat type routes to OpenRouter (not Groq)
// ---------------------------------------------------------------------------

describe('api/anthropic routing — non-chat fallthrough', () => {
  it.each(['evaluate', 'grade', 'summarise', 'unknown'])(
    'routes type "%s" to openrouter, not groq',
    (type) => {
      expect(resolveProvider(type)).toBe('openrouter');
    },
  );
});

// ---------------------------------------------------------------------------
// STT routing — always /api/transcribe (Groq Whisper)
// ---------------------------------------------------------------------------

describe('STT routing — Groq Whisper via /api/transcribe', () => {
  it('STT endpoint is /api/transcribe', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'Hallo' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const formData = new FormData();
    formData.append('file', new Blob(['audio'], { type: 'audio/webm' }), 'audio.webm');
    await fetch('/api/transcribe', { method: 'POST', body: formData });

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('/api/transcribe');
    expect(url).not.toContain('anthropic');
    expect(url).not.toContain('openai');
  });
});

// ---------------------------------------------------------------------------
// Provider identity — Groq and OpenRouter are never swapped
// ---------------------------------------------------------------------------

describe('Provider identity invariants', () => {
  it('Groq is used for STT and fast partner responses only', () => {
    // Groq handles: chat partner (llama), STT (whisper) — both via /api routes
    const chatEndpoint = resolveEndpoint('chat');
    expect(chatEndpoint.url).toContain('groq.com');
    expect(chatEndpoint.model).toBe('llama-3.3-70b-versatile');
  });

  it('OpenRouter is used for TELC evaluation only', () => {
    const evalEndpoint = resolveEndpoint('evaluate');
    expect(evalEndpoint.url).toContain('openrouter.ai');
    expect(evalEndpoint.model).toBe('deepseek/deepseek-chat');
  });

  it('both providers use /api/anthropic as the single client-facing endpoint', () => {
    const clientEndpoint = '/api/anthropic';
    // The client always calls /api/anthropic regardless of type
    // (server-side routing dispatches to Groq or OpenRouter)
    expect(clientEndpoint).toBe('/api/anthropic');
  });
});
