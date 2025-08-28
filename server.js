import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "15mb" })); // base64 images
app.use(morgan("tiny"));

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODEL  = process.env.GEMINI_CHAT_MODEL  || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const API_KEY = process.env.GEMINI_API_KEY;

// util
async function googleGenerate(parts, model = IMAGE_MODEL) {
  const resp = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error?.message || `google ${resp.status}`);
  const outParts = data?.candidates?.[0]?.content?.parts || [];
  const img = outParts.find(p => p.inlineData)?.inlineData?.data || null;
  const text = outParts.find(p => p.text)?.text || "";
  return { image_b64: img, text };
}

// health
app.get("/health", (_req, res) => res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL }));

// analyze images → text bullets
app.post("/analyze", async (req, res) => {
  try {
    const { images = [] } = req.body || {}; // array of base64 (no data: prefix)
    if (!images.length) return res.status(400).json({ error: "images[] required" });
    const parts = images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }));
    parts.push({ text: "Describe the image(s) in short bullet points: subjects, scene, colors, style, mood, camera angle, text present, notable details." });
    const resp = await googleGenerate(parts, CHAT_MODEL);
    res.json({ summary: resp.text || "" });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// text → image
app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const resp = await googleGenerate([{ text: prompt }], IMAGE_MODEL);
    if (!resp.image_b64) return res.status(502).json({ error: "no image returned" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: resp.image_b64, synthid: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

// image(s) + prompt → edited image
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });
    const parts = [
      ...images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } })),
      { text: prompt }
    ];
    const resp = await googleGenerate(parts, IMAGE_MODEL);
    if (!resp.image_b64) return res.status(502).json({ error: "no image returned" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: resp.image_b64, synthid: true, notes: resp.text || "" });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

