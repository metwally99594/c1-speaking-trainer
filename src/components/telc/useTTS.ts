import { useState, useCallback, useRef } from 'react';

interface TTSHook {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  currentText: string;
}

function getGermanVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices.find(v => v.lang.startsWith('de')) ?? voices[0] ?? null);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      const v = window.speechSynthesis.getVoices();
      resolve(v.find(x => x.lang.startsWith('de')) ?? v[0] ?? null);
    };
    setTimeout(() => resolve(null), 3000);
  });
}

export default function useTTS(): TTSHook {
  const [speaking, setSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const cancelledRef = useRef(false);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      setCurrentText(text);
      onEnd?.();
      return;
    }

    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setCurrentText(text);
    setSpeaking(true);

    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    let i = 0;

    const speakNext = () => {
      if (cancelledRef.current) return;
      if (i >= sentences.length) {
        setSpeaking(false);
        onEnd?.();
        return;
      }

      const chunk = sentences[i++].trim();
      if (!chunk) { speakNext(); return; }

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = 'de-DE';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      getGermanVoice().then(voice => {
        if (voice) utterance.voice = voice;
      });

      utterance.onend = speakNext;
      utterance.onerror = () => {
        console.warn('[TTS] chunk error, skipping:', chunk.slice(0, 30));
        speakNext();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCurrentText('');
  }, []);

  return { speak, stop, speaking, currentText };
}
