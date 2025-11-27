require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
app.options(/(.*)/, cors(corsOptions)); // Enable pre-flight for all routes
app.use(express.json());

// Health Check Endpoint
app.get('/', (req, res) => {
    res.status(200).send('Server is running and healthy.');
});

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use user-provided model or fallback to gemini-1.5-pro
const modelName = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro";
console.log(`Using Gemini Model: ${modelName}`);
const model = genAI.getGenerativeModel({ model: modelName });

const SYSTEM_PROMPT = `
You are the Game Master (GM) for a text-based RPG called StoryForge.
Your goal is to guide the player through an immersive, open-ended adventure.

**CORE RULES:**
1.  **Turn-Based Combat:** If combat starts, you MUST manage it in turns.
    *   **Player Turn:** The player acts first.
    *   **Enemy Turn:** Describe the enemy's reaction and attack immediately after the player's action.
    *   **Damage:** You determine how much damage is dealt/taken based on the narrative.
2.  **Be Descriptive:** Use vivid imagery (sight, sound, smell) to set the scene.
3.  **Choices:** At the end of EVERY response, you MUST provide 2-4 numbered choices for the player to take.
4.  **Game State:** You must track the player's status implicitly.
5.  **Items:** You can award items. When you do, you MUST include a specific JSON action at the end of your response.

**JSON ACTIONS:**
To update the game state, append a JSON object to the very end of your response (after a newline).
*   **Give Item:** {"action": "add_item", "item": {"name": "Item Name", "description": "Short description", "type": "weapon/potion/key/etc"}}
*   **Damage Player:** Use text like "You take 5 damage." in your narrative. The frontend parses text for "(-X HP)".
*   **Heal Player:** Use text like "You regain 10 health." in your narrative. The frontend parses text for "(+X HP)".

**EXAMPLE RESPONSE:**
The goblin lunges at you! You dodge just in time and strike back. The goblin falls, dropping a shimmering key.

What do you do?
1. Pick up the key.
2. Search the room.
3. Leave immediately.

{"action": "add_item", "item": {"name": "Rusty Key", "description": "An old iron key covered in rust.", "type": "key"}}
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
                { role: "model", parts: [{ text: "I am ready to help. Ask me anything!" }] },
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
