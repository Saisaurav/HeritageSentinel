function getVoices() {
  return new Promise(resolve => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', () => {
      resolve(speechSynthesis.getVoices());
    }, { once: true });
  });
}

function pickUKFemaleVoice(voices) {
  const preferredNames = [
    'Google UK English Female',
    'Microsoft Hazel',
    'Microsoft Libby',
    'Serena',
  ];

  for (const name of preferredNames) {
    const match = voices.find(v => v.name.includes(name));
    if (match) return match;
  }

  const gbVoice = voices.find(v => v.lang === 'en-GB');
  if (gbVoice) return gbVoice;

  const auVoice = voices.find(v => v.lang === 'en-AU');
  if (auVoice) return auVoice;

  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

export async function speak(text, lang = 'en-GB') {
  if (!text) return;

  speechSynthesis.cancel();

  // Wait for cancel to flush, then wait for voices
  await new Promise(r => setTimeout(r, 100));
  const voices = await getVoices();

  const isEnglish = lang.startsWith('en');

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (isEnglish) {
    const voice = pickUKFemaleVoice(voices);
    utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-GB';
  } else {
    const voice =
      voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(lang.split('-')[0])) ||
      voices[0];
    utterance.voice = voice;
    utterance.lang = lang;
  }

  // Another small delay so Chrome applies the voice before speaking
  await new Promise(r => setTimeout(r, 50));
  speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  speechSynthesis.cancel();
}