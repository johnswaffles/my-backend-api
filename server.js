import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

// ---- Models ----
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// ---- Simple in-memory store ----
const sessions = {};
const MAX_HISTORY = 10;

// ---- Health ----
app.get("/health", (_req, res) => {
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL });
});

// ---- Chat with memory ----
app.post("/chat", async (req, res) => {
  try {
    const { prompt, sessionId } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const sid = sessionId || "default";

    // Initialize history if not exists
    if (!sessions[sid]) sessions[sid] = [];

    // Add user message
    sessions[sid].push({ role: "user", text: prompt });
    if (sessions[sid].length > MAX_HISTORY) sessions[sid] = sessions[sid].slice(-MAX_HISTORY);

    // Build contents
    const contents = sessions[sid].map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const url = `${GEMINI_BASE}/${CHAT_MODEL}:generateContent`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ contents })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(resp.status).json({ error: `google: ${txt}` });
    }
    const data = await resp.json();

    let out = null;
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) if (p.text) { out = p.text; break; }

    if (!out) return res.status(502).json({ error: "no text in response" });

    // Save assistant reply
    sessions[sid].push({ role: "model", text: out });
    if (sessions[sid].length > MAX_HISTORY) sessions[sid] = sessions[sid].slice(-MAX_HISTORY);

    res.json({ provider: "google-gemini", model: CHAT_MODEL, output: out, sessionId: sid });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---- Image ----
app.post("/image", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const url = `${GEMINI_BASE}/${IMAGE_MODEL}:generateContent`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }]}]
      })
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(resp.status).json({ error: `google: ${txt}` });
    }
    const data = await resp.json();

    let b64 = null;
    const parts = data?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) if (p.inlineData?.data) { b64 = p.inlineData.data; break; }

    if (!b64) return res.status(502).json({ error: "no image in response" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: b64, synthid: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// ---- Listen ----
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

