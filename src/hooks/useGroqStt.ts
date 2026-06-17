import { useState, useRef, useCallback, useEffect } from 'react';
import { useTopicStore } from '../store/useTopicStore';

interface UseGroqSttOptions {
  timeslice?: number;
}

interface UseGroqSttReturn {
  transcript: string;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetTranscript: () => void;
  setTranscript: (t: string) => void;
}

export function useGroqStt(options: UseGroqSttOptions = {}): UseGroqSttReturn {
  const { timeslice = 0 } = options;

  const [transcript, setTranscriptState] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const transcriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync ref whenever state changes (avoids stale closures)
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const setTranscript = useCallback((t: string) => {
    transcriptRef.current = t;
    setTranscriptState(t);
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscriptState('');
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      // Collect all chunks for single-blob mode; send sequentially for timeslice mode
      const allChunks: Blob[] = [];
      let processingChain = Promise.resolve();

      recorder.ondataavailable = (e) => {
        if (e.data.size === 0) return;

        if (timeslice > 0) {
          allChunks.push(e.data); // accumulate for final full-recording pass
          const chunk = e.data;
          processingChain = processingChain.then(async () => {
            setIsProcessing(true);
            try {
              const formData = new FormData();
              formData.append('file', chunk, 'chunk.webm');
              const groqKey1 = useTopicStore.getState().apiKeys.groq;
              const headers1: Record<string, string> = {};
              if (groqKey1) headers1['x-api-key'] = groqKey1;
              const res = await fetch('/api/transcribe', { method: 'POST', headers: headers1, body: formData });
              const data = await res.json();
              if (res.ok && data.text) {
                setTranscriptState((prev) => {
                  const next = prev ? prev + ' ' + data.text.trim() : data.text.trim();
                  transcriptRef.current = next;
                  return next;
                });
              } else {
                console.log('Groq chunk error', res.status, data.error);
              }
            } catch (err) {
              console.log('Groq chunk error', err);
            } finally {
              setIsProcessing(false);
            }
          });
        } else {
          allChunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (timeslice > 0) {
          // Wait for all live chunks to finish, then send the full recording
          // for a final accurate transcription (avoids split-word errors)
          await processingChain;
          setIsProcessing(true);
          try {
            const blob = new Blob(allChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');
            const groqKey2 = useTopicStore.getState().apiKeys.groq;
            const headers2: Record<string, string> = {};
            if (groqKey2) headers2['x-api-key'] = groqKey2;
            const res = await fetch('/api/transcribe', { method: 'POST', headers: headers2, body: formData });
            const data = await res.json();
            if (res.ok && data.text) {
              const final = data.text.trim();
              transcriptRef.current = final;
              setTranscriptState(final);
            } else {
              console.log('Groq final pass error', res.status, data.error);
            }
          } catch (err) {
            console.log('Groq final pass error', err);
          } finally {
            setIsProcessing(false);
          }
        } else {
          // Send entire recording as one blob
          setIsProcessing(true);
          try {
            const blob = new Blob(allChunks, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('file', blob, 'recording.webm');
            const groqKey3 = useTopicStore.getState().apiKeys.groq;
            const headers3: Record<string, string> = {};
            if (groqKey3) headers3['x-api-key'] = groqKey3;
            const res = await fetch('/api/transcribe', { method: 'POST', headers: headers3, body: formData });
            const data = await res.json();
            if (res.ok && data.text) {
              setTranscriptState((prev) => {
                const next = prev ? prev + ' ' + data.text.trim() : data.text.trim();
                transcriptRef.current = next;
                return next;
              });
            } else {
              console.log('Groq error', res.status, data.error);
            }
          } catch (err) {
            console.log('Groq error', err);
          } finally {
            setIsProcessing(false);
          }
        }
      };

      setIsRecording(true);
      if (timeslice > 0) {
        recorder.start(timeslice);
      } else {
        recorder.start();
      }
    } catch {
      // Mic denied or unavailable — caller checks isRecording
    }
  }, [timeslice]);

  return {
    transcript,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    resetTranscript,
    setTranscript,
  };
}
