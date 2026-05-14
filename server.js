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


/*
  OPENCLAW API
*/
const OPENCLAW_URL =
  process.env.OPENCLAW_URL ||
  "http://localhost:11434/v1/chat/completions";


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

You are MUSE,
an intelligent museum guide robot.

Your personality:
- Friendly
- Curious
- Educational
- Calm
- Slightly enthusiastic
- Respectful to all ages

Rules:
- Keep responses concise (50-120 words)
- Use simple language
- Never overload the visitor with facts
- Explain things naturally
- Encourage curiosity
- Avoid sounding robotic
- Speak like a real museum guide

When explaining artifacts:
- Explain why the object mattered
- Mention historical context
- Mention how people used it
- Add one memorable detail or story
- Make visitors feel connected to history

If appropriate:
- Express wonder
- Compare old life to modern life
- Ask short curiosity questions

If the visitor asks follow-up questions:
- Remember previous discussion
- Continue naturally
- Avoid repeating yourself

You are physically inside a museum speaking to visitors.

`;

function buildMusePrompt(language) {
  const languageLabels = {
    'hi-IN': 'Hindi',
    'fr-FR': 'French',
    'en-US': 'English'
  };
  const languageLabel = languageLabels[language] || language;

  return `${MUSE_SYSTEM_PROMPT}
IMPORTANT LANGUAGE RULE:
Respond ONLY in this language: ${languageLabel}
If language is hi-IN → respond in Hindi
If language is fr-FR → respond in French
If language is en-US → respond in English
`;
}

app.use(express.json());

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

Current visitor location:
${mapContext.currentLocation || "Unknown"}

Current position:
x=${mapContext.currentPosition?.x},
y=${mapContext.currentPosition?.y}

Destination:
${mapContext.targetLocation || "None selected"}

Available museum areas:
${
  mapContext.locations
    ?.map(
      l =>
        `- ${l.label}`
    )
    .join("\n") ||
  "Unknown"
}

Navigation rules:
- Give short practical directions
- Mention nearby landmarks
- Be concise
- If a destination is selected,
  explain how to reach it
- Never invent locations
- If the visitor asks
  "where am I",
  use the current location
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

    const answer =
      data.choices?.[0]
        ?.message
        ?.content ||
      "I could not answer that.";

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
app.get(
  '/api/robot-position',
  (req, res) => {
    res.json(robotPosition);
  }
);

/*
  UPDATE POSITION
  For Raspberry Pi
*/
app.post(
  '/api/robot-position',
  (req, res) => {
    const { x, y } =
      req.body || {};

    if (
      typeof x === 'number' &&
      typeof y === 'number'
    ) {
      robotPosition = {
        x,
        y
      };
    }

    res.json({
      success: true,
      position:
        robotPosition
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
  socket.on("visitorMessage", async data => {
    try {
      const {
        message,
        sessionId = socket.id
      } = data;

      const memory =
        getVisitorMemory(sessionId);

      saveToMemory(memory, "user", message);

      const result = await callOpenclaw({
        model: "gemma4:31b-cloud",
        messages: [
          {
            role: "system",
            content:
              MUSE_SYSTEM_PROMPT
          },
          ...memory.slice(-8)
        ],
        temperature: 0.7,
        max_tokens: 180
      });


      const reply =
        result.choices?.[0]?.message
          ?.content ||
        "I could not respond.";

      saveToMemory(
        memory,
        "assistant",
        reply
      );

      socket.emit("museReply", {
        text: reply
      });

    } catch (err) {
      console.error(err);

      socket.emit("museReply", {
        text:
          "Museum assistant unavailable."
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(
      "Touchscreen disconnected"
    );
  });
});

/*
  START SERVER
*/
server.listen(PORT, () => {
  console.log(
    `Museum Robot Running: http://localhost:${PORT}`
  );
});