// app/api/tts/route.ts
import { NextResponse } from 'next/server';
import { TranslationServiceClient } from '@google-cloud/translate';

// サポートされている言語コードのマッピング
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
    const { text, targetLanguage } = await req.json();

    console.log('Translation Request:', {
      text,
      targetLanguage
    });

    if (!text || !targetLanguage) {
      console.error('Missing parameters:', { text, targetLanguage });
      return NextResponse.json(
        { error: 'テキストまたは対象言語が指定されていません' },
        { status: 400 }
      );
    }

    // 環境変数の検証
    if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PROJECT_ID) {
      console.error('Missing environment variables:', {
        hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasProjectId: !!process.env.GOOGLE_PROJECT_ID
      });
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    // private_keyの改行文字を処理
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    console.log('Initializing translation client...', {
      projectId: process.env.GOOGLE_PROJECT_ID,
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL
    });

    // 翻訳クライアントの初期化
    const translationClient = new TranslationServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: privateKey,
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });

    // 言語コードの変換と検証
    const mappedLanguage = languageCodeMap.get(targetLanguage) || targetLanguage;

    console.log('Preparing translation request:', {
      sourceLang: 'auto',
      targetLang: mappedLanguage,
      textLength: text.length
    });

    // 翻訳リクエストの作成
    const request = {
      parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: 'auto',
      targetLanguageCode: mappedLanguage,
    };

    // 翻訳の実行
    const [response] = await translationClient.translateText(request);

    if (!response.translations || response.translations.length === 0) {
      console.error('No translation result received');
      return NextResponse.json(
        { error: '翻訳結果が取得できませんでした' },
        { status: 500 }
      );
    }

    console.log('Translation successful:', {
      sourceText: text,
      translatedTextLength: response.translations![0].translatedText!.length
    });

    return NextResponse.json({
      translation: response.translations![0].translatedText,
    });

  } catch (error: any) {
    console.error('Translation error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack,
    });

    // API制限エラーの処理
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

    // 認証エラーの処理
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

    // 一般的なエラーの処理
    return NextResponse.json(
      {
        error: '翻訳に失敗しました',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
