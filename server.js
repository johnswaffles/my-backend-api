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
        console.log(`🎨 Using image model: ${IMAGE_MODEL_NAME}`);

        const geminiImageModel = genAI.getGenerativeModel({ model: IMAGE_MODEL_NAME });

        // 1. Build the image generation prompt with TRIPLE REFERENCE for consistency
        let imagePrompt = '';

        if (characterCard) {
            // Ultra-strong character locking with scene context
            imagePrompt = `⚠️ CRITICAL: This character MUST look IDENTICAL in every image. DO NOT change ANY features!

🚫 ABSOLUTELY NO TEXT, WORDS, LETTERS, NUMBERS, OR WRITING OF ANY KIND IN THE IMAGE! 🚫
- Do NOT include speech bubbles, dialogue boxes, or captions
- Do NOT include signs, labels, or written words
- Do NOT include numbers, symbols, or characters
- Do NOT include watermarks or logos
- The image must be purely visual with ZERO text elements

===CHARACTER REFERENCE (LOCK THESE FEATURES)===
${characterCard}
===END CHARACTER REFERENCE===

===CURRENT SCENE CONTEXT===
${sceneContext || 'Continue the current scene.'}
===END SCENE CONTEXT===

MANDATORY RULES FOR CHARACTER:
1. Same EXACT eye color and shape every time
2. Same EXACT hair color, length, and style every time  
3. Same EXACT facial features (nose, lips, jawline, skin tone)
4. Same EXACT cybernetics/implants in same locations
5. Same EXACT clothing unless story explicitly changes it
6. Same EXACT scars, tattoos, or distinguishing marks
7. DO NOT change age, build, or proportions

CURRENT SCENE TO DEPICT:
${history[history.length - 1]?.parts?.substring(0, 500) || 'character standing'}

STYLE: ${style || 'Pixel Art'}
GENRE: ${genre || 'Cyberpunk'}

⚠️ REMEMBER: NO TEXT IN THE IMAGE! The character appearance MUST match the reference EXACTLY. No variations!`;

            console.log(`✅ Using stored character card for locked consistency`);
        } else {
            // Fallback without character card
            imagePrompt = `Create a high-quality ${style || 'Pixel Art'} style ${genre || 'Cyberpunk'} image.

🚫 ABSOLUTELY NO TEXT, WORDS, LETTERS, NUMBERS, OR WRITING OF ANY KIND IN THE IMAGE! 🚫
- No speech bubbles, dialogue, captions, signs, labels, or watermarks
- The image must be purely visual with ZERO text elements

CURRENT SCENE:
${history[history.length - 1]?.parts?.substring(0, 500) || 'character standing'}

Style: ${style || 'Pixel Art'}
Genre atmosphere: ${genre || 'Cyberpunk'}
High quality, detailed composition. NO TEXT!`;
        }

        console.log(`📝 Image prompt length: ${imagePrompt.length} chars`);

        // 3. Build multimodal content array
        let contents;

        if (lastImageUrl) {
            // Extract base64 data from data URL
            console.log('🖼️ Using previous image as visual reference');
            const base64Match = lastImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);

            if (base64Match) {
                const mimeType = `image/${base64Match[1]}`;
                const base64Data = base64Match[2];

                // Build multimodal prompt: image first, then text
                // Note: generateContent expects parts array directly, not wrapped in role
                contents = [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: `⚠️ CRITICAL: Use this reference image to maintain EXACT character consistency!

The character in this image is the SAME character you must generate. Copy their appearance EXACTLY.

${imagePrompt}

REMEMBER: The character MUST look identical to the reference image above!`
                    }
                ];

                console.log(`✅ Included ${base64Data.length} bytes of image reference`);
            } else {
                console.warn('⚠️ Could not parse lastImageUrl, falling back to text-only');
                contents = imagePrompt;
            }
        } else {
            // First image - text only (using character card)
            console.log('📝 First image generation (text-only)');
            contents = imagePrompt;
        }

        // 4. Generate image with Gemini 2.5 Flash Image
        const result = await geminiImageModel.generateContent(contents);
        const response = await result.response;

        console.log('🔍 Gemini Image Response Structure:');
        console.log('Candidates:', response.candidates?.length || 0);

        if (!response.candidates || response.candidates.length === 0) {
            console.error('❌ No candidates in response');
            console.error('Full response:', JSON.stringify(response, null, 2));
            console.error('Prompt feedback:', response.promptFeedback);
            throw new Error('No candidates in Gemini response - possibly blocked by safety filters');
        }

        // Iterate through parts to find the inlineData (image)
        const parts = response.candidates[0]?.content?.parts;

        if (!parts || parts.length === 0) {
            console.error('❌ No parts in response');
            console.error('Full candidate:', JSON.stringify(response.candidates[0], null, 2));
            console.error('Finish reason:', response.candidates[0]?.finishReason);
            console.error('Safety ratings:', response.candidates[0]?.safetyRatings);

            // Check if blocked by safety
            if (response.candidates[0]?.finishReason === 'SAFETY') {
                throw new Error('Image generation blocked by safety filters. Try a different scene or character description.');
            }

            throw new Error(`No parts in Gemini response. Finish reason: ${response.candidates[0]?.finishReason || 'unknown'}`);
        }

        console.log(`Found ${parts.length} part(s) in response`);

        // Find the part with image data
        let imageData = null;
        for (const part of parts) {
            if (part.inlineData) {
                imageData = part.inlineData;
                console.log('✅ Found inlineData in part');
                break;
            } else if (part.text) {
                console.log('Part contains text:', part.text.substring(0, 100));
            }
        }

        if (!imageData) {
            console.error('❌ No inlineData found in any part');
            console.error('Parts structure:', JSON.stringify(parts, null, 2).substring(0, 500));
            throw new Error('No image data in Gemini response');
        }

        // Convert to data URL
        const mimeType = imageData.mimeType || 'image/png';
        const base64Data = imageData.data;

        if (!base64Data) {
            throw new Error('inlineData.data is empty');
        }

        const imageUrl = `data:${mimeType};base64,${base64Data}`;

        console.log(`✅ Image generated successfully (${base64Data.length} bytes)`);

        res.json({ imageUrl });

    } catch (error) {
        console.error("❌ Gemini Image Generation Error:", error);
        console.error("Error details:", error.message, error.stack);
        res.status(500).json({
            error: "Failed to generate image with Gemini",
            details: error.message
        });
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
