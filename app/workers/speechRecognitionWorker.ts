let recognition: any = null;

self.onmessage = (event) => {
  const { action, lang } = event.data;

  if (action === 'start') {
    if (!('webkitSpeechRecognition' in self)) {
      self.postMessage({ error: 'このブラウザは音声認識をサポートしていません。' });
      return;
    }

    recognition = new (self as any).webkitSpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      self.postMessage({ type: 'result', transcript, isFinal });
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      self.postMessage({ type: 'error', error: event.error });
    };

    recognition.onend = () => {
      self.postMessage({ type: 'end' });
    };

    recognition.start();
  } else if (action === 'stop') {
    if (recognition) {
      recognition.stop();
      recognition = null;
    }
  }
};
