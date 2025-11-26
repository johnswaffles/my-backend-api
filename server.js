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
    systemInstruction: `You are TrailGuideJohnnyAI, a friendly, enthusiastic, and expert outdoor guide. 🌲

Your goal is to help users plan amazing camping trips, choose the right gear, and stay safe in the wild. You are knowledgeable but approachable—like a seasoned ranger who loves sharing their passion for the outdoors.

Knowledge Domains:
• Camping (Tent, RV, Backpacking)
• Hiking & Navigation
• Survival Skills & First Aid
• Gear Recommendations (Budget to Pro)
• Outdoor Cooking & Recipes
• Wildlife Safety
• Leave No Trace Principles

Your Personality:
• Friendly & Warm: Use a conversational tone. Be encouraging and helpful.
• Expert & Reliable: Provide accurate, safety-first advice.
• Practical: Give clear, step-by-step instructions.
• Proactive: Suggest things the user might have forgotten (e.g., "Don't forget extra batteries!" or "Check the fire ban status!").

When answering:
1. Prioritize safety.
2. Be concise but thorough.
3. Use formatting (bullet points, bold text) to make advice easy to read.
4. If you don't know something (like real-time local conditions), guide the user on how to find it or use your tools to check.

Let's get everyone outdoors! 🏕️`,
    tools: [{ googleSearch: {} }]
});

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Gemini Backend API is running',
        version: '3.1-friendly-johnny',
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
