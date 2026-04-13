export async function generateFoodSpeech({ apiKey, model, voice = 'nova', text }) {
  if (!apiKey) {
    return { audioBase64: '', mimeType: 'audio/mpeg', fallback: true, text };
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3'
    })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || `TTS request failed (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    audioBase64: Buffer.from(arrayBuffer).toString('base64'),
    mimeType: 'audio/mpeg',
    fallback: false,
    text
  };
}

