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

// パフォーマンス測定用（不要なら削除可）
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
 * Cloud Translate / TTS が認識できるISO言語コードにマッピングする関数
 * page.tsx や STT が使用する地域コード（例: 'ja-JP', 'en-US', 'ko-KR', etc.）をまとめて対応
 */
function mapToTranslateCode(code: string): string {
  switch (code) {
    // === 日本語 ===
    case 'ja-JP':
    case 'ja':
      return 'ja';

    // === 英語 ===
    case 'en-US':
    case 'en':
      return 'en';

    // === 中国語（簡体字）===
    case 'zh':
    case 'zh-CN':
      return 'zh'; // Cloud Translateで簡体字として扱う

    // === 広東語（繁体字）===
    case 'yue-HK':  // STT用
    case 'zh-HK':   // UIで選択
      return 'zh-HK';

    // === 台湾中国語（繁体字）===
    case 'zh-TW':
      return 'zh-TW';

    // === 韓国語 ===
    case 'ko':
    case 'ko-KR':
      return 'ko';

    // === モンゴル語 ===
    // Cloud Translate的には 'mn' が一般的。 'mo' は非標準
    case 'mo':
      return 'mn';

    // === ベトナム語 ===
    case 'vi':
    case 'vi-VN':
      return 'vi';

    // === タイ語 ===
    case 'th':
    case 'th-TH':
      return 'th';

    // === マレー語 ===
    case 'ms':
    case 'ms-MY':
      return 'ms';

    // === インドネシア語 ===
    case 'id':
    case 'id-ID':
      return 'id';

    // === フィリピン語（タガログ）===
    case 'fil':
    case 'tl':
      return 'fil'; // Cloud Translateは 'tl' or 'fil' 両方扱えるが 'fil'推奨

    // === ミャンマー語 ===
    case 'my':  // 'my-MM' が STTで使われるかもしれない
      return 'my';

    // === クメール語（カンボジア）===
    case 'km':
    case 'km-KH':
      return 'km';

    // === ラオ語 ===
    case 'lo':
    case 'lo-LA':
      return 'lo';

    // === ヒンディー語 ===
    case 'hi':
    case 'hi-IN':
      return 'hi';

    // === ベンガル語 ===
    case 'bn':
    case 'bn-BD':
      return 'bn';

    // === ウルドゥー語 ===
    case 'ur':
    case 'ur-PK':
      return 'ur';

    // === タミル語 ===
    case 'ta':
    case 'ta-IN':
      return 'ta';

    // === テルグ語 ===
    case 'te':
      return 'te';

    // === マラーティー語 ===
    case 'mr':
      return 'mr';

    // === グジャラーティー語 ===
    case 'gu':
      return 'gu';

    // === カンナダ語 ===
    case 'kn':
      return 'kn';

    // === マラヤーラム語 ===
    case 'ml':
      return 'ml';

    // === パンジャーブ語 ===
    case 'pa':
      return 'pa';

    // === オリヤー語 ===
    case 'or':
      return 'or';

    // === シンハラ語 ===
    case 'si':
      return 'si';

    // === フランス語 ===
    case 'fr':
    case 'fr-FR':
      return 'fr';

    // === ドイツ語 ===
    case 'de':
    case 'de-DE':
      return 'de';

    // === スペイン語 ===
    case 'es':
    case 'es-ES':
      return 'es';

    // === イタリア語 ===
    case 'it':
    case 'it-IT':
      return 'it';

    // === ポルトガル語 ===
    // 'pt-PT' や 'pt-BR' はまとめて 'pt' にする
    case 'pt':
    case 'pt-PT':
    case 'pt-BR':
      return 'pt';

    // === オランダ語 ===
    case 'nl':
      return 'nl';

    // === スウェーデン語 ===
    case 'sv':
      return 'sv';

    // === デンマーク語 ===
    case 'da':
      return 'da';

    // === ノルウェー語 ===
    case 'no':
      return 'no';

    // === フィンランド語 ===
    case 'fi':
      return 'fi';

    // === アイスランド語 ===
    case 'is':
      return 'is';

    // === ロシア語 ===
    case 'ru':
      return 'ru';

    // === ポーランド語 ===
    case 'pl':
      return 'pl';

    // === ウクライナ語 ===
    case 'uk':
      return 'uk';

    // === チェコ語 ===
    case 'cs':
      return 'cs';

    // === ハンガリー語 ===
    case 'hu':
      return 'hu';

    // === ルーマニア語 ===
    case 'ro':
      return 'ro';

    // === ブルガリア語 ===
    case 'bg':
      return 'bg';

    // === スロバキア語 ===
    case 'sk':
      return 'sk';

    // === クロアチア語 ===
    case 'hr':
      return 'hr';

    // === セルビア語 ===
    case 'sr':
      return 'sr';

    // === スロベニア語 ===
    case 'sl':
      return 'sl';

    // === リトアニア語 ===
    case 'lt':
      return 'lt';

    // === ラトビア語 ===
    case 'lv':
      return 'lv';

    // === エストニア語 ===
    case 'et':
      return 'et';

    // === ギリシャ語 ===
    case 'el':
      return 'el';

    // === トルコ語 ===
    case 'tr':
      return 'tr';

    // === グルジア語 ===
    case 'ka':
      return 'ka';

    // === アラビア語 ===
    case 'ar':
      return 'ar';

    // === ヘブライ語 ===
    case 'he':
      return 'he';

    // === ペルシャ語 ===
    case 'fa':
      return 'fa';

    // === クルド語 ===
    case 'ku':
      return 'ku';

    // === アムハラ語 ===
    case 'am':
      return 'am';

    // === イディッシュ語 ===
    case 'yi':
      return 'yi';

    // === スワヒリ語 ===
    case 'sw':
      return 'sw';

    // === ズールー語 ===
    case 'zu':
      return 'zu';

    // === コーサ語 ===
    case 'xh':
      return 'xh';

    // === チェワ語 ===
    case 'ny':
      return 'ny';

    // === ハウサ語 ===
    case 'ha':
      return 'ha';

    // === イボ語 ===
    case 'ig':
      return 'ig';

    // === ヨルバ語 ===
    case 'yo':
      return 'yo';

    // === エスペラント語 ===
    case 'eo':
      return 'eo';

    default:
      // その他、未マッピングのコードはそのまま返す
      return code;
  }
}


/**
 * STT（音声入力）→ 翻訳 → TTS 再生を担うカスタムフック
 *
 * @param inputLanguage  STT 用の言語コード（例: 'ja-JP', 'en-US'）
 * @param targetLanguage 翻訳先の言語コード（例: 'ja', 'en', 'zh-HK' 等）
 * @param ttsConfig      TTSの有効/無効 & ボイス性別設定
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
   * モバイルで 'yue-HK' を 'zh-HK' に変換（SpeechRecognition対策）
   */
  const getAdjustedLanguageCode = useCallback((code: string) => {
    if (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      if (code === 'yue-HK') {
        return 'zh-HK';
      }
    }
    return code;
  }, []);

  // ===================
  // TTS再生ロジック
  // ===================
  const speakText = useCallback(
    async (text: string, lang: string, gender: TTSGender) => {
      if (!ttsConfig.enabled || !text) return;

      try {
        setTtsState({ isPlaying: true, currentText: text });

        // TTS用に言語をマッピング
        const translateCode = mapToTranslateCode(lang);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            targetLanguage: translateCode, 
            voiceConfig: { gender },
          }),
        });

        if (!response.ok) {
          throw new Error('TTS API request failed');
        }

        const audioData = await response.arrayBuffer();

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

  // ===================
  // メッセージ管理
  // ===================
  const addMessage = useCallback((newMessage: Message) => {
    setMessages(prev => [...prev, newMessage].slice(-100));
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
  }, []);

  // ===================
  // 翻訳 + TTS
  // ===================
  const translateAndSpeak = useCallback(
    async (text: string) => {
      try {
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

        const translationMessage: Message = {
          type: 'translation',
          content: translation,
          timestamp: Date.now(),
          isFinal: true,
          status: 'api',
        };
        addMessage(translationMessage);

        // TTS合成 & 再生
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

  // ===================
  // STT（SpeechRecognition）結果処理
  // ===================
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

        if (isFinal && transcript.length > 0) {
          await translateAndSpeak(transcript);
        }
      }
    },
    [addMessage, translateAndSpeak]
  );

  // ===================
  // 音声認識開始
  // ===================
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

      // マイク音量計測の初期化
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
      // 音声認識の自動再開
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

  // ===================
  // 音声認識停止
  // ===================
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

  // コンポーネント unmount 時にリスニング停止
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
