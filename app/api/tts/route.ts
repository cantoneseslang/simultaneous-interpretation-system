// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, language, voiceConfig } = await req.json();
    
    // リクエストの内容をログ
    console.log('TTS Request:', {
      text,
      language,
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

    // クライアントの初期化をログ
    console.log('Initializing TTS client with:', {
      clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
      projectId: process.env.GOOGLE_PROJECT_ID,
      hasPrivateKey: !!privateKey,
    });

    const client = new TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });

    // 音声合成リクエストのパラメータをログ
    console.log('Synthesize speech parameters:', {
      text,
      languageCode: language,
      ssmlGender: voiceConfig.gender,
    });

    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: language,
        ssmlGender: voiceConfig.gender,
      },
      audioConfig: {
        audioEncoding: 'MP3',
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

    return new Response(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
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

    // クライアントへのエラーレスポンス
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