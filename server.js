import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

/* sanity-check ElevenLabs creds -------------------------------------*/
if (!process.env.ELEVEN_API_KEY || !process.env.ELEVEN_VOICE_ID) {
  console.error("\n❌  Missing ELEVEN_API_KEY or ELEVEN_VOICE_ID env vars\n");
  process.exit(1);
}

const openai = new OpenAI();
const app = express();
app.use(cors());
app.use(express.json());

/* Chat Completions (no web-search) ----------------------------------*/
app.post("/chat", async (req, res) => {
  try {
    const history = req.body.history ?? [];
    const messages = history.map(({ role, text }) => ({
      role: role === "ai" ? "assistant" : role,
      content: text
    }));
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "o4-mini",
      messages
    });
    res.json({ reply: completion.choices[0].message.content.trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI error" });
  }
});

/* ElevenLabs TTS -----------------------------------------------------*/
app.post("/speech", async (req, res) => {
  try {
    const text = req.body.text || "Hi from NovaMind o4";
    const r = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({ text })
      }
    );
    if (!r.ok) {
      console.error("ElevenLabs error", await r.text());
      return res.status(502).end();
    }
    res.setHeader("Content-Type", "audio/mpeg");
    r.body.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(502).end();
  }
});

app.use(express.static("public"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 running on :${PORT}`));

