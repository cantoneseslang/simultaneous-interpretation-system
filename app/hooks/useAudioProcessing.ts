'use client'

import { useState, useEffect, useCallback, useRef } from 'react';

// TTS の性別指定
export type TTSGender = 'SSML_VOICE_GENDER_UNSPECIFIED' | 'MALE' | 'FEMALE' | 'NEUTRAL';

// メッセージ形式
export interface Message {
  type: 'transcript' | 'translation';
  content: string;
  timestamp: number;
  isFinal: boolean;
  status?: 'api' | 'fallback';
}

// パフォーマンス測定用インターフェース（オプション）
export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
}

// TTSの再生状態管理
interface TtsState {
  isPlaying: boolean;
  currentText?: string;
}

// TTS設定（有効フラグ＋音声の性別）
interface TtsConfig {
  enabled: boolean;
  voiceConfig: {
    gender: TTSGender;
  };
}

// フックの戻り値
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
 * Cloud Translate / TTS が対応可能な言語コードに変換するヘルパー関数
 * - STT 用の 'ja-JP', 'en-US', 'yue-HK' などを適宜 'ja', 'en', 'zh-HK' にマッピング
 */
function mapToTranslateCode(code: string): string {
  switch (code) {
    case 'ja-JP':
      return 'ja';
    case 'en-US':
      return 'en';
    case 'yue-HK':
      return 'zh-HK';
    // 必要に応じて追加マッピング
    default:
      return code; // 既に 'en', 'ja', 'zh', etc. 対応コードであればそのまま返す
  }
}

/**
 * STT（音声入力）→ 翻訳 → TTS 再生を担うカスタムフック
 *
 * @param inputLanguage  ブラウザ SpeechRecognition 用の言語コード（例: 'ja-JP', 'en-US'）
 * @param targetLanguage 翻訳先の言語コード（例: 'ja', 'en', 'zh-HK' 等）
 * @param ttsConfig      TTSの有効/無効や音声の性別などの設定
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

  // SpeechRecognitionなどの参照
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  /**
   * ブラウザがモバイルの場合 'yue-HK' を 'zh-HK' に変換して SpeechRecognition へ渡す。
   * （iOS/Androidでの広東語認識サポートの対策）
   */
  const getAdjustedLanguageCode = useCallback((code: string) => {
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      if (code === 'yue-HK') {
        return 'zh-HK';
      }
    }
    return code;
  }, []);

  /**
   * TTS API (/api/tts) を呼び出して音声を arrayBuffer() で受け取り、
   * AudioContext で再生する関数
   */
  const speakText = useCallback(
    async (text: string, lang: string, gender: TTSGender) => {
      if (!ttsConfig.enabled || !text) return;

      try {
        setTtsState({ isPlaying: true, currentText: text });

        // Cloud Translate / TTS 用に言語コードを変換
        const translateCode = mapToTranslateCode(lang);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLanguage: translateCode,  // route.ts 側で { text, targetLanguage } を期待
            voiceConfig: { gender },
          }),
        });

        if (!response.ok) {
          throw new Error('TTS API request failed');
        }

        // MP3 or WAVなどのバイナリを受け取る
        const audioData = await response.arrayBuffer();

        // AudioContext で再生
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
   * メッセージを追加（最大100件まで）
   */
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prev => [...prev, newMessage].slice(-100));
  }, []);

  /**
   * 会話履歴をクリア
   */
  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * 翻訳 + TTSを呼び出す関数
   * /api/translate へ text と targetLanguage を送って翻訳し、翻訳結果を /api/tts で発話
   */
  const translateAndSpeak = useCallback(
    async (text: string) => {
      try {
        // Cloud Translate 用に targetLanguage を変換
        const translateCode = mapToTranslateCode(targetLanguage);

        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLanguage: translateCode }),
        });
        if (!response.ok) {
          throw new Error('Translation API request failed');
        }

        const data = await response.json();
        const translation = data.translation ?? '';

        // 翻訳メッセージを messages に追加
        const translationMessage: Message = {
          type: 'translation',
          content: translation,
          timestamp: Date.now(),
          isFinal: true,
          status: 'api',
        };
        addMessage(translationMessage);

        // TTS合成と再生 ( speakText 呼び出し )
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
   * STT結果（transcript）を受け取り、確定したフレーズごとに translateAndSpeak() を呼ぶ
   */
  const processTranscript = useCallback(
    async (transcript: string, isFinal: boolean) => {
      if (transcript.trim()) {
        // STTの文字起こしを messages に追加
        const newMessage: Message = {
          type: 'transcript',
          content: transcript,
          timestamp: Date.now(),
          isFinal,
        };
        addMessage(newMessage);

        // フレーズが確定したら翻訳→TTSへ
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
    // すでに認識中なら停止
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

                // 音量計測をループする関数
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
      processTranscript(result[0].transcript, result.isFinal);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Recognition error:', event.error);
      setError(`音声認識エラー: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      // 自動再開ロジック
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

  // unmount 時にリスニング停止
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
