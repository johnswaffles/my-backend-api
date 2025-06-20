// server.js  ──────────────────────────────────────────────────────────
import OpenAI from "openai";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI();

const app = express();
app.use(cors());
app.use(express.json());

// ────────── conversation + web-search
app.post("/chat", async (req, res) => {
  try {
    const history = req.body.history ?? [];
    const latestUser = history.at(-1)?.text || "";

    const rsp = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "o4-mini",
      tools: [{ type: "web_search_preview" }],      // <── adds search
      input: latestUser
    });

    res.json({ reply: rsp.output_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI error" });
  }
});

/* ---------- existing ElevenLabs TTS endpoint ----------------------- */
import fetch from "node-fetch";
app.post("/speech", async (req, res) => {
  try {
    const text = req.body.text || "Hello from NovaMind o4";
    const resp = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" +
        process.env.ELEVEN_VOICE_ID + "/stream", {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    });
    res.setHeader("Content-Type", "audio/mpeg");
    resp.body.pipe(res);
  } catch (e) {
    console.error(e); res.status(500).end();
  }
});

app.use(express.static("public"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 live on :${PORT}`));

