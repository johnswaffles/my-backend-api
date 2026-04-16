import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createEmptySearchResponse, normalizeSearchRequest, FOOD_BRAND } from './services/food/schemas.js';
import { askGeneralAssistant } from './services/food/assistant.js';
import { describeFoodIntent, inferFoodIntent } from './services/food/intent.js';
import { searchWithOpenAI } from './services/food/openai-search.js';
import { generateFoodSpeech } from './services/food/audio.js';

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const salesLeadsPath = path.join(__dirname, 'data', 'sales-leads.json');

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use(
  '/godot-playtest',
  express.static(path.join(__dirname, 'public', 'godot-playtest'), {
    setHeaders: (res, filePath) => {
      if (
        filePath.endsWith('.html') ||
        filePath.endsWith('.js') ||
        filePath.endsWith('.wasm') ||
        filePath.endsWith('.pck')
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
      }

      if (filePath.endsWith('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm');
      }
    }
  })
);
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

app.use(
  express.static(path.join(__dirname, 'dist'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        return;
      }

      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  })
);

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
      if (typeof content?.output_text === 'string') parts.push(content.output_text);
    }
  }

  return parts.join('\n').trim();
}

app.post('/api/ai/city-advisor', async (req, res) => {
  try {
    const { prompt, snapshot } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on server.' });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5.3-codex';
    const input = [
      {
        role: 'system',
        content:
          'You are a city-building strategy assistant for a cozy block-scale city builder. Give concise, practical advice tailored to the player state. Prioritize block layout, road frontage, enough power, essentials, safety, and health.'
      },
      {
        role: 'user',
        content: `Player request: ${prompt}\n\nCity snapshot:\n${JSON.stringify(snapshot || {}, null, 2)}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 250
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenAI request failed',
        details: data
      });
    }

    const text = extractResponseText(data) || 'No advice returned.';
    return res.json({ advice: text });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected server error', details: String(error.message || error) });
  }
});

function extractFirstJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function normalizeChatMessage(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeFoodChatRequest(message, history = []) {
  const text = normalizeChatMessage(message).toLowerCase();
  if (!text) return false;

  const cuisineIntent = inferFoodIntent({ query: message, destinationText: '' });
  if (cuisineIntent?.inferredCuisine) return true;

  const foodTerms = [
    'restaurant',
    'restaurants',
    'place to eat',
    'places to eat',
    'food',
    'eat',
    'meal',
    'lunch',
    'dinner',
    'breakfast',
    'brunch',
    'pizza',
    'pasta',
    'steak',
    'steakhouse',
    'burger',
    'burgers',
    'bbq',
    'barbecue',
    'taco',
    'tacos',
    'mexican',
    'coffee',
    'cafe',
    'café',
    'dessert',
    'sushi',
    'ramen',
    'seafood',
    'deli',
    'sandwich'
  ];

  if (foodTerms.some((term) => text.includes(term))) return true;

  const priorFoodTalk = Array.isArray(history)
    ? history
        .filter((turn) => turn && typeof turn.content === 'string')
        .some((turn) => foodTerms.some((term) => turn.content.toLowerCase().includes(term)))
    : false;

  return priorFoodTalk && /\b(what|where|show|find|list|give|tell|more|again|phone|address|hours|open|best|good|top|near)\b/i.test(text);
}

function buildFoodChatSources(searchResult) {
  const sources = [];
  const seen = new Set();

  for (const result of Array.isArray(searchResult?.results) ? searchResult.results.slice(0, 4) : []) {
    const candidates = [
      { title: result.name, url: result.website || result.mapsUrl },
      ...(Array.isArray(result.evidence)
        ? result.evidence.slice(0, 1).map((item) => ({ title: item.title || result.name, url: item.url }))
        : [])
    ];

    for (const source of candidates) {
      if (!source?.title || !source?.url) continue;
      const key = `${source.title}::${source.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ title: source.title, url: source.url });
      if (sources.length >= 3) return sources;
    }
  }

  return sources;
}

function looksLikeProcessSummary(text) {
  if (!text || typeof text !== 'string') return false;
  return /\b(searching|looking for|finding|current|right now|just now|could not complete|could not format|could not reach|ready to search)\b/i.test(
    text
  );
}

function isShortAcknowledgement(text) {
  const normalized = normalizeChatMessage(text).toLowerCase();
  if (!normalized) return false;
  if (normalized.length > 24) return false;
  return /^(ok|okay|sure|yes|yep|yeah|ready|sounds good|go ahead|continue|that works|thanks|thank you|cool|let's go|lets go)$/i.test(
    normalized
  );
}

function findMostRecentFoodUserMessage(history = []) {
  if (!Array.isArray(history)) return '';
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (!turn || turn.role !== 'user' || typeof turn.content !== 'string') continue;
    const content = normalizeChatMessage(turn.content);
    if (!content) continue;
    if (looksLikeFoodChatRequest(content, history.slice(0, index + 1))) {
      return content;
    }
  }
  return '';
}

function buildFoodChatReply(searchResult, request = null) {
  const results = Array.isArray(searchResult?.results) ? searchResult.results.slice(0, 3) : [];
  const warnings = Array.isArray(searchResult?.warnings) ? searchResult.warnings.filter(Boolean) : [];
  const requestQuery = typeof request?.query === 'string' ? request.query.trim() : '';
  const requestDestination = typeof request?.destinationText === 'string' ? request.destinationText.trim() : '';
  const inferredCuisine = inferFoodIntent({
    query: requestQuery,
    destinationText: requestDestination
  }).inferredCuisine;
  const foodLabel =
    (typeof request?.filters?.cuisine === 'string' && request.filters.cuisine.trim()) ||
    inferredCuisine ||
    (/pizza/i.test(requestQuery) ? 'pizza' : 'food');
  const locationLabel =
    requestDestination ||
    (request?.location?.label ? request.location.label : '') ||
    (results[0]?.city ? `${results[0].city}, IL` : '') ||
    'the area';

  if (!results.length) {
    const fallback = `I could not verify a strong ${foodLabel || 'food'} match in ${locationLabel} yet.`;
    return `${fallback}${warnings.length ? ` ${warnings[0]}` : ''} If you want, I can broaden the search to nearby Illinois towns or try a different food type.`;
  }

  const intro = foodLabel
    ? `Here are a few strong ${foodLabel} places I found in ${locationLabel}:`
    : `Here are a few strong local options I found in ${locationLabel}:`;

  const lines = [intro, ''];
  results.forEach((result, index) => {
    const locationBits = [result.formattedAddress || result.city, result.openNow === true ? 'open now' : '', result.confidence === 'limited' ? 'call ahead to confirm' : '']
      .filter(Boolean)
      .join(' • ');
    const scoreNote = typeof result.score === 'number' ? `Score ${Math.round(result.score)}` : '';
    const detailBits = [locationBits, scoreNote].filter(Boolean).join(' • ');
    lines.push(`${index + 1}. ${result.name}${detailBits ? ` — ${detailBits}` : ''}`);
    if (result.whyThisIsAFit) lines.push(`   ${result.whyThisIsAFit}`);
  });

  if (warnings.length) {
    lines.push('', warnings[0]);
  }

  lines.push('', 'If you want, I can narrow this to best overall, closest, or call-ahead details.');
  return lines.join('\n');
}

function readSalesLeads() {
  try {
    if (!fs.existsSync(salesLeadsPath)) {
      return [];
    }

    const raw = fs.readFileSync(salesLeadsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSalesLeads(leads) {
  fs.mkdirSync(path.dirname(salesLeadsPath), { recursive: true });
  fs.writeFileSync(salesLeadsPath, JSON.stringify(leads, null, 2));
}

app.post('/api/ai/game-command', async (req, res) => {
  try {
    const { prompt, snapshot } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on server.' });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-5.3-codex';
    const input = [
      {
        role: 'system',
        content:
          'You are the AI mayor for a cozy block-scale city builder. Return only JSON with this shape: {"message":"short text","commands":[{"action":"place","type":"road|house|restaurant|shop|park|workshop|powerPlant|groceryStore|cornerStore|bank|policeStation|fireStation|hospital","x":number,"z":number},{"action":"bulldoze","x":number,"z":number}]}. Rules: extend clean street blocks, place homes and businesses on street frontage, keep heavy infrastructure away from homes, and add groceries, safety, and health services when demanded. Max 8 commands. No markdown.'
      },
      {
        role: 'user',
        content: `Player request: ${prompt}\n\nGame snapshot:\n${JSON.stringify(snapshot || {}, null, 2)}`
      }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input,
        max_output_tokens: 350
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenAI request failed',
        details: data
      });
    }

    const outputText = extractResponseText(data) || '';
    const parsed = extractFirstJsonObject(outputText);
    if (!parsed || !Array.isArray(parsed.commands)) {
      return res.json({
        message: 'Model response was not valid command JSON. No actions applied.',
        commands: [],
        raw: outputText
      });
    }

    const commands = parsed.commands
      .slice(0, 12)
      .map((c) => ({
        action: c?.action,
        type: c?.type,
        x: Number(c?.x),
        z: Number(c?.z)
      }))
      .filter(
        (c) =>
          (c.action === 'place' || c.action === 'bulldoze') &&
          (c.action !== 'place' ||
            c.type === 'road' ||
            c.type === 'house' ||
            c.type === 'restaurant' ||
            c.type === 'shop' ||
            c.type === 'park' ||
            c.type === 'workshop' ||
            c.type === 'powerPlant' ||
            c.type === 'groceryStore' ||
            c.type === 'cornerStore' ||
            c.type === 'bank' ||
            c.type === 'policeStation' ||
            c.type === 'fireStation' ||
            c.type === 'hospital') &&
          Number.isFinite(c.x) &&
          Number.isFinite(c.z)
      )
      .map((c) =>
        c.action === 'bulldoze'
          ? { action: 'bulldoze', x: Math.round(c.x), z: Math.round(c.z) }
          : { action: 'place', type: c.type, x: Math.round(c.x), z: Math.round(c.z) }
      );

    return res.json({
      message: typeof parsed.message === 'string' ? parsed.message : 'Planned actions ready.',
      commands
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected server error', details: String(error.message || error) });
  }
});

app.post('/api/ai/generate-asset', async (req, res) => {
  try {
    const { prompt, size, filename } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on server.' });
    }

    const imageModel = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
    const imageSize = size || '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: imageModel,
        prompt,
        size: imageSize
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OpenAI image generation failed',
        details: data
      });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: 'No image data returned.' });
    }

    let savedTo = null;
    if (filename && typeof filename === 'string') {
      const safe = filename.replace(/[^a-zA-Z0-9_.-]/g, '');
      if (safe) {
        const outPath = path.join(__dirname, 'public', 'assets', safe);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
        savedTo = `/assets/${safe}`;
      }
    }

    return res.json({
      imageBase64: b64,
      savedTo
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected server error', details: String(error.message || error) });
  }
});

app.post('/api/sales-lead', (req, res) => {
  try {
    const {
      businessName,
      industry,
      primaryGoal,
      channels,
      monthlyVolume,
      contactName,
      email,
      phone,
      notes,
      recommendedPlan,
      transcript
    } = req.body || {};

    if (!businessName || typeof businessName !== 'string') {
      return res.status(400).json({ error: 'Business name is required.' });
    }

    if (!contactName || typeof contactName !== 'string') {
      return res.status(400).json({ error: 'Contact name is required.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const leads = readSalesLeads();
    const record = {
      id: `lead_${Date.now()}`,
      createdAt: new Date().toISOString(),
      businessName: businessName.trim(),
      industry: typeof industry === 'string' ? industry.trim() : '',
      primaryGoal: typeof primaryGoal === 'string' ? primaryGoal.trim() : '',
      channels: Array.isArray(channels)
        ? channels.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
        : [],
      monthlyVolume: typeof monthlyVolume === 'string' ? monthlyVolume.trim() : '',
      contactName: contactName.trim(),
      email: email.trim(),
      phone: typeof phone === 'string' ? phone.trim() : '',
      notes: typeof notes === 'string' ? notes.trim() : '',
      recommendedPlan: typeof recommendedPlan === 'string' ? recommendedPlan.trim() : '',
      transcript: Array.isArray(transcript)
        ? transcript
            .filter(
              (entry) =>
                entry &&
                typeof entry.role === 'string' &&
                typeof entry.text === 'string'
            )
            .map((entry) => ({
              role: entry.role.trim(),
              text: entry.text.trim()
            }))
        : []
    };

    leads.unshift(record);
    writeSalesLeads(leads);

    return res.json({
      ok: true,
      leadId: record.id
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to save sales lead.',
      details: String(error.message || error)
    });
  }
});

function buildAssistantResultSummary(results) {
  if (!Array.isArray(results) || !results.length) {
    return 'No verified spots yet.';
  }

  const top = results[0];
  return `I found a current local food match: ${top.name}.`;
}

function enrichFoodRequest(request) {
  const intent = inferFoodIntent(request);
  const filters = {
    ...request.filters,
    cuisine: request.filters.cuisine || intent.inferredCuisine || ''
  };

  return {
    request: {
      ...request,
      query: intent.querySubject || request.query,
      destinationText: intent.inferredLocation || request.destinationText,
      filters
    },
    intent
  };
}

app.post('/api/food/search', async (req, res) => {
  try {
    const request = normalizeSearchRequest(req.body || {});
    const { request: searchRequest, intent } = enrichFoodRequest(request);
    const openaiKey = process.env.OPENAI_API_KEY;
    const searchModel = process.env.OPENAI_MODEL || 'gpt-5.4';

    if (!openaiKey) {
      return res.json({
        ...createEmptySearchResponse(
          `${FOOD_BRAND} is waiting for OpenAI credentials so it can return verified restaurant results.`
        ),
        warnings: ['OPENAI_API_KEY is not configured on the server yet.']
      });
    }

    const searchResult = await searchWithOpenAI({
      apiKey: openaiKey,
      model: searchModel,
      request: searchRequest
    });

    return res.json({
      intentSummary: searchResult.intentSummary || describeFoodIntent(searchRequest),
      summary: typeof searchResult.summary === 'string' ? searchResult.summary : '',
      results: Array.isArray(searchResult.results) ? searchResult.results.slice(0, 8) : [],
      warnings: Array.isArray(searchResult.warnings) ? searchResult.warnings : [],
      audioSummary: typeof searchResult.audioSummary === 'string' ? searchResult.audioSummary : '',
      buckets: Array.isArray(searchResult.buckets) ? searchResult.buckets : [],
      hasLiveData: true,
      sourceMode: 'live'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to search 618FOOD.COM right now.',
      details: String(error.message || error)
    });
  }
});

async function handleChatRequest(req, res) {
  try {
    const { message, history, pageContext } = req.body || {};
    const cleanMessage = normalizeChatMessage(message);
    if (!cleanMessage) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5.4';
    const assistant = await askGeneralAssistant({
      apiKey: openaiKey,
      model,
      message: cleanMessage,
      history: Array.isArray(history) ? history : [],
      pageContext: pageContext && typeof pageContext === 'object' ? pageContext : null
    });

    return res.json(assistant);
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to answer 618FOOD.COM chat right now.',
      details: String(error.message || error)
    });
  }
}

app.post('/api/chat', handleChatRequest);
app.post('/api/food/assistant', handleChatRequest);

app.post('/api/food/audio', async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Text is required.' });
    }

    const audio = await generateFoodSpeech({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'nova',
      text: text.trim()
    });

    return res.json(audio);
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to generate audio for 618FOOD.COM.',
      details: String(error.message || error)
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`618FOOD.COM running on port ${port}`);
});
