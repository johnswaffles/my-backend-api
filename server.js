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

async function gen(model, body) {
  const r = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `google ${r.status}`);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return {
    text: parts.find(p => p.text)?.text || "",
    image_b64: parts.find(p => p.inlineData)?.inlineData?.data || null
  };
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL })
);

// Analyze
app.post("/analyze", async (req, res) => {
  try {
    const { images = [] } = req.body || {};
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    const body = {
      systemInstruction: { parts: [{ text:
        "You analyze images. Reply with concise bullet points: subject, scene, colors, style, mood, camera angle, visible text, notable details."
      }]},
      contents: [{
        parts: [
          ...images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 }}))
        ]
      }]
    };

    const out = await gen(CHAT_MODEL, body);
    res.json({ summary: out.text });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// Text → image
app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });

    const body = { contents: [{ parts: [{ text: prompt }]}] };
    const out = await gen(IMAGE_MODEL, body);
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: out.image_b64, synthid: true });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// Image edit (force true style transform)
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    // Hard guardrails: never return the original unchanged image
    const systemText =
      "You are an image editor. Always apply visible edits. If instructions request a style change " +
      "(e.g., watercolor/oil/pencil), transform the rendering style across the whole image while " +
      "preserving identity and composition unless told otherwise. Never return the source image unchanged. " +
      "Output exactly one edited image.";

    // Important: put images FIRST, then the instruction text
    const body = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents: [{
        parts: [
          ...images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 }})),
          { text: `EDIT INSTRUCTIONS: ${prompt}\nMake the change obvious. Do not return the original.` }
        ]
      }]
    };

    const out = await gen(IMAGE_MODEL, body);
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: out.image_b64, synthid: true });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

