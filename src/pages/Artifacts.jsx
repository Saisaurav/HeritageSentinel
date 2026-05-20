import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ArtifactPanel from '../components/ArtifactPanel';
import { t } from '../utils/translations';
import { speak } from '../utils/speak';
import { getNextLanguage, languageChangedMessage } from '../utils/language';
import { startVoiceRecognition } from '../utils/speechRecognition';
import { typeText } from '../utils/typingEffect';
import { askMuse } from '../utils/api';

import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { COLLECTIONS, getArtifactsCollectionName } from '../services/firebaseService';


export default function Artifacts({
  assistantText,
  setAssistantText,
  language,
  switchLanguage
}) {
  const strings = t[language] || t['en-US'];

  const [artifacts, setArtifacts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [previewArtifact, setPreviewArtifact] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [displayedText,
    setDisplayedText] =
    useState('');

  const [isTyping,
    setIsTyping] =
    useState(false);

useEffect(() => {
  async function fetchArtifacts() {
    try {
      // getArtifactsCollectionName() reads the live value AND hydrates
      // from localStorage on first call, so this is correct both on
      // initial mount and after Settings changes the collection at runtime.
      const collectionName = getArtifactsCollectionName();

      const querySnapshot = await getDocs(
        collection(db, collectionName)
      );

      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // fallback: some documents store the URL under 'img'
        image: doc.data().img || doc.data().image
      }));

      setArtifacts(data);
    } catch (err) {
      console.error("Failed to load artifacts:", err);
    }
  }

  // Initial load — picks up any collection persisted from a previous session.
  fetchArtifacts();

  // Re-fetch whenever Settings (dev mode) switches the active collection.
  // setArtifactsCollectionName() in firebaseService dispatches this event.
  function handleCollectionChange() {
    fetchArtifacts();
  }

  window.addEventListener('artifactsCollectionChanged', handleCollectionChange);

  return () => {
    window.removeEventListener('artifactsCollectionChanged', handleCollectionChange);
  };
  // Empty deps: register the listener once only.
  // getArtifactsCollectionName() always reads the current live value.
}, []);

useEffect(() => {
  function handleClick() {
    setPreviewArtifact(
      null
    );
  }

  document.addEventListener(
    'click',
    handleClick
  );

  return () => {
    document.removeEventListener(
      'click',
      handleClick
    );
  };
}, []);
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
        await askMuseAndType(text);
      },
      onError: () => setAssistantText(strings.voiceError)
    });

    setAssistantText(strings.listening);
  }


  async function typeResponse(text) {
    setIsTyping(true);
    setDisplayedText('');

    await typeText({
      text,
      speed: 16,
      onTick: setDisplayedText,
      onDone: finalText => {
        setAssistantText(finalText);
        setIsTyping(false);
      }
    });
  }

  async function askMuseAndType(question) {
    try {
      setAssistantText(strings.thinking);
      setDisplayedText('');

      const data = await askMuse({ question, language });
      const responseText = data.text || '';

      speak(responseText, language);
      await typeResponse(responseText);
    } catch (err) {
      console.error(err);
      setAssistantText(strings.unavailable);
    }
  }


const SEARCH_ALIASES = {
  old: ['ancient', 'historic', 'history', 'artifact'],
  history: ['historic', 'ancient', 'old'],
  weapon: ['sword', 'shield', 'armor', 'battle'],
  painting: ['art', 'portrait', 'canvas'],
  pottery: ['pot', 'vase', 'ceramic'],
  sculpture: ['statue', 'stone', 'carving'],
  robot: ['technology', 'innovation', 'engineering'],
  gold: ['golden', 'metal', 'treasure'],
  ancient: ['old', 'historic', 'history']
};

const normalizedSearch =
  search
    .trim()
    .toLowerCase();

const filtered =
  artifacts.filter(a => {
    const matchesCategory =
      category === 'all' ||
      a.category === category;

    if (!normalizedSearch) {
      return matchesCategory;
    }

    const searchableText = [
      a.name,
      a.category,
      a.era,
      a.description
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    /*
      DIRECT MATCH
    */
    const directMatch =
      searchableText.includes(
        normalizedSearch
      );

    /*
      ALIAS MATCH
    */
    const aliasTerms =
      SEARCH_ALIASES[
        normalizedSearch
      ] || [];

    const aliasMatch =
      aliasTerms.some(term =>
        searchableText.includes(
          term
        )
      );

    /*
      PARTIAL WORD MATCH
    */
    const fuzzyMatch =
      normalizedSearch
        .split(' ')
        .some(word =>
          searchableText.includes(
            word
          )
        );

    return (
      matchesCategory &&
      (
        directMatch ||
        aliasMatch ||
        fuzzyMatch
      )
    );
  });


  return (
    <div className="artifacts-page">
      <div className="background-glow" />

      <Sidebar
        onAskMuse={startListening}
        onLanguage={handleLanguage}
        language={language}
      />

      <main className="main-content">

        <section className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '999px',
                background: 'rgba(179,139,89,.12)',
                border: '1px solid rgba(179,139,89,.16)',
                marginBottom: '16px', fontWeight: '600', color: 'var(--gold)'
              }}>
                {strings.collectionTag}
              </div>
              <h1>{strings.artifactExplorer}</h1>
              <p>{strings.artifactSubtitle}</p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,.45)', border: '1px solid rgba(255,255,255,.55)',
              borderRadius: '24px', padding: '18px 24px', minWidth: '180px',
              textAlign: 'center', backdropFilter: 'blur(18px)'
            }}>
              <div style={{ fontSize: '.9rem', color: 'var(--muted)', marginBottom: '8px' }}>
                {strings.available}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '700', fontFamily: 'Cinzel, serif' }}>
                {isTyping ? displayedText : filtered.length}
              </div>

              <div style={{ color: 'var(--gold)', fontSize: '.95rem' }}>
                {strings.artifactsLabel}
              </div>
            </div>
          </div>
        </section>

        <section className="search-bar-container">
          <input id="searchInput"
            type="text"
            placeholder={strings.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select id="categoryFilter" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">{strings.allCategories}</option>
            <option value="Weapons">Weapons</option>
            <option value="Paintings">Paintings</option>
            <option value="Pottery">Pottery</option>
            <option value="Sculptures">Sculptures</option>
          </select>
        </section>

        <section className="artifact-grid">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px' }}>
              <h2>{strings.noFound}</h2>
              <p>{strings.noFoundSub}</p>
            </div>
          ) : (
filtered.map(artifact => (
  <div
    key={artifact.id}
    className="artifact-card"
      onClick={(e) => {
  e.stopPropagation();
      if (
        previewArtifact?.id !==
        artifact.id
      ) {
        setPreviewArtifact(
          artifact
        );
        return;
      }

      setSelectedArtifact(
        artifact
      );
    }}
    style={{
      position:
        'relative',
      overflow:
        'visible'
    }}
  >
    <img
      src={artifact.image}
      alt={artifact.name}
    />

    <div className="card-content">
      <div style={{
        display: 'flex',
        justifyContent:
          'space-between',
        alignItems:
          'flex-start',
        gap: '12px'
      }}>
        <h2>
          {artifact.name}
        </h2>

        <div style={{
          fontSize:
            '.8rem',
          padding:
            '7px 12px',
          borderRadius:
            '999px',
          background:
            previewArtifact?.id ===
            artifact.id
              ? 'rgba(215,126,46,.15)'
              : 'rgba(179,139,89,.12)',
          color:
            'var(--gold)',
          transition:
            '.2s'
        }}>
          {
            previewArtifact?.id ===
            artifact.id
              ? 'Tap again'
              : strings.viewLabel
          }
        </div>
      </div>

      <p>
        {artifact.era}
      </p>

      <small>
        {artifact.category}
      </small>
    </div>

    {previewArtifact?.id ===
      artifact.id && (
      <div
        style={{
          position:
            'absolute',
          left:
            '50%',
          bottom:
            '75%',
          transform:
            'translate(-50%, 100%)',
          width:
            '340px',
          zIndex:
            50,
          borderRadius:
            '30px',
          padding:
            '22px',
          background:
            'rgba(255,255,255,.95)',
          border:
            '1px solid rgba(255,255,255,.55)',
          backdropFilter:
            'blur(22px)',
          boxShadow:
            '0 20px 50px rgba(0,0,0,.16)'
        }}
      >
        <div style={{
          display:
            'flex',
          gap:
            '14px'
        }}>
          <img
            src={
              artifact.image
            }
            alt={
              artifact.name
            }
            style={{
              width:
                '96px',
              height:
                '96px',
              objectFit:
                'cover',
              borderRadius:
                '18px'
            }}
          />

          <div>
            <h3 style={{
              margin:
                '0 0 8px'
            }}>
              {
                artifact.name
              }
            </h3>

            <div style={{
              color:
                'var(--gold)',
              fontWeight:
                600,
              marginBottom:
                '8px'
            }}>
              {
                artifact.era
              }
            </div>

            <p style={{
              fontSize:
                '.92rem',
              lineHeight:
                1.5,
              margin: 0,
              color:
                'var(--muted)'
            }}>
              {
                artifact.description
                  ?.slice(
                    0,
                    140
                  )
              }
              ...
            </p>

            <div style={{
              marginTop:
                '12px',
              fontSize:
                '.82rem',
              fontWeight:
                700,
              color:
                'var(--gold)'
            }}>
              Tap again to explore
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
))
          )}
        </section>

      </main>

      {selectedArtifact && (
        <ArtifactPanel
          artifact={selectedArtifact}
          language={language}
          onClose={() => setSelectedArtifact(null)}
        />
      )}
    </div>
  );
}