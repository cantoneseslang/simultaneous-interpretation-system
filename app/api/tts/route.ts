// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, language, voiceConfig } = await req.json();

  // Initialize the client with credentials from environment variable
  const client = new TextToSpeechClient({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}'),
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });

  try {
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
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'TTS処理に失敗しました' }, { status: 500 });
  }
}
