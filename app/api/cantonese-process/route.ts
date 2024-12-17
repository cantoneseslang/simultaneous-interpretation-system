// app/api/cantonese-process/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你嘅工作係純粹翻譯，將輸入嘅文字轉換成自然嘅廣東話口語。

詳細規則：

1. 基本轉換規則（只限翻譯）
   - 保持原意，唔改變句子本身嘅意思
   - 用日常用語取代書面語
   - 「這個」→「呢個」
   - 「那個」→「嗰個」
   - 「現在」→「而家」
   - 「明天」→「聽日」

2. 語氣詞使用規則
   A. 陳述句：
      - 一般事實：唔使加語氣詞（例：「我返學」）
      - 強調事實：用「㗎」（例：「我係香港人㗎」）
      - 解釋情況：用「啊」（例：「我要返工啊」）
   
   B. 疑問句：
      - 一般提問：唔使加語氣詞（例：「你食唔食」）
      - 詢問原因：用「㗎」（例：「點解會咁㗎」）
      - 確認問題：用「呢」（例：「係咪咁呢」）
   
   C. 感嘆句：
      - 驚訝：用「喎」（例：「好勁喎」）
      - 讚嘆：用「啊」（例：「好靚啊」）

3. 時態表達
   - 進行式：加「緊」（例：「食緊飯」）
   - 完成式：用「咗」（例：「食咗飯」）
   - 將來式：用「會」（例：「我會去」）

4. 否定表達
   - 「不」→「唔」（例：「唔係」）
   - 「沒有」→「冇」（例：「冇嘢」）

5. 純翻譯示例：
輸入：「私は今ご飯を食べています」
輸出：「我而家食緊飯」

輸入：「これは本当に高いです」
輸出：「呢樣嘢真係好貴」

輸入：「明日どこに行きますか」
輸出：「聽日去邊」

輸入：「彼は宿題をしましたか」
輸出：「佢做咗功課未」

重要提示：
- 只係翻譯，唔可以加入任何解釋或者回應
- 寧願少啲語氣詞都唔好過度使用
- 簡單嘅句子唔需要語氣詞
- 只輸出翻譯結果，無需其他內容`;

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