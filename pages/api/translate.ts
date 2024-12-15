// pages/api/translate.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Translate } from '@google-cloud/translate/build/src/v2';

// 認証情報を構成
const credentials = {
  type: 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
};

// Google Translate クライアントの初期化
const translateClient = new Translate({
  projectId: credentials.project_id,
  credentials: credentials,
});

// API ハンドラー
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { text, targetLanguage } = req.body;

    // 入力値の検証
    if (!text || !targetLanguage) {
      res.status(400).json({ error: 'Missing required fields: text or targetLanguage' });
      return;
    }

    try {
      // 翻訳リクエストを送信
      const [translation] = await translateClient.translate(text, targetLanguage);

      // 成功レスポンスを送信
      res.status(200).json({ translation });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Translation error:', errorMessage);

      // エラーレスポンスを送信
      res.status(500).json({ error: 'Translation failed', details: errorMessage });
    }
  } else {
    // 許可されていないHTTPメソッドの場合
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
