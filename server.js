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
5.  **Items & Economy:** You can award items and currency. You can also accept items/currency as payment (trading).
6.  **Equipment:** You can grant equipment that fits into specific slots.

**JSON ACTIONS:**
To update the game state, append a JSON object to the very end of your response (after a newline). You can send multiple actions in one response (one per line).

*   **Give Item:** {"action": "add_item", "item": {"name": "Item Name", "description": "Short description", "type": "weapon/potion/key/etc"}}
*   **Remove Item:** {"action": "remove_item", "item": {"name": "Item Name"}} (Use for trading/payment)
*   **Update Currency:** {"action": "update_currency", "gold": 1, "silver": 5, "copper": 0} (Values are DELTAS, e.g., -5 to remove 5)
*   **Equip Item:** {"action": "equip_item", "slot": "head/chest/main_hand/etc", "item": {"name": "Item Name", "description": "...", "stats": {"armor": 5, "damage": 0}}}
*   **Damage Player:** Use text like "You take 5 damage." (Frontend parses "(-X HP)")
*   **Heal Player:** Use text like "You regain 10 health." (Frontend parses "(+X HP)")

**EQUIPMENT SLOTS:**
head, neck, shoulders, chest, wrist, gloves, ring1, ring2, trinket1, trinket2, main_hand, off_hand

**EXAMPLE RESPONSE:**
The merchant nods, taking your pouch of coins. "A pleasure doing business." He hands you a gleaming sword.

What do you do?
1. Equip the sword.
2. Ask about rumors.
3. Leave the shop.

{"action": "remove_item", "item": {"name": "Pouch of Coins"}}
{"action": "equip_item", "slot": "main_hand", "item": {"name": "Steel Longsword", "description": "A sharp, well-balanced blade.", "stats": {"damage": 10, "armor": 0}}}
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
