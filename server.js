import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" })); // allow base64 images
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

// analyze endpoint
app.post("/analyze", async (req, res) => {
  try {
    const { images = [] } = req.body || {};
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    const body = {
      systemInstruction: { parts: [{ text:
        "You analyze images. Reply with concise bullet points: subject, scene, colors, style, mood, camera angle, visible text, notable details."
      }]},
      contents: [{
        parts: images.map(b64 => ({
          inlineData: {
            mimeType: b64.startsWith("iVBORw0") ? "image/png" : "image/jpeg",
            data: b64
          }
        }))
      }]
    };

    const out = await gen(CHAT_MODEL, body);
    res.json({ summary: out.text });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// text → image
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

// image edit (force true style transform)
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    const SYSTEM =
      "You are an IMAGE EDITOR. Always apply a VISIBLE transformation. " +
      "Preserve subject identity and composition unless told otherwise. " +
      "Re-render in the requested STYLE (e.g., watercolor/oil/pencil). " +
      "Never return the unedited source image. Output exactly one EDITED image.";

    const STYLE_HINTS =
      "If asked for watercolor, add brush strokes, pigment pooling, paper texture. " +
      "Do NOT copy source pixels; re-render in the new style.";

    const parts = [
      ...images.map(b64 => ({
        inlineData: {
          mimeType: b64.startsWith("iVBORw0") ? "image/png" : "image/jpeg",
          data: b64
        }
      })),
      { text: `EDIT INSTRUCTIONS: ${prompt}\n${STYLE_HINTS}\nReturn only the edited PNG.` }
    ];

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: { response_mime_type: "image/png" },
      contents: [{ parts }]
    };

    const out = await gen(IMAGE_MODEL, body);
    if (!out.image_b64) return res.status(502).json({ error: "no image" });

    res.json({ provider: "google-gemini", model: IMAGE_MODEL, image_b64: out.image_b64, synthid: true });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));

