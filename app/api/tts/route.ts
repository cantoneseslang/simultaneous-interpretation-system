// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, language, voiceConfig } = await req.json();

  try {
    // Load base64-encoded credentials from environment variable
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
    if (!credentialsBase64) {
      console.error('Missing GOOGLE_CREDENTIALS_BASE64 environment variable.');
      return NextResponse.json(
        { error: 'Server configuration error: Missing credentials' },
        { status: 500 }
      );
    }

    // Decode credentials
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8');
    const credentials = JSON.parse(credentialsJson);

    // Initialize the TextToSpeech client
    const client = new TextToSpeechClient({
      credentials,
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

    return new Response(response.audioContent as any, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error: any) {
    console.error('TTS Error:', error);

    // Return a more detailed error message for debugging purposes
    return NextResponse.json(
      { error: 'TTS処理に失敗しました', details: error.message },
      { status: 500 }
    );
  }
}
