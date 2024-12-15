// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

// Google Cloud TTSでサポートされている言語コードのマッピング
const languageCodeMap = new Map([
  // 東アジア
  ['ja', 'ja-JP'],
  ['en', 'en-US'],
  ['zh', 'zh-CN'],
  ['zh-HK', 'zh-HK'],
  ['zh-TW', 'zh-TW'],
  ['ko', 'ko-KR'],

  // 東南アジア
  ['vi', 'vi-VN'],
  ['th', 'th-TH'],
  ['id', 'id-ID'],
  ['ms', 'ms-MY'],

  // 南アジア
  ['hi', 'hi-IN'],
  ['bn', 'bn-IN'],
  ['ta', 'ta-IN'],

  // ヨーロッパ言語
  ['fr', 'fr-FR'],
  ['de', 'de-DE'],
  ['es', 'es-ES'],
  ['it', 'it-IT'],
  ['pt', 'pt-PT'],
  ['ru', 'ru-RU'],
  ['pl', 'pl-PL'],
  ['nl', 'nl-NL'],
  ['cs', 'cs-CZ'],
  ['el', 'el-GR'],
  ['tr', 'tr-TR'],

  // その他
  ['ar', 'ar-XA']
]);

export async function POST(req: Request) {
  try {
    // リクエストボディの取得とバリデーション
    const { text, language, voiceConfig } = await req.json();
    
    if (!text || !language || !voiceConfig) {
      return NextResponse.json(
        { error: 'リクエストパラメータが不足しています' },
        { status: 400 }
      );
    }

    // 言語コードの変換と検証
    const languageCode = languageCodeMap.get(language) || language;
    if (!languageCodeMap.has(language)) {
      console.error('Unsupported language code:', language);
      return NextResponse.json(
        { error: 'この言語は現在音声合成に対応していません' },
        { status: 400 }
      );
    }

    // リクエストの内容をログ
    console.log('TTS Request:', {
      text,
      originalLanguage: language,
      mappedLanguage: languageCode,
      voiceConfig,
    });

    // 環境変数の存在確認
    if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PROJECT_ID) {
      console.error('Missing environment variables:', {
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      });
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    // private_keyの改行文字を処理
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // クライアントの初期化
    const client = new TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });

    // 音声合成リクエストの実行
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        ssmlGender: voiceConfig.gender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
        volumeGainDb: 0,
      },
    });

    if (!response.audioContent) {
      console.error('No audio content received');
      return NextResponse.json(
        { error: '音声データが生成されませんでした' },
        { status: 500 }
      );
    }

    console.log('Successfully generated audio content');

    // 音声データの返送
    return new Response(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': response.audioContent.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error: any) {
    // エラーの詳細をログ
    console.error('TTS Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
      metadata: error.metadata,
    });

    // 特定のエラーの処理
    if (error.code === 8) {
      return NextResponse.json(
        {
          error: 'API制限に達しました',
          message: 'Resource exhausted',
          code: error.code,
        },
        { status: 429 }
      );
    }

    if (error.code === 16) {
      return NextResponse.json(
        {
          error: '認証に失敗しました',
          message: 'Authentication failed',
          code: error.code,
        },
        { status: 401 }
      );
    }

    // 一般的なエラーレスポンス
    return NextResponse.json(
      {
        error: 'TTS処理に失敗しました',
        message: error.message,
        code: error.code,
        details: error.details,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        metadata: error.metadata,
      },
      { status: 500 }
    );
  }
}