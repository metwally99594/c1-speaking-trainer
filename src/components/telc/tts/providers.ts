/**
 * TTS Provider Implementations
 *
 * FishTTSProvider   — Fish Audio S2 Pro via /api/tts (premium German voice).
 *                     Active when VITE_FISH_ENABLED=true.
 * PiperTTSProvider  — Piper TTS via /api/tts (reliable German offline voice).
 *                     Active when VITE_PIPER_ENABLED=true.
 * WebSpeechTTSProvider — browser Web Speech API, always available as fallback.
 * NullTTSProvider   — silent last-resort fallback.
 *
 * OpenAI is permanently excluded from this project.
 */

import type { TTSProvider, TTSOptions, TTSSpeakCallbacks } from './types';

// ---------------------------------------------------------------------------
// Shared helper — fetch /api/tts and play returned audio
// ---------------------------------------------------------------------------

function fetchAndPlay(
  provider: 'fish' | 'piper',
  text: string,
  callbacks?: TTSSpeakCallbacks,
): { cancel: () => void } {
  let audio: HTMLAudioElement | null = null;
  let cancelled = false;

  fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, provider }),
  })
    .then(res => {
      if (cancelled) return;
      if (!res.ok) throw new Error(`/api/tts returned ${res.status}`);
      return res.blob();
    })
    .then(blob => {
      if (cancelled || !blob) return;
      const url = URL.createObjectURL(blob);
      audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audio = null;
        if (!cancelled) callbacks?.onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audio = null;
        if (!cancelled) callbacks?.onError?.();
      };
      return audio.play();
    })
    .catch(() => {
      if (!cancelled) callbacks?.onError?.();
    });

  return {
    cancel: () => {
      cancelled = true;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
      }
    },
  };
}

// ---------------------------------------------------------------------------
// FishTTSProvider — Fish Audio S2 Pro via /api/tts?provider=fish
// ---------------------------------------------------------------------------

export class FishTTSProvider implements TTSProvider {
  readonly name = 'Fish';
  private _cancel: (() => void) | null = null;

  get isAvailable(): boolean {
    // import.meta.env → Vite production; process.env → Vitest / Node
    const v =
      (import.meta as { env?: Record<string, string> }).env?.VITE_FISH_ENABLED ??
      (typeof process !== 'undefined' ? process.env.VITE_FISH_ENABLED : undefined);
    return v === 'true';
  }

  speak(text: string, _options?: TTSOptions, callbacks?: TTSSpeakCallbacks): void {
    this.stop();
    const { cancel } = fetchAndPlay('fish', text, callbacks);
    this._cancel = cancel;
  }

  stop(): void {
    this._cancel?.();
    this._cancel = null;
  }
}

// ---------------------------------------------------------------------------
// PiperTTSProvider — Piper TTS via /api/tts?provider=piper
// ---------------------------------------------------------------------------

export class PiperTTSProvider implements TTSProvider {
  readonly name = 'Piper';
  private _cancel: (() => void) | null = null;

  get isAvailable(): boolean {
    const v =
      (import.meta as { env?: Record<string, string> }).env?.VITE_PIPER_ENABLED ??
      (typeof process !== 'undefined' ? process.env.VITE_PIPER_ENABLED : undefined);
    return v === 'true';
  }

  speak(text: string, _options?: TTSOptions, callbacks?: TTSSpeakCallbacks): void {
    this.stop();
    const { cancel } = fetchAndPlay('piper', text, callbacks);
    this._cancel = cancel;
  }

  stop(): void {
    this._cancel?.();
    this._cancel = null;
  }
}

// ---------------------------------------------------------------------------
// WebSpeechTTSProvider — browser Web Speech API, always-available fallback
// ---------------------------------------------------------------------------

export class WebSpeechTTSProvider implements TTSProvider {
  readonly name = 'WebSpeech';

  get isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  speak(text: string, options?: TTSOptions, callbacks?: TTSSpeakCallbacks): void {
    if (!this.isAvailable) { callbacks?.onEnd?.(); return; }

    const synth = window.speechSynthesis;
    synth.cancel();

    const lang = options?.lang ?? 'de-DE';
    const rate = options?.rate ?? 0.9;

    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    let i = 0;

    const speakNext = () => {
      if (i >= sentences.length) { callbacks?.onEnd?.(); return; }
      const chunk = sentences[i++].trim();
      if (!chunk) { speakNext(); return; }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = speakNext;
      utterance.onerror = speakNext;

      const voices = synth.getVoices();
      const germanVoice = voices.find(v => v.lang.startsWith('de'));
      if (germanVoice) utterance.voice = germanVoice;

      synth.speak(utterance);
    };

    speakNext();
  }

  stop(): void {
    if (this.isAvailable) window.speechSynthesis.cancel();
  }
}

// ---------------------------------------------------------------------------
// NullTTSProvider — silent fallback, always available
// ---------------------------------------------------------------------------

export class NullTTSProvider implements TTSProvider {
  readonly name = 'Null';
  readonly isAvailable = true;
  speak(_text: string, _options?: TTSOptions, callbacks?: TTSSpeakCallbacks): void { callbacks?.onEnd?.(); }
  stop(): void {}
}
