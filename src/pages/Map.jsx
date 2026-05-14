import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { t } from '../utils/translations';
import { getNextLanguage, languageChangedMessage } from '../utils/language';
import { speak } from '../utils/speak';
import { LOCATIONS, NAV_NODES } from '../utils/mapData';
import { findPath, getNearestLocation } from '../utils/pathfinding';

const MAP_FEATURES = [
  { key: 'feature1Title', keyDesc: 'feature1Desc' },
  { key: 'feature2Title', keyDesc: 'feature2Desc' },
  { key: 'feature3Title', keyDesc: 'feature3Desc' }
];

export default function Map({
  language,
  switchLanguage
}) {
  const strings =
    t[language] || t['en-US'];

  const [initialPos, setInitialPos] =
    useState({ x: 50, y: 48 });

  const [initialLocation,
    setInitialLocation] =
    useState(null);

  const [targetPos, setTargetPos] =
    useState({ x: 50, y: 48 });

  const [selectedItem,
    setSelectedItem] =
    useState(null);

  const [searchQuery,
    setSearchQuery] =
    useState('');

  const [chatQuery,
    setChatQuery] =
    useState('');

  const [chatResponse,
    setChatResponse] =
    useState(strings.chatIntro);

  const [chatBusy,
    setChatBusy] =
    useState(false);

  const [routePath,
    setRoutePath] =
    useState([]);

  const [isFullscreen,
    setIsFullscreen] =
    useState(false);

  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [clickTarget, setClickTarget] = useState(null); // {x, y} in map % coords

  const [displayedText,
  setDisplayedText] =
  useState('');

const [isTyping,
  setIsTyping] =
  useState(false);

  const [sessionId] = useState(
    'map-visitor-' + Date.now()
  );

  /*
    LOAD ROBOT POSITION
    Falls back to hallway node
  */
  useEffect(() => {
    async function loadPosition() {
      try {
        const response =
          await fetch(
            '/api/robot-position'
          );

        if (!response.ok) {
          throw new Error();
        }

        const data =
          await response.json();

        const robotPos = {
          x: data.x,
          y: data.y
        };

        setInitialPos(robotPos);
        setTargetPos(robotPos);

        const nearest =
          getNearestLocation(
            robotPos.x,
            robotPos.y
          );

        setInitialLocation(
          nearest
        );

        setSelectedItem(
          nearest
        );

      } catch {
        /*
          FALLBACK ACCESSIBLE
          HALLWAY POSITION
        */
        const accessible =
          NAV_NODES.filter(
            n =>
              ![
                'galleryA',
                'galleryB',
                'history',
                'innovation',
                'temp',
                'archive'
              ].includes(n.id)
          );

        const randomNode =
          accessible[
            Math.floor(
              Math.random() *
              accessible.length
            )
          ];

        const fallback = {
          x: randomNode.x,
          y: randomNode.y
        };

        setInitialPos(fallback);
        setTargetPos(fallback);

        const nearest =
          getNearestLocation(
            fallback.x,
            fallback.y
          );

        setInitialLocation(
          nearest
        );

        setSelectedItem(
          nearest
        );
      }
    }

    loadPosition();
  }, []);

  /*
    SEARCH RESULTS
  */
  const visibleResults =
    useMemo(() => {
      const query =
        searchQuery.trim();

      if (!query) {
        return [];
      }

      return LOCATIONS
        .filter(item =>
          item.label
            .toLowerCase()
            .includes(
              query.toLowerCase()
            )
        )
        .slice(0, 5);
    }, [searchQuery]);

  /*
    SELECT DESTINATION
  */
  const selectMapItem = item => {
    setSelectedItem(item);
    setClickTarget(null); // clear any free-click pin when a named destination is chosen

    const target = {
      x: item.center.x,
      y: item.center.y
    };

    setTargetPos(target);

    const { path } = findPath(initialPos, target);
    setRoutePath(path);

    setSearchQuery('');

    setChatResponse(
      `${item.label} is selected. ${item.info}`
    );
  
  };

  /*
    MAP CLICK → PATHFIND TO ARBITRARY POINT
  */
  const handleMapClick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;

    // Convert pixel position → map percentage coordinates (0–100)
    const x = (px / rect.width)  * 100;
    const y = (py / rect.height) * 100;

    const target = { x, y };
    setClickTarget(target);
    setTargetPos(target);

    const { path, totalDistance } = findPath(initialPos, target);
    setRoutePath(path);

    // Identify the nearest named location for the info panel
    const nearest = getNearestLocation(x, y);
    setSelectedItem({
      ...nearest,
      label: nearest.label,
      info: `Navigating to a point near ${nearest.label}. Distance: ${totalDistance.toFixed(1)} units.`
    });
  };

  /*
    SEARCH SUBMIT
  */
  const handleSearchSubmit =
    () => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      if (!query) return;

      const match =
        LOCATIONS.find(
          item =>
            item.label
              .toLowerCase()
              .includes(query)
        );

      if (match) {
        selectMapItem(match);
        return;
      }

      setChatResponse(
        strings.noSearchMatch
      );
    };

async function typeResponse(
  text
) {
  setIsTyping(true);
  setDisplayedText('');

  let current = '';

  const speed = 16;

  for (let i = 0; i < text.length; i++) {
    current += text[i];

    setDisplayedText(
      current
    );

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          speed
        )
    );
  }

await typeResponse(
  data.text
);

  setIsTyping(false);

}

  const handleChatAsk =
    async () => {
      const question =
        chatQuery.trim();

      if (!question) {
        return;
      }

      setChatBusy(true);

      try {
        const mapData = {
          currentPosition:
            initialPos,

          currentLocation:
            initialLocation
              ?.label,

          targetPosition:
            targetPos,

          targetLocation:
            selectedItem
              ?.label,

          locations:
            LOCATIONS.map(
              l => ({
                label:
                  l.label,
                center:
                  l.center
              })
            )
        };

        const response =
          await fetch(
            '/api/ask',
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                'x-session-id':
                  sessionId
              },
              body:
                JSON.stringify({
                  question,
                  language,
                  visitorType:
                    'map-navigation',
                  mapContext:
                    mapData
                })
            }
          );

        const data =
          await response.json();

        setChatResponse(
          data.text ||
          strings
            .mapChatFallback
        );

      } catch (err) {
        console.error(err);

        setChatResponse(
          strings
            .mapChatFallback
        );
      } finally {
        setChatBusy(false);
      }

      setChatQuery('');
    };

  /*
    LANGUAGE
  */
  function handleLanguage(nextLang) {
    const next = nextLang
      ? { value: nextLang }
      : getNextLanguage(language);

    switchLanguage(next.value);

    const msg = languageChangedMessage(next.value);
    speak(msg, next.value);
  }
function toggleFullscreen() {
  const elem =
    document.querySelector(
      '.map-frame'
    );

  if (!document.fullscreenElement) {
    elem?.requestFullscreen();

    setIsFullscreen(
      true
    );
  } else {
    document.exitFullscreen();

    setIsFullscreen(
      false
    );
  }
}
  return (
    <div className="map-page">
      <Sidebar
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
                background: 'rgba(179,139,89,.12)', border: '1px solid rgba(179,139,89,.16)',
                marginBottom: '16px', fontWeight: '600', color: 'var(--gold)'
              }}>
                {strings.mapTag}
              </div>
              <h1>{strings.mapTitle}</h1>
              <p>{strings.mapDesc}</p>
            </div>
          </div>
        </section>

        <section className="map-search-section">
          <label className="search-label" htmlFor="map-search-input">{strings.searchLabel}</label>
          <div className="search-bar-container">
            <input
              id="map-search-input"
              type="text"
              value={searchQuery}
              placeholder={strings.searchPlaceholderMap}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSearchSubmit();
              }}
            />
            <button className="gold-btn" type="button" onClick={handleSearchSubmit}>
              {strings.searchBtn}
            </button>
          </div>
          {searchQuery && visibleResults.length > 0 && (
            <div className="search-suggestions">
              {visibleResults.map((item) => (
                <button key={item.label} type="button" onClick={() => selectMapItem(item)}>
                  <span>{item.label}</span>
                  <small>{item.type}</small>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="map-grid">
          <div className="map-visual">
            <div className="map-frame">
<div className="map-frame" onClick={handleMapClick} style={{ cursor: 'crosshair' }}>
  <img
    src="/images/museum-map.png"
    alt={strings.mapAlt}
  />
<button
  onClick={
    toggleFullscreen
  }
  style={{
    position:
      'absolute',
    top: 18,
    right: 18,
    zIndex: 10,
    border: 'none',
    borderRadius: 16,
    padding:
      '10px 16px',
    background:
      'rgba(255,255,255,.9)',
    boxShadow:
      '0 6px 18px rgba(0,0,0,.12)',
    cursor:
      'pointer',
    fontWeight: 700
  }}
>
  {isFullscreen
    ? 'Exit Fullscreen'
    : 'Fullscreen'}
</button>
  {/* ROUTE SVG */}
  <svg
    className="map-route-line"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      overflow: 'visible'
    }}
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    {/* Animated route */}
    {routePath.length > 1 && (
      <>
        <defs>
          <filter id="routeGlow">
            <feGaussianBlur
              stdDeviation="0.4"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow path */}
        <polyline
          points={routePath
            .map(
              p => `${p.x},${p.y}`
            )
            .join(' ')}
          fill="none"
          stroke="rgba(215,126,46,.22)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#routeGlow)"
        />

        {/* Main path */}
        <polyline
          points={routePath
            .map(
              p => `${p.x},${p.y}`
            )
            .join(' ')}
          fill="none"
          stroke="#d77e2e"
          strokeWidth="0.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="120"
          strokeDashoffset="120"
          style={{
            animation:
              'drawRoute 1.6s ease forwards'
          }}
        />
      </>
    )}

    {/* Destination pulse */}
    {selectedItem && (
      <circle
        cx={targetPos.x}
        cy={targetPos.y}
        r="1.8"
        fill="rgba(215,126,46,.15)"
      >
        <animate
          attributeName="r"
          values="1.5;3.2;1.5"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
    )}
    {/* Click-destination X marker */}
    {clickTarget && (
      <g>
        <circle
          cx={clickTarget.x}
          cy={clickTarget.y}
          r="2.2"
          fill="none"
          stroke="#d77e2e"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <line x1={clickTarget.x - 1.2} y1={clickTarget.y - 1.2} x2={clickTarget.x + 1.2} y2={clickTarget.y + 1.2} stroke="#d77e2e" strokeWidth="0.6" strokeLinecap="round" />
        <line x1={clickTarget.x + 1.2} y1={clickTarget.y - 1.2} x2={clickTarget.x - 1.2} y2={clickTarget.y + 1.2} stroke="#d77e2e" strokeWidth="0.6" strokeLinecap="round" />
      </g>
    )}
  </svg>

  {/* DESTINATION PIN */}
  {(clickTarget || selectedItem) && (
    <div
      className="map-pin"
      style={{
        left: `${(clickTarget ?? targetPos).x}%`,
        top: `${(clickTarget ?? targetPos).y}%`,
        zIndex: 4
      }}
    >
      <div className="pin-ring" />
      <div className="pin-dot" />
    </div>
  )}

  {/* CURRENT POSITION */}
  <div
    className="map-pin map-start-pin"
    style={{
      left: `${initialPos.x}%`,
      top: `${initialPos.y}%`,
      zIndex: 5
    }}
  >
    <div className="pin-ring start-ring" />
    <div className="pin-dot start-dot" />
  </div>

  {/* LOCATION LABELS */}
  {LOCATIONS.map(location => (
    <div
      key={location.label}
      style={{
        position: 'absolute',
        left:
          `${location.center.x}%`,
        top:
          `${location.center.y}%`,
        transform:
          'translate(-50%, -50%)',
        pointerEvents: 'none',
        fontSize: '0.8rem',
        fontWeight: 600,
        color:
          'rgba(85,60,35,.8)',
        background:
          'rgba(255,255,255,.75)',
        padding:
          '4px 8px',
        borderRadius:
          '999px',
        backdropFilter:
          'blur(8px)',
        border:
          '1px solid rgba(180,140,90,.14)',
        zIndex: 2
      }}
    >
      {location.label}
    </div>
  ))}
</div>
            </div>
            <div className="map-badge">
              <strong>{strings.youAreHere}</strong>
              <span>{strings.nearbyLabel} {initialLocation?.label}</span>
            </div>
            <div className="map-chat-card">
              <div className="chat-hint">{strings.chatIntro}</div>
              <div className="chat-input-group">
                <input
                  type="text"
                  value={chatQuery}
                  placeholder={strings.chatPrompt}
                  onChange={(event) => setChatQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleChatAsk();
                  }}
                />
                <button className="gold-btn" type="button" onClick={handleChatAsk}>
                  {strings.chatAskBtn}
                </button>
              </div>
              <div className={`chat-response ${chatBusy ? 'busy' : ''}`}>
                {chatBusy ? strings.thinking : chatResponse}
              </div>
            </div>
          </div>

          <aside className="map-info-card">
            <div className="info-pill">{strings.mapTips}</div>
            <h2>{selectedItem?.label || strings.infoTitle}</h2>
            <p>{selectedItem?.info || strings.infoDesc}</p>

            <div className="info-stat-grid">
              <div>
                <span>{strings.locationLabel}</span>
                <strong>{initialLocation?.label}</strong>
              </div>
              <div>
                <span>{strings.routeLabel}</span>
                <strong>{strings.routeHint}</strong>
              </div>
            </div>


          </aside>
        </section>

        <section className="map-highlights">
          {MAP_FEATURES.map((feature) => (
            <div key={feature.key} className="feature-card">
              <h3>{strings[feature.key]}</h3>
              <p>{strings[feature.keyDesc]}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}