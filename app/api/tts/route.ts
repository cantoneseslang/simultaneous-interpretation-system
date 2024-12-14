// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, language, voiceConfig } = await req.json();

  try {
    // Load credentials from environment variable
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsJson) {
      console.error('Missing GOOGLE_CREDENTIALS environment variable.');
      return NextResponse.json({ error: 'Server configuration error: Missing credentials' }, { status: 500 });
    }

    // Parse credentials and fix escaped newlines in private key
    const credentials = JSON.parse(credentialsJson);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    } else {
      console.error('Invalid credentials: Missing private_key.');
      return NextResponse.json({ error: 'Server configuration error: Invalid credentials' }, { status: 500 });
    }

    // Initialize the TextToSpeech client
    const client = new TextToSpeechClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
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
