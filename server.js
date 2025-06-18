/* ─── server.js – v2  (uses gpt-4o-audio-preview) ──────────── */
import express from "express";
import multer  from "multer";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";

dotenv.config();

/* model defaults */
const PORT        = process.env.PORT || 3000;
const CHAT_MODEL  = process.env.MODEL      || "gpt-4o-audio-preview";   // text+audio chat
const S2T_MODEL   = process.env.S2T_MODEL  || "gpt-4o-mini-transcribe"; // speech→text
const TTS_MODEL   = process.env.TTS_MODEL  || "gpt-4o-audio-preview";   // text→speech

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* express */
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* multer in-memory (25 MB max) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 25_000_000 }
});

/* ── Speech → text ─────────────────────────────────────────── */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if(!req.file?.buffer) throw new Error("Empty audio buffer");

    const transcription = await openai.audio.transcriptions.create({
      model: S2T_MODEL,
      file : { data: req.file.buffer,
               name: req.file.originalname || "speech.webm" },
      response_format: "text"
    });

    res.json({ text: transcription.text || transcription });
  } catch (err) {
    console.error("transcribe error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "transcription failed" });
  }
});

/* ── Chat completion ──────────────────────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;
    const chat = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages: history,
      stream  : false
    });
    res.json({ reply: chat.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ── Text → speech ─────────────────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice : "shimmer",      // works with gpt-4o-audio-preview
      input : text,
      format: "wav"
    });
    res.set({ "Content-Type": "audio/wav" });
    res.send(Buffer.from(await audio.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* health */
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);

