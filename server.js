//--------------------------------------------------------------------
//  NovaMind o4  •  minimal back-end (Chat Completions + ElevenLabs TTS)
//--------------------------------------------------------------------
import OpenAI  from "openai";
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import fetch   from "node-fetch";
dotenv.config();

/* ------------ sanity-check required secrets ----------------------- */
if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
  console.error("❌  Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID env vars");
  process.exit(1);
}

/* ------------ OpenAI client --------------------------------------- */
const openai = new OpenAI();

/* ------------ Express setup --------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json());

/* ------------ /chat  (text only) ---------------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const history  = req.body.history ?? [];
    const messages = history.map(({ role, text }) => ({
      role   : role === "ai" ? "assistant" : role,  // map 'ai' ➜ 'assistant'
      content: text
    }));

    const { choices } = await openai.chat.completions.create({
      model   : process.env.CHAT_MODEL || "o4-mini",
      messages
    });

    res.json({ reply: choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

/* ------------ /speech  (ElevenLabs TTS) --------------------------- */
app.post("/speech", async (req, res) => {
  try {
    const text = req.body.text || "Hello from NovaMind o4";

    const tts = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {
        method : "POST",
        headers: {
          "xi-api-key"  : process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept        : "audio/mpeg"
        },
        body    : JSON.stringify({ text })
      }
    );

    if (!tts.ok) {                       // Bad voice ID or quota error
      console.error("ElevenLabs error", await tts.text());
      return res.status(502).end();
    }

    res.setHeader("Content-Type", "audio/mpeg");
    tts.body.pipe(res);                  // stream audio back to browser
  } catch (e) {
    console.error(e);
    res.status(502).end();
  }
});

/* ------------ serve static files (Squarespace embed optional) ----- */
app.use(express.static("public"));

/* ------------ launch ---------------------------------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 running on :${PORT}`));

