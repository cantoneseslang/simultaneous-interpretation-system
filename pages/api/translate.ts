// pages/api/translate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Translate } from '@google-cloud/translate/build/src/v2';
import fs from 'fs';

// 認証情報を適切に処理
let credentials: any = {};
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{')) {
    // 環境変数がJSON文字列の場合
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  } else {
    // 環境変数がファイルパスの場合
    try {
      const credentialsJson = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8');
      credentials = JSON.parse(credentialsJson);
    } catch (err) {
      console.error('Failed to read credentials file:', err);
      credentials = {};
    }
  }

  if (credentials.private_key) {
    // 改行文字を適切に処理
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
}

const translateClient = new Translate({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: credentials
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, targetLanguage } = req.body;
    
    try {
      const [translation] = await translateClient.translate(text, targetLanguage);
      res.status(200).json({ translation });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Translation error:', errorMessage);
      res.status(500).json({ error: 'Translation failed', details: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
