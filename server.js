/* ───────────────────────────────────────────────────────────────
  /* ─────────────────────────────  server.js  ─────────────────────────────
   Chat & vision:  GPT-4.1-nano
   TTS          :  ElevenLabs only (Data-URL JSON)
───────────────────────────────────────────────────────────────────────── */

import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import OpenAI  from "openai";
import multer  from "multer";
dotenv.config();

/* env ----------------------------------------------------------------- */
const PORT        = process.env.PORT || 3000;
const MODEL       = process.env.MODEL || "gpt-4.1-nano";
const ELEVEN_KEY  = process.env.ELEVENLABS_API_KEY  || "";
const ELEVEN_ID   = process.env.ELEVENLABS_VOICE_ID || "Bella";
const openai      = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* express -------------------------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const upload = multer({ storage: multer.memoryStorage(),
                        limits : { fileSize: 25 * 1024 * 1024 } });

/* /api/chat ------------------------------------------------------------ */
app.post("/api/chat", async (req,res)=>{
  try{
    const msgs = Array.isArray(req.body.history)?req.body.history:[];
    if (msgs[0]?.role==="assistant") msgs.unshift({role:"user",content:""});
    const out = await openai.chat.completions.create({model:MODEL,messages:msgs});
    res.json({reply:out.choices[0].message.content});
  }catch(e){console.error("chat error:",e.message);res.status(500).json({error:"chat failed"});}
});

/* /api/analyze --------------------------------------------------------- */
app.post("/api/analyze", upload.single("file"), async (req,res)=>{
  try{
    if(!req.file?.buffer) return res.status(400).json({error:"file missing"});
    const url=`data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    const q=(req.body.prompt||"").trim();
    const msgs=q?
      [{role:"system",content:"Answer using ONLY the image."},
       {role:"user",content:[{type:"image_url",image_url:{url}},{type:"text",text:q}]}]:
      [{role:"user",content:[{type:"image_url",image_url:{url}},
                             {type:"text",text:"Describe image in two sentences then ask a follow-up."}]}];
    const out=await openai.chat.completions.create({model:MODEL,messages:msgs});
    res.json({answer:out.choices[0].message.content});
  }catch(e){console.error("analyze error:",e.message);res.status(500).json({error:"analyze failed"});}
});

/* /api/speech  (FIXED) ------------------------------------------------- */
app.post("/api/speech", async (req,res)=>{
  try{
    if(!ELEVEN_KEY||!ELEVEN_ID) throw new Error("ElevenLabs credentials missing");
    const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_ID}`,{
      method:"POST",
      headers:{ "xi-api-key":ELEVEN_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({ text:req.body.text||"", model_id:"eleven_multilingual_v2"})
    });
    if(!r.ok) throw new Error(`ElevenLabs ${r.status}`);
    const b64=Buffer.from(await r.arrayBuffer()).toString("base64");
    res.json({ audio:`data:audio/mpeg;base64,${b64}` });
  }catch(e){
    console.error("tts error:",e.message);
    res.status(500).json({ error:"tts failed" });
  }
});

/* /api/health ---------------------------------------------------------- */
app.get("/api/health",(_,res)=>res.json({status:"ok"}));

app.listen(PORT,()=>console.log(`✅  Server ready → http://localhost:${PORT}`));



