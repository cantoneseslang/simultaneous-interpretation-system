'use client'

import { useState, useEffect, useCallback, useRef } from 'react';

export type TTSGender = 'SSML_VOICE_GENDER_UNSPECIFIED' | 'MALE' | 'FEMALE' | 'NEUTRAL';

export interface Message {
  type: 'transcript' | 'translation';
  content: string;
  timestamp: number;
  isFinal: boolean;
  status?: 'api' | 'fallback';
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
}

interface TtsState {
  isPlaying: boolean;
  currentText?: string;
}

interface TtsConfig {
  enabled: boolean;
  voiceConfig: {
    gender: TTSGender;
  };
}

interface UseAudioProcessingReturn {
  isListening: boolean;
  messages: Message[];
  startListening: () => void;
  stopListening: () => void;
  clearConversation: () => void;
  error: string | null;
  performanceMetrics: PerformanceMetrics;
  currentVolume: number;
  ttsState: TtsState;
}

/**
 * STT（音声入力）→ 翻訳 → TTS 再生を担うフック
 *
 * @param inputLanguage 入力言語コード（例: 'ja-JP'）
 * @param targetLanguage 翻訳後の言語コード（例: 'en'）
 * @param ttsConfig TTS有効/無効やボイス設定
 */
export function useAudioProcessing(
  inputLanguage: string,
  targetLanguage: string,
  ttsConfig: TtsConfig
): UseAudioProcessingReturn {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
  });
  const [currentVolume, setCurrentVolume] = useState(0);
  const [ttsState, setTtsState] = useState<TtsState>({ isPlaying: false });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const getAdjustedLanguageCode = useCallback((code: string) => {
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      if (code === 'yue-HK') {
        return 'zh-HK';
      }
    }
    return code;
  }, []);

  /**
   * TTSを呼んでAudioContextで再生
   */
  const speakText = useCallback(
    async (text: string, lang: string, gender: TTSGender) => {
      if (!ttsConfig.enabled || !text || !lang) return;

      try {
        setTtsState({ isPlaying: true, currentText: text });

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language: lang,
            targetLanguage: lang, // route.tsに合わせてキー名を変更
            voiceConfig: { gender },
          }),
        });
        if (!response.ok) {
          throw new Error('TTS API request failed');
        }

        const audioData = await response.arrayBuffer();

        // AudioContextで再生
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start(0);

        source.onended = () => {
          setTtsState({ isPlaying: false });
          audioContext.close();
        };
      } catch (err) {
        console.error('Error in speakText:', err);
        setError('音声の再生に失敗しました。');
        setTtsState({ isPlaying: false });
      }
    },
    [ttsConfig.enabled]
  );

  /**
   * メッセージを追加（最大100件）
   */
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prev => [...prev, newMessage].slice(-100));
  }, []);

  /**
   * 会話履歴クリア
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * 翻訳＋TTSを呼ぶ関数
   */
  const translateAndSpeak = useCallback(
    async (text: string) => {
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage }),
        });
        if (!response.ok) {
          throw new Error('Translation API request failed');
        }

        const data = await response.json();
        const translation = data.translation ?? '';

        // 翻訳メッセージを追加
        const translationMessage: Message = {
          type: 'translation',
          content: translation,
          timestamp: Date.now(),
          isFinal: true,
          status: 'api',
        };
        addMessage(translationMessage);

        // TTS合成と再生
        if (ttsConfig.enabled) {
          await speakText(translation, targetLanguage, ttsConfig.voiceConfig.gender);
        }
      } catch (err) {
        console.error('Translation or TTS error:', err);
        setError('翻訳または音声合成でエラーが発生しました。');
      }
    },
    [addMessage, speakText, targetLanguage, ttsConfig.enabled, ttsConfig.voiceConfig.gender]
  );

  /**
   * SpeechRecognitionからの音声認識結果を処理
   */
  const processTranscript = useCallback(
    async (transcript: string, isFinal: boolean) => {
      if (transcript.trim()) {
        // STT結果を追加
        const newMessage: Message = {
          type: 'transcript',
          content: transcript,
          timestamp: Date.now(),
          isFinal,
        };
        addMessage(newMessage);

        // フレーズ確定時に翻訳+TTS
        if (isFinal && transcript.length > 0) {
          await translateAndSpeak(transcript);
        }
      }
    },
    [addMessage, translateAndSpeak]
  );

  /**
   * 音声認識開始
   */
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

      // マイク音量解析の初期化
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

        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(stream => {
            if (audioContextRef.current) {
              const source = audioContextRef.current.createMediaStreamSource(stream);
              if (analyserRef.current) {
                source.connect(analyserRef.current);

                // 音量計測ループ
                const updateVolume = () => {
                  if (analyserRef.current && dataArrayRef.current) {
                    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                      sum += dataArrayRef.current[i] * dataArrayRef.current[i];
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
          })
          .catch(error => {
            console.error('Error getting audio stream:', error);
            setError('マイクの接続に失敗しました。');
          });
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const final = result.isFinal;
      processTranscript(transcript, final);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Recognition error:', event.error);
      setError(`音声認識エラー: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      // 自動再開
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
  }, [getAdjustedLanguageCode, inputLanguage, isListening, processTranscript]);

  /**
   * 音声認識停止
   */
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

  // コンポーネント unmount 時
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    messages,
    startListening,
    stopListening,
    clearConversation,
    error,
    performanceMetrics,
    currentVolume,
    ttsState,
  };
}
