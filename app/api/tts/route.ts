import { NextResponse } from 'next/server';
import { TranslationServiceClient } from '@google-cloud/translate';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export async function POST(req: Request) {
  try {
    // リクエストデータの取得
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'テキストまたは対象言語が指定されていません' },
        { status: 400 }
      );
    }

    // 環境変数の確認
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PROJECT_ID) {
      return NextResponse.json(
        { error: '環境変数が設定されていません' },
        { status: 500 }
      );
    }

    // 翻訳クライアントの初期化
    const translationClient = new TranslationServiceClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: privateKey,
      },
    });

    // 翻訳リクエスト
    const [translationResponse] = await translationClient.translateText({
      parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: 'auto',
      targetLanguageCode: targetLanguage,
    });

    // 翻訳結果の取得
    const translations = translationResponse.translations || [];
    const translatedText = translations[0]?.translatedText || '';

    // Text-to-Speech クライアントの初期化
    const ttsClient = new TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL!,
        private_key: privateKey,
      },
    });

    // Text-to-Speech リクエスト
    const ttsRequest = {
      input: { text: translatedText },
      voice: {
        languageCode: targetLanguage,
        ssmlGender: 'NEUTRAL' as const,
      },
      audioConfig: {
        audioEncoding: 'MP3' as const,
      },
    };

    const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);

    // 音声データの確認
    if (!ttsResponse.audioContent) {
      return NextResponse.json(
        { error: '音声データが生成できませんでした' },
        { status: 500 }
      );
    }

    // レスポンス
    return NextResponse.json({
      // Constructing the response object with the translated text and audio data
      translation: translatedText, // The translated text from the translation service
      audio: `data:audio/mp3;base64,${Buffer.from(ttsResponse.audioContent).toString('base64')}`, // Convert audio content to base64 string
    });
  } catch (error: any) {
    // Log the error details to the console for debugging purposes
    console.error('Error occurred:', error);
    return NextResponse.json(
      {
        error: '処理中にエラーが発生しました',
        message: error.message,
        code: error.code,
      },
      { status: 500 }
    );
  }
}
