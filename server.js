/* ───────────────────────────────────────────────────────────────
   server.js
   • CHAT & VISION : gpt-4.1-nano
   • TTS           : gpt-4o-mini-tts  (or any model you set)
────────────────────────────────────────────────────────────────── */

import express  from "express";
import cors     from "cors";
import dotenv   from "dotenv";
import OpenAI   from "openai";
import multer   from "multer";
dotenv.config();

/* ── config ──────────────────────────────────────────────────── */
const PORT   = process.env.PORT        || 3000;
const MODEL  = process.env.MODEL       || "gpt-4.1-nano";   // chat & vision
const TTS    = process.env.TTS_MODEL   || "gpt-4o-mini-tts";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ── express & uploads ───────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit:"4mb" }));
const upload = multer({ storage:multer.memoryStorage(),
                        limits :{fileSize:25*1024*1024} });

/* ── /api/chat (text) ────────────────────────────────────────── */
app.post("/api/chat", async (req,res)=>{
  try{
    const messages = Array.isArray(req.body.history)?req.body.history:[];
    if(messages[0]?.role==="assistant") messages.unshift({role:"user",content:""});
    const out = await openai.chat.completions.create({model:MODEL,messages});
    res.json({reply:out.choices[0].message.content});
  }catch(e){
    console.error("chat:",e.response?.data||e.message);
    res.status(500).json({error:"chat failed"});
  }
});

/* ── /api/analyze (vision) ───────────────────────────────────── */
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

    const out = await openai.chat.completions.create({model:MODEL,messages});
    res.json({answer:out.choices[0].message.content});
  }catch(e){
    console.error("analyze:",e.response?.data||e.message);
    res.status(500).json({error:"analyze failed"});
  }
});

/* ── /api/speech (OpenAI TTS) ────────────────────────────────── */
app.post("/api/speech", async (req,res)=>{
  try{
    const { text="", voice="onyx" } = req.body;
    const audio = await openai.audio.speech.create({
      model : TTS,
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

/* ── health ─────────────────────────────────────────────────── */
app.get("/api/health",(_,res)=>res.json({status:"ok"}));
app.listen(PORT,()=>console.log(`✅  Server ready → http://localhost:${PORT}`));
