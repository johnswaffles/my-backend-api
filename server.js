/* ───────────────────────────  server.js  ──────────────────────────
   • /api/chat      – GPT-4o-mini text chat
   • /api/analyze   – vision Q&A with image context
   • /api/speech    – OpenAI TTS (mp3)
   • /api/health    – simple health check
   Node 18+  ·  ES-module syntax
──────────────────────────────────────────────────────────────────── */

import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";
import multer  from "multer";           // ← only ONE import

dotenv.config();

/* ── config ─────────────────────────────────────────────────────── */
const PORT          = process.env.PORT          || 3000;
const CHAT_MODEL    = process.env.CHAT_MODEL    || "gpt-4o-mini";
const VISION_MODEL  = process.env.VISION_MODEL  || "gpt-4o-mini";
const TTS_MODEL     = process.env.TTS_MODEL     || "tts-1";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express setup ──────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));                // chat payloads
const upload = multer({                                 // image payloads
  storage: multer.memoryStorage(),
  limits : { fileSize: 25 * 1024 * 1024 }               // 25 MB
});

/* ───────────────────────────  /api/chat  ──────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const msgs = Array.isArray(history) ? history : [];
    if (msgs[0]?.role === "assistant") msgs.unshift({ role: "user", content: "" });

    const out = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages: msgs
    });
    res.json({ reply: out.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ───────────────────────────  /api/analyze  ───────────────────── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "file missing" });

    const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const q   = (req.body.prompt || "").trim();

    const messages = q
      ? [
          { role: "system", content: "Answer the user's question using ONLY the image. Do NOT ask further questions." },
          { role: "user",   content: [
              { type: "image_url", image_url: { url } },
              { type: "text",      text: q }
          ]}
        ]
      : [
          { role: "user", content: [
              { type: "image_url", image_url: { url } },
              { type: "text", text: "Describe this image in two sentences, then ask what the user would like to know." }
          ]}
        ];

    const out = await openai.chat.completions.create({
      model   : VISION_MODEL,
      messages
    });
    res.json({ answer: out.choices[0].message.content });
  } catch (err) {
    console.error("analyze error:", err.message);
    res.status(500).json({ error: "analyze failed" });
  }
});

/* ───────────────────────────  /api/speech  ────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text = "" } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice : "alloy",
      input : text,
      format: "mp3"
    });
    res.set({ "Content-Type": "audio/mpeg" });
    res.send(Buffer.from(await audio.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err.message);
    res.status(500).json({ error: "tts failed" });
  }
});

/* ───────────────────────────  /api/health  ────────────────────── */
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

/* ───────────────────────────  start  ──────────────────────────── */
app.listen(PORT, () => console.log(`✅  Server ready → http://localhost:${PORT}`));
