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
        model: 'gpt-4o-mini-search-preview', // The exact model you want
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 200,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    );

    // Log entire response for debugging
    console.log('🟢 Full OpenAI response data:', JSON.stringify(response.data, null, 2));

    // Attempt to parse reply from typical location
    const reply = response?.data?.choices?.[0]?.message?.content;

    // If no reply found, log it
    if (!reply) {
      console.error('🔴 No reply found in OpenAI response:', response.data);
      return res.status(500).json({ error: 'No reply received.' });
    }

    // Return the reply to the frontend
    res.json({ reply });
  } catch (error) {
    console.error('🔴 OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
