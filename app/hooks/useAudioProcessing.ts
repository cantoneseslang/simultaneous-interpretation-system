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

// 型宣言を追加
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

// メイン処理
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

  const addMessage = useCallback((newMessage: Message) => {
    setMessages((prev) => [...prev, newMessage].slice(-100));
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

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

        if (isFinal) {
          try {
            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text: transcript, targetLanguage }),
            });

            if (!response.ok) {
              throw new Error('Translation API request failed');
            }

            const data = await response.json();
            const translationMessage: Message = {
              type: 'translation',
              content: data.translation,
              timestamp: Date.now(),
              isFinal: true,
              status: 'api',
            };
            addMessage(translationMessage);
          } catch (error) {
            console.error('Translation error:', error);
            setError('翻訳エラーが発生しました。');
          }
        }
      }
    },
    [addMessage, targetLanguage]
  );

  const startListening = useCallback(() => {
    // 既存のインスタンスがあれば停止して破棄
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
      setError(null); // エラー状態をリセット
      
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
      // 継続的に聞き続ける場合は、自動的に再開
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