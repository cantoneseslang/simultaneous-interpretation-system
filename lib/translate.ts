export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const dummyTranslations: { [key: string]: string } = {
    'こんにちは': 'Hello',
    'さようなら': 'Goodbye',
    'ありがとう': 'Thank you',
    '今日はいい天気ですね': "It's a nice weather today",
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  return dummyTranslations[text] || 'Translation not available'
}

