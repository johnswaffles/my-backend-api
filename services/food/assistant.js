import { FOOD_ASSISTANT_SYSTEM_PROMPT } from './prompts.js';
import { normalizeSearchRequest } from './schemas.js';

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

function sanitizeSources(rawSources) {
  if (!Array.isArray(rawSources)) return [];

  return rawSources
    .filter((source) => source && typeof source === 'object')
    .map((source) => ({
      title: typeof source.title === 'string' ? source.title.trim() : '',
      url: typeof source.url === 'string' ? source.url.trim() : ''
    }))
    .filter((source) => source.title && source.url)
    .slice(0, 3);
}

function mergeSearchRequest(currentSearch, rawSearchRequest) {
  if (!rawSearchRequest || typeof rawSearchRequest !== 'object') return null;

  const current = normalizeSearchRequest(currentSearch || {});
  const merged = normalizeSearchRequest({
    ...current,
    ...rawSearchRequest,
    filters: {
      ...(current.filters || {}),
      ...(rawSearchRequest.filters && typeof rawSearchRequest.filters === 'object' ? rawSearchRequest.filters : {})
    }
  });

  return merged;
}

export async function askFoodAssistant({
  apiKey,
  model,
  message,
  currentSearch,
  currentSummary,
  currentResults = []
}) {
  if (!apiKey) {
    return {
      action: 'answer',
      reply: `${currentSearch?.destinationText || '618FOOD.COM'} is ready, but the assistant is not configured on the server yet.`,
      sources: [],
      searchRequest: null
    };
  }

  const payload = {
    message,
    currentSearch,
    currentSummary,
    currentResults: currentResults.map((result) => ({
      placeId: result.placeId,
      name: result.name,
      city: result.city,
      formattedAddress: result.formattedAddress,
      categories: result.categories,
      openNow: result.openNow,
      tags: result.tags,
      confidence: result.confidence,
      whyThisIsAFit: result.whyThisIsAFit,
      whatWeFound: result.whatWeFound
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
          content: FOOD_ASSISTANT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Current food context:\n${JSON.stringify(payload, null, 2)}\n\nReturn JSON only.`
        }
      ],
      max_output_tokens: 700
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI request failed.');
  }

  const text = extractResponseText(data);
  const parsed = extractJsonObject(text);
  if (!parsed || typeof parsed !== 'object') {
    return {
      action: 'answer',
      reply: 'I could not generate a live food assistant reply just now.',
      sources: [],
      searchRequest: null
    };
  }

  const action = parsed.action === 'search' ? 'search' : 'answer';
  const reply = typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim() : 'Here is a food-focused answer.';
  const sources = sanitizeSources(parsed.sources);
  const searchRequest = action === 'search' ? mergeSearchRequest(currentSearch, parsed.searchRequest) : null;

  return {
    action,
    reply,
    sources,
    searchRequest
  };
}
