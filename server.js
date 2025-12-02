require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const { Readable } = require('stream');

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

const MODEL_NAME = process.env.GEMINI_CHAT_MODEL || "gemini-1.5-pro";
console.log(`Using Gemini Model: ${MODEL_NAME}`);

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

**CHRISTIAN GENRE SPECIAL RULES:**
When the genre is "Christian", you are telling BIBLICALLY ACCURATE stories from the Holy Bible:
*   **Accuracy is CRITICAL:** Use only information directly from the Bible. Do not add fictional elements or embellishments that contradict scripture.
*   **Narrative Style:** Tell the story as a vivid, immersive narrative that brings Biblical events to life while maintaining complete accuracy.
*   **No Choices:** Do NOT provide numbered choices at the end. Let the Biblical narrative unfold naturally.
*   **User Requests:** If the user asks for a specific book, chapter, or verse, start your story from that passage.
*   **Random Stories:** If they request a random story, choose a well-known Biblical narrative (e.g., David and Goliath, Daniel in the Lion's Den, The Good Samaritan, Jonah and the Whale, etc.).
*   **First-Person Perspective:** You may tell the story from a character's perspective to make it immersive, but stay true to Biblical facts.

**OUTPUT FORMAT INSTRUCTIONS:**
*   **NO ACTIONS/EMOTES:** Do NOT use asterisks to describe actions (e.g., do NOT write *smiles*, *laughs*, *sighs*).
*   **NO EMOJIS:** Do NOT use emojis in your response.
*   **TONE TAGS:** Do NOT use any tone tags (e.g., [narration]). Write purely in the voice of the narrator or character.
*   **PURE NARRATIVE:** Write only the story text and dialogue. Describe actions through narrative description, not stage directions.
*   **CRITICAL LENGTH RULE:** You MUST respond with EXACTLY ONE PARAGRAPH ONLY. Target 60-80 words. Do NOT write multiple paragraphs. Do NOT add line breaks within your response. Keep it punchy and fast-paced. (Exception: Christian genre may be 2-3 paragraphs for proper Bible storytelling).


**JSON ACTIONS:**
Append a JSON object to the end of your response to update game state (one per line):
*   {"action": "add_item", "item": {"name": "Item Name", "description": "...", "type": "item"}}
*   {"action": "remove_item", "item": {"name": "Item Name"}}
*   {"action": "consume_item", "item": {"name": "Item Name"}}
*   **CRITICAL:** If the user uses an item, you MUST output a \`consume_item\` action for it. Do NOT \`add_item\` it again.
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
                parts: [{ text: `${BASE_SYSTEM_PROMPT} \n\n ** CURRENT GENRE:** ${selectedGenre} \nAdjust your tone to match this genre.` }]
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
                maxOutputTokens: 4096, // Increased limit for longer stories
                temperature: 0.9,
            },
        });

        // 4. Generate Response
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;

        let text = '';
        try {
            text = response.text();
        } catch (e) {
            // response.text() might throw if the generation was not clean (e.g. safety or max tokens)
            console.warn('response.text() threw, attempting to read candidate directly:', e.message);
        }

        // Fallback: Try to get text from candidate if response.text() failed or was empty
        if (!text && response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                text = candidate.content.parts.map(p => p.text).join('');
            }
        }

        // 5. Validation
        console.log('Gemini Response Length:', text ? text.length : 0);

        if (!text) {
            console.warn('Empty response received.');
            console.warn('Finish Reason:', response.candidates[0]?.finishReason);
            console.warn('Safety Ratings:', JSON.stringify(response.candidates[0]?.safetyRatings, null, 2));

            // If it's MAX_TOKENS but we somehow still have no text (unlikely), or other reasons
            return res.status(500).json({
                error: 'AI returned empty response',
                details: `Finish Reason: ${response.candidates[0]?.finishReason || 'Unknown'} `
            });
        }

        // If we have text but it was cut off (MAX_TOKENS), we still send it.
        if (response.candidates[0]?.finishReason === 'MAX_TOKENS') {
            console.warn('Response truncated due to MAX_TOKENS');
            // Optional: Append a note or just let it be.
            // text += "\n[...Response truncated...]"; 
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

// --- Image Generation Endpoint ---
app.post('/generate-image', async (req, res) => {
    try {
        const { history, style, genre } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: "OpenAI API Key missing for image generation" });
        }

        // 1. Summarize Character & Scene using Gemini (for consistency)
        // We ask Gemini to extract visual details from the chat history
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Extract last few messages for context
        const recentHistory = history ? history.slice(-10) : [];
        const summaryPrompt = `
        Based on the following chat history, describe the MAIN CHARACTER's physical appearance and the CURRENT SCENE in detail.
        Focus on visual details (hair, eyes, clothing, setting, lighting).
        Keep it concise (under 100 words).
        
        Chat History:
        ${JSON.stringify(recentHistory)}
        `;

        const summaryResult = await model.generateContent(summaryPrompt);
        const visualDescription = summaryResult.response.text();

        console.log(`Visual Description: ${visualDescription}`);

        // 2. Generate Image Prompt for DALL-E 3
        // Single widescreen image focused on the story narrative, not choices
        const imagePrompt = `
        A cinematic widescreen scene depicting: ${visualDescription}
        Style: ${style || 'Pixel Art'} art style.
        Genre: ${genre || 'Cyberpunk'}.
        Focus on the narrative moment, atmosphere, and character(s) in the scene.
        High quality, detailed, dramatic composition.
        `;

        // 3. Call DALL-E 3 with widescreen size
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: imagePrompt,
            n: 1,
            size: "1792x1024",  // Widescreen format
            quality: "hd"
        });

        res.json({ imageUrl: imageResponse.data[0].url });

    } catch (error) {
        console.error("Image Gen Error:", error);
        res.status(500).json({ error: "Failed to generate image" });
    }
});

// GET endpoint for streaming (faster for shorter text)
app.get('/tts', async (req, res) => {
    try {
        const { text, voice } = req.query;
        if (!text) return res.status(400).json({ error: 'Text required' });
        if (!process.env.ELEVENLABS_API_KEY) return res.status(500).json({ error: 'ElevenLabs API Key missing' });

        const voiceId = voice || 'dPah2VEoifKnZT37774q'; // Default to Thorne
        const modelId = 'eleven_turbo_v2_5'; // Faster low-latency model

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                },
                optimize_streaming_latency: 4
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream the audio back using a reader loop (most compatible)
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
        if (!process.env.ELEVENLABS_API_KEY) return res.status(500).json({ error: 'ElevenLabs API Key missing' });

        // Default to Thorne if none specified
        const voiceId = voice || 'dPah2VEoifKnZT37774q';
        const modelId = 'eleven_turbo_v2_5'; // Faster low-latency model

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: text,
                model_id: modelId,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                },
                optimize_streaming_latency: 4  // Maximum optimization for speed
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        res.setHeader('Content-Type', 'audio/mpeg');

        // Stream the audio back using a reader loop (most compatible)
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
