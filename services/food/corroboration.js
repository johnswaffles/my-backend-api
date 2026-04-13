import { FOOD_RANKING_SYSTEM_PROMPT } from './prompts.js';

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

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

function toEvidenceItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      sourceType: item.sourceType || 'other',
      title: typeof item.title === 'string' ? item.title : 'Source',
      url: typeof item.url === 'string' ? item.url : '',
      snippet: typeof item.snippet === 'string' ? item.snippet : '',
      freshness: item.freshness === 'fresh' || item.freshness === 'recent' || item.freshness === 'stale' ? item.freshness : 'unknown',
      notes: typeof item.notes === 'string' ? item.notes : '',
      consistent: Boolean(item.consistent)
    }))
    .filter((item) => item.title && item.url);
}

export async function corroborateCandidates({ apiKey, model, request, candidates }) {
  if (!apiKey || !candidates.length) {
    return {
      warnings: apiKey ? [] : ['OpenAI is not configured, so live corroboration was skipped.'],
      results: [],
      intentSummary: '',
      summary: ''
    };
  }

  const payload = {
    request,
    candidates: candidates.map((candidate) => ({
      placeId: candidate.placeId,
      name: candidate.name,
      formattedAddress: candidate.formattedAddress,
      city: candidate.city,
      phone: candidate.phone,
      website: candidate.website,
      mapsUrl: candidate.mapsUrl,
      categories: candidate.categories,
      openNow: candidate.openNow,
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      priceLevel: candidate.priceLevel,
      reviews: candidate.reviews || [],
      distanceMiles: candidate.distanceMiles
    }))
  };

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
          content: FOOD_RANKING_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Analyze these allowlisted candidates for ${request.mealType} in 618FOOD.COM.\n\nReturn JSON only.\n\n${JSON.stringify(payload, null, 2)}`
        }
      ],
      max_output_tokens: 1800
    })
  });

  const data = await response.json();
  if (!response.ok) {
    return {
      warnings: [`OpenAI corroboration failed (${data?.error?.message || response.status}).`],
      results: [],
      intentSummary: '',
      summary: ''
    };
  }

  const text = extractResponseText(data);
  const parsed = extractJsonObject(text);
  if (!parsed || !Array.isArray(parsed.results)) {
    return {
      warnings: ['OpenAI returned an unparseable corroboration payload.'],
      results: [],
      intentSummary: '',
      summary: ''
    };
  }

  const allowlist = new Map(candidates.map((candidate) => [candidate.placeId, candidate]));
  const normalizedResults = parsed.results
    .filter((item) => item && typeof item === 'object' && typeof item.placeId === 'string' && allowlist.has(item.placeId))
    .map((item) => ({
      placeId: item.placeId,
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
      confidence: item.confidence === 'high' || item.confidence === 'medium' ? item.confidence : 'limited',
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
      whyThisIsAFit: typeof item.whyThisIsAFit === 'string' ? item.whyThisIsAFit : '',
      whatWeFound: typeof item.whatWeFound === 'string' ? item.whatWeFound : '',
      evidence: toEvidenceItems(item.evidence)
    }));

  return {
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((warning) => typeof warning === 'string') : [],
    results: normalizedResults,
    intentSummary: typeof parsed.intentSummary === 'string' ? parsed.intentSummary : '',
    summary: typeof parsed.summary === 'string' ? parsed.summary : ''
  };
}
