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

// 1) Analyze helper (image(s) -> scene description)
async function analyzeImages(b64s) {
  const body = {
    systemInstruction: { parts: [{ text:
      "Summarize the image(s) in compact, factual bullet points covering: subjects, pose, clothing/fur/colors, background, camera angle/framing, lighting, style cues. No opinions."
    }]},
    contents: [{ parts: b64s.map(x => ({
      inlineData: { mimeType: x.startsWith("iVBORw0") ? "image/png" : "image/jpeg", data: x }
    })) }]
  };
  const out = await gemini(CHAT_MODEL, body);
  return out.text.trim();
}

// 2) Text -> image
app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const out = await gemini(IMAGE_MODEL, { contents: [{ parts: [{ text: prompt }]}] });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// 3) Edit (pipeline: analyze -> re-render with style)
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    // A) Analyze uploaded image(s)
    const scene = await analyzeImages(images);

    // B) Re-render scene with requested style (no inline source -> avoids echo)
    const styleGuide =
      "Recreate the same scene and composition described. Preserve subject identity and arrangement. " +
      "Apply the requested artistic restyle so the change is clearly visible. Return one image only.";
    const fullPrompt =
      `Scene description (from user photo):\n${scene}\n\n` +
      `Edits to apply: ${prompt}.\n` +
      styleGuide;

    const out = await gemini(IMAGE_MODEL, { contents: [{ parts: [{ text: fullPrompt }]}] });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });

    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

