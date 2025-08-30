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

function stripGrounding(obj) {
  const bad = new Set([
    "tools","toolConfig","groundingSpec","groundingConfig",
    "googleSearchRetrieval","google_search_retrieval","searchGrounding"
  ]);
  (function walk(o){
    if (!o || typeof o !== "object") return;
    for (const k of Object.keys(o)) {
      if (bad.has(k)) delete o[k];
      else walk(o[k]);
    }
  })(obj);
  return obj;
}
function parseCandidates(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return {
    text: parts.find(p => p.text)?.text || "",
    image_b64: parts.find(p => p.inlineData)?.inlineData?.data || null
  };
}
async function callGoogle(model, body) {
  const url = `${BASE}/${model}:generateContent`;
  const clean = stripGrounding(JSON.parse(JSON.stringify(body)));
  let r = await fetch(url, {
    method: "POST",
    headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(clean)
  });
  if (!r.ok) {
    const firstErr = await r.text();
    if (/Search Grounding|google_search/i.test(firstErr)) {
      const minimal = stripGrounding(clean);
      r = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(minimal)
      });
      if (!r.ok) throw new Error(firstErr);
    } else {
      throw new Error(firstErr);
    }
  }
  const data = await r.json();
  return parseCandidates(data);
}

app.get("/health", (_req, res) =>
  res.json({ ok: true, chat_model: CHAT_MODEL, image_model: IMAGE_MODEL })
);

app.post("/image", async (req, res) => {
  try {
    const { prompt = "" } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    const out = await callGoogle(IMAGE_MODEL, {
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: { response_mime_type: "image/png" }
    });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

app.post("/image-edit", async (req, res) => {
  try {
    const { prompt = "", images = [] } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "prompt required" });
    if (!images.length) return res.status(400).json({ error: "images[] required" });
    const systemInstruction = { parts: [{ text: "You are an expert photo editor. Keep identity and palette, but change camera, composition, and scene as instructed." }] };
    const contents = [{
      parts: [
        ...images.map(x => ({ inlineData: { mimeType: x.startsWith("iVBORw0") ? "image/png" : "image/jpeg", data: x }})),
        { text: prompt }
      ]
    }];
    const out = await callGoogle(IMAGE_MODEL, { systemInstruction, contents });
    if (!out.image_b64) return res.status(502).json({ error: "no image" });
    res.json({ image_b64: out.image_b64, model: IMAGE_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

app.post("/chat", async (req, res) => {
  try {
    const { history = [], message = "" } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });
    const contents = history.map(item => ({
      role: item.role === "ai" ? "model" : "user",
      parts: [{ text: item.text }]
    }));
    contents.push({ role: "user", parts: [{ text: message }] });
    const out = await callGoogle(CHAT_MODEL, {
      contents,
      generationConfig: { response_mime_type: "text/plain" }
    });
    res.json({ text: out.text, model: CHAT_MODEL });
  } catch (e) { res.status(500).json({ error: String(e.message||e) }); }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on :${port}`));
