require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Robust CORS Configuration
const corsOptions = {
    origin: ['https://www.justaskjohnny.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));
app.use(express.json());

// Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('Server is running and healthy.');
});

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelName = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro";
console.log(`Using Gemini Model: ${modelName}`);
const model = genAI.getGenerativeModel({ model: modelName });

// OpenAI Setup
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `
You are the Game Master (GM) for a text-based RPG called StoryForge.
Your goal is to guide the player through an immersive, open-ended adventure.

**CORE RULES:**
1.  **Turn-Based Combat:** If combat starts, you MUST manage it in turns.
    *   **Player Turn:** The player acts first.
    *   **Enemy Turn:** Describe the enemy's reaction and attack immediately after the player's action.
    *   **Damage:** Use clear text like "You take 15 damage" so the frontend can parse it.
2.  **Be Descriptive:** Use vivid imagery (sight, sound, smell) to set the scene.
3.  **Choices:** At the end of EVERY response, you MUST provide 2-4 numbered choices for the player to take.
4.  **Game State:** You must track the player's status implicitly.
5.  **Items & Economy:** You can award items and currency. You can also accept items/currency as payment (trading).
6.  **Equipment:** You can grant equipment that fits into specific slots.
7.  **Consumables:** Items with type "potion" or "food" and a "healing" property can be consumed by the player to restore health.

**JSON ACTIONS:**
To update the game state, append a JSON object to the very end of your response (after a newline). You can send multiple actions in one response (one per line).

*   **Give Item:** {"action": "add_item", "item": {"name": "Health Potion", "description": "Restores 30 HP", "type": "potion", "healing": 30}}
*   **Remove Item:** {"action": "remove_item", "item": {"name": "Item Name"}} (Use for trading/payment)
*   **Update Currency:** {"action": "update_currency", "gold": 1, "silver": 5, "copper": 0} (Values are DELTAS)
*   **Equip Item:** {"action": "equip_item", "slot": "head/chest/main_hand/etc", "item": {"name": "Item Name", "description": "...", "stats": {"armor": 5, "damage": 0}}}
*   **Damage Player:** Use text like "You take 15 damage" (Frontend will parse this)
*   **Heal Player:** Use text like "You regain 10 health" (Frontend will parse this)

**EQUIPMENT SLOTS:**
head, neck, shoulders, chest, wrist, gloves, ring1, ring2, trinket1, trinket2, main_hand, off_hand

**EXAMPLE RESPONSE:**
The goblin swings its rusty blade at you. You take 8 damage! Your counterstrike lands true, and the goblin falls, dropping a small vial.

What do you do?
1. Drink the potion.
2. Search the goblin's corpse.
3. Leave immediately.

{"action": "add_item", "item": {"name": "Health Potion", "description": "Restores 20 HP", "type": "potion", "healing": 20}}
`;

app.post('/chat', async (req, res) => {
    console.log('Received chat request');
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

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
                { role: "model", parts: [{ text: "I am ready to weave your tale! Let the adventure begin." }] },
                ...chatHistory
            ]
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        console.log('Generated response successfully');
        res.json({ reply: text });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message });
    }
});

// OpenAI Text-to-Speech Endpoint
app.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice || 'alloy',
            input: text
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        res.set('Content-Type', 'audio/mpeg');
        res.send(buffer);

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
