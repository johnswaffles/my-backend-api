/* ───────────────────────────────────────────────────────────────
   server.js  ·  OpenAI-only chat / vision / speech backend
────────────────────────────────────────────────────────────────── */

import express             from "express";
import multer              from "multer";
import cors                from "cors";
import dotenv              from "dotenv";
import OpenAI              from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream }  from "fs";
import { randomUUID }        from "crypto";
import { pipeline }          from "stream/promises";

dotenv.config();

/* ── defaults (env-vars override) ─────────────────────────────── */
const PORT        = process.env.PORT  || 3000;
const CHAT_MODEL  = process.env.MODEL || "gpt-4.1-nano";
const VISION_MODEL= "gpt-4.1-nano";
const S2T_MODEL   = process.env.S2T_MODEL || "gpt-4o-transcribe";
const TTS_MODEL   = process.env.TTS_MODEL || "gpt-4o-mini-tts";  // ← sample’s model
const openai      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express plumbing ─────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits:{ fileSize: 25_000_000 } });

/* ───────────────────────────────────────────────────────────────
   POST /api/speech   –  text → speech  (OpenAI only, MP3 stream)
────────────────────────────────────────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text = "", voice = "echo" } = req.body;

    /* get a streaming response (MP3) */
    const response = await openai.audio.speech.with_streaming_response.create({
      model : TTS_MODEL,          // gpt-4o-mini-tts
      voice ,                     // echo, alloy, …
      input : text
      // default format is mp3 – fine for browsers
    });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="speech.mp3"'
    });

    // Pipe OpenAI stream → client
    await pipeline(response, res);
  } catch (err) {
    console.error("tts error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* ─────────────────────  chat  ───────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = Array.isArray(history)
      ? history.filter(m => m && typeof m.content === "string" && m.content.trim())
      : [];

    const chat = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages,
      stream  : false
    });
    res.json({ reply: chat.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ───────────  OPTIONAL: vision endpoint (kept if you had it) ───────────
   … your /api/analyze handler here …
   (No changes needed for the speech fix.)                              */

/* health */
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);
