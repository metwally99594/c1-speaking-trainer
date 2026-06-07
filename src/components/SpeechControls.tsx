import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTopicStore } from '../store/useTopicStore';

interface SpeechControlsProps {
  text: string;
  onComplete?: () => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function SpeechControls({ text, onComplete }: SpeechControlsProps) {
  const voiceSettings = useTopicStore((state) => state.voiceSettings);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(() => voiceSettings.rate);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  const play = useCallback(() => {
    stop();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find voice by saved URI or fall back to any German voice
    const voices = window.speechSynthesis.getVoices();
    const savedVoice = voiceSettings.voiceURI
      ? voices.find(v => v.voiceURI === voiceSettings.voiceURI)
      : null;
    const germanVoice = savedVoice || voices.find(v => v.lang.startsWith('de')) || voices[0];
    
    if (germanVoice) {
      utterance.voice = germanVoice;
    }
    
    utterance.lang = 'de-DE';
    utterance.rate = rate;
    utterance.pitch = voiceSettings.pitch;
    utterance.volume = voiceSettings.volume;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      onComplete?.();
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [text, rate, stop, onComplete, voiceSettings.voiceURI, voiceSettings.pitch, voiceSettings.volume]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  // Handle cleanup
  useEffect(() => {
    return () => stop();
  }, [stop]);

  // Load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-900 border border-gray-800 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-400">
          <Volume2 size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">German Audio</span>
        </div>
        
        <div className="flex gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setRate(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all",
                rate === s 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => play()}
          className="p-4 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
          title="Repeat"
        >
          <RotateCcw size={24} />
        </button>

        {!isPlaying || isPaused ? (
          <button
            onClick={isPaused ? togglePause : play}
            className="p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/40 transition-all transform hover:scale-105 active:scale-95"
            title={isPaused ? "Resume" : "Play"}
          >
            <Play size={32} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={togglePause}
            className="p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-900/40 transition-all transform hover:scale-105 active:scale-95"
            title="Pause"
          >
            <Pause size={32} fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
}
