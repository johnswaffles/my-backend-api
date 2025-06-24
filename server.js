/* ───────────────────────────────────────────────────────────────
   server.js · FIXED
   • Chat now uses **gpt-4o-mini**, a text-only model.
   • No other endpoints changed.
────────────────────────────────────────────────────────────────── */

import express              from "express";
import multer               from "multer";
import cors                 from "cors";
import dotenv               from "dotenv";
import OpenAI               from "openai";
import { writeFile, unlink } from "fs/promises";
import { createReadStream }  from "fs";
import { randomUUID }        from "crypto";
import path                  from "path";

dotenv.config();

/* ── default models ───────────────────────────────────────────── */
const PORT         = process.env.PORT         || 3000;
const CHAT_MODEL   = process.env.MODEL        || "gpt-4o-mini";     // ← CHANGED
const S2T_MODEL    = process.env.S2T_MODEL    || "gpt-4o-transcribe";
const TTS_MODEL    = process.env.TTS_MODEL    || "gpt-4o-audio-preview";
const VISION_MODEL = process.env.VISION_MODEL || "gpt-4o-mini";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express setup ────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 25_000_000 }     // 25 MB
});

/* add near top */
import multer from "multer";
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}}); // 10 MB

/* route */
app.post("/api/analyze", upload.single("file"), async (req,res)=>{
  try{
    if(!req.file?.buffer) return res.status(400).json({error:"file missing"});
    const img=`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const q=(req.body.prompt||"").trim();
    const messages=q
      ?[{role:"system",content:"Answer the user's question using ONLY the image, no follow-up questions."},
        {role:"user",content:[{type:"image_url",image_url:{url:img}},{type:"text",text:q}]}]
      :[{role:"user",content:[{type:"image_url",image_url:{url:img}},
                              {type:"text",text:"Give a 2-sentence description then ask what they'd like to know."}]}];

    const gpt=await openai.chat.completions.create({model:process.env.VISION_MODEL||"gpt-4o-mini",messages});
    res.json({answer:gpt.choices[0].message.content});
  }catch(err){console.error(err);res.status(500).json({error:err.message||"vision failure"});}
});

/* ─────────────────────────  speech → text  ───────────────────── */
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer) throw new Error("Empty audio buffer");
    const tmp = `/tmp/${randomUUID()}.webm`;
    await writeFile(tmp, req.file.buffer);

    const transcription = await openai.audio.transcriptions.create({
      model : S2T_MODEL,
      file  : createReadStream(tmp),
      language: "en",
      response_format: "text"
    });

    await unlink(tmp).catch(()=>{});
    res.json({ text: transcription.text });
  } catch (err) {
    console.error("transcribe error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "transcription failed" });
  }
});

/* ─────────────────────────────  chat  ─────────────────────────── */
app.post("/api/chat", async (req, res) => {
  try {
    const { history = [] } = req.body;
    const messages = Array.isArray(history)
      ? history.filter(m=>m && typeof m.content==="string" && m.content.trim())
      : [];

    /* ensure first message is system|user (OpenAI requirement) */
    if (messages.length && messages[0].role === "assistant") {
      messages.unshift({ role:"user", content:"" });
    }

    const chat = await openai.chat.completions.create({
      model   : CHAT_MODEL,
      messages,
      stream  : false
    });

    res.json({ reply: chat.choices[0].message.content });
  } catch (err) {
    console.error("chat error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "chat failed" });
  }
});

/* ─────────────────────────  text → speech  ────────────────────── */
app.post("/api/speech", async (req, res) => {
  try {
    const { text } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice : "shimmer",
      input : text,
      format: "wav"
    });
    res.set({
      "Content-Type": "audio/wav; codecs=1",
      "Content-Disposition": 'inline; filename="reply.wav"'
    });
    res.send(Buffer.from(await audio.arrayBuffer()));
  } catch (err) {
    console.error("tts error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "tts failed" });
  }
});

/* ────────────────────────  image analyze  ─────────────────────── */
app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer) throw new Error("No file provided");
    const type=req.file.mimetype;
    const b64 = req.file.buffer.toString("base64");
    const url = `data:${type};base64,${b64}`;

    const completion = await openai.chat.completions.create({
      model   : VISION_MODEL,
      messages: [{
        role:"user",
        content:[
          {type:"text",text:"Describe this image briefly, then ask: 'Would you like to know anything in particular about this file?'"},
          {type:"image_url",image_url:{url}}
        ]
      }]
    });

    res.json({ analysis: completion.choices[0].message.content });
  } catch (err) {
    console.error("analyze error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "analyze failed" });
  }
});

/* health --------------------------------------------------------- */
app.get("/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () =>
  console.log(`✅  Server ready  →  http://localhost:${PORT}`)
);
