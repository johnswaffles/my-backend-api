require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
const corsOptions = {
    origin: [
        'https://justaskjohnny.com',
        'https://www.justaskjohnny.com',
        'http://localhost:3000', // For local testing
        /\.squarespace\.com$/ // Allow Squarespace preview domains
    ],
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    tools: [{ googleSearch: {} }]
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

// Google Translate TTS (Free, no auth required)
const googleTTS = require('google-tts-api');

// Text-to-Speech Endpoint
app.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'en-US' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log("TTS Request - Voice:", voice, "Text length:", text.length);

        // For long text, use getAllAudioUrls which splits into chunks
        const audioUrls = await googleTTS.getAllAudioUrls(text, {
            lang: voice,
            slow: false,
            host: 'https://translate.google.com',
            splitPunct: ',.?'
        });

        // If single URL, just fetch and return
        if (audioUrls.length === 1) {
            const https = require('https');
            https.get(audioUrls[0].url, (audioResponse) => {
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
                });
                audioResponse.pipe(res);
            }).on('error', (error) => {
                console.error('Error fetching audio:', error);
                res.status(500).json({ error: 'Failed to fetch audio' });
            });
        } else {
            // Multiple URLs - need to concatenate them
            const https = require('https');
            const chunks = [];

            // Fetch all audio chunks
            const fetchPromises = audioUrls.map(urlObj => {
                return new Promise((resolve, reject) => {
                    https.get(urlObj.url, (audioResponse) => {
                        const data = [];
                        audioResponse.on('data', chunk => data.push(chunk));
                        audioResponse.on('end', () => resolve(Buffer.concat(data)));
                        audioResponse.on('error', reject);
                    }).on('error', reject);
                });
            });

            const audioBuffers = await Promise.all(fetchPromises);
            const combinedAudio = Buffer.concat(audioBuffers);

            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
            });
            res.send(combinedAudio);
        }

    } catch (error) {
        console.error('Error with TTS:', error);
        res.status(500).json({ error: 'TTS Error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
