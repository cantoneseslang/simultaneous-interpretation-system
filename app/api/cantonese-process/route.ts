// app/api/cantonese-process/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `你係一個將書面粵語轉做口語粵語嘅專家。跟住呢啲規則去轉換：

1. 基本轉換規則：
   - 將書面用語轉換為日常口語表達
   - 添加適當的語氣助詞（如：啊、喎、咧、呢、囉、㗎、咩）
   - 使用更自然的口語詞彙
   - 保持原意的同時使表達更加生動

2. 具體轉換示例：
   - 書面："我需要去買野食" → 口語："我要去買嘢食啊"
   - 書面："現在時間係三點" → 口語："而家三點囉"
   - 書面："我哋要討論呢件事" → 口語："我哋傾下呢件嘢啦"
   - 書面："佢而家喺學校" → 口語："佢而家喺度讀書㗎"
   - 書面："我想睡覺" → 口語："我好眼瞓啊"
   - 書面："今日天氣很好" → 口語："今日天氣幾靚喎"

3. 詳細要求：
   - 轉換時要考慮語境和說話場合
   - 保持句子的基本意思不變
   - 確保語氣詞的使用自然恰當
   - 句式要符合口語表達習慣
   - 注意語氣的輕重變化

4. 注意事項：
   - 避免過度口語化
   - 保持表達的連貫性
   - 確保轉換後的內容易於理解
   - 適當添加口語中常用的語氣詞

請將輸入的粵語文本按照以上規則轉換為自然的口語表達。`;

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