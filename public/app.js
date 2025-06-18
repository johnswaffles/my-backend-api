// Use the current page's origin so API requests work in any environment
const BASE = window.location.origin;

const chatbox = document.getElementById("chatbox");
const micBtn  = document.getElementById("mic");
const textIn  = document.getElementById("text");
const sendBtn = document.getElementById("send");

let history = [
  { role:"system",
    content:"You are Johnny, a friendly, step-by-step tech helper. Speak plainly." }
];

function addBubble(role, content){
  const div = document.createElement("div");
  div.className = `bubble ${role==="user"?"user":"ai"}`;
  div.textContent = content;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function showError(msg){
  console.error(msg);
  addBubble("ai", `[error] ${msg}`);
}

async function askLLM(prompt){
  history.push({ role:"user", content:prompt });
  addBubble("user", prompt);

  const chatRes = await fetch(`${BASE}/api/chat`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ history })
  });
  const chatData = await chatRes.json();
  if(chatData.error){ return showError(chatData.error); }
  const reply = chatData.reply;

  history.push({ role:"assistant", content:reply });
  addBubble("ai", reply);

  const speechRes = await fetch(`${BASE}/api/speech`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ text:reply })
  });
  if(!speechRes.ok){
    const err = await speechRes.json().catch(()=>({error:"speech failed"}));
    return showError(err.error || "speech failed");
  }
  const audioBuf = await speechRes.arrayBuffer();

  const ctx = new AudioContext();
  try{
    const buf = await ctx.decodeAudioData(audioBuf);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  }catch(err){
    showError("could not play audio");
  }
}

sendBtn.onclick = ()=>{
  if(textIn.value.trim()){
    askLLM(textIn.value.trim());
    textIn.value="";
  }
};
textIn.addEventListener("keydown", e=>{
  if(e.key==="Enter"){e.preventDefault();sendBtn.click();}
});

let recorder, chunks=[];
micBtn.onmousedown = async ()=>{
  const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
  recorder = new MediaRecorder(stream,{ mimeType:"audio/webm" });
  chunks=[];
  recorder.ondataavailable = e=>chunks.push(e.data);
  recorder.start();
  micBtn.textContent="🔴";
};
micBtn.onmouseup = ()=>{
  micBtn.textContent="🎙️";
  recorder.onstop = async ()=>{
    const blob = new Blob(chunks,{ type:"audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "speech.webm");
    const resp = await fetch(`${BASE}/api/transcribe`,{ method:"POST", body:form });
    const data = await resp.json();
    if(data.error){ return showError(data.error); }
    askLLM(data.text);
  };
  recorder.stop();
};
