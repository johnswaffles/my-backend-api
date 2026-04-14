import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createEmptySearchResponse, normalizeSearchRequest, FOOD_BRAND } from './services/food/schemas.js';
import { fetchGooglePlaceDetails, inferFoodIntent, normalizeGooglePlace, searchGooglePlaces } from './services/food/google-places.js';
import { askFoodAssistant } from './services/food/assistant.js';
import { corroborateCandidates } from './services/food/corroboration.js';
import { applyCuisineGate, buildAudioSummary, buildResultBuckets, isLargeChain, rankCandidates } from './services/food/ranking.js';
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

function getGooglePlacesApiKey() {
  return (
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_PLACES_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    ''
  );
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

function buildFoodIntentSummary(request) {
  const parts = [];
  if (request.mealType !== 'any') parts.push(request.mealType);
  if (request.filters.cuisine) parts.push(request.filters.cuisine);
  if (request.filters.openNow) parts.push('open now');
  if (request.filters.localOnly) parts.push('local-first');
  if (request.filters.worthTheDrive) parts.push('worth the drive');
  if (request.destinationText) parts.push(`for ${request.destinationText}`);
  if (request.location?.label) parts.push(`near ${request.location.label}`);
  if (!parts.length) return `${FOOD_BRAND} is ready for a rural Southern Illinois search.`;
  return `${FOOD_BRAND} search tuned for ${parts.join(', ')}.`;
}

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
    const googleKey = getGooglePlacesApiKey();
    const openaiKey = process.env.OPENAI_API_KEY;
    const searchModel = process.env.OPENAI_MODEL || 'gpt-5.4';

    if (!googleKey) {
      return res.json({
        ...createEmptySearchResponse(
          `${FOOD_BRAND} is waiting for Google Places credentials so it can return verified restaurant results.`
        ),
        warnings: ['Google Places is not configured on the server yet.']
      });
    }

    const { candidates: rawCandidates, warnings: googleWarnings = [], resolvedLocation } = await searchGooglePlaces(searchRequest, googleKey);
    if (!rawCandidates.length) {
      return res.json({
        ...createEmptySearchResponse(
          `${FOOD_BRAND} did not find verified matches within the selected radius.`
        ),
        warnings: [
          ...googleWarnings,
          'No Google Places candidates were returned for the current search.'
        ]
      });
    }

    const candidateDetails = [];
    for (const seed of rawCandidates.slice(0, 32)) {
      try {
        const detail = await fetchGooglePlaceDetails(seed.placeId, googleKey);
        candidateDetails.push(
          normalizeGooglePlace(detail, seed, {
            ...searchRequest,
            location: resolvedLocation || searchRequest.location
          })
        );
      } catch {
        candidateDetails.push(
          normalizeGooglePlace(seed.place, seed, {
            ...searchRequest,
            location: resolvedLocation || searchRequest.location
          })
        );
      }
    }

    const radiusLimitedCandidates = candidateDetails.filter((candidate) => {
      if (candidate.distanceMiles == null) return true;
      return candidate.distanceMiles <= searchRequest.radiusMiles;
    });

    const corroboration = await corroborateCandidates({
      apiKey: openaiKey,
      model: searchModel,
      request: searchRequest,
      candidates: radiusLimitedCandidates
        .filter((candidate) => !isLargeChain(candidate))
        .slice(0, 8)
    });

    const ranked = rankCandidates({
      request: searchRequest,
      intent,
      candidates: radiusLimitedCandidates,
      corroborated: corroboration.results || []
    });
    const cuisineGate = applyCuisineGate(ranked, searchRequest, intent);
    const finalResults = cuisineGate.results.length ? cuisineGate.results : ranked;

    const mergedWarnings = [
      ...googleWarnings,
      ...(corroboration.warnings || []),
      ...(cuisineGate.warnings || []),
      ...(request.filters.openNow ? [] : []),
      ...(request.filters.localOnly ? [] : [])
    ].filter(Boolean);

    return res.json({
      intentSummary: corroboration.intentSummary || buildFoodIntentSummary(searchRequest),
      results: finalResults.slice(0, 8),
      warnings: mergedWarnings,
      audioSummary: buildAudioSummary(searchRequest, finalResults.slice(0, 1)),
      buckets: buildResultBuckets(finalResults.slice(0, 8), searchRequest, intent),
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

app.post('/api/food/assistant', async (req, res) => {
  try {
    const { message, currentSearch, currentSummary, currentResults } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5.4';

    const assistant = await askFoodAssistant({
      apiKey: openaiKey,
      model,
      message: message.trim(),
      currentSearch: normalizeSearchRequest(currentSearch || {}),
      currentSummary: typeof currentSummary === 'string' ? currentSummary : buildAssistantResultSummary(currentResults),
      currentResults: Array.isArray(currentResults) ? currentResults : []
    });

    return res.json(assistant);
  } catch (error) {
    return res.status(500).json({
      error: 'Unable to answer 618FOOD.COM follow-up right now.',
      details: String(error.message || error)
    });
  }
});

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
