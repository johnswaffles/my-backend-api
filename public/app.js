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
