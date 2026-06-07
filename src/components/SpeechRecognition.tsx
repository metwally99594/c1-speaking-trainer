import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, RefreshCw, AlertCircle, Award } from 'lucide-react';
import { cn } from './ui/ProgressBar';
import { compareSentencesV2 } from '../utils/accuracyEngine';
import type { ComparisonResultV2 } from '../utils/accuracyEngine';

interface SpeechRecognitionProps {
  originalText: string;
  onResult?: (score: number) => void;
}

export function SpeechRecognition({ originalText, onResult }: SpeechRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [, setTranscript] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [comparison, setComparison] = useState<ComparisonResultV2 | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setStatus('error');
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('listening');
      setTranscript('');
      setComparison(null);
    };

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setStatus('processing');
      
      const compResult = compareSentencesV2(originalText, result);
      setComparison(compResult);
      onResult?.(compResult.score);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setStatus('error');
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone permission denied.');
      } else if (event.error === 'no-speech') {
        setErrorMessage('No speech was detected.');
      } else {
        setErrorMessage(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setStatus(prev => prev === 'processing' ? 'completed' : prev === 'error' ? 'error' : 'idle');
    };

    recognitionRef.current = recognition;
  }, [originalText, onResult]);

  const startRecording = useCallback(() => {
    if (recognitionRef.current && status !== 'listening') {
      try {
        setErrorMessage('');
        recognitionRef.current.start();
      } catch (e) {
        console.error('Recognition start error:', e);
      }
    }
  }, [status]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const reset = () => {
    setTranscript('');
    setComparison(null);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-gray-900 border border-gray-800 rounded-2xl mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-400">
          <Mic size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">Speech Recognition</span>
        </div>
        
        <div className="flex items-center gap-2">
          {status === 'listening' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-red-500/20">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              Listening...
            </span>
          )}
          {status === 'completed' && comparison && (
            <div className="flex items-center gap-3">
               <span className={cn(
                 "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  comparison.score >= 95 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                  comparison.score >= 80 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                 "bg-red-500/10 text-red-500 border-red-500/20"
               )}>
                 Score: {comparison.score}%
               </span>
            </div>
          )}
          {(status === 'completed' || status === 'error') && (
            <button 
              onClick={reset}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
              title="Reset"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-6">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={status === 'error' && errorMessage.includes('supported')}
          className={cn(
            "p-8 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed",
            isRecording 
              ? "bg-red-600 text-white shadow-red-900/40 animate-pulse" 
              : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
          )}
        >
          {isRecording ? <MicOff size={40} /> : <Mic size={40} />}
        </button>

        {status === 'error' && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/5 border border-red-400/20 px-4 py-2 rounded-xl text-sm">
            <AlertCircle size={16} />
            {errorMessage}
          </div>
        )}
      </div>

      {comparison && (
        <div className="space-y-6 pt-6 border-t border-gray-800 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
            <div className={cn(
              "p-3 rounded-full",
              comparison.score >= 95 ? "bg-green-500/10 text-green-500" :
              comparison.score >= 80 ? "bg-yellow-500/10 text-yellow-500" :
              "bg-red-500/10 text-red-500"
            )}>
              <Award size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Feedback</p>
              <p className="text-xl font-black text-white">{comparison.feedback}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Comparison Result</span>
              <div className="flex flex-wrap gap-2 text-lg leading-relaxed">
                {comparison.words.map((word, idx) => (
                  <span 
                    key={idx}
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-all",
                      word.status === 'correct' && "text-green-400",
                      word.status === 'near-match' && "text-yellow-400 bg-yellow-400/10",
                      word.status === 'incorrect' && "text-red-400 bg-red-400/10",
                      word.status === 'missing' && "text-orange-400 bg-orange-400/10 line-through decoration-orange-500/50",
                      word.status === 'extra' && "text-blue-400 bg-blue-400/10"
                    )}
                  >
                    {word.text}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {[
                { label: 'Correct', color: 'bg-green-400' },
                { label: 'Near Match', color: 'bg-yellow-400' },
                { label: 'Incorrect', color: 'bg-red-400' },
                { label: 'Missing', color: 'bg-orange-400' },
                { label: 'Extra', color: 'bg-blue-400' },
              ].map(tag => (
                <div key={tag.label} className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", tag.color)}></span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{tag.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
