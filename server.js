const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/ai/city-advisor', async (req, res) => {
  try {
    const { prompt, snapshot } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on server.' });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const input = [
      {
        role: 'system',
        content:
          'You are a city-building strategy assistant. Give concise, practical advice tailored to the player state.'
      },
      {
        role: 'user',
        content: `Player request: ${prompt}\n\nCity snapshot:\n${JSON.stringify(snapshot || {}, null, 2)}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 250
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenAI request failed',
        details: data
      });
    }

    const text = data.output_text || 'No advice returned.';
    return res.json({ advice: text });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected server error', details: String(error.message || error) });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`World Builder running on port ${port}`);
});
