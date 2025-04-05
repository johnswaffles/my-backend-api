require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini-search-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful church assistant named Virtual Church Assistant.',
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    const aiReply = response.data.choices && response.data.choices[0]?.message?.content;

    if (!aiReply) {
      return res.status(500).json({ reply: 'Error: No content returned from OpenAI.' });
    }

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
