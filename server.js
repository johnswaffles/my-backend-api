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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools: [{ googleSearch: {} }]
});

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Gemini Backend API is running',
        version: '2.0-openai-tts',
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

// Text-to-Speech Endpoint using OpenAI
app.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'en-US-Neural2-D' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log("TTS Request - Voice:", voice, "Text length:", text.length);

        // Map Google voice names to OpenAI voice names
        const voiceMap = {
            // Female voices -> OpenAI female voices
            'en-US-Neural2-C': 'nova',
            'en-US-Neural2-E': 'shimmer',
            'en-US-Neural2-F': 'nova',
            'en-US-Neural2-H': 'shimmer',
            'en-GB-Neural2-A': 'nova',
            'en-GB-Neural2-C': 'shimmer',
            'en-AU-Neural2-A': 'nova',
            'en-AU-Neural2-C': 'shimmer',
            'en-CA-Neural2-B': 'nova',
            'en-CA-Neural2-D': 'shimmer',
            // Male voices -> OpenAI male voices
            'en-US-Neural2-D': 'onyx',
            'en-US-Neural2-I': 'echo',
            'en-US-Neural2-J': 'fable',
            'en-GB-Neural2-B': 'onyx',
            'en-GB-Neural2-D': 'echo',
            'en-AU-Neural2-B': 'onyx',
            'en-AU-Neural2-D': 'echo',
            'en-CA-Neural2-A': 'onyx',
            'en-CA-Neural2-C': 'echo',
            'en-IN-Neural2-B': 'fable'
        };

        const openaiVoice = voiceMap[voice] || 'alloy';

        // Call OpenAI TTS API
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                voice: openaiVoice,
                input: text
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenAI TTS API error: ${response.status} - ${errorData}`);
        }

        const audioBuffer = await response.arrayBuffer();

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
        });
        res.send(Buffer.from(audioBuffer));

    } catch (error) {
        console.error('Error with TTS:', error);
        res.status(500).json({ error: 'TTS Error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
