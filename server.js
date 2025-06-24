/* ───────────────────────────────────────────────────────────────
   server.js  ·  voice + chat + vision backend
────────────────────────────────────────────────────────────────── */

import express              from "express";
import multer               from "multer";
import cors                 from "cors";
import dotenv               from "dotenv";
import OpenAI               from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream }  from "fs";
import { randomUUID }        from "crypto";
import path                  from "path";

dotenv.config();

/* ── model defaults (env vars override) ───────────────────────── */
const PORT         = process.env.PORT         || 3000;
const CHAT_MODEL   = process.env.MODEL        || "gpt-4o-audio-preview";
const S2T_MODEL    = process.env.S2T_MODEL    || "gpt-4o-transcribe";   // or whisper-1
const TTS_MODEL    = process.env.TTS_MODEL    || "gpt-4o-audio-preview";
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";         // image analysis

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express setup ────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 25_000_000 }     // 25 MB
});

/* ───────────────────────────────────────────────────────────────
   POST /api/transcribe  – speech → text (English)
────────────────────────────────────────────────────────────────── */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer) throw new Error("Empty audio buffer");

    const tmp = `/tmp/${randomUUID()}.webm`;
    await writeFile(tmp, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      model : S2T_MODEL,
      file  : createReadStream(tmp),
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
   POST /api/chat  – LLM completion (English)
────────────────────────────────────────────────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = Array.isArray(history) ? history.filter(
      m => m && typeof m.content === "string" && m.content.trim().length
    ) : [];

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
   POST /api/speech  – text → speech (wav, shimmer)
────────────────────────────────────────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice : "shimmer",
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
   POST /api/analyze  – image / PDF → description + follow-up
────────────────────────────────────────────────────────────────── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) throw new Error("No file provided");

    /* save buffer to temp-file (OpenAI Files API needs a stream) */
    const ext  = path.extname(req.file.originalname || ".bin");
    const tmp  = `/tmp/${randomUUID()}${ext}`;
    await writeFile(tmp, req.file.buffer);

    /* create a file-id for vision */
    const fileResult = await openai.files.create({
      file    : createReadStream(tmp),
      purpose : "vision"
    });
    const file_id = fileResult.id;

    /* run the vision model */
    const response = await openai.responses.create({
      model : VISION_MODEL,
      input : [{
        role    : "user",
        content : [
          { type:"input_text",  text: "Describe this file briefly, then ask: 'Would you like to know anything in particular about this file?'" },
          { type:"input_image", file_id }
        ]
      }]
    });

    await unlink(tmp).catch(()=>{});
    res.json({ analysis: response.output_text });
  } catch (err) {
    console.error("analyze error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "analyze failed" });
  }
});

/* health -----------------------------------------------------------*/
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);
