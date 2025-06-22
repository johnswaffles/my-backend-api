//--------------------------------------------------------------------
// NovaMind o4  • GPT-4-nano chat • GPT-image-1 generation • Vision
//--------------------------------------------------------------------
import OpenAI  from "openai";
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";
dotenv.config();

/* ------------ sanity checks --------------------------------------- */
if (!process.env.OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY missing"); process.exit(1);
}

/* ------------ OpenAI client --------------------------------------- */
const openai = new OpenAI();

/* ------------ app -------------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json({limit:"10mb"}));          // <-- raise JSON size

/* ---- /chat -------------------------------------------------------- */
app.post("/chat", async (req,res)=>{
  try{
    const history=req.body.history??[];
    const messages=history.map(({role,text})=>({role,content:text}));
    const {choices}=await openai.chat.completions.create({
      model: process.env.CHAT_MODEL||"gpt-4.1-nano",
      messages
    });
    res.json({reply:choices[0].message.content.trim()});
  }catch(e){ console.error(e); res.status(500).json({error:"chat-error"});}
});

/* ---- /vision ------------------------------------------------------ */
app.post("/vision", async (req,res)=>{
  try{
    const {b64,prompt,detail="auto"} = req.body;
    const messages=[{
      role:"user",
      content:[
        {type:"text",     text: prompt||"Describe this image"},
        {type:"image_url",image_url:{url:b64,detail}}
      ]
    }];
    const {choices}=await openai.chat.completions.create({
      model:"gpt-4.1-nano",
      messages
    });
    res.json({reply:choices[0].message.content.trim()});
  }catch(e){ console.error(e); res.status(500).json({error:"vision-error"});}
});

/* ---- /image  (GPT-image-1) --------------------------------------- */
app.post("/image", async (req,res)=>{
  try{
    const {prompt="A happy cat"} = req.body;
    const resp = await openai.responses.create({
      model:"gpt-image-1",
      input: prompt,
      tools:[{type:"image_generation"}],
    });
    const b64 = resp.output.find(o=>o.type==="image_generation_call")?.result;
    res.json({b64});
  }catch(e){ console.error(e); res.status(500).json({error:"image-error"});}
});

/* ---- speech unchanged (ElevenLabs) ------------------------------- */
... keep your existing /speech route ...

/* ---- static & launch --------------------------------------------- */
app.use(express.static("public"));
const PORT=process.env.PORT||10000;
app.listen(PORT,()=>console.log("NovaMind o4 API on :"+PORT));
