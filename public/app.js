const BASE = "https://four-1-backend-api.onrender.com";

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

async function askLLM(prompt){
  history.push({ role:"user", content:prompt });
  addBubble("user", prompt);

  const { reply } = await fetch(`${BASE}/api/chat`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ history })
  }).then(r=>r.json());

  history.push({ role:"assistant", content:reply });
  addBubble("ai", reply);

  const audioBuf = await fetch(`${BASE}/api/speech`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ text:reply })
  }).then(r=>r.arrayBuffer());

  const ctx = new AudioContext();
  ctx.decodeAudioData(audioBuf, buf=>{
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  });
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
  recorder.stop();
  recorder.onstop = async ()=>{
    const blob = new Blob(chunks,{ type:"audio/webm" });
    const form = new FormData(); form.append("audio", blob, "speech.webm");
    const { text } = await fetch(`${BASE}/api/transcribe`,{
      method:"POST", body:form
    }).then(r=>r.json());
    askLLM(text);
  };
};
