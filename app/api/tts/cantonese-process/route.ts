import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CANTONESE_PROMPT = `
あなたは広東語の文語体を口語体に変換する専門家です。以下のルールに従って変換してください。

1. 入力テキストを自然な口語広東語に変換：
   - フォーマルな表現を日常会話で使用される表現に変換
   - 広東語特有の助詞（啊、喎、咧、呢など）を適切に追加
   - 書き言葉的な単語を話し言葉に置き換え

2. 変換例：
   - "我需要去買野食" → "我要去買嘢食啊"
   - "現在時間係三點" → "而家三點咯"
   - "我哋要討論呢件事" → "我哋傾下呢件事啦"
   - "佢而家喺學校" → "佢依家喺學校度"

3. 注意点：
   - 原文の意味やニュアンスを維持すること
   - 過度に口語的にならないよう調整すること
   - 文脈に応じて適切な助詞を選択すること

入力された広東語テキストを、上記のルールに従って自然な口語体に変換してください。`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    // 入力検証
    if (!text || typeof text !== 'string') {
      return new NextResponse('無効な入力テキストです', { status: 400 });
    }

    // OpenAI APIを使用して変換
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: CANTONESE_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const processedText = completion.choices[0]?.message?.content;

    if (!processedText) {
      console.error('OpenAIからの応答がありません');
      return new NextResponse('処理に失敗しました', { status: 500 });
    }

    // デバッグログ
    console.log('Original text:', text);
    console.log('Processed text:', processedText);

    // 成功レスポンス
    return NextResponse.json({
      processedText,
      original: text,
      success: true
    });

  } catch (error) {
    console.error('広東語処理エラー:', error);
    return new NextResponse(
      JSON.stringify({
        error: '広東語の処理に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// 環境変数の型定義を追加
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
    }
  }
}