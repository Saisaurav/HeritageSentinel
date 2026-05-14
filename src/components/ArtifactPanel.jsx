import { useState } from 'react';
import { t } from '../utils/translations';
import { speak, stopSpeaking } from '../utils/speak';

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
);

const MicrophoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <path d="M12 17v4" />
    <path d="M8 21h8" />
  </svg>
);

export default function ArtifactPanel({ artifact, onClose, language }) {
  const lang = language || localStorage.getItem('language') || 'en-US';
  const strings = t[lang] || t['en-US'];

  const [aiText, setAiText] = useState(strings.pressExplain);
  const [typedQuestion, setTypedQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [hasExplained, setHasExplained] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!artifact) return null;

  async function explainArtifact() {
    setLoading(true);
    setAiText(strings.analyzingMsg);

    try {
      const response = await fetch('/api/explain-artifact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifact, language: lang })
      });

      const data = await response.json();
      setAiText(data.text);
      setHasExplained(true);
      setIsExpanded(true);
      speak(data.text, lang);
    } catch (err) {
      console.error(err);
      setAiText(strings.explainError);
    }

    setLoading(false);
  }

  async function askMuse(question) {
    if (!question.trim()) return;
    if (!hasExplained) {
      setAiText(strings.chatDisabled);
      return;
    }

    try {
      setChatLoading(true);
      setAiText(strings.thinking);

      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, language: lang })
      });

      const data = await response.json();
      setAiText(data.text || strings.unavailable);
      speak(data.text, lang);
    } catch (err) {
      console.error(err);
      setAiText(strings.unavailable);
    }

    setChatLoading(false);
  }

  async function handleTypedAsk() {
    if (!typedQuestion.trim()) return;
    const q = typedQuestion;
    setTypedQuestion('');
    await askMuse(q);
  }

  async function startListening() {
    if (!hasExplained) {
      setAiText(strings.chatDisabled);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition unsupported.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setAiText(strings.listening);
    recognition.start();

    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setAiText(`${strings.youAsked}: "${text}"`);
      await askMuse(text);
    };
    recognition.onerror = () => setAiText(strings.voiceError);
  }

  function listenToArtifact() {
    speak(`${artifact.name}. ${artifact.description}. ${aiText}`, lang);
  }

  return (
    <div className="artifact-panel">
      <div className="panel-overlay" onClick={onClose} />

      <div className="panel-inner">
        <button className="close-panel-btn" onClick={onClose}>
          <CloseIcon />
        </button>

        <div className="artifact-hero">
          <img className="panel-image" src={artifact.image} alt={artifact.name} />
          <div className="image-overlay">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="panel-category">{artifact.category}</div>
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '.95rem', opacity: .9 }}>{strings.museumExhibit}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', fontFamily: 'Cinzel, serif' }}>
                  {artifact.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel-content">
          <div className="title-row">
            <div>
              <h2>{artifact.name}</h2>
              <p className="panel-era">{artifact.era}</p>
            </div>
          </div>

          <div className="museum-divider" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'rgba(255,255,255,.35)', padding: '18px', borderRadius: '22px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '8px' }}>
                {strings.categoryLabel}
              </div>
              <strong>{artifact.category}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,.35)', padding: '18px', borderRadius: '22px' }}>
              <div style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: '8px' }}>
                {strings.eraLabel}
              </div>
              <strong>{artifact.era}</strong>
            </div>
          </div>

          <div className="info-section">
            <h3>{strings.historicalContext}</h3>
            <p className="panel-description">{artifact.description}</p>
          </div>

          <div className={`ai-box${isExpanded ? '' : ' collapsed'}`}>
            <div className="ai-header">
              <div>
                <h3>{strings.museInsight}</h3>
                <p>{strings.aiExplanation}</p>
              </div>
              <button
                className="ai-toggle"
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                {isExpanded ? strings.collapseInsight : strings.expandInsight}
              </button>
            </div>
            <p className="ai-text" style={{ lineHeight: '1.9', color: '#4b3d2e' }}>
              {isExpanded ? aiText : ''}
            </p>

            {isExpanded && (
              <>
                <div className="question-input chat-input" style={{ marginTop: '24px' }}>
                  <input
                    type="text"
                    placeholder={strings.askQuestion}
                    value={typedQuestion}
                    onChange={(e) => setTypedQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTypedAsk()}
                    disabled={!hasExplained}
                    style={{ opacity: hasExplained ? 1 : .65 }}
                  />
                  <button
                    className="gold-btn"
                    onClick={handleTypedAsk}
                    disabled={!hasExplained || !typedQuestion.trim() || chatLoading}
                  >
                    {strings.askBtn}
                  </button>
                  <button
                    className="glass-btn"
                    onClick={startListening}
                    disabled={!hasExplained}
                    style={{ opacity: hasExplained ? 1 : .65 }}
                  >
                    <MicrophoneIcon />
                  </button>
                </div>


              </>
            )}
          </div>

          <div className="panel-buttons">
            <button className="gold-btn" onClick={explainArtifact}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">auto_awesome</span>
              {strings.explainBtn}
            </button>

            <button className="glass-btn" onClick={listenToArtifact}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">volume_up</span>
              {strings.listenBtn}
            </button>

            <button className="glass-btn" onClick={stopSpeaking}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-rounded">stop_circle</span>
              {strings.stopBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
