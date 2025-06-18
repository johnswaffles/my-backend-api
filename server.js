import express from "express";
import multer  from "multer";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";

dotenv.config();

const PORT        = process.env.PORT || 3000;
const CHAT_MODEL  = process.env.MODEL      || "gpt-4o-mini";
const S2T_MODEL   = process.env.S2T_MODEL  || "gpt-4o-mini-transcribe";
const TTS_MODEL   = process.env.TTS_MODEL  || "gpt-4o-mini-tts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ limits: { fileSize: 25_000_000 } }); // 25 MB

/* ── Speech → text ────────────────────────────── */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    const { buffer } = req.file;
    const transcript = await openai.audio.transcriptions.create({
      model: S2T_MODEL,
      file:  { buffer, name: "speech.webm" },
      response_format: "text"
    });
    res.json({ text: transcript });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "transcription failed" });
  }
});

/* ── Chat completion ──────────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body;
    const resp = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: history,
      stream: false
    });
    res.json({ reply: resp.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ── Text → speech ────────────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const tts = await openai.audio.speech.create({
      model:  TTS_MODEL,
      voice:  "alloy",
      input:  text,
      format: "wav"
    });
    res.set({ "Content-Type": "audio/wav" });
    res.send(Buffer.from(await tts.arrayBuffer()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* Health check */
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);

