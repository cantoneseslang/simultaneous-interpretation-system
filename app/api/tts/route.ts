// app/api/tts/route.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { text, language, voiceConfig } = await req.json();
  
  const client = new TextToSpeechClient();
  
  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: language,
        ssmlGender: voiceConfig.gender,
      },
      audioConfig: {
        audioEncoding: 'MP3'
      },
    });

    return new Response(response.audioContent, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json({ error: 'TTS処理に失敗しました' }, { status: 500 });
  }
}
