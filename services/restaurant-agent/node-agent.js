import { FOOD_BRAND, DEFAULT_SEARCH_FILTERS, normalizeSearchRequest } from '../food/schemas.js';
import { inferFoodIntent, normalizeComparableText } from '../food/intent.js';
import { searchGooglePlaces, fetchGooglePlaceDetails, normalizeGooglePlace } from '../food/google-places.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_TOOL_ROUNDS = 6;

function log(requestId, message) {
  console.log(`[restaurant-agent:${requestId}] ${message}`);
}

function getOpenAiKey() {
  return (process.env.OPENAI_API_KEY || '').trim();
}

function getGooglePlacesKey() {
  return (
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_PLACES_KEY ||
    process.env.GOOGLE_MAPS_KEY ||
    ''
  ).trim();
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

function safeJsonParse(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }
}

function extractFunctionCalls(response) {
  return (response?.output || []).filter((item) => item?.type === 'function_call');
}

function normalizeChatHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => turn && typeof turn === 'object')
    .map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: typeof turn.content === 'string' ? turn.content.trim() : ''
    }))
    .filter((turn) => turn.content);
}

function hasRestaurantContext(history) {
  return Array.isArray(history)
    ? history.some((turn) => turn && turn.role === 'assistant' && Array.isArray(turn.restaurants) && turn.restaurants.length > 0)
    : false;
}

function buildSystemPrompt() {
  return [
    `You are ${FOOD_BRAND}, a restaurant-finder agent for Southern Illinois.`,
    'You are not a generic chatbot.',
    'For restaurant requests, always use tools to get real data.',
    'Never invent restaurants, addresses, phone numbers, websites, ratings, or hours.',
    'If a town is mentioned without a state, assume Illinois unless the user clearly says otherwise.',
    'If the user provides only a location, ZIP, or town with no cuisine or food type, treat it as a request for the best overall restaurants in that place and do not ask them to repeat or add a food type.',
    'Prefer exact cuisine matches over generic restaurants.',
    'If the first search is thin or generic, search again with a tighter cuisine phrase or nearby Illinois town.',
    'Call search_places first, then get_place_details on the strongest candidates, then rank_restaurants on the verified restaurant objects.',
    'When the user gives enough information, answer directly from the tool results instead of asking them to repeat themselves.',
    'After the tools finish, reply in short plain language only.',
    'When writing about a top restaurant, sound like a local food writer: describe the atmosphere, service, value, and customer praise using the actual place details and review snippets.',
    'Do not mention tools, search mechanics, strongest matches, or anything about the internal process.',
    'Do not include raw URLs, markdown source blocks, or JSON in the assistant text; the server will package results separately.',
    'Do not include markdown code fences.'
  ].join('\n');
}

function buildConversation(message, history, pageContext) {
  const conversation = [
    { role: 'system', content: buildSystemPrompt() }
  ];

  if (pageContext && typeof pageContext === 'object') {
    const contextBits = [];
    if (typeof pageContext.brand === 'string' && pageContext.brand.trim()) {
      contextBits.push(`Brand: ${pageContext.brand.trim()}`);
    }
    if (typeof pageContext.pageTitle === 'string' && pageContext.pageTitle.trim()) {
      contextBits.push(`Page title: ${pageContext.pageTitle.trim()}`);
    }
    if (typeof pageContext.pageSummary === 'string' && pageContext.pageSummary.trim()) {
      contextBits.push(`Page summary: ${pageContext.pageSummary.trim()}`);
    }
    if (contextBits.length) {
      conversation.push({
        role: 'system',
        content: `Context:\n${contextBits.map((line) => `- ${line}`).join('\n')}`
      });
    }
  }

  for (const turn of normalizeChatHistory(history)) {
    conversation.push(turn);
  }

  conversation.push({ role: 'user', content: message.trim() });
  return conversation;
}

function buildSearchRequest(location, query, requestId) {
  const intent = inferFoodIntent({ query, destinationText: location });
  return normalizeSearchRequest({
    query: query || '',
    destinationText: location || '',
    radiusMiles: 18,
    mealType: 'any',
    mode: 'nearby',
    filters: {
      ...DEFAULT_SEARCH_FILTERS,
      localOnly: false,
      cuisine: intent.inferredCuisine || ''
    },
    meta: {
      requestId
    }
  });
}

function normalizeRestaurantRecord(candidate) {
  if (!candidate || typeof candidate !== 'object') return null;
  const rating = Number.isFinite(candidate.rating) ? Number(candidate.rating) : null;
  const reviewCount = Number.isFinite(candidate.review_count)
    ? Number(candidate.review_count)
    : Number.isFinite(candidate.reviewCount)
      ? Number(candidate.reviewCount)
      : null;
  const score = Number.isFinite(candidate.score) ? Number(candidate.score) : null;

  return {
    place_id: String(candidate.place_id || candidate.placeId || '').trim(),
    name: String(candidate.name || '').trim(),
    rating,
    review_count: reviewCount,
    score,
    summary: String(candidate.summary || '').trim(),
    formatted_address: String(candidate.formatted_address || candidate.formattedAddress || '').trim() || null,
    phone: String(candidate.phone || '').trim() || null,
    website: String(candidate.website || '').trim() || null,
    maps_url: String(candidate.maps_url || candidate.mapsUrl || '').trim() || null,
    city: String(candidate.city || '').trim() || null,
    categories: Array.isArray(candidate.categories)
      ? candidate.categories.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    price_level: Number.isFinite(candidate.price_level)
      ? Number(candidate.price_level)
      : Number.isFinite(candidate.priceLevel)
        ? Number(candidate.priceLevel)
        : null,
    open_now:
      candidate.open_now === true || candidate.open_now === false
        ? candidate.open_now
        : candidate.openNow === true || candidate.openNow === false
          ? candidate.openNow
          : null,
    business_status: String(candidate.business_status || candidate.businessStatus || '').trim() || null,
    reviews: Array.isArray(candidate.reviews)
      ? candidate.reviews.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 4)
      : [],
    reviewHighlights: Array.isArray(candidate.review_highlights || candidate.reviewHighlights)
      ? (candidate.review_highlights || candidate.reviewHighlights)
          .map((item) => ({
            text: String(item?.text || '').trim(),
            rating: Number.isFinite(item?.rating) ? Number(item.rating) : null,
            relativeTime: String(item?.relativeTime || item?.relative_time_description || '').trim() || '',
            author: String(item?.author || item?.author_name || '').trim() || ''
          }))
          .filter((item) => item.text)
          .slice(0, 4)
      : []
  };
}

function rankRestaurantsDeterministically(restaurants) {
  const ranked = restaurants
    .map((restaurant) => {
      const normalized = normalizeRestaurantRecord(restaurant);
      if (!normalized || !normalized.name) return null;

      const rating = Number.isFinite(normalized.rating) ? normalized.rating : 0;
      const reviewCount = Number.isFinite(normalized.review_count) ? normalized.review_count : 0;
      const score = (rating * 0.7) + (Math.log(reviewCount + 1) * 0.3);

      return {
        ...normalized,
        score: Number(score.toFixed(4)),
        summary:
          normalized.summary ||
          [
            Number.isFinite(normalized.rating) ? `${normalized.rating.toFixed(1)} rating` : 'Rating unavailable',
            Number.isFinite(normalized.review_count) ? `${normalized.review_count.toLocaleString()} reviews` : 'Review count unavailable'
          ].join(', ')
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 5);
}

function buildSources(restaurants) {
  const sources = [];
  const seen = new Set();

  for (const restaurant of restaurants || []) {
    if (restaurant.website && !seen.has(restaurant.website)) {
      seen.add(restaurant.website);
      sources.push({ title: restaurant.name, url: restaurant.website });
    }
    if (restaurant.maps_url && !seen.has(restaurant.maps_url)) {
      seen.add(restaurant.maps_url);
      sources.push({ title: `Map - ${restaurant.name}`, url: restaurant.maps_url });
    }
    if (sources.length >= 5) break;
  }

  return sources;
}

function buildReply({ restaurants, locationText, cuisineText }) {
  if (!restaurants.length) {
    const locationLabel = locationText || 'that area';
    return `I couldn't verify a strong match in ${locationLabel} yet. Try a nearby Illinois town, and I can search again.`;
  }

  const locationLabel = locationText || 'that area';
  const names = restaurants.slice(0, cuisineText ? 3 : 5).map((restaurant) => restaurant.name).filter(Boolean);
  const lead = names.length ? names.join(', ') : 'the top verified options';
  if (!cuisineText) {
    return `Here are the top five restaurants I found in ${locationLabel}: ${lead}.`;
  }
  return `Here are the top verified ${cuisineText} options I found in ${locationLabel}: ${lead}.`;
}

function toFinalRestaurant(candidate) {
  const normalized = normalizeRestaurantRecord(candidate);
  if (!normalized || !normalized.name) return null;

  return {
    place_id: normalized.place_id,
    name: normalized.name,
    rating: normalized.rating,
    review_count: normalized.review_count,
    score: normalized.score,
    summary: normalized.summary,
    formatted_address: normalized.formatted_address,
    phone: normalized.phone,
    website: normalized.website,
    maps_url: normalized.maps_url,
    city: normalized.city,
    categories: normalized.categories,
    open_now: normalized.open_now,
    business_status: normalized.business_status,
    reviews: normalized.reviews,
    reviewHighlights: normalized.reviewHighlights,
    price_level: normalized.price_level
  };
}

function mergeKnownDetails(restaurants, detailsById) {
  return restaurants.map((restaurant) => {
    const normalized = normalizeRestaurantRecord(restaurant);
    if (!normalized) return restaurant;

    const detail = detailsById.get(normalized.place_id);
    if (!detail) return normalized;

    return {
      ...normalized,
      phone: normalized.phone || detail.phone || null,
      website: normalized.website || detail.website || null,
      maps_url: normalized.maps_url || detail.maps_url || null,
      city: normalized.city || detail.city || null,
      categories: normalized.categories.length ? normalized.categories : (Array.isArray(detail.categories) ? detail.categories : []),
      open_now: normalized.open_now ?? detail.open_now ?? null,
      business_status: normalized.business_status || detail.business_status || null,
      reviews: normalized.reviews.length ? normalized.reviews : (Array.isArray(detail.reviews) ? detail.reviews : []),
      reviewHighlights: normalized.reviewHighlights.length ? normalized.reviewHighlights : (Array.isArray(detail.review_highlights) ? detail.review_highlights : []),
      price_level: normalized.price_level ?? detail.price_level ?? null
    };
  });
}

function describeAtmosphereFromCategories(categories) {
  const normalized = Array.isArray(categories)
    ? categories.map((item) => String(item || '').toLowerCase())
    : [];

  if (normalized.some((item) => item.includes('steakhouse') || item.includes('chophouse') || item.includes('grill'))) {
    return 'It feels like a sit-down place made for a fuller meal, with a classic steakhouse or grill kind of energy.';
  }
  if (normalized.some((item) => item.includes('pizza') || item.includes('pizzeria'))) {
    return 'It comes across as a casual pizza stop, the kind of place people lean on for a reliable local pie.';
  }
  if (normalized.some((item) => item.includes('coffee') || item.includes('cafe') || item.includes('bakery'))) {
    return 'It reads like an easygoing coffee or cafe stop, good for a slower pace and a simple bite.';
  }
  if (normalized.some((item) => item.includes('restaurant') || item.includes('diner'))) {
    return 'It has the feel of a straightforward local restaurant where the focus is on a dependable meal and steady service.';
  }
  return 'It has the feel of a real local spot rather than a polished chain.';
}

function collectReviewText(restaurant) {
  const parts = [];
  for (const item of Array.isArray(restaurant.reviewHighlights) ? restaurant.reviewHighlights : []) {
    if (item && typeof item.text === 'string' && item.text.trim()) {
      parts.push(item.text.trim());
    }
  }
  for (const item of Array.isArray(restaurant.reviews) ? restaurant.reviews : []) {
    if (typeof item === 'string' && item.trim()) {
      parts.push(item.trim());
    }
  }
  return parts.join(' ').toLowerCase();
}

function humanJoin(items) {
  const list = items.filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, and ${list.at(-1)}`;
}

function extractReviewThemes(restaurant, cuisineText) {
  const text = collectReviewText(restaurant);
  if (!text) return [];

  const themeDefs = [
    { label: 'friendly service', keywords: ['friendly', 'service', 'staff', 'helpful', 'kind', 'welcoming', 'waiter', 'waitress'] },
    { label: 'big portions', keywords: ['portion', 'portions', 'generous', 'plenty', 'big servings', 'large portions'] },
    { label: 'good value', keywords: ['value', 'reasonable', 'affordable', 'price', 'prices', 'cheap', 'inexpensive'] },
    { label: 'clean, casual atmosphere', keywords: ['clean', 'casual', 'cozy', 'comfortable', 'atmosphere', 'family friendly'] },
    { label: 'fresh food', keywords: ['fresh', 'hot', 'tasty', 'delicious', 'made to order', 'quality'] },
    { label: 'local favorite energy', keywords: ['local', 'favorite', 'go to', 'go-to', 'keep coming back', 'regulars', 'recommended'] }
  ];

  const cuisine = String(cuisineText || '').toLowerCase();
  if (cuisine.includes('pizza')) {
    themeDefs.unshift({
      label: 'crust, sauce, and toppings',
      keywords: ['crust', 'sauce', 'cheese', 'toppings', 'pizza', 'pepperoni', 'slice', 'slices']
    });
  } else if (cuisine.includes('steak')) {
    themeDefs.unshift({
      label: 'steaks cooked well',
      keywords: ['steak', 'ribeye', 'filet', 'sirloin', 'prime rib', 'meat', 'cooked']
    });
  } else if (cuisine.includes('coffee')) {
    themeDefs.unshift({
      label: 'coffee and baked goods',
      keywords: ['coffee', 'latte', 'espresso', 'brew', 'pastry', 'bakery', 'drink']
    });
  }

  const scored = themeDefs
    .map((theme) => {
      const count = theme.keywords.reduce((sum, keyword) => {
        const pattern = keyword.includes(' ') ? new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(`\\b${keyword}\\b`, 'g');
        const matches = text.match(pattern);
        return sum + (matches ? matches.length : 0);
      }, 0);
      return { ...theme, count };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  return scored.slice(0, 3).map((item) => item.label);
}

function buildFeaturedWriteup({ restaurant, locationText, cuisineText }) {
  if (!restaurant || !restaurant.name) return '';

  const locationLabel = locationText || restaurant.city || restaurant.formatted_address || 'the area';
  const cuisineLabel = cuisineText || 'restaurant';
  const ratingText = Number.isFinite(restaurant.rating) ? restaurant.rating.toFixed(1) : '';
  const reviewCount = Number.isFinite(restaurant.review_count) ? restaurant.review_count.toLocaleString() : '';
  const themes = extractReviewThemes(restaurant, cuisineText);
  const themeSentence = themes.length
    ? `Review snippets keep pointing to ${humanJoin(themes)}.`
    : 'Customer feedback is a little thinner here, so I’m leaning more on the rating, review count, and verified business details.';
  const atmosphereSentence = describeAtmosphereFromCategories(restaurant.categories);
  const scoreSentence = ratingText && reviewCount
    ? `It carries a ${ratingText} rating across ${reviewCount} reviews, which suggests a place with a real following.`
    : ratingText
      ? `It carries a ${ratingText} rating, which suggests a place with a real following.`
      : reviewCount
        ? `It has ${reviewCount} reviews, which suggests a place with a real following.`
        : 'It has verified business details and enough support to land at the top of the list.';
  const closing = `If you want a first stop that feels grounded in the local crowd, this is the one to start with.`;

  return `#1 pick: ${restaurant.name} in ${locationLabel}. ${atmosphereSentence} ${scoreSentence} ${themeSentence} ${closing}`;
}

function mergeUniqueRestaurants(existing, next) {
  const byKey = new Map();
  for (const restaurant of [...existing, ...next]) {
    const normalized = normalizeRestaurantRecord(restaurant);
    if (!normalized || !normalized.name) continue;
    const key = normalizeComparableText([normalized.place_id, normalized.name, normalized.formatted_address, normalized.website].filter(Boolean).join(' '));
    if (!key || byKey.has(key)) continue;
    byKey.set(key, normalized);
  }
  return [...byKey.values()];
}

async function callOpenAiResponses({ apiKey, model, conversation, tools, requestId }) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: conversation,
      tools,
      parallel_tool_calls: false,
      reasoning: { effort: 'low' },
      max_output_tokens: 1200,
      metadata: {
        request_id: requestId,
        service: '618food-node-restaurant-agent'
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error?.message === 'string' ? data.error.message : 'OpenAI request failed.';
    const error = new Error(message);
    error.details = data;
    throw error;
  }

  return data;
}

function buildToolSchemas() {
  return [
    {
      type: 'function',
      name: 'search_places',
      description: 'Search Google Places for restaurant candidates in a location.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['location', 'query'],
        properties: {
          location: { type: 'string', description: 'Town, ZIP, or place to search around.' },
          query: { type: 'string', description: 'Cuisine or restaurant query to search for.' }
        }
      }
    },
    {
      type: 'function',
      name: 'get_place_details',
      description: 'Fetch Google Places details for a specific restaurant candidate.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['place_id'],
        properties: {
          place_id: { type: 'string', description: 'Google Places place_id.' }
        }
      }
    },
    {
      type: 'function',
      name: 'rank_restaurants',
      description: 'Rank verified restaurant objects using the required scoring formula.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['restaurants'],
        properties: {
          restaurants: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          }
        }
      }
    }
  ];
}

async function executeToolCall({ call, googlePlacesKey, requestId, context }) {
  const args = safeJsonParse(call.arguments) || {};
  log(requestId, `tool call -> ${call.name} ${JSON.stringify(args)}`);

  if (call.name === 'search_places') {
    const request = buildSearchRequest(String(args.location || ''), String(args.query || ''), requestId);
    const result = await searchGooglePlaces(request, googlePlacesKey);
    const candidates = (result.candidates || []).map((candidate) => ({
      place_id: String(candidate.placeId || candidate.place_id || '').trim(),
      name: String(candidate.name || '').trim(),
      formatted_address: String(candidate.place?.formatted_address || candidate.place?.vicinity || candidate.formatted_address || '').trim(),
      rating: Number.isFinite(candidate.place?.rating) ? candidate.place.rating : null,
      review_count: Number.isFinite(candidate.place?.user_ratings_total) ? candidate.place.user_ratings_total : null,
      price_level: Number.isFinite(candidate.place?.price_level) ? candidate.place.price_level : null,
      maps_url: String(candidate.place?.url || '').trim() || null,
      search_query: String(candidate.searchQuery || '').trim() || null
    }));

    context.searchCandidates = mergeUniqueRestaurants(context.searchCandidates, candidates);
    context.warnings.push(...(result.warnings || []).filter(Boolean));

    return {
      location: result.resolvedLocation || null,
      warnings: result.warnings || [],
      candidates
    };
  }

  if (call.name === 'get_place_details') {
    const placeId = String(args.place_id || '').trim();
    if (!placeId) {
      return { error: 'place_id is required.' };
    }

    const detail = await fetchGooglePlaceDetails(placeId, googlePlacesKey);
    const normalized = normalizeGooglePlace(detail);
    const restaurant = {
      place_id: normalized.placeId,
      name: normalized.name,
      formatted_address: normalized.formattedAddress,
      rating: normalized.rating,
      review_count: normalized.reviewCount,
      price_level: normalized.priceLevel,
      maps_url: normalized.mapsUrl,
      website: normalized.website,
      phone: normalized.phone,
      open_now: normalized.openNow,
      city: normalized.city,
      categories: normalized.categories,
      reviews: normalized.reviews,
      review_highlights: normalized.reviewHighlights,
      coordinates: normalized.coordinates,
      business_status: normalized.businessStatus
    };

    context.detailsById.set(restaurant.place_id, restaurant);
    return restaurant;
  }

  if (call.name === 'rank_restaurants') {
    const restaurants = Array.isArray(args.restaurants) ? args.restaurants : [];
    const ranked = rankRestaurantsDeterministically(restaurants);
    context.rankedRestaurants = ranked;
    return {
      restaurants: ranked
    };
  }

  return { error: `Unknown tool: ${call.name}` };
}

function buildRestaurantIntentContext(message, history) {
  const historyText = Array.isArray(history)
    ? history
        .filter((turn) => turn && typeof turn.content === 'string')
        .map((turn) => turn.content)
        .join(' ')
    : '';

  const intent = inferFoodIntent({
    query: `${message} ${historyText}`.trim(),
    destinationText: ''
  });

  return {
    intent,
    likelyRestaurantRequest:
      Boolean(intent.inferredCuisine || intent.queryLocation || intent.inferredLocation) ||
      /\b(restaurant|food|pizza|pizzeria|bbq|steak|burger|coffee|cafe|diner|taco|sushi|breakfast|lunch|dinner|dessert|eat|eatery|where should i eat|what should i eat|find me|show me)\b/i.test(
        `${message} ${historyText}`
      ) ||
      hasRestaurantContext(history)
  };
}

export async function runRestaurantAgent({ message, history = [], pageContext = {}, requestId }) {
  const cleanMessage = typeof message === 'string' ? message.trim() : '';
  const requestLabel = requestId || `req_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const apiKey = getOpenAiKey();
  const googlePlacesKey = getGooglePlacesKey();
  const context = {
    searchCandidates: [],
    detailsById: new Map(),
    rankedRestaurants: [],
    warnings: []
  };

  const { intent, likelyRestaurantRequest } = buildRestaurantIntentContext(cleanMessage, history);
  const locationText = intent.inferredLocation || '';
  const cuisineText = intent.inferredCuisine || '';

  if (!cleanMessage) {
    return {
      reply: 'Please send a town or ZIP, and I’ll find the top restaurants there.',
      restaurants: [],
      sources: [],
      requestId: requestLabel
    };
  }

  if (!likelyRestaurantRequest) {
    return {
      reply: `Hello! I’m ${FOOD_BRAND}. Tell me a town or ZIP, and I’ll find the top restaurants using live tools.`,
      restaurants: [],
      sources: [],
      requestId: requestLabel
    };
  }

  if (!apiKey) {
    return {
      reply: 'The restaurant agent is online, but the OpenAI API key is missing on the server.',
      restaurants: [],
      sources: [],
      requestId: requestLabel
    };
  }

  if (!googlePlacesKey) {
    return {
      reply: 'The restaurant agent is online, but Google Places credentials are missing on the server.',
      restaurants: [],
      sources: [],
      requestId: requestLabel
    };
  }

  const tools = buildToolSchemas();
  let conversation = buildConversation(cleanMessage, history, pageContext);
  let response = null;

  log(requestLabel, `start message=${JSON.stringify(cleanMessage)}`);

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      response = await callOpenAiResponses({
        apiKey,
        model: process.env.OPENAI_MODEL || 'gpt-5.4',
        conversation,
        tools,
        requestId: requestLabel
      });

      const functionCalls = extractFunctionCalls(response);
      const text = extractResponseText(response);
      if (!functionCalls.length) {
        if (text) {
          log(requestLabel, `final model text length=${text.length}`);
        }
        break;
      }

      conversation = [...conversation, ...(response.output || [])];

      const outputs = [];
      for (const call of functionCalls) {
        const toolResult = await executeToolCall({
          call,
          googlePlacesKey,
          requestId: requestLabel,
          context
        });
        outputs.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(toolResult)
        });
      }

      conversation = [...conversation, ...outputs];
      log(requestLabel, `completed tool round ${round + 1} with ${outputs.length} outputs`);
    }
  } catch (error) {
    log(requestLabel, `agent loop failed: ${String(error.message || error)}`);
  }

  let finalRestaurants = context.rankedRestaurants.length ? context.rankedRestaurants : [];
  if (!finalRestaurants.length && context.detailsById.size) {
    finalRestaurants = rankRestaurantsDeterministically([...context.detailsById.values()]);
  }
  if (!finalRestaurants.length && context.searchCandidates.length) {
    finalRestaurants = rankRestaurantsDeterministically(context.searchCandidates);
  }

  finalRestaurants = mergeKnownDetails(finalRestaurants, context.detailsById);

  const replyText =
    extractResponseText(response) ||
    buildReply({
      restaurants: finalRestaurants,
      locationText: locationText || String(pageContext?.pageSummary || '').trim(),
      cuisineText
    });

  const finalResultRestaurants = finalRestaurants
    .slice(0, 5)
    .map((restaurant, index) => {
      const resolved = toFinalRestaurant(restaurant);
      if (!resolved) return null;
      return {
        ...resolved,
        summary:
          resolved.summary ||
          [
            Number.isFinite(resolved.rating) ? `${resolved.rating.toFixed(1)} rating` : 'Rating unavailable',
            Number.isFinite(resolved.review_count) ? `${resolved.review_count.toLocaleString()} reviews` : 'Review count unavailable'
          ].join(', ')
      };
    })
    .filter(Boolean);

  const sources = buildSources(finalResultRestaurants);
  const featuredWriteup = finalResultRestaurants.length
    ? buildFeaturedWriteup({
        restaurant: finalResultRestaurants[0],
        locationText: locationText || String(pageContext?.pageSummary || '').trim(),
        cuisineText
      })
    : '';

  log(
    requestLabel,
    `done restaurants=${finalResultRestaurants.length} sources=${sources.length} warnings=${context.warnings.length}`
  );

  return {
    reply: replyText,
    restaurants: finalResultRestaurants,
    sources,
    featuredWriteup,
    requestId: requestLabel
  };
}
