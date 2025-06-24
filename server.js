/* ─────────────────────────  server.js  ───────────────────────────
   • /api/chat      – GPT-4o-mini text chat
   • /api/analyze   – Vision Q-and-A with uploaded image
   • /api/speech    – OpenAI TTS (mp3)
   • /api/health    – simple health check
   ES-module syntax · Node 18+ / 20+
─────────────────────────────────────────────────────────────────── */

import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";
import multer  from "multer";          // ← single import; don’t duplicate

dotenv.config();

/* ── configuration ─────────────────────────────────────────────── */
const PORT          = process.env.PORT         || 3000;
const CHAT_MODEL    = process.env.CHAT_MODEL   || "gpt-4o-mini";
const VISION_MODEL  = process.env.VISION_MODEL || "gpt-4o-mini";
const TTS_MODEL     = process.env.TTS_MODEL    || "tts-1";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── Express setup ─────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));               // chat / TTS JSON

const upload = multer({                                // image uploads
  storage: multer.memoryStorage(),
  limits : { fileSize: 25 * 1024 * 1024 }              // 25 MB
});

/* ───────────────────────────  /api/chat  ─────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = Array.isArray(history) ? history : [];

    /* OpenAI requires first message not be assistant-role */
    if (messages[0]?.role === "assistant") {
      messages.unshift({ role: "user", content: "" });
    }

    const completion = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.message);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ───────────────────────────  /api/analyze  ──────────────────── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ error: "file missing" });

    const imgDataURL =
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const prompt = (req.body.prompt || "").trim();

    const messages = prompt
      ? [
          { role: "system",
            content: "Answer the user's question using ONLY the image. "
                   + "Do NOT ask follow-up questions." },
          { role: "user",
            content: [
              { type: "image_url", image_url: { url: imgDataURL } },
              { type: "text",      text: prompt }
            ]}
        ]
      : [
          { role: "user",
            content: [
              { type: "image_url", image_url: { url: imgDataURL } },
              { type: "text",
                text: "Describe this image in two short sentences, then ask "
                    + "what the user would like to know." }
            ]}
        ];

    const completion = await openai.chat.completions.create({
      model   : VISION_MODEL,
      messages
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    console.error("analyze error:", err.message);
    res.status(500).json({ error: "analyze failed" });
  }
});

/* ───────────────────────────  /api/speech  ───────────────────── */
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

/* ───────────────────────────  /api/health  ───────────────────── */
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

/* ───────────────────────────  start  ─────────────────────────── */
app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);
