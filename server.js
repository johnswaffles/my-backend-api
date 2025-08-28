import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "15mb" })); // large base64
app.use(morgan("tiny"));

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODEL  = process.env.GEMINI_CHAT_MODEL  || "gemini-2.5-flash";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
const API_KEY = process.env.GEMINI_API_KEY;

async function callGemini(model, parts) {
  const r = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `google ${r.status}`);
  const out = data?.candidates?.[0]?.content?.parts || [];
  return {
    text: out.find(p => p.text)?.text || "",
    image_b64: out.find(p => p.inlineData)?.inlineData?.data || null
  };
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL })
);

// Analyze image(s) -> bullets
app.post("/analyze", async (req, res) => {
  try {
    const { images = [] } = req.body || {};
    if (!images.length) return res.status(400).json({ error: "images[] required" });
    const parts = [
      { text: "Describe the image(s) in concise bullet points: subjects, scene, colors, style, mood, camera angle, visible text, notable details." },
      ...images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }))
    ];
    const out = await callGemini(CHAT_MODEL, parts);
    res.json({ summary: out.text });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// Text -> image
app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const out = await callGemini(IMAGE_MODEL, [{ text: prompt }]);
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: out.image_b64, synthid: true });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// Image edit (true transform)
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    // Strong directive to avoid echoing original
    const directive =
      "Transform the following image(s) according to the instructions. " +
      "Preserve composition and identity unless explicitly changed. " +
      "Apply the requested ARTISTIC RESTYLE to the entire image. " +
      "Return ONLY the edited image, not the original.";

    const parts = [
      { text: `${directive}\n\nINSTRUCTIONS: ${prompt}` },
      ...images.map(b64 => ({ inlineData: { mimeType: "image/jpeg", data: b64 } }))
    ];

    const out = await callGemini(IMAGE_MODEL, parts);
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: out.image_b64, synthid: true });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

