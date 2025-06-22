//--------------------------------------------------------------------
//  NovaMind o4 - tiny API for Chat, Vision, Image & optional TTS
//--------------------------------------------------------------------
import OpenAI  from "openai";
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import fetch   from "node-fetch";         // node ≥20 already has fetch; harmless if duplicated
dotenv.config();

/* ------------ required keys --------------------------------------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌  Missing OPENAI_API_KEY"); process.exit(1);
}
const haveTTS = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID;

/* ------------ clients --------------------------------------------- */
const openai = new OpenAI();

/* ------------ express --------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json({ limit: "8mb" }));    // large enough for base-64 images

/* ---------- /chat -------------------------------------------------- */
app.post("/chat", async (req, res) => {
  try {
    const history  = req.body.history ?? [];
    const messages = history.map(({ role, text }) => ({
      role   : role === "ai" ? "assistant" : role,
      content: text
    }));

    const { choices } = await openai.chat.completions.create({
      model   : process.env.CHAT_MODEL || "gpt-4.1-nano",
      messages
    });

    res.json({ reply: choices[0].message.content.trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "chat-error" });
  }
});

/* ---------- /speech  (ElevenLabs) --------------------------------- */
app.post("/speech", async (req, res) => {
  if (!haveTTS) return res.status(501).end();   // not configured
  try {
    const text = req.body.text || "Hello from Johnny Five!";
    const tts  = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {
        method : "POST",
        headers: {
          "xi-api-key"  : process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept        : "audio/mpeg"
        },
        body   : JSON.stringify({ text })
      }
    );
    if (!tts.ok) {
      console.error("ElevenLabs", await tts.text());
      return res.status(502).end();
    }
    res.setHeader("Content-Type", "audio/mpeg");
    tts.body.pipe(res);
  } catch (e) {
    console.error(e); res.status(502).end();
  }
});

/* ---------- /vision  (image ➜ text) --------------------------------
   Expects { b64:"data:image/…", prompt?:string, detail?:"low|high|auto" }
   ------------------------------------------------------------------ */
app.post("/vision", async (req, res) => {
  try {
    const { b64, prompt, detail = "auto" } = req.body;

    const messages = [{
      role   : "user",
      content: [
        { type: "text",      text: prompt || "What’s in this image?" },
        { type: "image_url", image_url: { url: b64, detail } }      // ⭐ object, not raw string
      ]
    }];

    const { choices } = await openai.chat.completions.create({
      model   : "gpt-4.1-nano",
      messages
    });

    res.json({ reply: choices[0].message.content.trim() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "vision-error" });
  }
});

/* ------------ /image  (GPT-Image-1 generation) ------------------- */
app.post("/image", async (req, res) => {
  try {
    const { prompt } = req.body;               // <-- only the prompt

    /* One-shot call; no parameters object allowed */
    const { output } = await openai.responses.create({
      model: "gpt-image-1",
      input: prompt,
      tools: [{ type: "image_generation" }]    // <-- keep it this simple
    });

    /* Extract the first generated PNG */
    const img64 = output
      .find(o => o.type === "image_generation_call")?.result;

    if (!img64) return res.status(502).json({ error: "no_image" });
    res.json({ b64: img64 });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "img_gen_failed" });
  }
});

/* ---------- static files (optional) ------------------------------- */
app.use(express.static("public"));

/* ---------- go! ---------------------------------------------------- */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`NovaMind o4 listening on :${PORT}`));
