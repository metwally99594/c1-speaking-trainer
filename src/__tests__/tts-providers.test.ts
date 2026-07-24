/**
 * TTS provider tests.
 *
 * Covers:
 *  - Availability flags (VITE_FISH_ENABLED / VITE_PIPER_ENABLED)
 *  - Fish → Piper fallback when Fish fetch fails
 *  - Fish → Piper fallback when Fish server returns non-200
 *  - NullTTSProvider always available and calls onEnd synchronously
 *  - stop() cancels pending audio
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FishTTSProvider, PiperTTSProvider, NullTTSProvider, WebSpeechTTSProvider } from '../components/telc/tts/providers';

// ── Audio + URL mocks ──────────────────────────────────────────────────────

let mockAudio: {
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  currentTime: number;
  onended: (() => void) | null;
  onerror: (() => void) | null;
};

beforeEach(() => {
  mockAudio = { play: vi.fn(() => Promise.resolve()), pause: vi.fn(), currentTime: 0, onended: null, onerror: null };
  vi.stubGlobal('Audio', vi.fn(() => mockAudio));
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// ── Availability ───────────────────────────────────────────────────────────

describe('FishTTSProvider.isAvailable', () => {
  it('returns false when VITE_FISH_ENABLED is not set', () => {
    vi.stubEnv('VITE_FISH_ENABLED', '');
    expect(new FishTTSProvider().isAvailable).toBe(false);
  });

  it('returns true when VITE_FISH_ENABLED=true', () => {
    vi.stubEnv('VITE_FISH_ENABLED', 'true');
    expect(new FishTTSProvider().isAvailable).toBe(true);
  });

  it('returns false when VITE_FISH_ENABLED=false', () => {
    vi.stubEnv('VITE_FISH_ENABLED', 'false');
    expect(new FishTTSProvider().isAvailable).toBe(false);
  });
});

describe('PiperTTSProvider.isAvailable', () => {
  it('returns false when VITE_PIPER_ENABLED is not set', () => {
    vi.stubEnv('VITE_PIPER_ENABLED', '');
    expect(new PiperTTSProvider().isAvailable).toBe(false);
  });

  it('returns true when VITE_PIPER_ENABLED=true', () => {
    vi.stubEnv('VITE_PIPER_ENABLED', 'true');
    expect(new PiperTTSProvider().isAvailable).toBe(true);
  });
});

describe('NullTTSProvider', () => {
  it('is always available', () => {
    expect(new NullTTSProvider().isAvailable).toBe(true);
  });

  it('calls onEnd synchronously', () => {
    const onEnd = vi.fn();
    new NullTTSProvider().speak('test', {}, { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('never calls onError', () => {
    const onError = vi.fn();
    new NullTTSProvider().speak('test', {}, { onError });
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── Fish: success path ─────────────────────────────────────────────────────

describe('FishTTSProvider.speak — success', () => {
  it('fetches /api/tts with provider:fish and plays audio', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }));

    const onEnd = vi.fn();
    new FishTTSProvider().speak('Hallo', {}, { onEnd });

    // Let fetch + play promises settle
    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));

    const [url, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/tts');
    const body = JSON.parse(opts.body as string);
    expect(body.provider).toBe('fish');
    expect(body.text).toBe('Hallo');
  });

  it('calls onEnd when audio finishes', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }));

    const onEnd = vi.fn();
    const onError = vi.fn();
    new FishTTSProvider().speak('Test', {}, { onEnd, onError });

    await vi.waitFor(() => expect(mockAudio.play).toHaveBeenCalled());
    mockAudio.onended?.();

    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});

// ── Fish: failure path → triggers onError ─────────────────────────────────

describe('FishTTSProvider.speak — failure', () => {
  it('calls onError when fetch throws (network failure)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const onError = vi.fn();
    new FishTTSProvider().speak('Test', {}, { onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it('calls onError when /api/tts returns non-200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));

    const onError = vi.fn();
    new FishTTSProvider().speak('Test', {}, { onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it('calls onError when audio.play() rejects', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }));
    mockAudio.play.mockRejectedValue(new Error('NotAllowedError'));

    const onError = vi.fn();
    new FishTTSProvider().speak('Test', {}, { onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});

// ── Fish → Piper fallback ─────────────────────────────────────────────────

describe('Fish → Piper fallback', () => {
  it('PiperTTSProvider.speak is called when Fish fires onError', async () => {
    const piperSpy = vi.spyOn(PiperTTSProvider.prototype, 'speak');

    // Fish fetch fails
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Fish down')));

    const fishOnError = vi.fn((callbacks?: { onError?: () => void }) => callbacks?.onError?.());

    const fish = new FishTTSProvider();
    const piper = new PiperTTSProvider();

    // Simulate adapter chain: Fish speaks, on error → Piper speaks
    const onEnd = vi.fn();
    fish.speak('Hallo', {}, {
      onEnd,
      onError: () => piper.speak('Hallo', {}, { onEnd }),
    });

    await vi.waitFor(() => expect(piperSpy).toHaveBeenCalledTimes(1));
    expect(fishOnError).not.toHaveBeenCalled(); // fish.speak errors internally
  });
});

// ── Piper: success path ────────────────────────────────────────────────────

describe('PiperTTSProvider.speak — success', () => {
  it('fetches /api/tts with provider:piper', async () => {
    const blob = new Blob(['audio'], { type: 'audio/wav' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }));

    new PiperTTSProvider().speak('Hallo', {}, {});

    await vi.waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1));

    const [, opts] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(opts.body as string);
    expect(body.provider).toBe('piper');
  });
});

// ── stop() ────────────────────────────────────────────────────────────────

describe('FishTTSProvider.stop()', () => {
  it('pauses audio element on stop()', async () => {
    const blob = new Blob(['audio'], { type: 'audio/mpeg' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }));

    const provider = new FishTTSProvider();
    provider.speak('Test', {}, {});

    await vi.waitFor(() => expect(mockAudio.play).toHaveBeenCalled());
    provider.stop();

    expect(mockAudio.pause).toHaveBeenCalled();
  });

  it('cancels pending fetch so onError is not called after stop()', async () => {
    let resolveFetch!: (v: unknown) => void;
    const pendingFetch = new Promise(r => { resolveFetch = r; });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch));

    const onError = vi.fn();
    const provider = new FishTTSProvider();
    provider.speak('Test', {}, { onError });

    // Stop before fetch resolves
    provider.stop();

    // Now resolve the fetch with a failure — should NOT trigger onError
    resolveFetch({ ok: false, status: 502 });
    await new Promise(r => setTimeout(r, 10));

    expect(onError).not.toHaveBeenCalled();
  });
});

// ── WebSpeechTTSProvider: unchanged contract ──────────────────────────────

describe('WebSpeechTTSProvider', () => {
  it('calls onEnd immediately when speechSynthesis is absent', () => {
    const onEnd = vi.fn();
    // In jsdom, window.speechSynthesis is not defined → isAvailable=false
    new WebSpeechTTSProvider().speak('test', {}, { onEnd });
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
