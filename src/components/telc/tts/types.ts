/**
 * TTS Provider Adapter Interface
 *
 * Provider chain (highest-quality first):
 *   Fish Audio S2 Pro → Piper → WebSpeech → Null
 *
 * Fish and Piper are server-side (api/tts.mjs). WebSpeech is browser-native.
 * Null is the silent last-resort fallback.
 *
 * OpenAI is permanently excluded from this project.
 */

export interface TTSOptions {
  /** BCP-47 language tag. Defaults to 'de-DE' throughout the TELC module. */
  lang?: string;
  /** Playback rate (0.1–10). Provider interprets as-is or maps to its own scale. */
  rate?: number;
  /** Provider-specific voice identifier. */
  voice?: string;
}

export interface TTSSpeakCallbacks {
  /** Called once after the last word is spoken. */
  onEnd?: () => void;
  /**
   * Called when speech fails before or during playback.
   * The adapter uses this to trigger fallback to the next provider.
   * Must never be called after onEnd has already fired.
   */
  onError?: () => void;
}

export interface TTSProvider {
  /** Human-readable name used for debug display and logging. */
  readonly name: string;

  /**
   * Synchronous availability check called before every speak().
   * Returns false when required env flags or browser APIs are absent.
   * The adapter skips unavailable providers at startup.
   */
  readonly isAvailable: boolean;

  /**
   * Start speaking text. Must cancel any ongoing utterance first.
   * Calls callbacks.onEnd on success, callbacks.onError on failure.
   *
   * @param text      Plain text only; no SSML.
   * @param options   Callers should always pass { lang: 'de-DE' }.
   * @param callbacks onEnd/onError signals for the adapter fallback chain.
   */
  speak(text: string, options?: TTSOptions, callbacks?: TTSSpeakCallbacks): void;

  /** Cancel any ongoing speech immediately. */
  stop(): void;
}

export interface TTSHook {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  currentText: string;
  /** Name of the provider currently handling (or last handled) a request. */
  providerName: string;
}

export type ProviderName = 'Fish' | 'Piper' | 'WebSpeech' | 'Null';

export const PROVIDER_FALLBACK_ORDER: ProviderName[] = ['Fish', 'Piper', 'WebSpeech', 'Null'];
