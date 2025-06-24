/* ───────────────────────────────────────────────────────────────
   server.js  ·  chat  ·  vision  ·  speech  (OpenAI-only)
────────────────────────────────────────────────────────────────── */

import express             from "express";
import multer              from "multer";
import cors                from "cors";
import dotenv              from "dotenv";
import OpenAI              from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream }  from "fs";
import { randomUUID }        from "crypto";

dotenv.config();

/* ── model defaults ──────────────────────────────────────────── */
const PORT        = process.env.PORT  || 3000;
const CHAT_MODEL  = process.env.MODEL || "gpt-4.1-nano";
const VISION_MODEL= "gpt-4.1-nano";
const S2T_MODEL   = "gpt-4o-transcribe";
const TTS_MODEL   = "gpt-4o-mini-tts";         // OpenAI TTS
const openai      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express plumbing ─────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 25_000_000 }           // 25 MB
});

/* ───────────────────────────────────────────────────────────────
   POST /api/chat
────────────────────────────────────────────────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const messages = (req.body.history || []).filter(m => m?.content?.trim());
    const completion = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages,
      stream  : false
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ───────────────────────────────────────────────────────────────
   POST /api/speech    (returns MP3)
────────────────────────────────────────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text = "", voice = "echo" } = req.body;

    const mp3 = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice ,
      input : text,
      format: "mp3"              // browsers handle natively
    });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'inline; filename="speech.mp3"'
    });
    res.send(Buffer.from(await mp3.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* health */
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);
