require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Simplified CORS - Allow All Origins for now to ensure connectivity
app.use(cors());
app.use(express.json());

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
                { role: "model", parts: [{ text: "I am ready to be the Game Master. Let the adventure begin!" }] },
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
