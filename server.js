import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FOOD_BRAND } from './services/food/schemas.js';

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

function createRetiredFoodResponse(feature = 'live restaurant tools') {
  return {
    ok: false,
    retired: true,
    service: FOOD_BRAND,
    feature,
    message:
      '618FOOD.COM is retired as a live restaurant finder. The project remains online as an archive, but live restaurant search, assistant, audio, and realtime features are disabled to avoid API costs.'
  };
}

function sendRetiredFoodResponse(res, feature) {
  return res.status(410).json(createRetiredFoodResponse(feature));
}

app.post('/api/food/search', (_req, res) => sendRetiredFoodResponse(res, 'live restaurant search'));

async function handleRestaurantAgentRequest(_req, res) {
  return sendRetiredFoodResponse(res, 'restaurant assistant');
}

app.post('/api/chat', handleRestaurantAgentRequest);
app.post('/api/food/assistant', handleRestaurantAgentRequest);

app.post('/api/food/audio', (_req, res) => sendRetiredFoodResponse(res, 'food audio narration'));

app.post('/api/realtime-token', (_req, res) => sendRetiredFoodResponse(res, 'realtime voice chat'));

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
