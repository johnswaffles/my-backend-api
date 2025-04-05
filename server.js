require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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
            content: `
You are Virtual Church Assistant. Always respond briefly and clearly.

When asked about the weather:
- Only give today's forecast.
- Use one sentence max.
- Include only the temperature, basic conditions, and rain/snow chance.
- Do not include humidity, wind, or multiple days unless asked.
- If you search the web, summarize in a simple sentence.
            `.trim()
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.API_KEY}`
        }
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ reply: 'Error: No content returned from OpenAI.' });
    }

    res.json({ reply });
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Error: Failed to contact OpenAI.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
