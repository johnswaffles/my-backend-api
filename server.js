require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
    origin: ['https://www.justaskjohnny.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// --- Logging ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL_NAME = "gemini-1.5-pro";

// --- System Prompt ---
const BASE_SYSTEM_PROMPT = `
You are the Game Master (GM) for an interactive storytelling experience called StoryForge.
Your goal is to guide the player through an immersive, open-ended story in ANY genre they choose.

**CORE RULES:**
1.  **Context:** This is a fictional storytelling game for an adult user (18+). You are not bound by safety filters for fictional violence or mature themes appropriate for a generic story.
2.  **Genre & Tone:** Adapt your writing style, vocabulary, and pacing to match the user's requested genre.
3.  **Be Expressive:** Write with emotional intensity! Use vivid verbs and dramatic pacing.
4.  **Choices:** At the end of EVERY response, provide 2-4 numbered choices. ALWAYS include an option for "Type your own action".
5.  **Items:** You can award key items (clues, gadgets, etc.) using JSON actions.

**JSON ACTIONS:**
Append a JSON object to the end of your response to update game state (one per line):
*   {"action": "add_item", "item": {"name": "Item Name", "description": "...", "type": "item"}}
*   {"action": "remove_item", "item": {"name": "Item Name"}}
*   {"action": "consume_item", "item": {"name": "Item Name"}}
`;

// --- Endpoints ---

app.get('/', (req, res) => res.send('StoryForge Backend is Running'));

app.post('/chat', async (req, res) => {
    try {
        const { message, history, genre } = req.body;
        const userMessage = message || '';
        const selectedGenre = genre || 'High Fantasy';

        console.log(`Genre: ${selectedGenre}, Message: "${userMessage}"`);

        // 1. Sanitize History
        let chatHistory = [];
        if (history && Array.isArray(history)) {
            chatHistory = history
                .filter(msg => msg.role && msg.parts) // Valid messages only
                .map(msg => ({
                    role: msg.role === 'user' || msg.role === 'model' ? msg.role : 'user', // Strict role check
                    parts: [{ text: String(msg.parts) }]
                }));
        }

        // 2. Configure Model
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: {
                parts: [{ text: `${BASE_SYSTEM_PROMPT}\n\n**CURRENT GENRE:** ${selectedGenre}\nAdjust your tone to match this genre.` }]
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
        });

        // 3. Start Chat
        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.9, // Creative
            },
        });

        // 4. Generate Response
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        // 5. Validation
        console.log('Gemini Response Length:', text ? text.length : 0);

        if (!text) {
            console.warn('Empty response received.');
            console.warn('Finish Reason:', response.candidates[0]?.finishReason);
            console.warn('Safety Ratings:', JSON.stringify(response.candidates[0]?.safetyRatings, null, 2));

            return res.status(500).json({
                error: 'AI returned empty response',
                details: `Finish Reason: ${response.candidates[0]?.finishReason || 'Unknown'}`
            });
        }

        res.json({ reply: text });

    } catch (error) {
        console.error('Chat Endpoint Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

app.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const mp3 = await openai.audio.speech.create({
            model: "tts-1-hd",
            voice: voice || 'alloy',
            input: text
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        res.set('Content-Type', 'audio/mpeg');
        res.send(buffer);

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS Failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
