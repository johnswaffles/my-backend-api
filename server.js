//--------------------------------------------------------------------
//  NovaMind o4  •  minimal back-end (chat · TTS · vision · image)
//--------------------------------------------------------------------
import OpenAI  from "openai";
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
import fetch   from "node-fetch";
dotenv.config();

/* ─────────── sanity check ─────────── */
if(!process.env.OPENAI_API_KEY){console.error("❌  Missing OPENAI_API_KEY");process.exit(1);}
if(!process.env.ELEVENLABS_API_KEY||!process.env.ELEVENLABS_VOICE_ID){
  console.error("❌  Missing ELEVENLABS_* env vars");process.exit(1);
}

/* ─────────── OpenAI client ─────────── */
const openai = new OpenAI();

/* ─────────── Express setup ─────────── */
const app = express();
app.use(cors());
app.use(express.json({limit:"3mb"}));          //  ➜ allow images ±2 MB

/* ─────────── /chat ─────────── */
app.post("/chat", async (req,res)=>{
  try{
    const history  = req.body.history ?? [];
    const messages = history.map(({role,text})=>({role:role==="ai"?"assistant":role,content:text}));
    const {choices}= await openai.chat.completions.create({
      model: process.env.CHAT_MODEL || "gpt-4.1-nano",
      messages
    });
    res.json({reply:choices[0].message.content.trim()});
  }catch(err){console.error(err);res.status(500).json({error:"AI error"});}
});

/* ─────────── /speech (ElevenLabs) ─────────── */
app.post("/speech", async (req,res)=>{
  try{
    const text=req.body.text||"Hello from Johnny Five";
    const tts = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}/stream`,
      {method:"POST",
       headers:{
         "xi-api-key":process.env.ELEVENLABS_API_KEY,
         "Content-Type":"application/json",
         Accept:"audio/mpeg"},
       body:JSON.stringify({text})});
    if(!tts.ok){console.error("ElevenLabs",await tts.text());return res.status(502).end();}
    res.setHeader("Content-Type","audio/mpeg");
    tts.body.pipe(res);
  }catch(e){console.error(e);res.status(502).end();}
});

/* ─────────── /vision (image analysis) ─────────── */
app.post("/vision", async (req,res)=>{
  try{
    const {imageB64,prompt="Describe this image."}=req.body||{};
    if(!imageB64?.startsWith("data:image")) return res.status(400).json({error:"No imageB64"});
    const response = await openai.chat.completions.create({
      model:"gpt-image-1",
      messages:[
        {role:"user",content:[{type:"text",text:prompt}]},
        {role:"user",content:[{type:"image_url",image_url:imageB64,detail:"low"}]}
      ]
    });
    res.json({answer:response.choices[0].message.content.trim()});
  }catch(e){console.error(e);res.status(500).json({error:"vision error"});}
});

/* ─────────── /image (generation) ─────────── */
app.post("/image", async (req,res)=>{
  try{
    const {prompt,style="illustration"}=req.body||{};
    const resp = await openai.chat.completions.create({
      model:"gpt-image-1",
      messages:[{role:"user",content:prompt}],
      tools:[{type:"image_generation",parameters:{style}}]
    });
    const b64 = resp.choices[0].message.tool_calls[0].image_base64;
    res.json({b64});
  }catch(err){console.error(err);res.status(500).json({error:"image-gen error"});}
});

/* ─────────── static (optional) ─────────── */
app.use(express.static("public"));

/* ─────────── launch ─────────── */
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log("NovaMind o4 running on :"+PORT));
