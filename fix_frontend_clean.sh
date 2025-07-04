set -e
mkdir -p public
cat > public/index.html <<'HTML'
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
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
  </style>
</head>
<body>
  <div id="chatbox"></div>
  <div id="controls">
    <textarea id="prompt" rows="2" placeholder="Ask Johnny anything…"></textarea>
    <button id="send">Send</button>
  </div>
  <audio id="voice"></audio>

  <!-- main JS -->
  <script src="app.js"></script>
</body>
</html>
HTML
cat > public/app.js <<'JS'
const chatbox = document.getElementById('chatbox');
const prompt  = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const voiceEl = document.getElementById('voice');

sendBtn.onclick = async () => {
  const text = prompt.value.trim();
  if (!text) return;

  addBubble(text, 'user');
  prompt.value = '';

  try {
    const { reply } = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    }).then(r => r.json());

    addBubble(reply, 'ai');
    speak(reply);
  } catch (err) {
    console.error('Chat error:', err);
  }
};

function addBubble(text, role) {
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.textContent = text;
  chatbox.appendChild(div);
  chatbox.scrollTop = chatbox.scrollHeight;
}

async function speak(text) {
  try {
    const audioBlob = await fetch('/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    }).then(r => {
      if (!r.ok) throw new Error('TTS failed');
      return r.blob();
    });

    voiceEl.src = URL.createObjectURL(audioBlob);
    voiceEl.play();
  } catch (err) {
    console.error('TTS error:', err);
  }
}
JS
