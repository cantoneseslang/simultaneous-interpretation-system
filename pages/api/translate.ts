import { NextApiRequest, NextApiResponse } from 'next';
import { Translate } from '@google-cloud/translate/build/src/v2';

// 認証情報を適切に処理
const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
if (credentials.private_key) {
  // バックスラッシュとnの組み合わせを実際の改行に変換
  credentials.private_key = credentials.private_key
    .replace(/\\n/g, '\n')
    .replace(/\n/g, '\n');
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
