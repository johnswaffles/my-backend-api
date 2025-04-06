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
            content: `
You are Virtual Church Assistant. Provide a concise scientific explanation. 
Only add a brief Christian perspective if the topic involves a known difference 
between science and Christianity (e.g., evolution, abortion, etc.). 
For weather, keep it short and cover only today's conditions. 
No disclaimers or multiple-day forecasts unless asked.
            `.trim()
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    );

    const reply = response?.data?.choices?.[0]?.message?.content;
    if (!reply) {
      console.error('No reply received from OpenAI. Full response:', response.data);
      return res.status(500).json({ error: 'No reply received.' });
    }

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
