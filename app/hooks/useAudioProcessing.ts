'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';

interface Message {
  type: 'transcript' | 'translation';
  content: string;
  timestamp: number;
  isFinal: boolean;
  status?: 'api' | 'fallback';
}

interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
}

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognitionInstance;
    new (): SpeechRecognitionInstance;
  };

  interface SpeechRecognitionInstance {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort?: () => void;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
    resultIndex: number;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
  }
}

export function useAudioProcessing(
  inputLanguage: string,
  targetLanguage: string,
  useLocalProcessing: boolean,
  updateInterval: number,
  voiceThreshold: number
) {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
  });
  const [currentVolume, setCurrentVolume] = useState(0);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const lastTranslatedTextRef = useRef<string>('');

  const getAdjustedLanguageCode = (code: string) => {
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      if (code === 'yue-HK') {
        return 'zh-HK';
      }
    }
    return code;
  };

  const addMessage = useCallback((newMessage: Message) => {
    setMessages((prev) => [...prev, newMessage].slice(-100));
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    lastTranslatedTextRef.current = '';
  }, []);

  const debouncedTranslate = useMemo(
    () =>
      debounce(async (text: string, isFinal: boolean) => {
        if (text.trim() === lastTranslatedTextRef.current.trim()) {
          return;
        }

        try {
          const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, targetLanguage }),
          });

          if (!response.ok) {
            throw new Error('Translation API request failed');
          }

          const data = await response.json();
          const translationMessage: Message = {
            type: 'translation',
            content: data.translation,
            timestamp: Date.now(),
            isFinal,
            status: 'api',
          };
          addMessage(translationMessage);
          
          lastTranslatedTextRef.current = text;
        } catch (error) {
          console.error('Translation error:', error);
          setError('翻訳エラーが発生しました。');
        }
      }, updateInterval),
    [targetLanguage, addMessage, updateInterval]
  );

  const processTranscript = useCallback(
    async (transcript: string, isFinal: boolean) => {
      if (transcript.trim()) {
        const newMessage: Message = {
          type: 'transcript',
          content: transcript,
          timestamp: Date.now(),
          isFinal,
        };
        addMessage(newMessage);

        const shouldTranslate = 
          (isFinal && transcript.length > 0) || 
          (!isFinal && (
            (transcript.includes('。') && transcript.length > lastTranslatedTextRef.current.length) ||
            (transcript.length > lastTranslatedTextRef.current.length + 20)
          ));

        if (shouldTranslate) {
          debouncedTranslate(transcript, isFinal);
        }
      }
    },
    [addMessage, debouncedTranslate]
  );

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('このブラウザは音声認識をサポートしていません。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = getAdjustedLanguageCode(inputLanguage);
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      
      if (!audioContextRef.current) {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;
        analyser.smoothingTimeConstant = 0.85;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;
        analyserRef.current = analyser;
        audioContextRef.current = audioContext;
    
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          if (audioContextRef.current) {
            const source = audioContextRef.current.createMediaStreamSource(stream);
            if (analyserRef.current) {
              source.connect(analyserRef.current);
              
              const updateVolume = () => {
                if (analyserRef.current && dataArrayRef.current) {
                  analyserRef.current.getByteFrequencyData(dataArrayRef.current);
                  
                  let sum = 0;
                  const data = dataArrayRef.current;
                  for (let i = 0; i < bufferLength; i++) {
                    sum += data[i] * data[i];
                  }
                  const rms = Math.sqrt(sum / bufferLength);
                  const normalizedVolume = Math.min(rms / 256, 1);
                  
                  setCurrentVolume(normalizedVolume);
                }
                if (isListening) {
                  requestAnimationFrame(updateVolume);
                }
              };
              updateVolume();
            }
          }
        }).catch(error => {
          console.error('Error getting audio stream:', error);
          setError('マイクの接続に失敗しました。');
        });
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      processTranscript(result[0].transcript, result.isFinal);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Recognition error:', event.error);
      setError(`音声認識エラー: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch (error) {
          console.error('Recognition restart error:', error);
          setError('音声認識の再開に失敗しました。');
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Recognition start error:', error);
      setError('音声認識の開始に失敗しました。');
    }
  }, [processTranscript, inputLanguage, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    }
    lastTranslatedTextRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      debouncedTranslate.cancel();
      stopListening();
    };
  }, [debouncedTranslate, stopListening]);

  return {
    isListening,
    messages,
    startListening,
    stopListening,
    clearConversation,
    error,
    performanceMetrics,
    currentVolume,
  };
}