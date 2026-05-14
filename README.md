# MUSE Museum Robot — React Edition

Converted from vanilla HTML/CSS/JS to a full React + Vite project.
All functionality is identical: Socket.IO robot commands, Speech Recognition, TTS, artifact panel, AI explanations via OpenClaw.

## Project Structure

```
wro-react/
├── index.html              # Vite HTML entry
├── vite.config.js          # Vite config (proxy → Express on :3000)
├── server.js               # Express + Socket.IO backend (unchanged logic)
├── package.json
├── public/
│   ├── artifacts.json      # Artifact data
│   └── images/
│       ├── logo.png
│       └── logo.jpg
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Router (Home / Artifacts)
    ├── index.css           # All styles (exact copy of original)
    ├── socket.js           # Socket.IO singleton
    ├── components/
    │   ├── Sidebar.jsx     # Navigation sidebar
    │   └── ArtifactPanel.jsx  # Slide-in artifact detail panel
    └── pages/
        ├── Home.jsx        # index.html → React page
        └── Artifacts.jsx   # artifacts.html → React page
```

## Setup & Run

### Development (hot-reload React + Express backend)

```bash
npm install

# Terminal 1 — Express backend
npm run server

# Terminal 2 — Vite dev server (proxies /api and /socket.io to :3000)
npm run dev
```

Open http://localhost:5173

### Production Build

```bash
npm install
npm run build
npm start          # serves built React from Express on port 3000
```

Open http://localhost:3000

## OpenClaw / AI Backend

Same as before — edit `OPENCLAW_URL` in `server.js` when your local LLM is running:

```js
const OPENCLAW_URL = "http://localhost:11434/v1/chat/completions";
```

## ESP32 / Robot Commands

Socket.IO `robotCommand` events are emitted exactly as before.
Extend the `io.on("connection")` block in `server.js` to forward commands to your ESP32.
