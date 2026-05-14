export function startVoiceRecognition({
  lang,
  onResult,
  onError
}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.(new Error('Speech Recognition unsupported.'));
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = event => {
    const text = event.results?.[0]?.[0]?.transcript;
    if (text) onResult?.(text);
  };

  recognition.onerror = () => {
    onError?.(new Error('Voice recognition failed.'));
  };

  recognition.start();
  return recognition;
}

