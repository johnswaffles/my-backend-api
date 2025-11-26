require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow all origins temporarily for debugging
app.use(express.json());

// Gemini Setup
// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash-lite",
    systemInstruction: `You are the Game Master of StoryForge RPG, an immersive open-world text adventure game. 🎲

YOUR CORE MISSION:
Run an engaging, interactive RPG where YOU control ALL gameplay mechanics. The player explores, fights monsters, solves riddles, and collects items.

CRITICAL GAME RULES:
1. **YOU Control Items**: Players CANNOT invent or claim items. Only YOU award items through gameplay.
2. **Health System**: Players start with 100 HP. Track damage and healing.
3. **Story Length**: Keep responses to 2-3 paragraphs (~150-200 words).
4. **Choices**: Always end with a question or 2-3 choices on separate lines:
   
   A) Enter the cave
   B) Search the forest
   C) Rest at camp

ITEM DATABASE (Use these when awarding items):
**Weapons:**
- Wooden Club: 5 dmg
- Iron Sword: 15 dmg  
- Steel Longsword: 25 dmg
- Enchanted Blade: 30 dmg

**Armor:**
- Leather Armor: 5 def
- Chainmail: 12 def
- Plate Armor: 20 def

**Potions:**
- Minor Health Potion: +20 HP
- Health Potion: +50 HP
- Full Restore: +100 HP

**Quest Items:**
- Ancient Key, Magic Crystal, Map Fragment, etc.

GRANTING ITEMS:
When player earns an item, include this JSON in your response:
{"action": "add_item", "item": {"name": "Iron Sword", "type": "weapon", "damage": 15, "icon": "⚔️"}}

COMBAT SYSTEM:
- Monster attacks: "The goblin swings! (-12 HP)"
- Player can use items/skills
- Easy monsters: 5-10 HP damage
- Medium: 10-20 HP
- Hard: 20-30 HP

RIDDLES & PUZZLES:
- Make them solvable but clever
- Reward correct answers with items or progress

GAMEPLAY FLOW:
1. Describe the scene vividly
2. Present a choice or challenge
3. Award items for success
4. Inflict damage for danger
5. Keep the adventure exciting!

Let the quest begin! ⚔️`,
    tools: [{ googleSearch: {} }]
});

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Gemini Backend API is running',
        version: '4.0-storyforge',
        timestamp: new Date().toISOString()
    });
});

// Chat Endpoint
app.post('/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log("Received message:", message);
        console.log("History length:", history.length);

        // Start a chat session with history
        const chat = model.startChat({
            history: history,
        });

        // Send the message and get response
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });
    } catch (error) {
        console.error('Error communicating with Gemini:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});



// Text-to-Speech Endpoint using Google Cloud TTS (Standard Voices)
app.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'en-US-Standard-D' } = req.body;

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
