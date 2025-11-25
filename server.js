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

// Google Cloud Credentials Setup (for TTS)
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const fs = require('fs');
    const path = require('path');
    const credPath = path.join(__dirname, 'gcloud-creds.json');
    try {
        fs.writeFileSync(credPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
        console.log('Google Cloud credentials configured from environment variable');
    } catch (error) {
        console.error('Failed to write Google Cloud credentials:', error);
    }
}

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Gemini Backend API is running' });
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

// Google Cloud Text-to-Speech Setup
const textToSpeech = require('@google-cloud/text-to-speech');

// Initialize TTS client - Remove this section and use a simpler fallback
// The Google Cloud TTS client requires service account credentials which aren't configured on Render
// For now, we'll return an error message explaining this

// Text-to-Speech Endpoint
app.post('/tts', async (req, res) => {
    try {
        const { text, voice = 'en-US-Neural2-C' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        console.log("TTS Request - Voice:", voice, "Text length:", text.length);

        // Initialize client with default credentials (uses GOOGLE_APPLICATION_CREDENTIALS env var)
        const ttsClient = new textToSpeech.TextToSpeechClient();

        const request = {
            input: { text: text },
            voice: {
                languageCode: voice.split('-').slice(0, 2).join('-'), // e.g., en-US
                name: voice
            },
            audioConfig: {
                audioEncoding: 'MP3',
                pitch: 0,
                speakingRate: 1.0
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': `attachment; filename="speech-${Date.now()}.mp3"`
        });
        res.send(response.audioContent);

    } catch (error) {
        console.error('Error with TTS:', error);

        // Check for common API enablement error
        if (error.message && error.message.includes('PERMISSION_DENIED') && error.message.includes('Cloud Text-to-Speech API')) {
            return res.status(500).json({
                error: 'API Not Enabled',
                details: 'Please enable the Cloud Text-to-Speech API in your Google Cloud Console for this project.'
            });
        }

        // Check for missing credentials
        if (error.message && (error.message.includes('Could not load the default credentials') || error.message.includes('authenticate'))) {
            return res.status(500).json({
                error: 'TTS Authentication Error',
                details: 'Google Cloud credentials are not configured. Please set GOOGLE_APPLICATION_CREDENTIALS environment variable in Render.'
            });
        }

        res.status(500).json({ error: 'TTS Error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
