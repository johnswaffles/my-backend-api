import { FOOD_BRAND } from './schemas.js';
import { FOOD_DISCOVERY_EVIDENCE_PROMPT, FOOD_DISCOVERY_FORMATTING_PROMPT } from './prompts.js';
import { inferFoodIntent, normalizeComparableText } from './intent.js';
import { haversineMiles, resolveSearchLocation } from './location.js';
import { applyCuisineGate, buildAudioSummary, buildResultBuckets, isLargeChain, rankCandidates } from './ranking.js';

const OPENAI_DISCOVERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intentSummary', 'summary', 'warnings', 'results'],
  properties: {
    intentSummary: { type: 'string' },
    summary: { type: 'string' },
    warnings: {
      type: 'array',
      items: { type: 'string' }
    },
    results: {
      type: 'array',
      maxItems: 8,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'placeId',
            'name',
            'formattedAddress',
            'city',
            'phone',
            'website',
            'mapsUrl',
            'categories',
            'openNow',
            'rating',
            'reviewCount',
            'priceLevel',
            'coordinates',
            'distanceMiles',
            'score',
            'confidence',
            'tags',
            'whyThisIsAFit',
            'whatWeFound',
            'evidence'
          ],
          properties: {
          placeId: { type: 'string' },
          name: { type: 'string' },
          formattedAddress: { type: 'string' },
          city: { type: 'string' },
          phone: { type: 'string' },
          website: { type: 'string' },
          mapsUrl: { type: 'string' },
          categories: {
            type: 'array',
            items: { type: 'string' }
          },
          openNow: { type: ['boolean', 'null'] },
          rating: { type: ['number', 'null'] },
          reviewCount: { type: ['number', 'null'] },
          priceLevel: { type: ['number', 'null'] },
          coordinates: {
            type: ['object', 'null'],
            additionalProperties: false,
            required: ['lat', 'lng'],
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' }
            }
          },
          distanceMiles: { type: ['number', 'null'] },
          score: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'limited'] },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          whyThisIsAFit: { type: 'string' },
          whatWeFound: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['sourceType', 'title', 'url', 'snippet', 'freshness', 'notes', 'consistent'],
              properties: {
                sourceType: { type: 'string' },
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' },
                freshness: { type: 'string', enum: ['fresh', 'recent', 'stale', 'unknown'] },
                notes: { type: 'string' },
                consistent: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
};

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

function sanitizeStructuredText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .replace(/\u200b/g, '')
    .replace(/\s*cite[^]*/g, '')
    .replace(/\s*【\d+:\d+†[^】]*】/g, '')
    .replace(/\s*\[\d+\]/g, '')
    .trim();
}

function extractJsonObject(text) {
  const cleanText = sanitizeStructuredText(text);
  if (!cleanText) return null;
  const start = cleanText.indexOf('{');
  const end = cleanText.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleanText.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slugPart(value) {
  return normalizeComparableText(value).replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 80);
}

function createStablePlaceId(candidate) {
  const parts = [candidate.name, candidate.formattedAddress, candidate.city, candidate.website]
    .filter(Boolean)
    .map((value) => slugPart(value))
    .filter(Boolean);
  return parts.length ? `openai-${parts.join('-')}` : `openai-${Date.now()}`;
}

function buildMapsUrl(candidate) {
  const query = [candidate.name, candidate.formattedAddress, candidate.city].filter(Boolean).join(' ');
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}

function normalizeEvidence(rawEvidence) {
  if (!Array.isArray(rawEvidence)) return [];
  return rawEvidence
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      sourceType: typeof item.sourceType === 'string' && item.sourceType.trim() ? item.sourceType.trim() : 'other',
      title: typeof item.title === 'string' ? item.title.trim() : '',
      url: typeof item.url === 'string' ? item.url.trim() : '',
      snippet: typeof item.snippet === 'string' ? item.snippet.trim() : '',
      freshness:
        item.freshness === 'fresh' || item.freshness === 'recent' || item.freshness === 'stale'
          ? item.freshness
          : 'unknown',
      notes: typeof item.notes === 'string' ? item.notes.trim() : '',
      consistent: Boolean(item.consistent)
    }))
    .filter((item) => item.title && item.url);
}

function normalizeConfidence(value) {
  return value === 'high' || value === 'medium' ? value : 'limited';
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()))].slice(0, 8);
}

function normalizeCandidate(candidate, requestLocation = null) {
  const normalized = {
    placeId: normalizeText(candidate.placeId) || createStablePlaceId(candidate),
    name: normalizeText(candidate.name),
    formattedAddress: normalizeText(candidate.formattedAddress),
    city: normalizeText(candidate.city),
    phone: normalizeText(candidate.phone),
    website: normalizeText(candidate.website),
    mapsUrl: normalizeText(candidate.mapsUrl) || buildMapsUrl(candidate),
    categories: Array.isArray(candidate.categories)
      ? [...new Set(candidate.categories.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))].slice(0, 6)
      : [],
    openNow: candidate.openNow === true || candidate.openNow === false ? candidate.openNow : null,
    rating: Number.isFinite(candidate.rating) ? candidate.rating : null,
    reviewCount: Number.isFinite(candidate.reviewCount) ? candidate.reviewCount : null,
    priceLevel: Number.isFinite(candidate.priceLevel) ? candidate.priceLevel : null,
    coordinates:
      candidate.coordinates && Number.isFinite(candidate.coordinates.lat) && Number.isFinite(candidate.coordinates.lng)
        ? { lat: candidate.coordinates.lat, lng: candidate.coordinates.lng }
        : null,
    distanceMiles: Number.isFinite(candidate.distanceMiles) ? candidate.distanceMiles : null,
    score: Number.isFinite(candidate.score) ? candidate.score : 0,
    confidence: normalizeConfidence(candidate.confidence),
    tags: normalizeTags(candidate.tags),
    whyThisIsAFit: normalizeText(candidate.whyThisIsAFit),
    whatWeFound: normalizeText(candidate.whatWeFound),
    evidence: normalizeEvidence(candidate.evidence)
  };

  if (requestLocation && normalized.coordinates == null && normalized.formattedAddress) {
    // The backend geocoder will fill coordinates later when available.
  }

  return normalized;
}

function buildEvidencePrompt(request, intent, locationContext) {
  const parts = [
    `Brand: ${FOOD_BRAND}.`,
    'You are helping a rural Southern Illinois food discovery app find real places to eat.',
    'If a town is mentioned without a state, assume Illinois unless the user clearly says otherwise.',
    'Think like a Mount Vernon, Illinois local and look for exact matches before generic nearby restaurants.',
    'Start by anchoring on the town, ZIP, or destination, then search only that area for the requested food type.',
    'If the query contains a specific restaurant name plus a location, search for that exact business first and return a profile-style result for it.',
    'Use the web_search tool to find verified businesses only.',
    'Do not invent restaurants, addresses, phone numbers, websites, ratings, or hours.',
    'Prefer local independents and hidden gems.',
    'If the user asks for a specific cuisine, exact matches must outrank generic restaurants.',
    'If the requested cuisine has no verified matches, return the closest verified alternative and say so clearly.',
    'Exclude major chains unless the user explicitly asks for them, names the chain directly, or no independent option is available.',
    'Honor the requested radius and do not include places that clearly fall outside it.',
    'Do not return JSON yet. Return a short plain-text shortlist for another model to format.'
  ];

  const queryBits = [];
  if (request.query) queryBits.push(`Query: ${request.query}`);
  if (request.destinationText) queryBits.push(`Destination: ${request.destinationText}`);
  if (intent.inferredCuisine) queryBits.push(`Cuisine intent: ${intent.inferredCuisine}`);
  if (intent.preference) queryBits.push(`Preference: ${intent.preference}`);
  if (request.mealType && request.mealType !== 'any') queryBits.push(`Meal type: ${request.mealType}`);
  if (request.filters?.localOnly) queryBits.push('Local restaurants only');
  if (request.filters?.openNow) queryBits.push('Open now preferred');
  if (request.filters?.dogFriendly) queryBits.push('Dog-friendly preferred');
  if (request.filters?.patio) queryBits.push('Patio preferred');
  if (request.filters?.familyFriendly) queryBits.push('Family-friendly preferred');
  if (request.filters?.quickBite) queryBits.push('Quick bite preferred');
  if (request.filters?.dateNight) queryBits.push('Date night preferred');
  if (request.filters?.worthTheDrive) queryBits.push('Worth the drive');
  if (request.filters?.budget) queryBits.push(`Budget preference: ${request.filters.budget}`);
  if (locationContext?.label) queryBits.push(`Search center: ${locationContext.label}`);
  if (request.radiusMiles) queryBits.push(`Radius: ${request.radiusMiles} miles`);

  parts.push(queryBits.length ? `Search context:\n${queryBits.map((item) => `- ${item}`).join('\n')}` : 'Search context: none provided.');
  parts.push(
    'Use multiple searches as needed: official sites, menus, social pages, local news, tourism pages, ordering pages, and current web mentions. Keep the answer focused on the 3 to 5 best matches. If evidence is thin or conflicting, reduce confidence or omit the place. If the first pass only finds a few generic options, do a second closer look before settling.'
  );
  parts.push(
    'For each candidate include: name, address, city, phone, website, category, open now if known, rating/review count if known, and 1 to 3 short evidence bullets with source title, URL, and a short note.'
  );
  parts.push('Keep the memo short, factual, and easy to convert into JSON. Do not mention tools or model traces.');

  return parts.join('\n\n');
}

function buildFallbackEvidencePrompt(request, intent, locationContext) {
  const lines = [
    `Brand: ${FOOD_BRAND}.`,
    'Find the best few verified places to eat for the requested location and food type.',
    'If the request names one restaurant and a location, search for that exact business first and return its verified profile details.',
    'Major chains are allowed when the user names the chain directly.',
    'If the first pass was thin, do a second closer look with alternate spellings, nearby Illinois towns, menu pages, official sites, social pages, local news, tourism pages, and ordering pages.',
    'Return plain text only.',
    'Use this exact format for each candidate:',
    'Name: ...',
    'Address: ...',
    'City: ...',
    'Phone: ...',
    'Website: ...',
    'Category: ...',
    'Why: ...',
    'Evidence: ...',
    '',
    'Keep it to 3 to 5 candidates.',
    'Do not write JSON.',
    'Do not mention your process.'
  ];

  const contextBits = [];
  if (request.query) contextBits.push(`Query: ${request.query}`);
  if (request.destinationText) contextBits.push(`Destination: ${request.destinationText}`);
  if (intent.inferredCuisine) contextBits.push(`Cuisine intent: ${intent.inferredCuisine}`);
  if (locationContext?.label) contextBits.push(`Search center: ${locationContext.label}`);
  if (request.radiusMiles) contextBits.push(`Radius: ${request.radiusMiles} miles`);
  if (contextBits.length) {
    lines.push('', `Context:\n${contextBits.map((item) => `- ${item}`).join('\n')}`);
  }

  return lines.join('\n');
}

function buildCloserLookEvidencePrompt(request, intent, locationContext, memo) {
  const lines = [
    `Brand: ${FOOD_BRAND}.`,
    'This is a second, closer pass.',
    'Search again more carefully for exact cuisine matches, local favorites, and small-town places that may have been missed.',
    'If the request names one restaurant and a location, focus on the exact business and gather profile details instead of broad substitutes.',
    'Look for official sites, menus, Facebook pages, local blogs, local news, tourism pages, ordering pages, and current community language.',
    'If the first pass found generic restaurants or chains, keep looking for better exact matches before settling.',
    'Try alternate spellings, tiny variants in town names, and nearby Illinois towns when relevant.',
    'Return a short plain-text shortlist for another model to format.',
    'Do not mention the process or tool trace.'
  ];

  const contextBits = [];
  if (request.query) contextBits.push(`Query: ${request.query}`);
  if (request.destinationText) contextBits.push(`Destination: ${request.destinationText}`);
  if (intent.inferredCuisine) contextBits.push(`Cuisine intent: ${intent.inferredCuisine}`);
  if (intent.preference) contextBits.push(`Preference: ${intent.preference}`);
  if (request.mealType && request.mealType !== 'any') contextBits.push(`Meal type: ${request.mealType}`);
  if (request.filters?.localOnly) contextBits.push('Local restaurants only');
  if (request.filters?.openNow) contextBits.push('Open now preferred');
  if (request.filters?.dogFriendly) contextBits.push('Dog-friendly preferred');
  if (request.filters?.patio) contextBits.push('Patio preferred');
  if (request.filters?.familyFriendly) contextBits.push('Family-friendly preferred');
  if (request.filters?.quickBite) contextBits.push('Quick bite preferred');
  if (request.filters?.dateNight) contextBits.push('Date night preferred');
  if (request.filters?.worthTheDrive) contextBits.push('Worth the drive');
  if (request.radiusMiles) contextBits.push(`Radius: ${request.radiusMiles} miles`);
  if (locationContext?.label) contextBits.push(`Search center: ${locationContext.label}`);

  lines.push('', contextBits.length ? `Search context:\n${contextBits.map((item) => `- ${item}`).join('\n')}` : 'Search context: none provided.');
  lines.push('', `Earlier memo to improve on:\n${memo || 'No memo returned.'}`);
  lines.push(
    'If the earlier pass only found a few weak or generic candidates, search wider nearby Illinois towns and more specific cuisine words. Aim for 3 to 8 verified candidates.'
  );

  return lines.join('\n');
}

function countCandidateBlocks(text) {
  if (!text || typeof text !== 'string') return 0;
  const matches = text.match(/^Name:\s+/gmi);
  return matches ? matches.length : 0;
}

function buildFormattingPrompt(request, intent, locationContext, memo) {
  const parts = [
    `Brand: ${FOOD_BRAND}.`,
    'Convert the provided evidence memo into valid JSON that matches the food discovery schema exactly.',
    'Preserve only facts present in the memo. Do not invent restaurants, addresses, phone numbers, websites, ratings, hours, or evidence.',
    'If the original request named one restaurant and a location, keep the response focused on that restaurant profile when the memo supports it.',
    'If a candidate is weak, stale, unsupported, or clearly repeated from a second pass, omit or merge it.',
    'Keep explanations short, concrete, and trustworthy.',
    'Return JSON only.'
  ];

  const queryBits = [];
  if (request.query) queryBits.push(`Query: ${request.query}`);
  if (request.destinationText) queryBits.push(`Destination: ${request.destinationText}`);
  if (intent.inferredCuisine) queryBits.push(`Cuisine intent: ${intent.inferredCuisine}`);
  if (intent.preference) queryBits.push(`Preference: ${intent.preference}`);
  if (request.mealType && request.mealType !== 'any') queryBits.push(`Meal type: ${request.mealType}`);
  if (request.filters?.localOnly) queryBits.push('Local restaurants only');
  if (request.filters?.openNow) queryBits.push('Open now preferred');
  if (request.filters?.dogFriendly) queryBits.push('Dog-friendly preferred');
  if (request.filters?.patio) queryBits.push('Patio preferred');
  if (request.filters?.familyFriendly) queryBits.push('Family-friendly preferred');
  if (request.filters?.quickBite) queryBits.push('Quick bite preferred');
  if (request.filters?.dateNight) queryBits.push('Date night preferred');
  if (request.filters?.worthTheDrive) queryBits.push('Worth the drive');
  if (request.filters?.budget) queryBits.push(`Budget preference: ${request.filters.budget}`);
  if (locationContext?.label) queryBits.push(`Search center: ${locationContext.label}`);
  if (request.radiusMiles) queryBits.push(`Radius: ${request.radiusMiles} miles`);

  parts.push(queryBits.length ? `Search context:\n${queryBits.map((item) => `- ${item}`).join('\n')}` : 'Search context: none provided.');
  parts.push(`Evidence memo:\n${memo || 'No memo returned.'}`);

  return parts.join('\n\n');
}

async function runDiscoveryMemo({ apiKey, model, request, intent, locationContext }) {
  const run = async (prompt) => {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search' }],
        reasoning: { effort: 'medium' },
        input: [
          {
            role: 'system',
            content: FOOD_DISCOVERY_EVIDENCE_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_output_tokens: 1800
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const message = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI request failed.';
      const error = new Error(message);
      error.details = data;
      throw error;
    }

    const text = extractResponseText(data);
    return sanitizeStructuredText(text);
  };

  const primaryMemo = await run(buildEvidencePrompt(request, intent, locationContext));
  const memos = [];
  if (primaryMemo) memos.push(primaryMemo);

  const needsCloserPass =
    !primaryMemo ||
    countCandidateBlocks(primaryMemo) < (intent?.inferredCuisine ? 3 : 2) ||
    primaryMemo.length < (intent?.inferredCuisine ? 1200 : 800);

  if (primaryMemo && needsCloserPass) {
    const closerMemo = await run(buildCloserLookEvidencePrompt(request, intent, locationContext, primaryMemo));
    if (closerMemo) memos.push(closerMemo);
  }

  if (!memos.length) {
    const fallbackMemo = await run(buildFallbackEvidencePrompt(request, intent, locationContext));
    if (fallbackMemo) {
      memos.push(fallbackMemo);
      if (countCandidateBlocks(fallbackMemo) < (intent?.inferredCuisine ? 3 : 2)) {
        const closerMemo = await run(buildCloserLookEvidencePrompt(request, intent, locationContext, fallbackMemo));
        if (closerMemo) memos.push(closerMemo);
      }
    }
  }

  if (memos.length) return memos.join('\n\n---\n\n');

  throw new Error('OpenAI returned an empty food discovery memo.');
}

async function runFormatting({ apiKey, model, request, intent, locationContext, memo }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'food_discovery',
          strict: true,
          schema: OPENAI_DISCOVERY_SCHEMA
        }
      },
      input: [
        {
          role: 'system',
          content: FOOD_DISCOVERY_FORMATTING_PROMPT
        },
        {
          role: 'user',
          content: buildFormattingPrompt(request, intent, locationContext, memo)
        }
      ],
      max_output_tokens: 2600
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI formatting failed.';
    const error = new Error(message);
    error.details = data;
    throw error;
  }

  const text = extractResponseText(data);
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.results)) {
    return repairDiscoveryPayload({ apiKey, model, rawText: memo || text || JSON.stringify(data, null, 2) });
  }

  return parsed;
}

async function repairDiscoveryPayload({ apiKey, model, rawText }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'food_discovery_repair',
          strict: true,
          schema: OPENAI_DISCOVERY_SCHEMA
        }
      },
      input: [
        {
          role: 'system',
          content: FOOD_DISCOVERY_FORMATTING_PROMPT
        },
        {
          role: 'user',
          content: `Repair this evidence memo into valid JSON that matches the food discovery schema exactly:\n\n${rawText}`
        }
      ],
      max_output_tokens: 2600
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI discovery repair failed.';
    const error = new Error(message);
    error.details = data;
    throw error;
  }

  const text = extractResponseText(data);
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.results)) {
    throw new Error('OpenAI could not repair the food discovery payload.');
  }

  return parsed;
}

async function enrichWithDistance(results, locationContext) {
  if (!locationContext || !Number.isFinite(locationContext.lat) || !Number.isFinite(locationContext.lng) || !Array.isArray(results) || !results.length) {
    return results;
  }

  const enriched = [];
  for (const candidate of results) {
    let next = { ...candidate };
    if (
      next.coordinates &&
      Number.isFinite(next.coordinates.lat) &&
      Number.isFinite(next.coordinates.lng)
    ) {
      next.distanceMiles = haversineMiles(
        locationContext.lat,
        locationContext.lng,
        next.coordinates.lat,
        next.coordinates.lng
      );
      enriched.push(next);
      continue;
    }

    if (!next.formattedAddress) {
      enriched.push(next);
      continue;
    }

    try {
      const geocoded = await resolveSearchLocation({ destinationText: next.formattedAddress });
      if (geocoded.location) {
        next.coordinates = { lat: geocoded.location.lat, lng: geocoded.location.lng };
        next.distanceMiles = haversineMiles(
          locationContext.lat,
          locationContext.lng,
          geocoded.location.lat,
          geocoded.location.lng
        );
      }
    } catch {
      // Leave distance unavailable if geocoding fails.
    }

    enriched.push(next);
  }

  return enriched;
}

function addFallbackWarnings(warnings, request, locationContext) {
  const next = Array.isArray(warnings) ? warnings.filter((item) => typeof item === 'string' && item.trim()) : [];
  if (!locationContext && (request.query || request.destinationText)) {
    next.push('Location was not fully resolved, so search radius checks may be looser than usual.');
  }
  if (request.filters?.localOnly) {
    next.push('Local-first mode is on, so chain restaurants were filtered aggressively.');
  }
  return [...new Set(next)];
}

function isTechnicalWarning(value) {
  if (typeof value !== 'string') return true;
  const text = value.trim();
  if (!text) return true;
  return /(\breq_[a-z0-9]+\b|request id|help\.openai\.com|OpenAI request failed|OpenAI formatting failed|OpenAI discovery repair failed|An error occurred while processing your request|could not reach the live assistant|could not complete the web search right now|could not format the verified results right now)/i.test(
    text
  );
}

function friendlySearchFailureWarning(request) {
  const cuisine = typeof request?.filters?.cuisine === 'string' && request.filters.cuisine.trim()
    ? request.filters.cuisine.trim()
    : (typeof request?.query === 'string' && request.query.trim() ? request.query.trim().split(/\s+/)[0] : 'local');
  return `I could not fully verify a strong ${cuisine} match just now, so I’m keeping the list conservative.`;
}

export async function searchWithOpenAI({ apiKey, model, request }) {
  if (!apiKey) {
    return {
      intentSummary: `${FOOD_BRAND} is waiting for OpenAI credentials so it can return verified restaurant results.`,
      summary: '',
      warnings: ['OPENAI_API_KEY is not configured on the server yet.'],
      results: [],
      buckets: [],
      sourceMode: 'empty',
      hasLiveData: false
    };
  }

  const intent = inferFoodIntent(request);
  const locationResolution = await resolveSearchLocation(request);
  const locationContext = locationResolution.location;

  let discoveryMemo;
  try {
    discoveryMemo = await runDiscoveryMemo({ apiKey, model, request, intent, locationContext });
  } catch (error) {
    return {
      intentSummary: `${FOOD_BRAND} could not complete the web search right now.`,
      summary: '',
      warnings: [friendlySearchFailureWarning(request)],
      results: [],
      buckets: [],
      sourceMode: 'empty',
      hasLiveData: false
    };
  }

  let discovery;
  try {
    discovery = await runFormatting({ apiKey, model, request, intent, locationContext, memo: discoveryMemo });
  } catch (error) {
    return {
      intentSummary: `${FOOD_BRAND} could not format the verified results right now.`,
      summary: '',
      warnings: [friendlySearchFailureWarning(request)],
      results: [],
      buckets: [],
      sourceMode: 'empty',
      hasLiveData: false
    };
  }

  const normalizedResults = uniqueBy(
    (Array.isArray(discovery.results) ? discovery.results : [])
      .map((candidate) => normalizeCandidate(candidate, locationContext))
      .filter((candidate) => candidate.name && candidate.evidence.length),
    (candidate) => normalizeComparableText([candidate.name, candidate.formattedAddress, candidate.website].filter(Boolean).join(' '))
  );

  const localFiltered = normalizedResults.filter((candidate) => !isLargeChain(candidate));
  const distanceFiltered = (await enrichWithDistance(localFiltered, locationContext)).filter((candidate) => {
    if (!Number.isFinite(candidate.distanceMiles)) return true;
    return candidate.distanceMiles <= request.radiusMiles;
  });

  const rankedResults = rankCandidates({
    request,
    intent,
    candidates: distanceFiltered,
    corroborated: distanceFiltered.map((candidate) => ({
      placeId: candidate.placeId,
      evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
      confidence: candidate.confidence,
      tags: Array.isArray(candidate.tags) ? candidate.tags : [],
      whyThisIsAFit: candidate.whyThisIsAFit,
      whatWeFound: candidate.whatWeFound
    }))
  }).map((candidate) => ({
    ...candidate,
    mapsUrl: candidate.mapsUrl || buildMapsUrl(candidate),
    placeId: candidate.placeId || createStablePlaceId(candidate),
    tags: normalizeTags(candidate.tags)
  }));

  const cuisineGated = applyCuisineGate(rankedResults, request, intent);
  const finalResults = cuisineGated.results.length ? cuisineGated.results : rankedResults;

  const warnings = addFallbackWarnings(
    [
      ...(Array.isArray(discovery.warnings) ? discovery.warnings : []),
      ...(Array.isArray(locationResolution.warnings) ? locationResolution.warnings : []),
      ...(cuisineGated.warnings || [])
    ],
    request,
    locationContext
  ).filter((warning) => !isTechnicalWarning(warning));

  if (!finalResults.length && !warnings.length) {
    warnings.push(friendlySearchFailureWarning(request));
  }

  return {
    intentSummary: typeof discovery.intentSummary === 'string' && discovery.intentSummary.trim() ? discovery.intentSummary.trim() : `${FOOD_BRAND} search tuned for ${intent.querySubject || request.query || 'local food'}.`,
    summary: typeof discovery.summary === 'string' ? discovery.summary : '',
    warnings,
    results: finalResults.slice(0, 8),
    buckets: buildResultBuckets(finalResults.slice(0, 8), request, intent),
    audioSummary: buildAudioSummary(request, finalResults.slice(0, 1)),
    hasLiveData: true,
    sourceMode: 'live'
  };
}
