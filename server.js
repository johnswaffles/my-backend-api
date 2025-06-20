// server.js  ──────────────────────────────────────────────────────────
import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
dotenv.config();

/* OpenAI client */
const openai = new OpenAI();

/* Express app */
const app = express();
app.use(cors());
app.use(express.json());

/* -------------- Chat endpoint (no web-search) -----------------------*/
app.post("/chat", async (req, res) => {
  try {
    const history = req.body.history ?? [];
    /* map history into Chat-Completions format */
    const messages = history.map(({ role, text }) => ({
      role: role === "ai" ? "assistant" : role, // convert 'ai' ➜ 'assistant'
      content: text
    }));

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "o4-mini",
      messages
    });

    const reply = completion.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

/* -------------- ElevenLabs text-to-speech --------------------------*/
app.post("/speech", async (req, res) => {
  try {
    const text = req.body.text || "Hello from NovaMind o4";
    const tts = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text })
      }
    );
    res.setHeader("Content-Type", "audio/mpeg");
    tts.body.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
});

/* serve front-end */
app.use(express.static("public"));

/* start server */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 running on :${PORT}`));

