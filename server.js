/* ─────────────────────────────  server.js  ─────────────────────────────
   Routes
     /api/chat     – text chat  (GPT-4.1-nano)
     /api/analyze  – vision Q&A (GPT-4.1-nano)
     /api/speech   – ElevenLabs-only TTS
     /api/health   – health check
   Node 18+  ·  ES-module syntax
───────────────────────────────────────────────────────────────────────── */

import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";
import multer  from "multer";
dotenv.config();

/* ── env + defaults ─────────────────────────────────────────────── */
const PORT        = process.env.PORT || 3000;
const MODEL       = process.env.MODEL || "gpt-4.1-nano";  // one var for both
const ELEVEN_KEY  = process.env.ELEVENLABS_API_KEY  || "";
const ELEVEN_ID   = process.env.ELEVENLABS_VOICE_ID || "Bella";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express middleware ─────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));             // chat / TTS JSON
const upload = multer({ storage: multer.memoryStorage(),
                        limits : { fileSize: 25 * 1024 * 1024 }}); // 25 MB

/* ───────────────────────────  /api/chat  ───────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const msgs = Array.isArray(req.body.history) ? req.body.history : [];
    if (msgs[0]?.role === "assistant") msgs.unshift({ role: "user", content: "" });

    const out = await openai.chat.completions.create({
      model   : MODEL,
      messages: msgs
    });
    res.json({ reply: out.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ───────────────────────────  /api/analyze  ────────────────────── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "file missing" });

    const img = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const q   = (req.body.prompt || "").trim();

    const messages = q
      ? [
          { role:"system",
            content:"Answer the user's question using ONLY the image. Do NOT ask follow-up questions."},
          { role:"user",
            content:[ {type:"image_url",image_url:{url:img}},{type:"text",text:q} ]}
        ]
      : [
          { role:"user",
            content:[ {type:"image_url",image_url:{url:img}},
                      {type:"text",
                       text:"Describe this image in two short sentences, then ask what the user wants to know."} ]}
        ];

    const out = await openai.chat.completions.create({ model: MODEL, messages });
    res.json({ answer: out.choices[0].message.content });
  } catch (err) {
    console.error("analyze error:", err.message);
    res.status(500).json({ error: "analyze failed" });
  }
});

/* ───────────────────────────  /api/speech  ─────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    if (!ELEVEN_KEY || !ELEVEN_ID)
      throw new Error("ElevenLabs credentials missing");

    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_ID}`,{
      method :"POST",
      headers:{
        "xi-api-key"  : ELEVEN_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text:req.body.text||"", model_id:"eleven_multilingual_v2" })
    });

    if (!r.ok) throw new Error(`ElevenLabs error ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    res.set({ "Content-Type":"audio/mpeg" }).send(buf);
  } catch (err) {
    console.error("tts error:", err.message);
    res.status(500).json({ error: "tts failed" });
  }
});

/* ───────────────────────────  /api/health  ─────────────────────── */
app.get("/api/health", (_, res) => res.json({ status:"ok" }));

/* ───────────────────────────  start  ───────────────────────────── */
app.listen(PORT, () =>
  console.log(`✅  Server ready  → http://localhost:${PORT}`)
);
