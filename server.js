import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const app  = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VOICE_ID   = process.env.ELEVENLABS_VOICE_ID;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

// ── CHAT ──────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  const history = req.body.history ?? [];               // [{role,text},…]

  // build OpenAI messages
  const messages = [
    {
      role: 'system',
      content:
        "You are Johnny, a friendly personal assistant. " +
        "Keep answers short and concise unless the user explicitly asks for more. " +
        "Always be helpful."
    },
    ...history.map(m => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.text }))
  ];

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "o4-mini",
    messages
  });

  res.json({ reply: completion.choices[0].message.content });
});

// ── TTS ───────────────────────────────────────────────────────────────
app.post('/speech', async (req, res) => {
  const r = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg'
      },
      body: JSON.stringify({
        text: req.body.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.8 }
      })
    }
  );

  if (!r.ok) {
    const msg = await r.text();
    console.error('TTS failed', r.status, msg);
    return res.status(500).json({ error: msg });
  }
  res.set('Content-Type', 'audio/mpeg');
  r.body.pipe(res);
});

app.listen(port, () => console.log(`Johnny listening on ${port}`));

