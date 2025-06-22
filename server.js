//--------------------------------------------------------------------
//  NovaMind o4  ·  mini-backend   (Chat · Vision · Image · TTS)
//--------------------------------------------------------------------
import OpenAI  from "openai";
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import fetch   from "node-fetch";
dotenv.config();

/* --- sanity check --------------------------------------------------*/
["OPENAI_API_KEY","ELEVENLABS_API_KEY","ELEVENLABS_VOICE_ID"]
  .forEach(k => { if (!process.env[k]) { console.error(`❌  Missing ${k}`); process.exit(1);} });

/* --- OpenAI client -------------------------------------------------*/
const openai = new OpenAI();

/* --- Express setup -------------------------------------------------*/
const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));        // ⭐ NEW – large image payloads

/* ───────────── /chat  ───────────────────────────────────────────── */
app.post("/chat", async (req, res) => {
  try {
    const hist = req.body.history ?? [];
    const messages = hist.map(({ role, text }) => ({
      role   : role === "ai" ? "assistant" : role,
      content: text
    }));
    const { choices } = await openai.chat.completions.create({
      model   : process.env.CHAT_MODEL || "gpt-4.1-nano",
      messages
    });
    res.json({ reply: choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI-error" });
  }
});

/* ───────────── /vision  (image-analysis) ────────────────────────── */
app.post("/vision", async (req, res) => {
  try {
    const { imageB64, prompt } = req.body;                 // prompt optional («what’s in this?» etc.)
    if (!imageB64) return res.status(400).end();

    const response = await openai.chat.completions.create({
      model: process.env.IMAGE_MODEL || "gpt-image-1",
      messages: [
        { role: "user", content: prompt || "Please describe this image." },
        {
          role   : "user",
          content: { type: "image_url", image_url: imageB64, detail: "low" }
        }
      ]
    });
    res.json({ answer: response.choices[0].message.content.trim() });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "Vision-error" });
  }
});

/* ───────────── /image  (generate) ───────────────────────────────── */
app.post("/image", async (req, res) => {
  try {
    const { prompt, style = "illustration" } = req.body;
    if (!prompt) return res.status(400).end();

    const img = await openai.chat.completions.create({
      model: process.env.IMAGE_MODEL || "gpt-image-1",
      tools: [{ type: "image_generation" }],
      messages: [{ role: "user", content: prompt }],
      tool_choice: { type: "image_generation", params: { style } }
    });

    const b64 = img.choices[0].message.tool_calls[0].result;
    res.json({ b64 });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "Image-error" });
  }
});

/* ───────────── /speech (ElevenLabs TTS) ─────────────────────────── */
app.post("/speech", async (req, res) => {
  try {
    const txt = req.body.text || "Hello from NovaMind o4";
    const wav = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {
        method : "POST",
        headers: {
          "xi-api-key"  : process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept        : "audio/mpeg"
        },
        body: JSON.stringify({ text: txt })
      }
    );
    if (!wav.ok) return res.status(502).end();
    res.setHeader("Content-Type", "audio/mpeg");
    wav.body.pipe(res);
  } catch (e) { console.error(e); res.status(502).end(); }
});

/* serve static (Squarespace embed, optional) */
app.use(express.static("public"));

/* launch */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 running on :${PORT}`));
