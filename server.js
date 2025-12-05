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
const CHAT_MODEL_NAME = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash-preview-09-2025';
const IMAGE_MODEL_NAME = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

console.log('🤖 Chat Model:', CHAT_MODEL_NAME);
console.log('🎨 Image Model:', IMAGE_MODEL_NAME);

const MODEL_NAME = CHAT_MODEL_NAME; // For backward compatibility

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

**CRITICAL FIRST PARAGRAPH RULE (Non-Christian Genres):**
For ALL genres EXCEPT Christian, your VERY FIRST response is CRITICAL:
- **USE THE USER'S INPUT:** Build directly from what the user said (e.g., if they say "orphan girl", make the protagonist an orphan girl!)
- **ESTABLISH APPEARANCE:** Describe the protagonist's physical appearance in detail (eyes, hair, skin, build, clothing)
- **BRIEF BACKSTORY:** Give a hint of their background or current situation
- **BE SPECIFIC:** This paragraph sets the visual foundation for ALL future images
- Example: If user says "orphan girl", your first paragraph should introduce an orphan girl character with specific physical details

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


**INVENTORY TRACKING (MANDATORY):**

YOU MUST ADD ITEMS TO INVENTORY! When the story mentions character receiving/finding/picking up ANY item:
1. Write your story paragraph
2. On the NEXT LINE, output JSON in this EXACT format:
   {"action":"add_item","item":{"name":"Item Name","description":"Brief desc","type":"item"}}

When character uses/consumes an item:
   {"action":"consume_item","item":{"name":"Item Name"}}

When character drops/loses an item:
   {"action":"remove_item","item":{"name":"Item Name"}}

**CRITICAL JSON FORMATTING RULES:**
✓ Put JSON on its OWN LINE after the paragraph (NOT inline)
✓ Use ONLY double quotes (")
✓ NO trailing commas
✓ NO line breaks inside JSON
✓ Compact format with NO spaces around colons/commas

**WRONG:** She picked up the data chip {"action": "add_item"...}
**RIGHT:** 
She picked up the data chip.
{"action":"add_item","item":{"name":"Data Chip","description":"Corporate secrets","type":"item"}}

IMPORTANT: If you mention an item being acquired, you MUST output the JSON!
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
            // Limit history to last 30 messages to prevent token overflow/500 errors
            const MAX_HISTORY = 30;
            const recentHistory = history.slice(-MAX_HISTORY);

            chatHistory = recentHistory
                .filter(msg => msg.role && msg.parts) // Valid messages only
                .map(msg => ({
                    role: msg.role === 'user' || msg.role === 'model' ? msg.role : 'user', // Strict role check
                    parts: [{ text: String(msg.parts) }]
                }));
        }

        // 2. Build System Prompt
        const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}

**CURRENT GENRE:** ${selectedGenre}
Adjust your tone to match this genre.`;

        // 3. Configure Model
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: {
                parts: [{ text: fullSystemPrompt }]
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
            ],
            generationConfig: {
                maxOutputTokens: 4096, // Increased limit for longer stories
                temperature: 0.9,
            },
        });

        // 3. Start Chat Session
        const chat = model.startChat({
            history: chatHistory,
        });

        // 4. Generate Response
        console.log(`📤 Sending message to Gemini...`);
        const result = await chat.sendMessage(userMessage);
        const response = await result.response;

        let responseText = '';
        try {
            responseText = response.text();
        } catch (e) {
            // response.text() might throw if the generation was not clean (e.g. safety or max tokens)
            console.warn('response.text() threw, attempting to read candidate directly:', e.message);
        }

        // Fallback: Try to get text from candidate if response.text() failed or was empty
        if (!responseText && response.candidates && response.candidates.length > 0) {
            const candidate = response.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                responseText = candidate.content.parts.map(p => p.text).join('');
            }
        }

        // 5. Validation
        console.log('Gemini Response Length:', responseText ? responseText.length : 0);

        if (!responseText) {
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
            // responseText += "\n[...Response truncated...]"; 
        }

        // Create DETAILED character card ONLY on first message (for perfect image consistency)
        let characterCard = null;
        // Generate character card ONLY on first bot response (not for Christian genre)
        if (history.length <= 2 && genre !== 'Christian') {
            console.log('🎭 FIRST MESSAGE DETECTED - Generating Character Card...');
            console.log('User Input:', userMessage);
            console.log('Bot Response:', responseText.substring(0, 200));

            const characterCardPrompt = `Extract the MAIN CHARACTER's physical appearance from this story opening. Be ULTRA SPECIFIC.

USER'S REQUEST: "${userMessage}"
STORY OPENING: "${responseText}"

Provide EXACT details in this format:
HAIR: [exact color/shade, length, style, texture, any accessories]
EYES: [exact color/shade, shape, size, any modifications]
FACE: [shape, skin tone, age, distinctive marks, scars, makeup, facial hair]
BODY: [height, build, muscle definition, posture, notable features]
CYBERNETICS: [exact implants, locations, colors, materials, glow colors]
CLOTHING: [specific items (jacket, pants, boots), colors, materials, style, condition, logos/patterns]
ACCESSORIES: [jewelry, tech gadgets, holsters, backpacks, glasses/goggles]
WEAPONS/GEAR: [visible weapons, tools, equipment carried]
DISTINCTIVE FEATURES: [scars, tattoos, piercings, glowing elements, aura]
VIBE: [overall aesthetic - e.g., "gritty cyberpunk mercenary", "elegant corporate spy"]

Be SPECIFIC with colors (use descriptive shades like "neon electric blue" not just "blue").
Describe textures (matte, glossy, metallic, worn, leather).
Keep total under 150 words but pack in EXACT visual details.`;

            try {
                const charCardModel = genAI.getGenerativeModel({ model: MODEL_NAME });
                const charResult = await charCardModel.generateContent(characterCardPrompt);
                characterCard = charResult.response.text().trim();
                console.log('📋 Character Card Created:', characterCard);
            } catch (error) {
                console.error('❌ Character card generation failed:', error);
                characterCard = null;
            }
        }

        res.json({
            reply: responseText,
            characterCard  // Send back to frontend to store
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
        const { history, style, genre, characterCard, lastImageUrl, sceneContext } = req.body;

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

Scene: ${history[history.length - 1]?.parts?.substring(0, 500) || 'dramatic scene'}

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
