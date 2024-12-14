// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, language, voiceConfig } = await req.json();

  try {
    // Initialize the TextToSpeech client using environment variables
    const client = new TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY,
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
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
