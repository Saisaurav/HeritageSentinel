require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      process.env.SOCKETIO_CORS_ORIGIN ||
      process.env.SOCKETIO_ORIGIN ||
      false,
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT =
  process.env.PORT || 3000;

const fs = require('fs');
const multer = require('multer');

// Dynamic museum collection name (defaults to 'artifacts')
let MUSEUM_COLLECTION = process.env.MUSEUM_COLLECTION || 'artifacts';


/*
  OPENCLAW API
*/
const OPENCLAW_URL =
  process.env.OPENCLAW_URL ||
  "http://localhost:11434/v1/chat/completions";

/*
  BLYNK CONFIG
  Set BLYNK_TOKEN in your .env file.
  BLYNK_PIN should be the virtual pin (e.g. "V0") that holds the JSON command string.
*/
const BLYNK_TOKEN = process.env.BLYNK_TOKEN || '';
const BLYNK_PIN   = process.env.BLYNK_PIN   || 'V0';

/**
 * Sends a robot command array to the ESP32 via Blynk.
 * The commands array (JSON string) is written to the configured virtual pin.
 *
 * @param {Array} commands - Array of instruction objects from pathToInstructions()
 */
async function sendToBlynk(commands) {
  if (!BLYNK_TOKEN) {
    console.warn('[Blynk] BLYNK_TOKEN not set — skipping Blynk push');
    return;
  }

  const json = JSON.stringify(commands);

  // Blynk HTTP API: update a virtual pin value
  const url =
    `https://blynk.cloud/external/api/update` +
    `?token=${BLYNK_TOKEN}` +
    `&${BLYNK_PIN}=${encodeURIComponent(json)}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Blynk update failed: ${res.status} ${body}`);
  }

  console.log(`[Blynk] Commands sent to ${BLYNK_PIN}:`, json);
}


/*
  SIMPLE IN-MEMORY VISITOR MEMORY

  In production:
  - Redis
  - Database
  - Session storage
*/
const visitorMemories = new Map();

/*
  GLOBAL MUSE PERSONALITY
*/
const MUSE_SYSTEM_PROMPT = `

Your Personality
You are a museum assistant named Muse. You are stationed in a grand, historic museum filled with wonders from across time and space. Your purpose is to enlighten and captivate visitors by sharing the fascinating stories behind the artifacts on display.

Eloquent & Theatrical: Highly articulate with a grand, poetic vocabulary. You treat the museum floor as your stage.

Courtly & Polite: Unfailingly well-mannered, addressing visitors with immense, old-world respect.

Curious & Intellectual: Fascinated by human progress, enlightenment, and the stories behind objects.

Calm yet Passionate: Unwaveringly composed, but intensely captivated by history.

Rules
Keep it Concise: Limit responses to 50–120 words.

European Flair: Use sophisticated, slightly archaic language. Strictly avoid modern slang.

Dramatic Politeness: Address visitors theatrically (e.g., "My dear friend," "My good sir," "Young scholar").

Smooth & Natural: Never ramble or list dry statistics. Speak like a captivating storyteller, not a computer.

When Explaining Artifacts
The "Why" Matters: Explain why the object was vital to its time and how people interacted with it.

Theatrical Storytelling: Frame the history through a lens of human struggle, ingenuity, or a grand scheme.

One Memorable Detail: Include a sharp, memorable anecdote or a witty observation.

Bridge to History: Make the visitor feel the tangible reality of the past.

If Appropriate
Express refined wonder at human achievement.

Ask sharp, curiosity-inducing questions to challenge the visitor's intellect.

Use a touch of dry irony or gentlemanly wit.
`;

// ─── REPLACE buildMusePrompt with this ───────────────────────────────────────
const LOCALE_TO_LANGUAGE = {
  'en-US': 'English',
  'hi-IN': 'Hindi',
  'fr-FR': 'French',
  'es-ES': 'Spanish',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-PT': 'Portuguese',
  'ru-RU': 'Russian',
  'ar-SA': 'Arabic',
  'tr-TR': 'Turkish',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  'nl-NL': 'Dutch',
  'sv-SE': 'Swedish',
  'no-NO': 'Norwegian',
  'pl-PL': 'Polish',
  'uk-UA': 'Ukrainian',
  'th-TH': 'Thai',
};

function buildMusePrompt(language) {
  const languageLabel = LOCALE_TO_LANGUAGE[language] || 'English';
  return `${MUSE_SYSTEM_PROMPT}

CRITICAL LANGUAGE RULE:
You MUST respond ONLY in ${languageLabel}. This is non-negotiable.
Do NOT respond in English unless the selected language is English.
Do NOT mix languages. Every word of your response must be in ${languageLabel}.`;
}
app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const uploadDir = path.join(
  __dirname,
  'src',
  'public',
  'images',
);

console.log('UPLOAD DIR:', uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, uploadDir);
  },

  filename: (_, file, cb) => {
    cb(
      null,
      'current-map' +
      path.extname(file.originalname)
    );
  }
});

const upload =
  multer({ storage });

app.use(
  '/uploads',
  express.static(uploadDir, {
    etag: false,
    lastModified: false,
    cacheControl: false,
    setHeaders: (res) => {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  })
);

// Return current museum collection configuration
app.get('/api/museum-config', (req, res) => {
  res.json({ collection: MUSEUM_COLLECTION });
});

// Set museum name and derive collection name (stored in-memory)
app.post('/api/set-museum', (req, res) => {
  const { museumName } = req.body || {};
  if (!museumName || typeof museumName !== 'string') {
    return res.status(400).json({ success: false, error: 'museumName required' });
  }

  const sanitized = museumName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  MUSEUM_COLLECTION = `artifacts-${sanitized}`;

  console.log('Museum collection set to', MUSEUM_COLLECTION);

  res.json({ success: true, collection: MUSEUM_COLLECTION });
});

/*
  SERVE FRONTEND
*/
app.use(express.static(path.join(__dirname, "dist")));

/*
  GET OR CREATE VISITOR MEMORY
*/
function getVisitorMemory(sessionId) {
  if (!visitorMemories.has(sessionId)) {
    visitorMemories.set(sessionId, []);
  }

  return visitorMemories.get(sessionId);
}

/*
  SAVE MESSAGE TO MEMORY
*/
function saveToMemory(memory, role, content) {
  memory.push({
    role,
    content
  });

  /*
    LIMIT MEMORY SIZE
  */
  if (memory.length > 12) {
    memory.splice(0, memory.length - 12);
  }
}

/*
  EXPLAIN ARTIFACT
*/
app.post("/api/explain-artifact", async (req, res) => {
  try {
    const { artifact, visitorType, language = 'en-US' } = req.body;

    /*
      SESSION ID
      Frontend should send:
      x-session-id
    */
    const sessionId =
      req.headers["x-session-id"] || "default";

    const memory = getVisitorMemory(sessionId);

    /*
      STORE CURRENT ARTIFACT CONTEXT
    */
    const artifactContext = `
Current artifact being discussed:

Name: ${artifact.name}
Category: ${artifact.category}
Era: ${artifact.era}

Description:
${artifact.description}
`;

    saveToMemory(memory, "system", artifactContext);

    /*
      OPTIONAL VISITOR ADAPTATION
    */
    const audiencePrompt = visitorType
      ? `Visitor type: ${visitorType}`
      : "";

    const prompt = `
A visitor is viewing a museum artifact.

${audiencePrompt}

Artifact Information:

Name:
${artifact.name}

Category:
${artifact.category}

Era:
${artifact.era}

Description:
${artifact.description}

Your task:
- Explain the artifact naturally
- Make it engaging
- Help the visitor imagine its historical use
- Include one memorable detail
- Keep it concise
`;

    saveToMemory(memory, "user", prompt);

    const systemPrompt = buildMusePrompt(language);
    const data = await callOpenclaw({

      model: "gemma4:31b-cloud",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...memory.slice(-8)
      ],
      temperature: 0.7,
      max_tokens: 180
    });


    const text =
      data.choices?.[0]?.message?.content ||
      "I could not explain this artifact.";

    saveToMemory(memory, "assistant", text);

    res.json({
      success: true,
      text
    });

  } catch (err) {
    console.error(err);

    res.json({
      success: false,
      text: "OpenClaw is currently unavailable."
    });
  }
});
app.post("/api/ask", async (req, res) => {
  try {
const {
  question,
  context,
  visitorType,
  language = "en-US",
  mapContext
} = req.body;

    const sessionId =
      req.headers[
        "x-session-id"
      ] || "default";

    const memory =
      getVisitorMemory(
        sessionId
      );

    const systemPrompt =
      buildMusePrompt(
        language
      );

    /*
      OPTIONAL VISITOR TYPE
    */
    if (visitorType) {
      const alreadyHasType =
        memory.some(
          m =>
            m.role ===
              "system" &&
            m.content?.includes(
              "Visitor type:"
            )
        );

      if (!alreadyHasType) {
        saveToMemory(
          memory,
          "system",
          `Visitor type: ${visitorType}`
        );
      }
    }

    /*
      MAP CONTEXT
      TEMPORARY ONLY
      DOES NOT POLLUTE MEMORY
    */
    let dynamicContext =
      null;
if (mapContext) {
  dynamicContext = {
    role: "system",
    content: `
You are helping a museum visitor navigate.

Museum locations:
${
  mapContext.locations
    ?.map(l => `- ${l.label}`)
    .join("\n")
}

Visitor current location:
${mapContext.currentLocation || "Unknown"}

VERY IMPORTANT SYSTEM RULE:

If the visitor is asking to go somewhere,
navigate somewhere,
find a place,
or asking where something is:

YOU MUST begin your reply EXACTLY with:

[NAVIGATION]

No exceptions.

Correct examples:

[NAVIGATION] Sure! Let's head to the Cafe.

[NAVIGATION] I can guide you to the AI Research Lab.

Wrong examples:

"Right this way..."
"Let's go there..."

Keep responses concise.
Never invent locations.
`
  };
}

    /*
      SAVE USER MESSAGE
    */
    saveToMemory(
      memory,
      "user",
      question
    );

    /*
      BUILD MESSAGE LIST
      SAFE FOR OTHER PAGES
    */
const messages = [
  {
    role: "system",
    content:
      systemPrompt
  }
];

/*
  ARTIFACT CONTEXT
*/
if (context) {
  messages.push({
    role: "system",
    content: `
Current artifact context:

${context}

IMPORTANT RULES:
- Answer based on this artifact
- Stay museum focused
- Use the context when relevant
- If the visitor asks
  about the object,
  assume they mean
  the currently opened
  artifact
`
  });
}

    /*
      Add map context
      only for map page
    */
    if (dynamicContext) {
      messages.push(
        dynamicContext
      );
    }

    /*
      Add recent memory
    */
    messages.push(
      ...memory.slice(
        -12
      )
    );

    const data =
      await callOpenclaw({
        model:
          "gemma4:31b-cloud",

        messages,

        temperature:
          0.7,

        max_tokens:
          180
      });

let answer = data.choices?.[0]?.message?.content || "I could not answer that.";

// Server-side safety net: if the question sounds navigational but AI forgot the tag, add it
const navKeywords = ['go to', 'take me', 'navigate', 'where is', 'find the', 'how do i get'];
const isNavQuestion = navKeywords.some(kw => question.toLowerCase().includes(kw));
if (isNavQuestion && !answer.startsWith('[NAVIGATION]')) {
  answer = '[NAVIGATION] ' + answer;
}

    /*
      SAVE AI RESPONSE
    */
    saveToMemory(
      memory,
      "assistant",
      answer
    );

    res.json({
      success: true,
      text: answer
    });

  } catch (err) {
    console.error(
      err
    );

    res.json({
      success: false,
      text:
        "Museum assistant unavailable."
    });
  }
});

/*
  RESET MEMORY
*/
app.post("/api/reset-memory", (req, res) => {
  const sessionId =
    req.headers["x-session-id"] || "default";

  visitorMemories.delete(sessionId);

  res.json({
    success: true
  });
});


/*
  ROBOT POSITION
  Raspberry Pi can update later
*/
let robotPosition = {
  x: 50,
  y: 48
};

/*
  GET CURRENT POSITION
*/


app.post('/api/robot-position', (req, res) => {
  const { x, y } = req.body || {};

  if (typeof x === 'number' && typeof y === 'number') {
    robotPosition = { x, y };
    io.emit('robotPosition', robotPosition); // ← ADD THIS
  }

  res.json({ success: true, position: robotPosition });
});
async function pollBlynkPosition() {
  if (!BLYNK_TOKEN) return;

  try {
    const res = await fetch(
      `https://blynk.cloud/external/api/get?token=${BLYNK_TOKEN}&pin=V2`
    );

    if (!res.ok) {
      console.warn('[Blynk Poll] HTTP error:', res.status);
      return;
    }

    const raw = await res.text();

    let x, y, heading = 0;

    if (typeof raw === 'string' && raw.includes(',')) {
      const parts = raw.trim().split(',');
      x = parseFloat(parts[0]);
      y = parseFloat(parts[1]);
      heading = parseFloat(parts[2]) || 0;

    } else {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          x = parseFloat(parsed[0]);
          y = parseFloat(parsed[1]);
          heading = parseFloat(parsed[2]) || 0;
        } else {
          console.warn('[Blynk Poll] Unexpected JSON shape:', parsed);
          return;
        }
      } catch {
        console.warn('[Blynk Poll] Could not parse:', raw);
        return;
      }
    }

    if (!isNaN(x) && !isNaN(y)) {
      robotPosition = { x, y, heading };
      io.emit('robotPosition', robotPosition);
      console.log(`[Blynk Poll] Position updated → x=${x} y=${y} hdg=${heading}`);
    }

  } catch (err) {
    console.error('[Blynk Poll] Failed:', err.message);
  }
}


app.get('/api/robot-position', (req, res) => {
  res.json(robotPosition);
});

setInterval(pollBlynkPosition, 1000);




async function callOpenclaw(payload) {
  const res = await fetch(OPENCLAW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenClaw request failed: ${res.status} ${text}`);
  }

  return res.json();
}





/*
  SOCKET.IO
  TOUCHSCREEN ↔ ROBOT
*/
io.on("connection", socket => {
  console.log("Touchscreen Connected");

  /*
    ROBOT COMMANDS
  */
  socket.on("robotCommand", data => {
    console.log("Robot Command:", data);

    /*
      SEND TO ESP32 LATER
    */

    socket.emit("robotReply", {
      text: `Robot command received: ${data.command}`
    });
  });

  /*
    OPTIONAL:
    REALTIME MUSE CHAT
  */
// ─── REPLACE the visitorMessage socket handler with this ─────────────────────
socket.on("visitorMessage", async data => {
  try {
    const {
      message,
      sessionId = socket.id,
      language = 'en-US'          // ← accept language from the client
    } = data;

    const memory = getVisitorMemory(sessionId);
    saveToMemory(memory, "user", message);

    const systemPrompt = buildMusePrompt(language);  // ← use it here

    const result = await callOpenclaw({
      model: "gemma4:31b-cloud",
      messages: [
        { role: "system", content: systemPrompt },
        ...memory.slice(-8)
      ],
      temperature: 0.7,
      max_tokens: 180
    });

    const reply =
      result.choices?.[0]?.message?.content ||
      "I could not respond.";

    saveToMemory(memory, "assistant", reply);
    socket.emit("museReply", { text: reply });

  } catch (err) {
    console.error(err);
    socket.emit("museReply", { text: "Museum assistant unavailable." });
  }
});

  socket.on("disconnect", () => {
    console.log(
      "Touchscreen disconnected"
    );
  });
});

app.post('/api/navigate', async (req, res) => {
  const {
    destination,
    coordinates,
    source,
    instructions   // array of robot instructions from pathToInstructions()
  } = req.body || {};

  console.log('========== NAVIGATION REQUEST ==========');
  console.log('Destination :', destination);
  console.log('Coordinates :', coordinates);
  console.log('Requested From:', source);
  console.log('Instructions:', instructions?.length ?? 0, 'steps');
  console.log('========================================');

  // Nothing to drive without instructions
  if (!instructions || instructions.length === 0) {
    console.warn('[Navigate] No instructions received — skipping Blynk push');
    return res.json({ success: true, blynk: false, reason: 'no instructions' });
  }

  try {
    await sendToBlynk(instructions);
    res.json({ success: true, blynk: true, steps: instructions.length });
  } catch (err) {
    console.error('[Navigate] Blynk push failed:', err.message);
    // Still return success to the UI — the nav was planned; Blynk is optional hardware
    res.json({ success: true, blynk: false, reason: err.message });
  }
});

/* DEVELOPER TEST ENDPOINT */
app.post('/api/dev-unlock', (req, res) => {
  const { code } = req.body || {};
  if (code === process.env.DEV_CODE) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});


app.post(
  '/api/save-map',
  async (req, res) => {
    try {
      const mapData = req.body;

      const filePath = path.join(
        __dirname,
        'src',
        'utils',
        'mapData.js'
      );

      const fileContent = `
export const GRID_STEP =
  ${mapData.GRID_STEP};

export const ZONE_RECTS =
  ${JSON.stringify(
    mapData.ZONE_RECTS,
    null,
    2
  )};

export const ZONE_CONNECTIONS =
  ${JSON.stringify(
    mapData.ZONE_CONNECTIONS,
    null,
    2
  )};

export const NAV_NODES =
  ${JSON.stringify(
    mapData.NAV_NODES,
    null,
    2
  )};

export const LOCATIONS =
  ${JSON.stringify(
    mapData.LOCATIONS,
    null,
    2
  )};
export const ZONE_NODE_KEYS = new Map(
  Object.entries(${JSON.stringify(mapData.ZONE_NODE_KEYS || {}, null, 2)})
    .map(([k, v]) => [k, new Set(v)])
);
`;

      fs.writeFileSync(
        filePath,
        fileContent,
        'utf8'
      );

      console.log(
        '✓ mapData.js updated'
      );

      res.json({
        success: true
      });

    } catch (err) {
      console.error(
        'Save map failed:',
        err
      );

      res.status(500).json({
        success: false
      });
    }
  }
);
app.post(
  '/api/upload-map-image',
  upload.single('map'),
  (req, res) => {
    console.log('Upload received:', req.file?.filename);
    console.log('Files in uploadDir:', fs.readdirSync(uploadDir)); // ← add this

    if (!req.file) {
      return res.status(400).json({ success: false });
    }

    const existing = fs.readdirSync(uploadDir);
    existing
      .filter(f => f.startsWith('current-map') && f !== req.file.filename)
      .forEach(f => {
        console.log('Deleting:', f); 
        fs.unlinkSync(path.join(uploadDir, f));
      });

    res.json({
      success: true,
      imageUrl: `/uploads/${req.file.filename}`
    });
  }
);

// Upload museum logo (dev mode)
const logoStorage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    cb(null, 'museum-logo' + path.extname(file.originalname));
  }
});

const uploadLogo = multer({ storage: logoStorage });

app.post('/api/upload-logo', uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  res.json({ success: true, imageUrl: `/uploads/${req.file.filename}` });
});

app.get(
  '/api/map-image',
  (req, res) => {

    const files =
      fs.readdirSync(uploadDir);

    const mapFile =
      files.find(file =>
        file.startsWith(
          'current-map'
        )
      );

    if (!mapFile) {
      return res.json({
        imageUrl:
          '/images/museum-map.png'
      });
    }

    res.json({
      imageUrl:
        `/uploads/${mapFile}`
    });
  }
);


app.get("/{*path}", (req, res) => {
  // SPA fallback for client-side routes.
  // React Router pages rely on browser navigation Accept: text/html.
  // For other resource requests (assets/json), return 404 to avoid masking errors.
  const accept = req.headers.accept || "";
  if (accept.includes("text/html")) {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
    return;
  }

  res.status(404).end();
});


/*
  START SERVER
*/
server.listen(PORT, () => {
  console.log(
    `Museum Robot Running: http://localhost:${PORT}`
  );
});