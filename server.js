import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "6mb" })); // allow base64 image posts
app.use(morgan("tiny"));

const CHAT_MODEL  = process.env.GEMINI_CHAT_MODEL  || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// health
app.get("/health", (_req, res) =>
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL })
);

// chat with short memory (optional simple session)
const sessions = {};
const MAX_HISTORY = 10;

app.post("/chat", async (req, res) => {
  try {
    const { prompt, sessionId="default" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    sessions[sessionId] ||= [];
    sessions[sessionId].push({ role: "user", text: prompt });
    if (sessions[sessionId].length > MAX_HISTORY) sessions[sessionId] = sessions[sessionId].slice(-MAX_HISTORY);

    const contents = sessions[sessionId].map(m => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text }]
    }));

    const resp = await fetch(`${BASE}/${CHAT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ contents })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || "google error" });

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const out = parts.find(p => p.text)?.text || null;
    if (!out) return res.status(502).json({ error: "no text in response" });

    sessions[sessionId].push({ role: "model", text: out });
    if (sessions[sessionId].length > MAX_HISTORY) sessions[sessionId] = sessions[sessionId].slice(-MAX_HISTORY);
    res.json({ provider: "google-gemini", model: CHAT_MODEL, output: out, sessionId });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// image generation
app.post("/image", async (req, res) => {
  try {
    const { prompt, size } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const resp = await fetch(`${BASE}/${IMAGE_MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }]}] })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || "google error" });

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const b64 = parts.find(p => p.inlineData?.data)?.inlineData?.data || null;
    if (!b64) return res.status(502).json({ error: "no image in response" });

    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: b64, synthid: true, size: size || "auto" });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// NEW: analyze image(s) → description bullets
app.post("/analyze", async (req, res) => {
  try {
    const { images = [] } = req.body || {}; // array of base64 strings (no data: prefix)
    if (!images.length) return res.status(400).json({ error: "images[] base64 required" });

    const parts = [];
    images.forEach(b64 => parts.push({ inlineData: { mimeType: "image/jpeg", data: b64 }}));
    parts.push({
      text: "Describe the image(s) precisely in short bullet points: subjects, scene, colors, style, mood, camera angle, text present, notable details. Be concise."
    });

    const resp = await fetch(`${BASE}/${CHAT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] })
    });
    const data = await resp.json();
    if (!resp.ok) return res.status(resp.status).json({ error: data.error?.message || "google error" });

    const txt = data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || "";
    res.json({ summary: txt });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

