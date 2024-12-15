// pages/api/translate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Translate } from '@google-cloud/translate/build/src/v2';

// 認証情報を適切に処理
let credentials: any = {};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  try {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    if (credentials.private_key) {
      // 改行文字を適切に処理
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
  } catch (err) {
    console.error('Failed to parse credentials JSON:', err);
    credentials = {};
  }
} else {
  console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set');
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
