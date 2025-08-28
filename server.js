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

// This endpoint is for generating an image from only text.
app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const out = await gemini(IMAGE_MODEL, { contents: [{ parts: [{ text: prompt }]}] });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

// *** REWRITTEN ENDPOINT FOR IMAGE EDITING ***
app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });

    // This is the new, more effective instruction for direct image editing.
    const systemInstruction = {
      parts: [{ text:
        "You are an expert photo editor. The user has provided an image and a text prompt. " +
        "Your task is to edit the image based on the instructions in the text prompt. " +
        "Preserve the original image's subjects, poses, and composition exactly. " +
        "Only apply the specific stylistic changes requested. " +
        "Return only the single, edited image."
      }]
    };

    // Construct the multimodal payload: text prompt + all reference images.
    const contents = [{
      parts: [
        { text: prompt },
        ...images.map(x => ({
          inlineData: { mimeType: x.startsWith("iVBORw0") ? "image/png" : "image/jpeg", data: x }
        }))
      ]
    }];
    
    // Call the image model with the system instruction and the multimodal content.
    const out = await gemini(IMAGE_MODEL, { systemInstruction, contents });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });

    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));
