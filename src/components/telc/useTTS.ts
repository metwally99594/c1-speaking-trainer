import { useState, useCallback, useEffect } from 'react';

interface TTSHook {
  speak: (text: string, onEnd?: () => void) => void;
  stop: () => void;
  speaking: boolean;
  currentText: string;
}

export default function useTTS(): TTSHook {
  const [speaking, setSpeaking] = useState(false);
  const [currentText, setCurrentText] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const load = () => {
      window.speechSynthesis.getVoices();
    };
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', load, { once: true });
    }
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      setCurrentText(text);
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    setCurrentText(text);
    setSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const germanVoice = voices.find(v => v.lang.startsWith('de'));
    if (germanVoice) utterance.voice = germanVoice;

    utterance.onend = () => {
      setSpeaking(false);
      setCurrentText('');
      onEnd?.();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setCurrentText('');
  }, []);

  return { speak, stop, speaking, currentText };
}
