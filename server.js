/* ───────────────────────────────────────────────────────────────
   server.js
   • /api/chat      – GPT-4.1-nano (text-only)
   • /api/analyze   – GPT-4o-mini-tts (vision)
   • /api/speech    – GPT-4o-mini-tts (OpenAI TTS, WAV stream)
────────────────────────────────────────────────────────────────── */

import express  from "express";
import cors     from "cors";
import dotenv   from "dotenv";
import OpenAI   from "openai";
import multer   from "multer";
import { randomUUID } from "crypto";
dotenv.config();

/* ── model & port ────────────────────────────────────────────── */
const PORT        = process.env.PORT        || 3000;
const CHAT_MODEL  = process.env.CHAT_MODEL  || "gpt-4.1-nano";
const VISION_MODEL= process.env.VISION_MODEL|| "gpt-4o-mini-tts";
const TTS_MODEL   = process.env.TTS_MODEL   || "gpt-4o-mini-tts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express & multer ───────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit:"4mb" }));
const upload = multer({ storage:multer.memoryStorage(),
                        limits :{fileSize:25*1024*1024} }); // 25 MB

/* ───────────────── /api/chat ───────────────────────────────── */
app.post("/api/chat", async (req,res)=>{
  try{
    const history = Array.isArray(req.body.history)? req.body.history : [];
    if(history[0]?.role==="assistant") history.unshift({role:"user",content:""});
    const out = await openai.chat.completions.create({model:CHAT_MODEL,messages:history});
    res.json({reply:out.choices[0].message.content});
  }catch(e){
    console.error("chat:",e.response?.data||e.message);
    res.status(500).json({error:"chat failed"});
  }
});

/* ───────────────── /api/analyze ────────────────────────────── */
app.post("/api/analyze", upload.single("file"), async (req,res)=>{
  try{
    if(!req.file?.buffer) return res.status(400).json({error:"file missing"});
    const prompt = (req.body.prompt||"").trim();
    const dataURL = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const messages = [{
      role:"user",
      content:[
        {type:"text",text: prompt || "Describe this image in two sentences then ask a follow-up."},
        {type:"image_url",image_url:{url:dataURL}}
      ]
    }];

    const out = await openai.chat.completions.create({model:VISION_MODEL,messages});
    res.json({answer:out.choices[0].message.content});
  }catch(e){
    console.error("analyze:",e.response?.data||e.message);
    res.status(500).json({error:"analyze failed"});
  }
});

/* ───────────────── /api/speech ─────────────────────────────── */
app.post("/api/speech", async (req,res)=>{
  try{
    const { text="", voice="onyx" } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS_MODEL,
      voice,
      input : text,
      format: "wav"
    });
    res.set({
      "Content-Type":"audio/wav; codecs=1",
      "Content-Disposition":'inline; filename="reply.wav"'
    });
    res.send(Buffer.from(await audio.arrayBuffer()));
  }catch(e){
    console.error("tts:",e.response?.data||e.message);
    res.status(500).json({error:"speech failed"});
  }
});

/* ───────────────── /api/health ─────────────────────────────── */
app.get("/api/health",(_,res)=>res.json({status:"ok"}));

app.listen(PORT,()=>console.log(`✅  Server ready  →  http://localhost:${PORT}`));

