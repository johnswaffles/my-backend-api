set -e
rm -rf node_modules
mkdir -p public
cat > package.json <<'JSON'
{
  "name": "johnny-assistant",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "cors": "2.8.5",
    "dotenv": "16.4.5",
    "express": "4.19.2",
    "node-fetch": "3.3.2",
    "openai": "4.28.0"
  }
}
JSON

cat > server.js <<'JS'
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const app  = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const VOICE_ID   = process.env.ELEVENLABS_VOICE_ID;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;

app.post('/chat', async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    messages: [
      { role: 'system', content: 'You are Johnny, a helpful personal assistant.' },
      { role: 'user',   content: req.body.message }
    ]
  });
  res.json({ reply: completion.choices[0].message.content });
});

app.post('/speech', async (req, res) => {
  const r = await fetch(
    \`https://api.elevenlabs.io/v1/text-to-speech/\${VOICE_ID}/stream\`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: req.body.text,
        model_id: 'eleven_tts_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.8 }
      })
    }
  );
  if (!r.ok) {
    const msg = await r.text();
    console.error('TTS failed', r.status, msg);
    return res.status(500).json({ error: msg });
  }
  res.set('Content-Type', 'audio/mpeg');
  r.body.pipe(res);
});

app.listen(port, () => console.log(\`Johnny listening on \${port}\`));
JS

cat > public/index.html <<'HTML'
<!doctype html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Johnny Assistant</title>
<style>
body{font-family:system-ui;margin:0;background:#f6f6f6;display:flex;flex-direction:column;height:100vh}
#chatbox{flex:1;overflow-y:auto;padding:1rem}
.bubble{max-width:80%;padding:.6rem 1rem;margin:.4rem 0;border-radius:12px;line-height:1.4}
.ai{background:#e2e8f0}.user{background:#667eea;color:#fff;margin-left:auto}
#controls{display:flex;padding:.8rem;background:#fff;gap:.5rem}
#controls textarea{flex:1;padding:.6rem;border:1px solid #ccc;border-radius:8px;resize:none}
#controls button{padding:.6rem 1rem;border:none;border-radius:8px;background:#667eea;color:#fff}
audio{display:none}
</style></head><body>
<div id="chatbox"></div>
<div id="controls">
  <textarea id="prompt" rows="2" placeholder="Ask Johnny anything…"></textarea>
  <button id="send">Send</button>
</div>
<audio id="voice"></audio>
<script>
const chatbox=document.getElementById('chatbox');
const prompt=document.getElementById('prompt');
const send=document.getElementById('send');
const voice=document.getElementById('voice');

send.onclick=async()=>{
  const q=prompt.value.trim(); if(!q) return;
  add(q,'user'); prompt.value='';
  const {reply}=await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:q})}).then(r=>r.json());
  add(reply,'ai'); speak(reply);
};
function add(t,r){const d=document.createElement('div');d.className=\`bubble \${r}\`;d.textContent=t;chatbox.appendChild(d);chatbox.scrollTop=chatbox.scrollHeight;}
async function speak(t){const b=await fetch('/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t})}).then(r=>r.blob());voice.src=URL.createObjectURL(b);voice.play();}
</script></body></html>
HTML

echo -e ".env*\nnode_modules/\n" > .gitignore
rm -rf .git
git init
git add .
git commit -m "Clean rebuild – Johnny assistant"
git branch -M main
git remote add origin https://github.com/johnswaffles/my-backend-api.git
git push --force origin main
