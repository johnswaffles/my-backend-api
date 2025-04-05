require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow CORS from all domains
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o', // or gpt-3.5-turbo if you're using the free tier
        messages: [{ role: 'user', content: userMessage }],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`,
        },
      }
    );

    res.json({ reply: response.data.choices[0].message.content });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to contact OpenAI' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
