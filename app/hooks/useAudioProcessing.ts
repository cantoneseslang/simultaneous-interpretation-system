'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  const translationQueue = useRef<string[]>([]);
  const lastTranslationTime = useRef<number>(0);
  const MIN_TRANSLATION_INTERVAL = 300; // ミリ秒

  const processTranslation = useCallback(async (text: string, isFinal: boolean) => {
    const currentTime = Date.now();
    
    // 短すぎるテキストは翻訳しない
    if (text.length < 3) return;

    // 最小間隔チェック
    if (currentTime - lastTranslationTime.current < MIN_TRANSLATION_INTERVAL) {
      translationQueue.current.push(text);
      return;
    }

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage }),
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();
      lastTranslationTime.current = currentTime;

      setMessages(prev => [...prev, {
        type: 'translation',
        content: data.translation,
        timestamp: currentTime,
        isFinal,
        status: 'api'
      }]);

      // キューの処理
      if (translationQueue.current.length > 0) {
        const nextText = translationQueue.current.pop();
        if (nextText) processTranslation(nextText, false);
        translationQueue.current = []; // 古いキューをクリア
      }
    } catch (error) {
      console.error('Translation error:', error);
      setError('翻訳エラーが発生しました。');
    }
  }, [targetLanguage]);

  const processTranscript = useCallback((transcript: string, isFinal: boolean) => {
    if (!transcript.trim()) return;

    // 新しい文章の認識
    setMessages(prev => [...prev, {
      type: 'transcript',
      content: transcript,
      timestamp: Date.now(),
      isFinal
    }]);

    // インテリジェントな区切り処理の最適化
    const shouldTranslate = 
      isFinal || 
      transcript.includes('。') || 
      transcript.includes('、') ||
      transcript.includes('？') ||
      transcript.includes('！') ||
      transcript.length > 15 || // 文字数制限を短く
      transcript.match(/[.!?]$/); // 英語の文末判定

    if (shouldTranslate) {
      processTranslation(transcript, isFinal);
    }
  }, [processTranslation]);

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
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      
      if (!audioContextRef.current) {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;
        analyserRef.current = analyser;
        audioContextRef.current = audioContext;

        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          const updateVolume = () => {
            if (analyserRef.current && dataArrayRef.current) {
              analyserRef.current.getByteFrequencyData(dataArrayRef.current);
              const volume = dataArrayRef.current.reduce((a, b) => a + b) / bufferLength;
              setCurrentVolume(volume);
            }
            requestAnimationFrame(updateVolume);
          };
          updateVolume();
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
  }, [processTranscript]);

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
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isListening,
    messages,
    startListening,
    stopListening,
    clearConversation,
    error,
    performanceMetrics,
    currentVolume,
    translationQueueSize: translationQueue.current.length
  };
}