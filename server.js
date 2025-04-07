require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Function to perform Google Custom Search
async function performGoogleSearch(query) {
  const googleApiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
  const response = await axios.get(url);
  return response.data;
}

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const mode = req.body.mode || 'openai'; // default mode: openai
  if (!userMessage) {
    return res.status(400).json({ error: 'No message provided.' });
  }

  if (mode === 'search') {
    // Perform Google search
    try {
      const googleResponse = await performGoogleSearch(userMessage);
      const firstResult = googleResponse.items && googleResponse.items[0];
      if (firstResult) {
        const reply = `Search result: ${firstResult.title}: ${firstResult.snippet}`;
        return res.json({ reply });
      } else {
        return res.json({ reply: 'No search results found.' });
      }
    } catch (error) {
      console.error('Google API error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Failed to perform Google search.' });
    }
  } else {
    // Use OpenAI for normal queries
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4.5-preview', // or your working model
          messages: [
            {
              role: 'system',
              content: "You are Virtual Church Assistant. Provide a concise scientific explanation. When answering weather-related queries, keep it short. Do not provide extra disclaimers or multiple-day forecasts unless asked."
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
      
      const reply = response.data.choices?.[0]?.message?.content;
      if (!reply) {
        console.error('No reply received. Full response:', response.data);
        return res.status(500).json({ error: 'No reply received.' });
      }
      
      res.json({ reply });
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      res.status(500).json({ error: 'Failed to contact OpenAI.' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
