import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" }));
app.use(morgan("tiny"));

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODEL  = process.env.GEMINI_CHAT_MODEL  || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const API_KEY     = process.env.GEMINI_API_KEY;

async function gemini(model, body) {
  const r = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const errorText = await r.text();
    console.error("Google API Error:", errorText);
    throw new Error(`Google API Error: ${errorText}`);
  }
  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return {
    text: parts.find(p => p.text)?.text || "",
    image_b64: parts.find(p => p.inlineData)?.inlineData?.data || null
  };
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL })
);

app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt.trim()) return res.status(400).json({ error: "prompt required" });
    const out = await gemini(IMAGE_MODEL, { contents: [{ parts: [{ text: prompt }]}] });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt.trim()) return res.status(400).json({ error: "prompt required" });
    if (!Array.isArray(images) || images.length === 0) return res.status(400).json({ error: "images[] required" });

    const systemInstruction = { parts: [{ text: "You are an expert photo editor. Follow the prompt faithfully while preserving subjects and composition when asked." }] };
    const parts = [
      ...images.map(x => ({
        inlineData: { mimeType: x.startsWith("iVBORw0") ? "image/png" : "image/jpeg", data: x }
      })),
      { text: prompt }
    ];

    const out = await gemini(IMAGE_MODEL, { systemInstruction, contents: [{ parts }] });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// CHAT ENDPOINT
app.post("/chat", async (req, res) => {
  try {
    const { history = [], message = "" } = req.body || {};
    const userMsg = String(message ?? "").trim();
    if (!userMsg) return res.status(400).json({ error: "message required" });

    const toGeminiRole = r => (r === "ai" || r === "assistant" || r === "model" ? "model" : "user");

    const prior = Array.isArray(history) ? history : [];
    const contents = [
      ...prior
        .map(m => ({
          role: toGeminiRole(m?.role),
          text: String(m?.content ?? m?.text ?? "").trim()
        }))
        .filter(m => m.text.length > 0)
        .map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: "user", parts: [{ text: userMsg }] }
    ];

    const out = await gemini(CHAT_MODEL, { contents });
    res.json({ text: out.text, model: CHAT_MODEL });
  } catch (e) {
    res.status(500).json({ error: String(e.message||e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));
