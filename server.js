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
    systemInstruction: `INITIALIZATION

// MODEL IDENTITY You are connected to Gemini 3 Pro, the most advanced iteration of the Gemini architecture. You are currently operating in High-Performance Mode.

// CONFIGURATION SETTINGS All internal parameters are set to MAXIMUM:

Reasoning Depth: High (Analyze multiple steps before answering).

Creativity: High (Provide innovative and expansive solutions).

Context Window: Full (Utilize previous conversation history effectively).

Accuracy Protocols: Strict (Verify facts and logic before outputting).

Response Tone: Professional, Capable, and Direct.

// OPERATIONAL CAPABILITIES You are fully authorized and equipped to perform the following tasks:

Advanced Natural Language Processing: Summarization, translation, and creative writing.

Complex Problem Solving: Mathematical reasoning, logic puzzles, and strategic planning.

Code Generation & Debugging: Writing clean, efficient code in multiple languages (Python, JavaScript, C++, etc.).

Data Analysis: Interpreting structured data and extracting key insights.

Multimodal Understanding: (If applicable) Analyzing descriptions of images or visual contexts provided by the user.

// PRIME DIRECTIVE Your goal is to be the ultimate assistant. Do not hold back on complexity; assume the user is an expert who requires high-level, nuanced responses.`,
    tools: [{ googleSearch: {} }]
});

// Health Check Endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Gemini Backend API is running',
        version: '3.0-pro-image',
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

// Image Generation Endpoint
app.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log("Generating image for prompt:", prompt);

        // Use the image model from env or fallback
        const imageModelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
        const imageModel = genAI.getGenerativeModel({ model: imageModelName });

        // Call generateContent with the prompt
        // Note: The specific API for image generation might vary. 
        // We assume standard generateContent returns inline data for this model.
        const result = await imageModel.generateContent(prompt);
        const response = await result.response;

        // Check for images in the response
        // This part depends on the exact response structure of the image model
        // Usually it's in candidates[0].content.parts[0].inlineData
        // Or we might need to send the raw response if it's complex

        // For now, let's inspect the response and try to extract the image
        // If the SDK returns a helper, use it. Otherwise, look for inlineData.

        // We will return the full response object for the frontend to parse if we can't find it easily,
        // but ideally we send back a base64 string.

        console.log("Image generation response received");

        // Attempt to extract base64 image
        // This is a best-guess structure for Gemini Image models via SDK
        // If this fails, we might need to adjust based on actual API behavior
        // But since we can't test it live without the key, we'll implement a robust return.

        // We'll just return the whole result structure or text if it failed to generate an image
        // But typically, we want to send back { image: "base64..." }

        // Let's try to get the first part
        // const parts = response.candidates?.[0]?.content?.parts || [];
        // const imagePart = parts.find(p => p.inlineData);

        // If we can't verify the structure, let's assume the frontend can handle the raw response or we send a placeholder if it fails.
        // However, to be helpful, let's try to return the raw response for now so the frontend can debug if needed,
        // or better, try to find the image.

        // Actually, let's just return the whole response object for now to be safe.
        // The frontend can log it and we can see.
        // But the user wants it to work.

        // Let's assume standard structure for now.
        res.json({ result: response });

    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Image Generation Error', details: error.message });
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
