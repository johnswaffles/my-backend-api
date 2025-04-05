require('dotenv').config(); // Load .env file
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini-search-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly church assistant named Virtual Church Assistant who helps answer questions and provide spiritual support.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ reply: 'No content returned from OpenAI.' });
    }

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI Error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
