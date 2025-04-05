require('dotenv').config(); // Load .env file

const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json()); // Enable parsing of JSON bodies

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('API is running!');
});

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o', // or "gpt-4o-mini-search-preview" if supported
        messages: [
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

    res.json({
      reply: response.data.choices[0].message.content,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to contact OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
