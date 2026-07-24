/**
 * useTTSAdapter
 *
 * Selects the first available provider from the fallback chain
 * [Fish → Piper → WebSpeech → Null] and upgrades dynamically:
 * if a provider fires onError during playback, the next provider
 * in the chain picks up the same text without any visible gap.
 *
 * Only one provider is active at a time — Fish and Piper are
 * never used simultaneously for the same sentence.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import type { TTSHook, TTSProvider } from './types';
import { FishTTSProvider, PiperTTSProvider, WebSpeechTTSProvider, NullTTSProvider } from './providers';

function buildProviders(): TTSProvider[] {
  const candidates: TTSProvider[] = [
    new FishTTSProvider(),
    new PiperTTSProvider(),
    new WebSpeechTTSProvider(),
    new NullTTSProvider(),
  ];
  const available = candidates.filter(p => p.isAvailable);
  return available.length > 0 ? available : [new NullTTSProvider()];
}

export default function useTTSAdapter(): TTSHook {
  const providers = useMemo(() => buildProviders(), []);
  const [speaking, setSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const cancelledRef = useRef(false);
  const activeIndexRef = useRef(0);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    cancelledRef.current = false;
    setSpeaking(true);
    setCurrentText(text);

    function tryProvider(index: number): void {
      if (index >= providers.length) {
        setSpeaking(false);
        onEnd?.();
        return;
      }
      const provider = providers[index];
      activeIndexRef.current = index;
      setActiveIndex(index);

      provider.speak(text, { lang: 'de-DE', rate: 0.9 }, {
        onEnd: () => {
          if (!cancelledRef.current) {
            setSpeaking(false);
            onEnd?.();
          }
        },
        onError: () => {
          if (!cancelledRef.current) {
            tryProvider(index + 1);
          }
        },
      });
    }

    tryProvider(0);
  }, [providers]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    providers[activeIndexRef.current]?.stop();
    setSpeaking(false);
    setCurrentText('');
  }, [providers]);

  return {
    speak,
    stop,
    speaking,
    currentText,
    providerName: providers[activeIndex]?.name ?? 'Null',
  };
}
