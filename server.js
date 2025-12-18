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
const CHAT_MODEL_NAME = process.env.GEMINI_CHAT_MODEL || 'gemini-3-flash-preview';
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp';

console.log('🤖 Chat Model:', CHAT_MODEL_NAME);
console.log('🎨 Image Model:', IMAGE_MODEL_NAME);

const MODEL_NAME = CHAT_MODEL_NAME; // For backward compatibility

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

app.post('/chat', async (req, res) => {
    try {
        const { message, history, image } = req.body; // Added image support
        const userMessage = message || '';

        console.log(`📥 User Message: "${userMessage.substring(0, 50)}..."`);
        if (image) console.log('📷 Image received');

        // 1. Sanitize History
        let chatHistory = [];
        if (history && Array.isArray(history)) {
            const MAX_HISTORY = 20; // Keep context focused
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
                maxOutputTokens: 8000, // High limit for detailed answers
                temperature: 0.7, // Slightly lower for accuracy
            },
        });

        // 3. Start Chat Session
        const chat = model.startChat({
            history: chatHistory,
        });

        // 4. Generate Response
        let result;
        if (image) {
            // Multimodal request
            const imagePart = {
                inlineData: {
                    data: image.split(',')[1], // Remove data:image/png;base64, header
                    mimeType: image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1]
                }
            };

            result = await chat.sendMessage([userMessage, imagePart]);
        } else {
            result = await chat.sendMessage(userMessage);
        }

        const response = await result.response;
        const responseText = response.text();

        // 5. Validation & Cleaning
        console.log('Gemini Response Length:', responseText ? responseText.length : 0);

        if (!responseText) {
            throw new Error('Empty response from AI');
        }

        res.json({
            reply: responseText
        });

    } catch (error) {
        console.error('Chat Endpoint Error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

// --- Image Generation Endpoint (Gemini 2.5 Flash Image) ---
app.post('/generate-image', async (req, res) => {
    try {
        const { lastMessage, style, genre, characterCard, lastImageUrl, sceneContext } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Gemini API Key missing for image generation" });
        }

        // Use Gemini image model from environment variable
        const imageModelName = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
        console.log(`🎨 Using Gemini image model: ${imageModelName}`);

        const geminiImageModel = genAI.getGenerativeModel({ model: imageModelName });

        // Style guide for specific visual descriptions
        const styleGuide = {
            'Anime': 'Japanese anime style, big expressive eyes, clean linework, cel-shaded, vibrant colors, manga influenced',
            'Oil Painting': 'visible brushstrokes, thick impasto texture, classical painting technique, rich colors, museum quality',
            'Watercolor': 'soft edges, color bleeding, wet-on-wet technique, paper texture visible, transparent washes',
            'Digital Art': 'clean digital illustration, modern concept art, smooth gradients, professional digital painting',
            'Concept Art': 'entertainment industry concept art, detailed environment design, professional illustration',
            'Comic Book': 'bold black outlines, halftone dots, dynamic action poses, Marvel/DC aesthetic',
            'Manga': 'Japanese manga style, screentones, dramatic speed lines, expressive faces, black and white or limited color',
            'Pixel Art': '16-bit retro game pixels, visible square pixels, limited color palette, nostalgic video game style',
            'Impressionism': 'visible brushwork, light and color focus, Monet-style, soft edges, outdoor scenes',
            'Art Nouveau': 'flowing organic lines, decorative borders, Alphonse Mucha style, ornate patterns',
            'Pop Art': 'bold primary colors, Ben-Day dots, Andy Warhol style, commercial art aesthetic',
            'Surrealism': 'dreamlike, impossible scenes, Salvador Dali influence, melting reality, symbolic imagery',
            'Photorealistic': 'hyperrealistic, could be mistaken for a photograph, extreme detail, perfect lighting',
            'Charcoal Sketch': 'black and white, rough sketch lines, smudged charcoal texture, artistic drawing',
            'Fantasy Art': 'epic fantasy illustration, detailed armor and magic, Frank Frazetta inspired, heroic',
            'Cyberpunk': 'neon lights, rain-slicked streets, high-tech low-life, blade runner aesthetic, futuristic',
            'Steampunk': 'Victorian era technology, brass gears, steam-powered machinery, goggles and corsets',
            'Studio Ghibli': 'Hayao Miyazaki style, soft colors, detailed backgrounds, whimsical, hand-drawn animation look'
        };

        const styleDesc = styleGuide[style] || style || 'detailed illustration';

        // Build prompt
        let imagePrompt = '';

        if (characterCard) {
            const sceneText = sceneContext || 'character standing in a dramatic setting';

            // SCENE-FIRST prompt: Environment is primary, character is secondary
            imagePrompt = `CREATE A NEW SCENE - Different from any previous image.

SCENE TO ILLUSTRATE (THIS IS THE MOST IMPORTANT PART):
"${sceneText}"

Extract from above: What is the LOCATION? What is the CHARACTER DOING? What is the MOOD/ATMOSPHERE?
Show this specific moment with a UNIQUE composition, angle, and environment.

CHARACTER IN THIS SCENE (keep appearance consistent):
${characterCard}

Art Style: ${style || 'Digital Art'} (${styleDesc})
Genre: ${genre || 'Science Fiction'}

CRITICAL REQUIREMENTS:
1. The ENVIRONMENT must match the scene description above - NOT a generic background
2. Show a NEW camera angle/composition 
3. Character should be DOING something relevant to the scene
4. Lighting and atmosphere should reflect the current moment
5. No text/words in image

The scene and setting are the STAR - the character just needs to be recognizable.`;

            console.log(`✅ Using character card for consistency`);
        } else {
            imagePrompt = `Art Style: ${style || 'Digital Art'} - ${styleDesc}

Scene: ${lastMessage?.parts?.substring(0, 500) || 'dramatic scene'}

Requirements:
- Render in ${style || 'Digital Art'} style ONLY
- No text, words, or writing in the image
- ${genre || 'Science Fiction'} genre atmosphere`;
        }

        console.log(`📝 Image prompt (${imagePrompt.length} chars)`);

        // Generate with Gemini
        const result = await geminiImageModel.generateContent(imagePrompt);
        const response = await result.response;

        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No candidates in Gemini response');
        }

        const parts = response.candidates[0]?.content?.parts;
        if (!parts || parts.length === 0) {
            throw new Error('No parts in Gemini response');
        }

        // Find image data
        let imageData = null;
        for (const part of parts) {
            if (part.inlineData) {
                imageData = part.inlineData;
                break;
            }
        }

        if (!imageData) {
            throw new Error('No image data in Gemini response');
        }

        const mimeType = imageData.mimeType || 'image/png';
        const imageUrl = `data:${mimeType};base64,${imageData.data}`;

        console.log(`✅ Gemini image generated successfully`);

        res.json({ imageUrl });

    } catch (error) {
        console.error("❌ Gemini Image Generation Error:", error);
        console.error("Error details:", error.message);
        res.status(500).json({
            error: "Failed to generate image with Gemini",
            details: error.message
        });
    }
});

// GET endpoint for TTS
app.get('/tts', async (req, res) => {
    try {
        const { text, voice } = req.query;
        if (!text) return res.status(400).json({ error: 'Text required' });
        if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API Key missing' });

        const voiceName = voice || 'alloy'; // Default voice
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

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

        // Stream the audio back
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

        const voiceName = voice || 'alloy'; // Default voice
        const ttsModel = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

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

        // Stream the audio back
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
