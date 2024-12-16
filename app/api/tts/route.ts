// app/api/tts/route.ts
import { NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// 言語コードを TTS API 用にマッピングする関数
function mapToTtsLanguageCode(code: string): string {
  switch (code) {
    // === 日本語 ===
    case 'ja-JP':
    case 'ja':
      return 'ja-JP';

    // === 英語 ===
    case 'en-US':
    case 'en':
      return 'en-US';

    // === 中国語（簡体字）===
    case 'zh':
    case 'zh-CN':
      return 'cmn-CN';

    // === 広東語（繁体字）===
    case 'yue-HK':
    case 'zh-HK':
      return 'yue-HK';

    // === 台湾中国語（繁体字）===
    case 'zh-TW':
      return 'cmn-TW';

    // === 韓国語 ===
    case 'ko':
    case 'ko-KR':
      return 'ko-KR';

    // === モンゴル語 ===
    case 'mo':
      return 'mn-MN';

    // === ベトナム語 ===
    case 'vi':
    case 'vi-VN':
      return 'vi-VN';

    // === タイ語 ===
    case 'th':
    case 'th-TH':
      return 'th-TH';

    // === マレー語 ===
    case 'ms':
    case 'ms-MY':
      return 'ms-MY';

    // === インドネシア語 ===
    case 'id':
    case 'id-ID':
      return 'id-ID';

    // === フィリピン語（タガログ語）===
    case 'fil':
    case 'tl':
      return 'fil-PH';

    // === ミャンマー語 ===
    case 'my':
      return 'my-MM';

    // === クメール語（カンボジア）===
    case 'km':
    case 'km-KH':
      return 'km-KH';

    // === ラオ語 ===
    case 'lo':
    case 'lo-LA':
      return 'lo-LA';

    // === ヒンディー語 ===
    case 'hi':
    case 'hi-IN':
      return 'hi-IN';

    // === ベンガル語 ===
    case 'bn':
    case 'bn-BD':
      return 'bn-BD';

    // === ウルドゥー語 ===
    case 'ur':
    case 'ur-PK':
      return 'ur-PK';

    // === タミル語 ===
    case 'ta':
    case 'ta-IN':
      return 'ta-IN';

    // === テルグ語 ===
    case 'te':
      return 'te-IN';

    // === マラーティー語 ===
    case 'mr':
      return 'mr-IN';

    // === グジャラーティー語 ===
    case 'gu':
      return 'gu-IN';

    // === カンナダ語 ===
    case 'kn':
      return 'kn-IN';

    // === マラヤーラム語 ===
    case 'ml':
      return 'ml-IN';

    // === パンジャーブ語 ===
    case 'pa':
      return 'pa-IN';

    // === オリヤー語 ===
    case 'or':
      return 'or-IN';

    // === シンハラ語 ===
    case 'si':
      return 'si-LK';

    // === フランス語 ===
    case 'fr':
    case 'fr-FR':
      return 'fr-FR';

    // === ドイツ語 ===
    case 'de':
    case 'de-DE':
      return 'de-DE';

    // === スペイン語 ===
    case 'es':
    case 'es-ES':
      return 'es-ES';

    // === イタリア語 ===
    case 'it':
    case 'it-IT':
      return 'it-IT';

    // === ポルトガル語 ===
    case 'pt':
    case 'pt-PT':
    case 'pt-BR':
      return 'pt-PT';

    // === オランダ語 ===
    case 'nl':
      return 'nl-NL';

    // === スウェーデン語 ===
    case 'sv':
      return 'sv-SE';

    // === デンマーク語 ===
    case 'da':
      return 'da-DK';

    // === ノルウェー語 ===
    case 'no':
      return 'no-NO';

    // === フィンランド語 ===
    case 'fi':
      return 'fi-FI';

    // === アイスランド語 ===
    case 'is':
      return 'is-IS';

    // === ロシア語 ===
    case 'ru':
      return 'ru-RU';

    // === ポーランド語 ===
    case 'pl':
      return 'pl-PL';

    // === ウクライナ語 ===
    case 'uk':
      return 'uk-UA';

    // === チェコ語 ===
    case 'cs':
      return 'cs-CZ';

    // === ハンガリー語 ===
    case 'hu':
      return 'hu-HU';

    // === ルーマニア語 ===
    case 'ro':
      return 'ro-RO';

    // === ブルガリア語 ===
    case 'bg':
      return 'bg-BG';

    // === スロバキア語 ===
    case 'sk':
      return 'sk-SK';

    // === クロアチア語 ===
    case 'hr':
      return 'hr-HR';

    // === セルビア語 ===
    case 'sr':
      return 'sr-RS';

    // === スロベニア語 ===
    case 'sl':
      return 'sl-SI';

    // === リトアニア語 ===
    case 'lt':
      return 'lt-LT';

    // === ラトビア語 ===
    case 'lv':
      return 'lv-LV';

    // === エストニア語 ===
    case 'et':
      return 'et-EE';

    // === ギリシャ語 ===
    case 'el':
      return 'el-GR';

    // === トルコ語 ===
    case 'tr':
      return 'tr-TR';

    // === グルジア語 ===
    case 'ka':
      return 'ka-GE';

    // === アラビア語 ===
    case 'ar':
      return 'ar-XA';

    // === ヘブライ語 ===
    case 'he':
      return 'he-IL';

    // === ペルシャ語 ===
    case 'fa':
      return 'fa-IR';

    // === クルド語 ===
    case 'ku':
      return 'ku-TR';

    // === アムハラ語 ===
    case 'am':
      return 'am-ET';

    // === イディッシュ語 ===
    case 'yi':
      return 'yi'; // TTS APIではサポート外の場合があります

    // === スワヒリ語 ===
    case 'sw':
      return 'sw-KE';

    // === ズールー語 ===
    case 'zu':
      return 'zu-ZA';

    // === コーサ語 ===
    case 'xh':
      return 'xh-ZA';

    // === チェワ語 ===
    case 'ny':
      return 'ny-MW';

    // === ハウサ語 ===
    case 'ha':
      return 'ha-NG';

    // === イボ語 ===
    case 'ig':
      return 'ig-NG';

    // === ヨルバ語 ===
    case 'yo':
      return 'yo-NG';

    // === エスペラント語 ===
    case 'eo':
      return 'eo'; // TTS APIではサポート外の場合があります

    default:
      // その他、未マッピングのコードはそのまま返す
      return code;
  }
}

export async function POST(req: Request) {
  try {
    const { text, targetLanguage, voiceConfig } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: 'テキストまたは対象言語が指定されていません' },
        { status: 400 }
      );
    }

    // 環境変数から認証情報をロード
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsJson) {
      console.error('Missing GOOGLE_CREDENTIALS environment variable.');
      return NextResponse.json({ error: 'Server configuration error: Missing credentials' }, { status: 500 });
    }

    const credentials = JSON.parse(credentialsJson);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    } else {
      console.error('Invalid credentials: Missing private_key.');
      return NextResponse.json({ error: 'Server configuration error: Invalid credentials' }, { status: 500 });
    }

    // Text-to-Speech クライアントの初期化
    const client = new TextToSpeechClient({
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });

    // targetLanguage を TTS 用の言語コードにマッピング
    const ttsLanguageCode = mapToTtsLanguageCode(targetLanguage);

    // TTS リクエストの作成
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: ttsLanguageCode,
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
    return NextResponse.json(
      {
        error: 'TTS処理に失敗しました',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
