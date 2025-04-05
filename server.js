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
              'You are the Virtual Church Assistant. Be kind and helpful. Always reply briefly. If asked for weather or directions, reply in a single short sentence.',
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
    if (!choices || choices.length === 0) {
      console.error('No choices in response:', response.data);
      return res.status(500).json({ error: 'No reply received.' });
    }

    const reply = choices[0].message?.content || choices[0]?.text;
    if (!reply) {
      console.error('Reply format unexpected:', choices[0]);
      return res.status(500).json({ error: 'No reply received.' });
    }

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
