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
        messages: [{ role: 'user', content: userMessage }],
        // Removed 'temperature' and 'max_tokens' because the model doesn't support them
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    );

    console.log('🟢 Full OpenAI response data:', JSON.stringify(response.data, null, 2));

    const reply = response?.data?.choices?.[0]?.message?.content;

    if (!reply) {
      console.error('🔴 No reply found in OpenAI response:', response.data);
      return res.status(500).json({ error: 'No reply received.' });
    }

    // Return the assistant's reply to your frontend
    res.json({ reply });
  } catch (error) {
    console.error('🔴 OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
