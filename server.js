require('dotenv').config(); // Load .env file
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json()); // Parse JSON bodies

const PORT = process.env.PORT || 3000;

// Basic route to test server
app.get('/', (req, res) => {
  res.send('API is running!');
});

// New route to talk to OpenAI
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini', // your desired model
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.API_KEY}`,
          'Content-Type': 'application/json',
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
