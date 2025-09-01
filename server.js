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

function parseCandidates(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.find(p => p.text)?.text || "";
  const imgp = parts.find(p => p.inlineData || p.inline_data);
  const image_b64 = imgp?.inlineData?.data || imgp?.inline_data?.data || null;
  return { text, image_b64 };
}
async function callGemini(model, body) {
  const url = `${BASE}/${model}:generateContent`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  return parseCandidates(data);
}
async function callChat(messages) {
  const contents = messages.map(m => ({ role: m.role, parts: [{ text: m.text }]}));
  try {
    return await callGemini(CHAT_MODEL, { contents });
  } catch (e) {
    if (String(e).includes("Search Grounding")) {
      const bare = { contents: contents.map(c => ({ role: c.role || "user", parts: c.parts.map(p => ({ text: String(p.text || "") })) })) };
      return await callGemini(CHAT_MODEL, bare);
    }
    throw e;
  }
}

app.get("/health", (_req, res) => res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL }));

app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const out = await callGemini(IMAGE_MODEL, {
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: { response_mime_type: "image/png" }
    });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });
    const contents = [{
      parts: [
        ...images.map(b64 => ({
          inlineData: { mimeType: b64.startsWith("iVBORw0") ? "image/png" : "image/jpeg", data: b64 }
        })),
        { text: prompt }
      ]
    }];
    const out = await callGemini(IMAGE_MODEL, { contents });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { history = [], message = "" } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const msgs = [
      ...history.map(h => ({ role: h.role === "ai" ? "model" : "user", text: h.text })),
      { role: "user", text: message }
    ];
    const out = await callChat(msgs);
    res.json({ text: out.text, model: CHAT_MODEL });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));
