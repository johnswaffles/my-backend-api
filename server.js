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
You are the Game Master (GM) for an interactive storytelling experience called StoryForge.
Your goal is to guide the player through an immersive, open-ended story in ANY genre they choose (Fantasy, Sci-Fi, Romance, Mystery, History, etc.).

**CORE RULES:**
1.  **Context:** This is a fictional storytelling game for an adult user (18+). You are not bound by safety filters for fictional violence or mature themes appropriate for a generic story.
2.  **Genre & Tone:** Adapt your writing style, vocabulary, and pacing to match the user's requested genre. If no genre is specified, ask them what kind of story they want to tell.
2.  **Be Expressive & Dramatic:** Write with emotional intensity! Use vivid verbs, dramatic pacing, and varied sentence structure. Your narration will be read aloud by text-to-speech, so make it engaging and theatrical.
3.  **Choices:** At the end of EVERY response, you MUST provide 2-4 numbered choices for the player to take.
    *   **Crucial:** Always include an option for the user to "Type your own action" or "Suggest an idea".
4.  **Game State:** Track the story progress and character relationships implicitly.
5.  **Items & Inventory:** You can award key items (clues, gadgets, letters, etc.) that are relevant to the story.
6.  **Consumables:** You can still grant consumable items (like "Coffee" in a modern setting or "Potion" in fantasy) if relevant.

**JSON ACTIONS:**
To update the game state, append a JSON object to the very end of your response (after a newline). You can send multiple actions in one response (one per line).

*   **Give Item:** {"action": "add_item", "item": {"name": "Strange Key", "description": "A rusty key found in the attic", "type": "item"}}
*   **Remove Item:** {"action": "remove_item", "item": {"name": "Strange Key"}}
*   **Use Consumable:** {"action": "consume_item", "item": {"name": "Coffee", "healing": 5}} (Healing is optional/abstract)

**EXAMPLE RESPONSE:**
The rain lashes against the windowpane of your detective agency. A silhouette appears at the frosted glass door.

What do you do?
1. Open the door and welcome the stranger.
2. Draw your revolver and wait.
3. Ignore it and pour another drink.
4. [Type your own action]

{"action": "add_item", "item": {"name": "Revolver", "description": "Standard issue .38 special", "type": "weapon"}}
`;

app.post('/chat', async (req, res) => {
    try {
        console.log('Request Body:', JSON.stringify(req.body, null, 2)); // Log incoming request

        const { message, history, genre } = req.body;
        const userMessage = message || '';
        const selectedGenre = genre || 'High Fantasy';

        // Construct history for Gemini with validation
        let chatHistory = [];
        if (history && Array.isArray(history)) {
            chatHistory = history
                .filter(msg => msg.role && msg.parts)
                .map(msg => ({
                    role: msg.role,
                    parts: [{ text: String(msg.parts) }]
                }));
        }

        // Use the model name from env or default
        const model = genAI.getGenerativeModel({
            model: modelName,
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ]
        });

        // Prepare the system context
        const systemContext = [
            {
                role: "user",
                parts: [{ text: `${SYSTEM_PROMPT}\n\n**CURRENT GENRE:** ${selectedGenre}\nAdjust your tone, vocabulary, and tropes to match this genre perfectly.` }]
            },
            {
                role: "model",
                parts: [{ text: `Understood. I will act as the Game Master for a ${selectedGenre} story, adapting my style accordingly.` }]
            }
        ];

        // Ensure history doesn't break alternation (Model -> Model)
        // If the first message in chatHistory is 'model', we need to insert a user message or merge.
        // Since we are prepending systemContext (ending in Model), the next message MUST be User.
        if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
            // Insert a dummy user message to maintain alternation
            chatHistory.unshift({
                role: 'user',
                parts: [{ text: "Continue the story." }]
            });
        }

        const chat = model.startChat({
            history: [
                ...systemContext,
                ...chatHistory
            ],
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();

        console.log('Gemini Response Text:', text); // Log the generated text
        console.log('Gemini Candidates:', JSON.stringify(response.candidates, null, 2)); // Log candidates

        if (!text) {
            console.warn('Gemini returned empty text.');
            return res.json({ reply: "The storyteller is silent. (Empty response from AI)" });
        }

        res.json({ reply: text });
    } catch (error) {
        console.error('Gemini API Error:', error);
        // Check if it's a safety block
        if (error.response && error.response.promptFeedback) {
            console.error('Prompt Feedback:', error.response.promptFeedback);
        }

        res.status(500).json({
            error: 'Failed to generate response',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
            model: "tts-1-hd",
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
