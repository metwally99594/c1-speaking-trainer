/**
 * Turn lifecycle tests for useSTT.
 *
 * Tests the state machine: idle → recording → processing → transcript / fallback → reset.
 * Browser APIs (MediaRecorder, getUserMedia, fetch) are mocked. useSTT.ts is not modified.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useSTT from '../components/telc/useSTT';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../store/useTopicStore', () => ({
  useTopicStore: {
    getState: () => ({ apiKeys: { groq: '' } }),
  },
}));

class MockMediaRecorder {
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  state: 'inactive' | 'recording' = 'inactive';
  static isTypeSupported = vi.fn(() => true);

  start(_timeslice?: number) {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    const chunk = new Blob(['fake-audio-data'], { type: 'audio/webm' });
    // Fire ondataavailable then onstop in microtasks (mirrors real browser behavior)
    Promise.resolve()
      .then(() => this.ondataavailable?.({ data: chunk }))
      .then(() => this.onstop?.());
  }
}

const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

function setupMocks(transcriptResponse: string | null = 'Hallo Welt') {
  Object.defineProperty(globalThis, 'MediaRecorder', {
    value: MockMediaRecorder,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    },
    writable: true,
    configurable: true,
  });

  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: transcriptResponse !== null,
    status: transcriptResponse !== null ? 200 : 500,
    text: vi.fn().mockResolvedValue(transcriptResponse === null ? 'server error' : ''),
    json: vi.fn().mockResolvedValue(
      transcriptResponse !== null ? { text: transcriptResponse } : { error: 'STT failed' }
    ),
  }));
}

beforeEach(() => setupMocks());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useSTT — initial state', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useSTT());
    expect(result.current.recording).toBe(false);
    expect(result.current.processing).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.fallbackMode).toBe(false);
    expect(result.current.mediaError).toBeNull();
  });
});

describe('useSTT — recording lifecycle', () => {
  it('transitions idle → recording after startRecording', async () => {
    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.recording).toBe(true);
    expect(result.current.processing).toBe(false);
    expect(result.current.transcript).toBe('');
  });

  it('transitions recording → transcript after stop (fast-path)', async () => {
    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.recording).toBe(true);

    act(() => { result.current.stopRecording(); });

    // With an instant mock fetch, processing resolves before the next tick.
    // Assert the final stable state only.
    await waitFor(() => {
      expect(result.current.transcript).toBe('Hallo Welt');
      expect(result.current.processing).toBe(false);
      expect(result.current.recording).toBe(false);
    });
  });

  it('shows processing=true while transcription is in flight (slow-path)', async () => {
    // Use a deferred fetch so we can observe the processing=true window
    let resolveTranscription!: (value: unknown) => void;
    const pendingFetch = new Promise(resolve => { resolveTranscription = resolve; });

    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch));

    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => { result.current.stopRecording(); });

    // processing should be true while fetch is pending
    await waitFor(() => expect(result.current.processing).toBe(true));

    // resolve the fetch
    await act(async () => {
      resolveTranscription({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(''),
        json: vi.fn().mockResolvedValue({ text: 'Langsames Transkript' }),
      });
      await pendingFetch;
    });

    await waitFor(() => {
      expect(result.current.transcript).toBe('Langsames Transkript');
      expect(result.current.processing).toBe(false);
    });
  });

  it('does not call stopRecording if recorder is already inactive', async () => {
    const { result } = renderHook(() => useSTT());
    // Not started — stopRecording should be a no-op
    expect(() => act(() => { result.current.stopRecording(); })).not.toThrow();
    expect(result.current.recording).toBe(false);
  });
});

describe('useSTT — fallback mode', () => {
  it('enters fallbackMode and sets error when getUserMedia is denied', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
      new Error('Permission denied'),
    );

    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.recording).toBe(false);
    expect(result.current.fallbackMode).toBe(true);
    expect(result.current.mediaError).toContain('Permission denied');
  });

  it('enters fallbackMode when /api/transcribe returns an error', async () => {
    setupMocks(null); // makes fetch return 500

    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => { result.current.stopRecording(); });

    await waitFor(() => {
      expect(result.current.fallbackMode).toBe(true);
      expect(result.current.processing).toBe(false);
    });
  });

  it('accepts a manual fallback transcript and exits fallbackMode', async () => {
    navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
      new Error('Mic not found'),
    );

    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.fallbackMode).toBe(true);

    act(() => {
      result.current.setFallbackTranscript('Manuell eingetippt');
    });

    expect(result.current.transcript).toBe('Manuell eingetippt');
    expect(result.current.fallbackMode).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useSTT — reset', () => {
  it('clears all state after reset', async () => {
    const { result } = renderHook(() => useSTT());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => { result.current.stopRecording(); });
    await waitFor(() => expect(result.current.transcript).toBe('Hallo Welt'));

    act(() => { result.current.reset(); });

    expect(result.current.recording).toBe(false);
    expect(result.current.processing).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
    expect(result.current.fallbackMode).toBe(false);
    expect(result.current.mediaError).toBeNull();
  });
});
