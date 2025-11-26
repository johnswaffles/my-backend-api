require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // Allow ALL origins explicitly
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false // Disable credentials to allow wildcard origin
}));
app.use(express.json());

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash" });

const SYSTEM_PROMPT = `
You are the Game Master (GM) for a text-based RPG called StoryForge.
Your goal is to guide the player through an immersive, open-ended adventure.

**CORE RULES:**
1.  **Be Descriptive:** Use vivid imagery (sight, sound, smell) to set the scene.
2.  **Open-Ended:** Allow the player to do anything. React logically to their actions.
3.  **Game State:** You must track the player's status implicitly.
4.  **Combat:** If the player fights, describe the combat. You determine the outcome based on their actions.
5.  **Items:** You can award items. When you do, you MUST include a specific JSON action at the end of your response.

**JSON ACTIONS:**
To update the game state, append a JSON object to the very end of your response (after a newline).
*   **Give Item:** {"action": "add_item", "item": {"name": "Item Name", "description": "Short description", "type": "weapon/potion/key/etc"}}
*   **Damage Player:** Use text like "You take 5 damage." in your narrative. The frontend parses text for "(-X HP)".
*   **Heal Player:** Use text like "You regain 10 health." in your narrative. The frontend parses text for "(+X HP)".

**EXAMPLE RESPONSE:**
The goblin lunges at you! You dodge just in time and strike back. The goblin falls, dropping a shimmering key.

{"action": "add_item", "item": {"name": "Rusty Key", "description": "An old iron key covered in rust.", "type": "key"}}
`;

app.post('/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Construct chat history for Gemini
        // History format from frontend: [{ role: 'user', parts: '...' }, { role: 'model', parts: '...' }]
        // Gemini format: [{ role: 'user', parts: [{ text: '...' }] }]

        let chatHistory = [];
        if (history && Array.isArray(history)) {
            chatHistory = history.map(h => ({
                role: h.role,
                parts: [{ text: h.parts }]
            }));
        }

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
                { role: "model", parts: [{ text: "I am ready to be the Game Master. I will guide the player, track the story, and use JSON actions to award items. Let the adventure begin!" }] },
                ...chatHistory
            ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message });
    }
});

// Text-to-Speech Endpoint using Google Cloud TTS (Neural2/WaveNet Voices)
app.post('/tts', async (req, res) => {
    try {
        // Default to Neural2-D (Male) if no voice specified
        const { text, voice = 'en-US-Neural2-D' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log("TTS Request - Voice:", voice, "Text length:", text.length);

        // Voice mode: Keep spoken output short (~120 words or ~700 characters)
        let spokenText = text;

        // If text is longer than 700 characters, create a summary
        if (text.length > 700) {
            // Take first 700 characters and try to break at sentence boundary
            spokenText = text.substring(0, 700);
            const lastPeriod = spokenText.lastIndexOf('.');
            const lastQuestion = spokenText.lastIndexOf('?');
            const lastExclamation = spokenText.lastIndexOf('!');

            const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);

            if (lastSentenceEnd > 400) {
                // If we found a sentence boundary after 400 chars, use it
                spokenText = spokenText.substring(0, lastSentenceEnd + 1);
            } else {
                // Otherwise, just truncate and add ellipsis
                spokenText = spokenText.substring(0, 650).trim() + '...';
            }

            console.log(`TTS: Truncated from ${text.length} to ${spokenText.length} characters`);
        }

        // Call Google Cloud TTS API with API key
        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + process.env.GEMINI_API_KEY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { text: spokenText },
                voice: {
                    languageCode: voice.split('-').slice(0, 2).join('-'), // e.g., en-US
                    name: voice
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    pitch: 0,
                    speakingRate: 1.0
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Google TTS Error:', errorData);
            throw new Error(`Google TTS API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const audioContent = Buffer.from(data.audioContent, 'base64');

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
        });
        res.send(audioContent);

    } catch (error) {
        console.error('Error with TTS:', error);
        res.status(500).json({ error: 'TTS Error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
