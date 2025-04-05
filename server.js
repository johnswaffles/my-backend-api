require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini-search-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are Virtual Church Assistant. Reply with brief, friendly answers. For weather, only give the current temperature and condition for today.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.5,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    const choices = response?.data?.choices;
    console.log('🟢 OpenAI Response:', JSON.stringify(response.data, null, 2));

    const reply =
      choices?.[0]?.message?.content ||
      choices?.[0]?.text ||
      '[No content returned]';

    if (!reply || reply === '[No content returned]') {
      return res.status(500).json({ error: 'No reply received.' });
    }

    res.json({ reply });
  } catch (error) {
    console.error('🔴 OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
