/* ───────────────────────────────────────────────────────────────
   server.js   ·   chat + vision + speech backend  (OpenAI only)
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

/* ── model defaults (env vars override) ───────────────────────── */
const PORT        = process.env.PORT  || 3000;
const CHAT_MODEL  = process.env.MODEL || "gpt-4.1-nano";       // chat + RPG, etc.
const VISION_MODEL= "gpt-4.1-nano";                            // image analysis
const S2T_MODEL   = process.env.S2T_MODEL || "gpt-4o-transcribe";
const TTS_MODEL   = process.env.TTS_MODEL || "gpt-4o-mini-tts"; // <-- here
const openai      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express setup ────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 25_000_000 }         // 25 MB
});

/* ───────────────────────────────────────────────────────────────
   POST /api/transcribe   – speech → text
────────────────────────────────────────────────────────────────── */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer) throw new Error("Empty audio buffer");

    const tmp = `/tmp/${randomUUID()}.webm`;
    await writeFile(tmp, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      model   : S2T_MODEL,
      file    : createReadStream(tmp),
      language: "en",
      response_format: "text"
    });

    await unlink(tmp).catch(() => {});
    res.json({ text: transcription.text });
  } catch (err) {
    console.error("transcribe error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "transcription failed" });
  }
});

/* ───────────────────────────────────────────────────────────────
   POST /api/chat   – LLM completion
────────────────────────────────────────────────────────────────── */
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

/* ───────────────────────────────────────────────────────────────
   POST /api/speech   – text → speech  (OpenAI TTS only)
────────────────────────────────────────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text = "", voice = "echo" } = req.body;

    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,         // gpt-4o-mini-tts
      voice ,                    // echo, alloy, ash, …
      input : text,
      format: "wav"
    });

    res.set({
      "Content-Type": "audio/wav; codecs=1",
      "Content-Disposition": 'inline; filename="reply.wav"'
    });
    res.send(Buffer.from(await audio.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* ───────────────────────────────────────────────────────────────
   (optional) POST /api/analyze – vision model for image + prompt
   ––––– keep if you already had it; omitted here for brevity
────────────────────────────────────────────────────────────────── */

/* health check */
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () =>
  console.log(`✅  Server ready → http://localhost:${PORT}`)
);
