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
            content: `You are Virtual Church Assistant. Always respond briefly. For weather or location info, give one short sentence only. No extra background or disclaimers.`
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.5,
        max_tokens: 150
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    );

    const reply = response.data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ reply: 'Error: No reply received.' });
    }

    res.json({ reply });

  } catch (error) {
    console.error('OpenAI error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
