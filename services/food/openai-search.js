import { FOOD_BRAND } from './schemas.js';
import { FOOD_DISCOVERY_SYSTEM_PROMPT } from './prompts.js';
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

function buildDiscoveryPrompt(request, intent, locationContext) {
  const parts = [
    `Brand: ${FOOD_BRAND}.`,
    'You are helping a rural Southern Illinois food discovery app find real places to eat.',
    'Use the web_search tool to find verified businesses only.',
    'Do not invent restaurants, addresses, phone numbers, websites, ratings, or hours.',
    'Prefer local independents and hidden gems.',
    'If the user asks for a specific cuisine, exact matches must outrank generic restaurants.',
    'If the requested cuisine has no verified matches, return the closest verified alternative and say so clearly.',
    'Exclude major chains unless the user explicitly asks for them or no independent option is available.',
    'Honor the requested radius and do not include places that clearly fall outside it.',
    'Return the final ranked shortlist only.'
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
    'Use multiple searches as needed: official sites, menus, social pages, local news, tourism pages, ordering pages, and current web mentions. Use evidence from the web search results you find. If evidence is thin or conflicting, reduce confidence or omit the place. Return no more than 8 results.'
  );
  parts.push('Every evidence item must include notes, even if the note is an empty string. Keep notes short and factual.');
  parts.push('Output JSON only that matches the schema exactly.');

  return parts.join('\n\n');
}

async function runDiscovery({ apiKey, model, request, intent, locationContext }) {
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
          content: FOOD_DISCOVERY_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: buildDiscoveryPrompt(request, intent, locationContext)
        }
      ],
      max_output_tokens: 2600
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
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.results)) {
    throw new Error('OpenAI returned an unparseable food discovery payload.');
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

  let discovery;
  try {
    discovery = await runDiscovery({ apiKey, model, request, intent, locationContext });
  } catch (error) {
    return {
      intentSummary: `${FOOD_BRAND} could not complete the web search right now.`,
      summary: '',
      warnings: [String(error?.message || 'OpenAI search failed.')],
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
  );

  if (!finalResults.length && !warnings.length) {
    warnings.push('No verified local matches were returned for the current search.');
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
