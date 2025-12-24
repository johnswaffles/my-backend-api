require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
    origin: ['https://www.justaskjohnny.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Increase body size limit for base64 image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Logging ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Configuration ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use environment variables for model names
const CHAT_MODEL_NAME = process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash';
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp';

console.log('🤖 Chat Model:', CHAT_MODEL_NAME);
console.log('🎨 Image Model:', IMAGE_MODEL_NAME);

// --- System Prompt ---
const BASE_SYSTEM_PROMPT = `
You are a highly intelligent, precise, and helpful AI Knowledge Assistant.
Your goal is to provide comprehensive, accurate, and beautifully structured answers to the user's questions.

**CORE INSTRUCTIONS:**
1.  **Detailed & Comprehensive:** Do not give short, surface-level answers. Dive deep into the topic. Explain "Why" and "How", not just "What".
2.  **Structured Formatting:** behavior is CRITICAL. Use Markdown to structure your response:
    - Use \`## Headers\` for main sections.
    - Use bullet points for readability.
    - Use **Bold** for key terms.
    - Use \`Code Blocks\` for technical content or code.
3.  **Tone:** Professional, clear, engaging, and authoritative yet accessible.
4.  **Links:** Whenever possible, include [Clickable Links](https://google.com) to reputable external sources, documentation, or further reading.
5.  **Multi-Modal Awareness:** If the user uploads an image, analyze it in detail as part of your answer.

**FOLLOW-UP SYSTEM (MANDATORY):**
At the VERY END of your response, after your conclusion, you MUST provide a JSON block proposing 3-4 relevant follow-up questions the user might want to ask next.

FORMAT:
[RESPONSE TEXT HERE]

\`\`\`json
{
  "followUps": [
    "What are the pros and cons?",
    "How does this compare to X?",
    "Can you explain the history of this?"
  ]
}
\`\`\`

CRITICAL: The JSON must be valid and the LAST thing in your response.
`;

// --- Endpoints ---

app.get('/', (req, res) => res.send('AI Knowledge Assistant Backend is Running'));

// --- Chat Endpoint ---
app.post('/chat', async (req, res) => {
    try {
        const { message, history, image } = req.body;
        const userMessage = message || '';

        console.log(`📥 User Message: "${userMessage.substring(0, 50)}..."`);
        if (image) console.log('📷 Image received');

        // 1. Sanitize History
        let chatHistory = [];
        if (history && Array.isArray(history)) {
            const MAX_HISTORY = 20;
            const recentHistory = history.slice(-MAX_HISTORY);

            chatHistory = recentHistory
                .filter(msg => msg.role && msg.parts)
                .map(msg => ({
                    role: msg.role === 'user' || msg.role === 'model' ? msg.role : 'user',
                    parts: [{ text: String(msg.parts) }]
                }));
        }

        // 2. Configure Model
        const model = genAI.getGenerativeModel({
            model: CHAT_MODEL_NAME,
            systemInstruction: {
                parts: [{ text: BASE_SYSTEM_PROMPT }]
            },
            generationConfig: {
                maxOutputTokens: 8000,
                temperature: 0.7,
            },
        });

        // 3. Start Chat Session
        const chat = model.startChat({
            history: chatHistory,
        });

        // 4. Generate Response
        let result;
        if (image) {
            const imagePart = {
                inlineData: {
                    data: image.split(',')[1],
                    mimeType: image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1]
                }
            };
            result = await chat.sendMessage([userMessage, imagePart]);
        } else {
            result = await chat.sendMessage(userMessage);
        }

        const response = await result.response;
        const responseText = response.text();

        console.log('Gemini Response Length:', responseText ? responseText.length : 0);

        if (!responseText) {
            throw new Error('Empty response from AI');
        }

        res.json({ reply: responseText });

    } catch (error) {
        console.error('Chat Endpoint Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// --- TTS Endpoints ---
app.get('/tts', async (req, res) => {
    try {
        const { text, voice } = req.query;
        if (!text) return res.status(400).json({ error: 'Text required' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API Key missing' });

        const voiceName = voice || 'alloy';
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'tts-1';

        console.log(`🎤 TTS request: voice=${voiceName}, model=${ttsModel}, text length=${text.length}`);

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: ttsModel,
                input: text,
                voice: voiceName,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI TTS Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS Failed', details: error.message });
    }
});

app.post('/tts', async (req, res) => {
    try {
        const { text, voice } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API Key missing' });

        const voiceName = voice || 'alloy';
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'tts-1';

        console.log(`🎤 TTS POST request: voice=${voiceName}, model=${ttsModel}, text length=${text.length}`);

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: ttsModel,
                input: text,
                voice: voiceName,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI TTS Error:', errorData);
            return res.status(response.status).json(errorData);
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS Failed', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
