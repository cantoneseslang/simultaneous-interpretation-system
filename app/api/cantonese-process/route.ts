// app/api/cantonese-process/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你嘅工作係將輸入嘅文字轉做廣東話口語，唔係回應對話。

例子：
輸入：「明天去學校」
輸出：「聽日去學校啊」

輸入：「現在工作」
輸出：「而家做嘢㗎」

輸入：「這個很好」
輸出：「呢個好正喎」

注意：
- 只係轉換成口語，唔好加任何對話或者回應
- 保持原本意思，只係轉換表達方式
- 加啲適當嘅語氣詞（啊、喎、咧、呢、囉、㗎）
- 用廣東話日常用字`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    // 入力検証
    if (!text || typeof text !== 'string') {
      return new NextResponse(
        JSON.stringify({
          error: '入力テキストが無効です',
          details: 'テキストが空または不正な形式です'
        }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // デバッグログ
    console.log('Converting to colloquial Cantonese, input:', text);

    // OpenAI APIを使用して変換
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0.2,
      presence_penalty: 0.1,
    });

    const processedText = completion.choices[0]?.message?.content;

    if (!processedText) {
      console.error('OpenAI API response is empty or invalid');
      return new NextResponse(
        JSON.stringify({
          error: '処理に失敗しました',
          details: 'APIレスポンスが空です'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // デバッグログ
    console.log('Conversion result:', {
      original: text,
      processed: processedText
    });

    // 成功レスポンス
    return NextResponse.json({
      processedText,
      original: text,
      success: true,
      model: "gpt-4-0125-preview"
    });

  } catch (error) {
    // エラーログ
    console.error('Cantonese processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // エラーレスポンス
    return new NextResponse(
      JSON.stringify({
        error: '広東語の処理中にエラーが発生しました',
        details: error instanceof Error ? error.message : '不明なエラー',
        timestamp: new Date().toISOString()
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

// 環境変数の型定義
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string;
    }
  }
}