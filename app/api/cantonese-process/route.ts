// app/api/cantonese-process/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你嘅工作係將輸入嘅文字轉換成自然嘅廣東話口語表達，唔好加任何額外嘅回應或者對話。

要求：
1. **保持原本意思**，只係將輸入文字轉換成廣東話口語形式。
2. **適當加入語氣詞**（例如：啊、喎、咧、呢、囉、啦、㗎），令句子更加自然同口語化。
3. 使用廣東話**日常會話常用字**，避免書面語或者唔自然嘅表達方式。

### 例子：
輸入：「明天去學校」
輸出：「聽日去學校啊。」

輸入：「現在工作」
輸出：「而家做嘢㗎。」

輸入：「這個很好」
輸出：「呢個好正喎。」

輸入：「你要不要吃飯」
輸出：「你要唔要食飯啊？」

注意：
- **唔好改變句子嘅意思**，重點係將文字變成口語化嘅廣東話。  
- **唔需要額外回應或解釋**，淨係提供轉換後嘅句子。  
- 確保句子自然同適合日常對話使用。`;

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