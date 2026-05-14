import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import socket from '../socket';
import { t } from '../utils/translations';
import { speak } from '../utils/speak';
import { getNextLanguage, languageChangedMessage } from '../utils/language';
import { startVoiceRecognition } from '../utils/speechRecognition';
import { typeText } from '../utils/typingEffect';
import { askMuse as askMuseApi } from '../utils/api';

export default function Home({

  assistantText,
  setAssistantText,
  language,
  switchLanguage
}) {
  const navigate = useNavigate();

  const strings =
    t[language] ||
    t['en-US'];

  const [
    typedQuestion,
    setTypedQuestion
  ] = useState('');

  const [
    displayedText,
    setDisplayedText
  ] = useState('');

  const [
    isTyping,
    setIsTyping
  ] = useState(false);

  function handleLanguage(nextLang) {
    const next = nextLang
      ? { value: nextLang }
      : getNextLanguage(language);

    switchLanguage(next.value);

    const msg = languageChangedMessage(next.value);
    setAssistantText(msg);
    speak(msg, next.value);
  }


  async function startListening() {
    startVoiceRecognition({
      lang: language,
      onResult: async text => {
        setAssistantText(`${strings.youAsked}: "${text}"`);
        const data = await askMuseApi({ question: text, language });
        await typeResponse(data.text);
      },

      onError: () => setAssistantText(strings.voiceError)
    });

    setAssistantText(strings.listening);
  }


  async function typeResponse(text) {
    setIsTyping(true);
    speak(text, language);
    setDisplayedText('');

    await typeText({
      text,
      speed: 26,
      onTick: setDisplayedText,
      onDone: finalText => {
        setAssistantText(finalText);
        setIsTyping(false);
      }
    });
  }


  async function askMuse(question) {
    try {
      setAssistantText(strings.thinking);
      setDisplayedText('');

      const data = await askMuseApi({ question, language });
      await typeResponse(data.text);

    } catch (err) {
      console.error(err);
      setAssistantText(strings.unavailable);
    }
  }



  async function handleTypedAsk() {
    if (
      !typedQuestion.trim()
    )
      return;

    const q =
      typedQuestion;

    setTypedQuestion(
      ''
    );

    await askMuse(
      q
    );
  }

  function handleTour() {
    setAssistantText(
      strings.tourMsg
    );

    speak(
      strings.tourMsg,
      language
    );

    socket.emit(
      'robotCommand',
      {
        command:
          'startTour'
      }
    );
  }

  return (
    <>
      <div className="background-glow" />

      <Sidebar
        onAskMuse={
          startListening
        }
        onTour={
          handleTour
        }
        onLanguage={
          handleLanguage
        }
        language={
          language
        }
      />

      <main className="main-content">

        <section className="hero-card">
          <div className="hero-text">

            <div
              style={{
                display:
                  'inline-flex',
                alignItems:
                  'center',
                gap: '8px',
                padding:
                  '10px 18px',
                borderRadius:
                  '999px',
                background:
                  'rgba(179,139,89,.12)',
                border:
                  '1px solid rgba(179,139,89,.16)',
                marginBottom:
                  '24px',
                fontSize:
                  '.95rem',
                color:
                  'var(--gold)',
                fontWeight:
                  '600'
              }}
            >
              {
                strings.tagline
              }
            </div>

            <h1>
              {
                strings.heroTitle
              }
            </h1>

            <p>
              {
                strings.heroDesc
              }
            </p>

            <div className="hero-buttons">
              <button
                className="gold-btn"
                onClick={() =>
                  navigate(
                    '/artifacts'
                  )
                }
              >
                {
                  strings.exploreBtn
                }
              </button>

              <button
                className="glass-btn"
                onClick={
                  startListening
                }
              >
                {
                  strings.speakBtn
                }
              </button>

              <button
                className="glass-btn"
                onClick={
                  handleTour
                }
              >
                {
                  strings.tourBtn
                }
              </button>
            </div>
          </div>

          <div className="hero-robot">
            <div className="robot-circle">
              <img
                src="/images/logo.png"
                alt="MUSE Robot"
                className="robot-image"
              />
            </div>
          </div>
        </section>

        <section className="feature-grid">
          <div className="feature-card">
            <span>🏛</span>
            <h3>
              {
                strings.feat1Title
              }
            </h3>
            <p>
              {
                strings.feat1Desc
              }
            </p>
          </div>

          <div className="feature-card">
            <span>🎧</span>
            <h3>
              {
                strings.feat2Title
              }
            </h3>
            <p>
              {
                strings.feat2Desc
              }
            </p>
          </div>

          <div className="feature-card">
            <span>🌍</span>
            <h3>
              {
                strings.feat3Title
              }
            </h3>
            <p>
              {
                strings.feat3Desc
              }
            </p>
          </div>
        </section>

        <section className="assistant-panel">
          <div className="assistant-header">

            <div>
              <h2
                style={{
                  fontFamily:
                    'Cinzel, serif',
                  marginBottom:
                    '8px'
                }}
              >
                {
                  strings.assistantTitle
                }
              </h2>

              <p
                style={{
                  color:
                    'var(--muted)'
                }}
              >
                {
                  strings.assistantSubtitle
                }
              </p>
            </div>

            <div className="status">
              <span className="status-indicator" />
              {
                strings.online
              }
            </div>
          </div>

          <div className="assistant-message">
            <>
              {(isTyping
                ? displayedText
                : assistantText) ||
                strings.defaultMsg}

              {isTyping && (
                <span
                  style={{
                    animation:
                      'blink 1s infinite'
                  }}
                >
                  |
                </span>
              )}
            </>
          </div>

          <div
            style={{
              display:
                'flex',
              gap: '14px',
              marginTop:
                '24px'
            }}
          >
            <input
              id="searchInput"
              type="text"
              placeholder={
                strings.inputPlaceholder
              }
              value={
                typedQuestion
              }
              onChange={e =>
                setTypedQuestion(
                  e.target.value
                )
              }
              onKeyDown={e =>
                e.key ===
                  'Enter' &&
                handleTypedAsk()
              }
            />

            <button
              className="gold-btn"
              onClick={
                handleTypedAsk
              }
            >
              {
                strings.askBtn
              }
            </button>

          </div>
        </section>

      </main>
    </>
  );
}