import { FOOD_BRAND, DEFAULT_SEARCH_FILTERS, normalizeSearchRequest } from '../food/schemas.js';
import { inferFoodIntent, normalizeComparableText } from '../food/intent.js';
import { searchGooglePlaces, fetchGooglePlaceDetails, normalizeGooglePlace } from '../food/google-places.js';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_TOOL_ROUNDS = 6;

function log(requestId, message) {
  console.log(`[restaurant-agent:${requestId}] ${message}`);
}

function normalizeWriteupText(value) {
  return normalizeComparableText(String(value || ''))
    .replace(/\billinois\b/g, 'il')
    .replace(/\bmt\b/g, 'mount');
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

function buildHistoryText(history) {
  return Array.isArray(history)
    ? history
        .filter((turn) => turn && typeof turn.content === 'string')
        .map((turn) => turn.content)
        .join(' ')
    : '';
}

function normalizeRecentRestaurants(pageContext) {
  const restaurants = Array.isArray(pageContext?.recentRestaurants) ? pageContext.recentRestaurants : [];
  return restaurants
    .map((restaurant) => {
      const name = String(restaurant?.name || '').trim();
      if (!name) return null;
      return {
        place_id: String(restaurant?.place_id || '').trim(),
        name,
        formatted_address: String(restaurant?.formatted_address || '').trim() || null,
        city: String(restaurant?.city || '').trim() || null,
        phone: String(restaurant?.phone || '').trim() || null,
        website: String(restaurant?.website || '').trim() || null
      };
    })
    .filter(Boolean);
}

function matchRecentRestaurantContext(message, history, intent, pageContext) {
  const recentRestaurants = normalizeRecentRestaurants(pageContext);
  if (!recentRestaurants.length) return null;

  const rawCombined = [message, buildHistoryText(history)].filter(Boolean).join(' ');
  const combined = normalizeWriteupText(rawCombined);
  const messageText = normalizeWriteupText(message || '');
  const explicitSubject = cleanPlaceFollowupText(intent?.querySubject || message);
  const hasCuisineCue = Boolean(intent?.inferredCuisine);
  const followupPattern = /^(what about|how about|tell me about|tell us about|show me|what is|what's|whats|give me|find me|do you know|any info on|information on|details on|my favorite|that place|this place|that restaurant|this restaurant|it)\b/i;
  const followupish =
    followupPattern.test(combined) ||
    followupPattern.test(messageText) ||
    messageText.split(/\s+/).filter(Boolean).length <= 4;

  const explicitMatches = recentRestaurants.filter((restaurant) => {
    const name = normalizeWriteupText(restaurant.name);
    if (!name) return false;
    if (!explicitSubject) return false;
    return name === explicitSubject || name.includes(explicitSubject) || explicitSubject.includes(name);
  });

  if (explicitSubject && !explicitMatches.length) {
    return null;
  }

  if (explicitMatches.length === 1) {
    return explicitMatches[0];
  }

  if (hasCuisineCue) {
    return null;
  }

  const subject = normalizeWriteupText(intent?.querySubject || '');
  let best = null;
  let bestScore = 0;

  for (const restaurant of recentRestaurants) {
    const name = normalizeWriteupText(restaurant.name);
    if (!name) continue;

    let score = 0;
    if (subject && (name === subject || name.includes(subject) || subject.includes(name))) {
      score += 120;
    }

    if (messageText && (name === messageText || name.includes(messageText) || messageText.includes(name))) {
      score += 100;
    }

    const messageTokens = messageText.split(/\s+/).filter(Boolean);
    if (messageTokens.length && messageTokens.every((token) => name.includes(token))) {
      score += 60;
    }

    if (combined.includes(name)) {
      score += 40;
    }

    if (followupish && restaurant === recentRestaurants[0]) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      best = restaurant;
    }
  }

  if (bestScore >= 40 || (followupish && best && !explicitSubject)) {
    return best;
  }

  return null;
}

function cleanPlaceFollowupText(value) {
  const cleaned = normalizeWriteupText(value || '')
    .replace(/^(what about|how about|tell me about|tell us about|show me|what is|what's|whats|give me|find me|do you know|any info on|information on|details on)\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\b(my favorite|that place|this place|that restaurant|this restaurant)\b/i, '')
    .trim();

  return /^(it|this|that|there|here|them|they)$/i.test(cleaned) ? '' : cleaned;
}

function looksLikeGenericFoodCategory(value) {
  const subject = normalizeWriteupText(value || '');
  if (!subject) return true;

  const categoryPhrases = new Set([
    'food',
    'restaurant',
    'restaurants',
    'place',
    'places',
    'spot',
    'spots',
    'pizza',
    'pizzeria',
    'burger',
    'burgers',
    'hamburger',
    'hamburgers',
    'bbq',
    'barbecue',
    'barbeque',
    'steak',
    'steakhouse',
    'steak house',
    'taco',
    'tacos',
    'burrito',
    'burritos',
    'sushi',
    'ramen',
    'coffee',
    'cafe',
    'breakfast',
    'brunch',
    'dessert',
    'bakery',
    'diner',
    'grill',
    'grille',
    'sandwich',
    'sandwiches',
    'deli',
    'sub',
    'subs',
    'seafood',
    'fish fry',
    'catfish',
    'shrimp',
    'chinese',
    'italian',
    'mexican',
    'thai',
    'japanese'
  ]);

  if (categoryPhrases.has(subject)) return true;
  if (/^(best|top|good|great|local|nearby|recommended)\s+/.test(subject)) return true;
  if (/\b(food|restaurants?|places?|spots?|options|recommendations?)\b/.test(subject)) return true;

  return false;
}

function shouldTreatAsSpecificPlaceRequest(message, history, intent) {
  const rawCombined = [message, buildHistoryText(history)].filter(Boolean).join(' ');
  const combined = normalizeWriteupText(rawCombined);
  if (!combined) return false;

  if (/\b(address|phone|hours|menu|about|details|info|information|review|reviews|where is|what is|what's|tell me about|tell me more|how is|how's|directions)\b/i.test(combined)) {
    return true;
  }

  const followupCandidate = cleanPlaceFollowupText(rawCombined);
  if (
    /^(what about|how about|tell me about|tell us about|show me|what is|what's|whats|give me|find me|do you know|any info on|information on|details on)/i.test(rawCombined) &&
    followupCandidate &&
    followupCandidate.split(/\s+/).filter(Boolean).length >= 1 &&
    followupCandidate.split(/\s+/).filter(Boolean).length <= 8
  ) {
    return true;
  }

  const subject = normalizeWriteupText(intent?.querySubject || '');
  if (!subject) return false;

  const subjectWords = subject.split(/\s+/).filter(Boolean);
  const hasQueryLocation = Boolean(intent?.queryLocation || intent?.inferredLocation);
  const genericFoodCategory = looksLikeGenericFoodCategory(subject);
  const hasNameLikeCue = /[&'’]/.test(rawCombined) || /(?:\b[A-Z][a-z]+\b){2,}/.test(rawCombined);
  const hasPlaceSuffix = /\b(steakhouse|steak house|restaurant|restaurants|tavern|bistro|kitchen|cafe|coffee|grill|grille|diner|bar|pub|pizzeria|seafood|house)\b/i.test(rawCombined);

  if (hasQueryLocation && subjectWords.length >= 1 && subjectWords.length <= 8 && !genericFoodCategory) return true;
  if (/\b(best|top|recommend|recommendation|options|places|spots|find|show|list)\b/i.test(combined)) {
    return false;
  }
  if (hasNameLikeCue && subjectWords.length >= 1) return true;
  if (!/\b(food|place|places|restaurant|restaurants|spot|spots|options|best|top|find|show|recommend|recommendation)\b/i.test(combined) && hasPlaceSuffix) {
    return true;
  }
  if (!hasQueryLocation && subjectWords.length >= 2 && subjectWords.length <= 6 && !/\b(food|restaurant|restaurants|places|spots)\b/i.test(subject)) return true;

  return false;
}

function scoreSpecificPlaceCandidate(candidate, querySubject, locationText) {
  if (!candidate || !candidate.name) return Number.NEGATIVE_INFINITY;
  const candidateName = normalizeWriteupText(candidate.name);
  const candidateAddress = normalizeWriteupText(candidate.formatted_address || candidate.place?.formatted_address || '');
  const subject = normalizeWriteupText(querySubject || '');
  const location = normalizeWriteupText(locationText || '');
  let score = 0;

  if (subject && candidateName === subject) score += 1000;
  else if (subject && (candidateName.includes(subject) || subject.includes(candidateName))) score += 500;

  const subjectTokens = subject.split(/\s+/).filter(Boolean);
  if (subjectTokens.length && subjectTokens.every((token) => candidateName.includes(token))) score += 250;

  if (location && candidateAddress.includes(location)) score += 40;
  if (Number.isFinite(candidate.review_count)) score += Math.log(candidate.review_count + 1);
  if (Number.isFinite(candidate.rating)) score += candidate.rating;

  return score;
}

async function runSpecificPlaceLookup({
  message,
  history,
  pageContext,
  intent,
  googlePlacesKey,
  requestId,
  apiKey
}) {
  const subjectQuery = cleanPlaceFollowupText(intent?.querySubject || message) || normalizeWriteupText(intent?.querySubject || message);
  const searchRequest = normalizeSearchRequest({
    query: subjectQuery,
    destinationText: intent?.inferredLocation || '',
    radiusMiles: 14,
    mealType: 'any',
    mode: 'nearby',
    filters: {
      ...DEFAULT_SEARCH_FILTERS,
      localOnly: false,
      cuisine: ''
    },
    meta: {
      requestId
    }
  });

  const searchResult = await searchGooglePlaces(searchRequest, googlePlacesKey);
  const bestCandidate = [...(searchResult.candidates || [])]
    .map((candidate) => ({
      ...candidate,
      _score: scoreSpecificPlaceCandidate(candidate, subjectQuery, intent?.inferredLocation || '')
    }))
    .sort((a, b) => b._score - a._score)[0] || null;

  if (!bestCandidate?.placeId) {
    return {
      reply: `I couldn't confidently match that place yet. If you want, send the full restaurant name or city and I can try again.`,
      restaurants: [],
      sources: [],
      featuredWriteup: '',
      requestId
    };
  }

  const detail = await fetchGooglePlaceDetails(bestCandidate.placeId, googlePlacesKey);
  const normalized = normalizeGooglePlace(detail, bestCandidate, searchRequest);
  const restaurant = {
    place_id: normalized.placeId,
    name: normalized.name,
    rating: normalized.rating,
    review_count: normalized.reviewCount,
    score: Number.isFinite(bestCandidate._score) ? Number(bestCandidate._score.toFixed(4)) : null,
    summary:
      [
        Number.isFinite(normalized.rating) ? `${normalized.rating.toFixed(1)} rating` : 'Rating unavailable',
        Number.isFinite(normalized.reviewCount) ? `${normalized.reviewCount.toLocaleString()} reviews` : 'Review count unavailable'
      ].join(', '),
    formatted_address: normalized.formattedAddress,
    phone: normalized.phone,
    website: normalized.website,
    maps_url: normalized.mapsUrl,
    city: normalized.city,
    categories: normalized.categories,
    open_now: normalized.openNow,
    business_status: normalized.businessStatus,
    reviews: normalized.reviews,
    reviewHighlights: normalized.reviewHighlights,
    price_level: normalized.priceLevel
  };

  const websiteSignals = restaurant.website ? await fetchWebsiteSignals(restaurant.website, requestId) : null;
  const featuredWriteup = buildFeaturedWriteup({
    restaurant,
    locationText: intent?.inferredLocation || String(pageContext?.pageSummary || '').trim(),
    cuisineText: intent?.inferredCuisine || '',
    websiteSignals
  });

  const sources = buildSources([restaurant]);
  const locationLabel = restaurant.city || intent?.inferredLocation || 'that area';
  const detailsBits = [];
  if (restaurant.formatted_address) detailsBits.push(restaurant.formatted_address);
  if (restaurant.phone) detailsBits.push(`phone ${restaurant.phone}`);
  if (restaurant.open_now === true) detailsBits.push('open now');
  if (Number.isFinite(restaurant.rating)) {
    detailsBits.push(`${restaurant.rating.toFixed(1)} rating`);
  }
  if (Number.isFinite(restaurant.review_count)) {
    detailsBits.push(`${restaurant.review_count.toLocaleString()} reviews`);
  }

  const reply = [
    `Here’s ${restaurant.name} in ${locationLabel}.`,
    detailsBits.length ? detailsBits.join(' • ') : 'I found the place and pulled its verified details.',
  ].filter(Boolean).join(' ');

  return {
    reply,
    restaurants: [restaurant],
    sources,
    featuredWriteup,
    requestId
  };
}

function buildSystemPrompt() {
  return [
    `You are ${FOOD_BRAND}, a restaurant-finder agent for Southern Illinois.`,
    'You are not a generic chatbot.',
    'For restaurant requests, always use tools to get real data.',
    'Never invent restaurants, addresses, phone numbers, websites, ratings, or hours.',
    'If a town is mentioned without a state, assume Illinois unless the user clearly says otherwise.',
    'If the user provides only a location, ZIP, or town with no cuisine or food type, treat it as a request for the best overall restaurants in that place and do not ask them to repeat or add a food type.',
    'If the user provides a specific restaurant name with a location, such as "McDonald’s in Salem," treat it as a specific restaurant profile request, not a broad ranking request.',
    'For specific restaurant profile requests, fetch the exact place details, allow major chains when explicitly named, and include address, phone, website, rating, review count, business status, and a polished concise writeup when available.',
    'Do not suggest ordering food, delivery, takeout ordering, or reservations. This assistant only helps people find and learn about restaurants.',
    'Never claim 618FOOD.COM has restaurant partners, ordering partners, online ordering, checkout, delivery, reservations, coupons, or payment features.',
    'If a user asks to order, say 618FOOD.COM can only share restaurant details like website, map, and phone so they can contact the restaurant directly.',
    'Prefer exact cuisine matches over generic restaurants.',
    'If the first search is thin or generic, search again with a tighter cuisine phrase or nearby Illinois town.',
    'Call search_places first, then get_place_details on the strongest candidates, then rank_restaurants on the verified restaurant objects.',
    'When the user gives enough information, answer directly from the tool results instead of asking them to repeat themselves.',
    'After the tools finish, reply in short plain language only.',
    'When writing about a top restaurant, sound like a polished food magazine writer: describe the atmosphere, service, value, and customer praise using the actual place details and review snippets in compact copy.',
    'Do not mention tools, search mechanics, strongest matches, previous lists, or anything about the internal process.',
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
    if (Array.isArray(pageContext.recentRestaurants) && pageContext.recentRestaurants.length) {
      contextBits.push(
        `Recent restaurants: ${pageContext.recentRestaurants
          .map((restaurant) => String(restaurant?.name || '').trim())
          .filter(Boolean)
          .slice(0, 7)
          .join(', ')}`
      );
    }
    if (typeof pageContext.recentLocation === 'string' && pageContext.recentLocation.trim()) {
      contextBits.push(`Recent location: ${pageContext.recentLocation.trim()}`);
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
    radiusMiles: 14,
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
    search_query: String(candidate.search_query || candidate.searchQuery || '').trim() || null,
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
      if (isClosedRestaurant(normalized)) return null;

      const rating = Number.isFinite(normalized.rating) ? normalized.rating : 0;
      const reviewCount = Number.isFinite(normalized.review_count) ? normalized.review_count : 0;
      const ownershipScore = scoreOwnershipSignal(normalized);
      const score = (rating * 0.7) + (Math.log(reviewCount + 1) * 0.3) + ownershipScore;

      return {
        ...normalized,
        score: Number(score.toFixed(4)),
        ownershipScore,
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

  return ranked.slice(0, 7);
}

function inferCuisineFocus(cuisineText) {
  const text = normalizeWriteupText(cuisineText || '');
  if (!text) return '';

  if (/\bpizza\b|\bpizzeria\b|\bcalzone\b|\bstromboli\b/.test(text)) return 'pizza';
  if (/\bsteak\b|\bsteakhouse\b|\bchophouse\b|\bchop house\b|\bprime rib\b|\bribeye\b|\bfilet\b|\bsirloin\b|\bporterhouse\b|\broadhouse\b/.test(text)) {
    return 'steakhouse';
  }
  if (/\bitalian\b|\bpasta\b|\blasagna\b|\bspaghetti\b|\bravioli\b|\bfettuccine\b|\bmarinara\b/.test(text)) return 'italian';
  if (/\bburger\b|\bburgers\b|\bhamburger\b|\bcheeseburger\b/.test(text)) return 'burgers';
  if (/\bbbq\b|\bbarbecue\b|\bbarbeque\b|\bsmokehouse\b/.test(text)) return 'bbq';
  if (/\bmexican\b|\btaco\b|\btacos\b|\bburrito\b|\bquesadilla\b/.test(text)) return 'mexican';
  if (/\bseafood\b|\bcatfish\b|\bshrimp\b/.test(text)) return 'seafood';
  if (/\bcoffee\b|\bcafe\b|\bcafé\b|\bespresso\b|\blatte\b/.test(text)) return 'coffee';
  if (/\bbreakfast\b|\bbrunch\b|\bpancake\b|\bomelet\b|\bomelette\b/.test(text)) return 'breakfast';
  if (/\bdessert\b|\bbakery\b|\bice cream\b/.test(text)) return 'dessert';
  return text;
}

function cuisineSignalsForText(cuisineKey) {
  const key = normalizeWriteupText(cuisineKey || '');
  if (!key) return null;

  const map = {
    pizza: ['pizza', 'pizzeria', 'slice', 'pepperoni', 'calzone', 'stromboli'],
    steakhouse: ['steak', 'steakhouse', 'chophouse', 'chop house', 'prime rib', 'ribeye', 'filet', 'sirloin', 'porterhouse', 'roadhouse', 'grill', 'grille'],
    italian: ['italian', 'pasta', 'lasagna', 'spaghetti', 'ravioli', 'fettuccine', 'marinara'],
    burgers: ['burger', 'burgers', 'hamburger', 'cheeseburger'],
    bbq: ['bbq', 'barbecue', 'barbeque', 'smokehouse'],
    mexican: ['mexican', 'taco', 'tacos', 'burrito', 'quesadilla'],
    seafood: ['seafood', 'catfish', 'shrimp', 'oyster', 'oysters'],
    coffee: ['coffee', 'cafe', 'café', 'espresso', 'latte', 'bakery'],
    breakfast: ['breakfast', 'brunch', 'pancake', 'omelet', 'omelette'],
    dessert: ['dessert', 'bakery', 'ice cream', 'pie', 'sweet']
  };

  for (const [label, terms] of Object.entries(map)) {
    if (key === label || terms.some((term) => key.includes(normalizeWriteupText(term)))) {
      return { label, terms };
    }
  }

  return { label: key, terms: [key] };
}

function scoreCuisineRelevance(restaurant, cuisineText) {
  const cuisine = inferCuisineFocus(cuisineText);
  const signals = cuisineSignalsForText(cuisine);
  if (!signals) return 0;

  const haystackParts = [
    restaurant?.name,
    Array.isArray(restaurant?.categories) ? restaurant.categories.join(' ') : '',
    Array.isArray(restaurant?.reviews) ? restaurant.reviews.join(' ') : '',
    Array.isArray(restaurant?.reviewHighlights) ? restaurant.reviewHighlights.map((item) => item?.text || '').join(' ') : '',
    restaurant?.summary,
    restaurant?.search_query,
    restaurant?.website,
    restaurant?.formatted_address,
    restaurant?.city
  ].filter(Boolean);
  const haystack = normalizeWriteupText(haystackParts.join(' '));
  if (!haystack) return 0;

  let score = 0;
  const matches = signals.terms.filter((term) => haystack.includes(normalizeWriteupText(term)));
  if (matches.length) {
    score += 1.5;
    score += Math.min(matches.length - 1, 2) * 0.35;
  }

  const nameMatches = signals.terms.some((term) => normalizeWriteupText(restaurant?.name || '').includes(normalizeWriteupText(term)));
  if (nameMatches) score += 1.25;

  const categoryMatches = Array.isArray(restaurant?.categories)
    ? restaurant.categories.some((category) => signals.terms.some((term) => normalizeWriteupText(category).includes(normalizeWriteupText(term))))
    : false;
  if (categoryMatches) score += 1.25;

  const reviewMatches = Array.isArray(restaurant?.reviews) && restaurant.reviews.some((review) =>
    signals.terms.some((term) => normalizeWriteupText(review).includes(normalizeWriteupText(term)))
  );
  if (reviewMatches) score += 0.75;

  const websiteMatches = normalizeWriteupText(restaurant?.website || '').includes(signals.label);
  if (websiteMatches) score += 0.5;

  const searchQueryMatches = normalizeWriteupText(restaurant?.search_query || '').includes(signals.label);
  if (searchQueryMatches) score += 0.5;

  if (signals.label === 'steakhouse' && /subway|sandwich|deli|sub shop|subs?/i.test(haystack)) {
    score -= 1.5;
  }
  if (signals.label === 'pizza' && /subway|sandwich|deli|sub shop|subs?/i.test(haystack)) {
    score -= 1.25;
  }

  if (score < 0) score = 0;
  return Number(score.toFixed(2));
}

function scoreRelevanceConfidence(restaurant) {
  const rating = Number.isFinite(restaurant?.rating) ? Number(restaurant.rating) : 0;
  const reviewCount = Number.isFinite(restaurant?.review_count) ? Number(restaurant.review_count) : 0;

  if (!rating && !reviewCount) return 0.25;

  const reviewConfidence = reviewCount > 0
    ? Math.min(1, Math.log(reviewCount + 1) / Math.log(75 + 1))
    : 0.15;
  const ratingConfidence = rating > 0
    ? Math.min(1, Math.max(0.15, (rating - 2.5) / 2))
    : 0.2;

  if (reviewCount < 10 && rating < 3.5) {
    return 0.15;
  }

  return Number(Math.max(0.15, Math.min(1, (reviewConfidence * 0.6) + (ratingConfidence * 0.4))).toFixed(2));
}

function rankRestaurantsForIntent(restaurants, cuisineText) {
  const cuisine = normalizeWriteupText(cuisineText || '');
  const ranked = (Array.isArray(restaurants) ? restaurants : [])
    .map((restaurant) => {
      const normalized = normalizeRestaurantRecord(restaurant);
      if (!normalized || !normalized.name) return null;
      if (isClosedRestaurant(normalized)) return null;

      const baseScore = Number.isFinite(normalized.score)
        ? Number(normalized.score)
        : ((Number.isFinite(normalized.rating) ? normalized.rating : 0) * 0.7) +
          (Math.log((Number.isFinite(normalized.review_count) ? normalized.review_count : 0) + 1) * 0.3);
      const cuisineScore = cuisine ? scoreCuisineRelevance(normalized, cuisine) : 0;
      const relevanceConfidence = cuisine ? scoreRelevanceConfidence(normalized) : 1;
      const adjustedCuisineScore = Number((cuisineScore * relevanceConfidence).toFixed(4));
      const ownershipScore = scoreOwnershipSignal(normalized);
      const chainCuisinePenalty = scoreChainCuisinePenalty(normalized, cuisine, adjustedCuisineScore);

      return {
        ...normalized,
        score: Number((baseScore + adjustedCuisineScore + ownershipScore + chainCuisinePenalty).toFixed(4)),
        cuisineScore,
        adjustedCuisineScore,
        relevanceConfidence,
        ownershipScore,
        chainCuisinePenalty
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.ownershipScore !== a.ownershipScore) return b.ownershipScore - a.ownershipScore;
      if (b.chainCuisinePenalty !== a.chainCuisinePenalty) return a.chainCuisinePenalty - b.chainCuisinePenalty;
      if (b.adjustedCuisineScore !== a.adjustedCuisineScore) return b.adjustedCuisineScore - a.adjustedCuisineScore;
      return b.cuisineScore - a.cuisineScore;
    });

  if (!cuisine) {
    return ranked.slice(0, 7);
  }

  const matched = ranked.filter((restaurant) => restaurant.adjustedCuisineScore > 0.3);
  if (matched.length >= 7) {
    return matched.slice(0, 7);
  }

  return ranked.slice(0, 7);
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
  const names = restaurants.slice(0, cuisineText ? 3 : 7).map((restaurant) => restaurant.name).filter(Boolean);
  const lead = names.length ? names.join(', ') : 'the top verified options';
  if (!cuisineText) {
    return `Here are the top seven restaurants I found in ${locationLabel}: ${lead}.`;
  }
  return `Here are the top ${cuisineText} spots I found in ${locationLabel}: ${lead}.`;
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
    search_query: normalized.search_query,
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

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickByHash(text, options) {
  if (!Array.isArray(options) || !options.length) return '';
  return options[hashText(text) % options.length];
}

function domainFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function compactComparableText(value) {
  return normalizeWriteupText(value || '').replace(/\s+/g, '');
}

function isClosedBusinessStatus(status) {
  const text = normalizeWriteupText(status || '');
  if (!text) return false;
  return /closed permanently|closed temporarily|permanently closed|temporarily closed/i.test(text);
}

function isClosedRestaurant(restaurant) {
  if (!restaurant || typeof restaurant !== 'object') return false;
  return isClosedBusinessStatus(restaurant.business_status || restaurant.businessStatus || '');
}

const CHAIN_NAME_HINTS = [
  'subway',
  'mcdonalds',
  'burger king',
  'wendys',
  'arbys',
  'taco bell',
  'dominos',
  'little caesars',
  'papa johns',
  'pizza hut',
  'kfc',
  'sonic drive in',
  'sonic',
  'dairy queen',
  'jack in the box',
  'whataburger',
  'five guys',
  'in n out burger',
  'hardees',
  'carls jr',
  'shake shack',
  'freddys frozen custard and steakburgers',
  'the habit burger grill',
  'checkers',
  'rallys',
  'steak n shake',
  'cook out',
  'white castle',
  'smashburger',
  'krystal',
  'farmer boys',
  'burgerfi',
  'portillos',
  'aw restaurants',
  'wahlburgers',
  'blakes lotaburger',
  'burgerville',
  'mooyah burgers fries and shakes',
  'wayback burgers',
  'texas roadhouse',
  'outback steakhouse',
  'longhorn steakhouse',
  'ruths chris steak house',
  'the capital grille',
  'logans roadhouse',
  'saltgrass steak house',
  'black angus steakhouse',
  'sizzler',
  'ponderosa steakhouse',
  'tgi fridays',
  'bjs restaurant and brewhouse',
  'red robin',
  'ruby tuesday',
  'houlihans',
  'bennigans',
  'bar louie',
  'beef o bradys',
  'dennys',
  'ihop',
  'waffle house',
  'cracker barrel',
  'olive garden',
  'red lobster',
  'bahama breeze',
  'yard house',
  'millers ale house',
  'cheesecake factory',
  'seasons 52',
  'california pizza kitchen',
  'carrabbas italian grill',
  'maggianos little italy',
  'romanos macaroni grill',
  'brio italian grille',
  'bertuccis',
  'bravo italian kitchen',
  'buca di beppo',
  'fazolis',
  'sbarro',
  'il forno',
  'north italia',
  'eataly',
  'vapiano',
  'piatti',
  'trattoria toscana',
  'johnny carinos',
  'amici italian restaurant',
  'spaghetti warehouse',
  'carmines',
  'larosas pizza',
  'panda express',
  'pf changs',
  'pei wei asian kitchen',
  'benihana',
  'ra sushi',
  'gyu kaku japanese bbq',
  'gen korean bbq house',
  'kura sushi',
  'din tai fung',
  'pick up stix',
  'teriyaki madness',
  'bibibop asian grill',
  'wok to walk',
  'leeann chin',
  'manchu wok',
  'sarku japan',
  'wasabi sushi and bento',
  'tokyo joes',
  'yoshinoya',
  'china max',
  'papa murphys',
  'marcos pizza',
  'jets pizza',
  'round table pizza',
  'mountain mikes pizza',
  'hungry howies pizza',
  'mellow mushroom',
  'mod pizza',
  'blaze pizza',
  'pieology',
  'donatos pizza',
  'rosatis pizza',
  'godfathers pizza',
  'gattis pizza',
  'ledo pizza',
  'cicis pizza',
  'chick fil a',
  'raising canes',
  'zaxbys',
  'bojangles',
  'churchs texas chicken',
  'el pollo loco',
  'daves hot chicken',
  'long john silvers',
  'captain ds',
  'bonefish grill',
  'joes crab shack',
  'legal sea foods',
  'bubba gump shrimp co',
  'mccormick and schmicks',
  'trulucks',
  'the boiling crab',
  'dickeys barbecue pit',
  'famous daves',
  'sonnys bbq',
  'mission bbq',
  'smokey bones',
  'rudys country store and bbq',
  'city barbeque',
  'jim n nicks bar b q',
  'shanes rib shack',
  'dinosaur bar b que',
  'first watch',
  'perkins',
  'bob evans',
  'huddle house',
  'another broken egg cafe',
  'snooze a m eatery',
  'jersey mikes',
  'jimmy johns',
  'firehouse subs',
  'quiznos',
  'potbelly sandwich shop',
  'schlotzskys',
  'mcalisters deli',
  'which wich',
  'jasons deli',
  'starbucks',
  'dunkin',
  'dutch bros',
  'tim hortons',
  'peets coffee',
  'caribou coffee',
  'the coffee bean and tea leaf',
  'biggby coffee',
  'scooters coffee',
  'gregorys coffee',
  'baskin robbins',
  'cold stone creamery',
  'nothing bundt cakes',
  'crumbl cookies',
  'insomnia cookies',
  'cinnabon',
  'krispy kreme',
  'great american cookies',
  'marble slab creamery',
  'cava',
  'the halal guys',
  'zoes kitchen',
  'garbanzo mediterranean fresh',
  'tazikis mediterranean cafe',
  'roti mediterranean grill',
  'nick the greek',
  'naf naf grill',
  'pita pit',
  'hummus and pita co',
  'golden corral',
  'shady maple smorgasbord',
  'pizza ranch',
  'sirloin stockade',
  'western sizzling',
  'hibachi grill and supreme buffet',
  'old country buffet',
  'chuck a rama',
  'souplantation',
  'buffalo wild wings',
  'hooters',
  'twin peaks',
  'dave and busters',
  'walk ons sports bistreaux',
  'tilted kilt'
];

const CHAIN_DOMAIN_HINTS = [
  'subway.com',
  'mcdonalds.com',
  'burgerking.com',
  'wendys.com',
  'arbys.com',
  'arbysrestaurants.com',
  'tacobell.com',
  'dominos.com',
  'littlecaesars.com',
  'papajohns.com',
  'pizzahut.com',
  'kfc.com',
  'sonicdrivein.com',
  'dairyqueen.com',
  'jackinthebox.com',
  'whataburger.com',
  'fiveguys.com',
  'in-n-out.com',
  'hardees.com',
  'carlsjr.com',
  'shakeshack.com',
  'freddys.com',
  'thehabitburgergrill.com',
  'checkers.com',
  'rallys.com',
  'steaknshake.com',
  'cookout.com',
  'whitecastle.com',
  'smashburger.com',
  'krystal.com',
  'burgerfi.com',
  'portillos.com',
  'awrestaurants.com',
  'wahlburgers.com',
  'lotaburger.com',
  'burgerville.com',
  'mooyah.com',
  'waybackburgers.com',
  'texasroadhouse.com',
  'outback.com',
  'longhornsteakhouse.com',
  'ruthschris.com',
  'thecapitalgrille.com',
  'logansroadhouse.com',
  'saltgrass.com',
  'blackangus.com',
  'sizzler.com',
  'ponderosasteakhouse.com',
  'tgifridays.com',
  'bjsrestaurants.com',
  'redrobin.com',
  'rubytuesday.com',
  'houlihans.com',
  'bennigans.com',
  'barlouie.com',
  'beefobradys.com',
  'dennys.com',
  'ihop.com',
  'wafflehouse.com',
  'crackerbarrel.com',
  'olivegarden.com',
  'redlobster.com',
  'bahamabreeze.com',
  'yardhouse.com',
  'millersalehouse.com',
  'cheesecakefactory.com',
  'seasons52.com',
  'cpk.com',
  'carrabbas.com',
  'maggianos.com',
  'romanosmacaroni.com',
  'brios.com',
  'bertuccis.com',
  'bravoitalian.com',
  'bucadibeppo.com',
  'fazolis.com',
  'sbarro.com',
  'ilfornaio.com',
  'northitalia.com',
  'eataly.com',
  'vapiano.com',
  'piatti.com',
  'johnnycarinos.com',
  'spaghettiwarehouse.com',
  'carminesnyc.com',
  'larosas.com',
  'pandargill.com',
  'pfchangs.com',
  'peiwei.com',
  'benihana.com',
  'rasushi.com',
  'gyukaku.com',
  'genkoreanbbq.com',
  'kurasushi.com',
  'dintaifungusa.com',
  'pickupstix.com',
  'teriyaki.com',
  'bibibop.com',
  'woktowalk.com',
  'leeannchin.com',
  'manchuwok.com',
  'sarkujapan.com',
  'wasabisushi.com',
  'tokyojoes.com',
  'yoshinoya.com',
  'chinamax.com',
  'papamurphys.com',
  'marcos.com',
  'jetspizza.com',
  'roundtablepizza.com',
  'mountainmikes.com',
  'hungryhowies.com',
  'mellowmushroom.com',
  'modpizza.com',
  'blazepizza.com',
  'pieology.com',
  'donatos.com',
  'rosatis.com',
  'godfathers.com',
  'gattispizza.com',
  'ledopizza.com',
  'cicis.com',
  'chick-fil-a.com',
  'raisingcanes.com',
  'zaxbys.com',
  'bojangles.com',
  'churchs.com',
  'eploloco.com',
  'daveshotchicken.com',
  'longjohnsilvers.com',
  'captainds.com',
  'bonefishgrill.com',
  'joescrabshack.com',
  'legalseafoods.com',
  'bubbagump.com',
  'mccormickandschmicks.com',
  'trulucks.com',
  'theboilingcrab.com',
  'dickeys.com',
  'famousdaves.com',
  'sonnysbbq.com',
  'mission-bbq.com',
  'smokeybones.com',
  'rudysbbq.com',
  'citybbq.com',
  'jimnnicks.com',
  'shanesribshack.com',
  'dinosaurbarbque.com',
  'firstwatch.com',
  'perkinsrestaurants.com',
  'bobevans.com',
  'huddlehouse.com',
  'anotherbrokenegg.com',
  'snoozeeatery.com',
  'jerseymikes.com',
  'jimmyjohns.com',
  'firehousesubs.com',
  'quiznos.com',
  'potbelly.com',
  'schlotzskys.com',
  'mcalistersdeli.com',
  'whichwich.com',
  'jasonsdeli.com',
  'starbucks.com',
  'dunkin.com',
  'dutchbros.com',
  'timhortons.com',
  'peets.com',
  'cariboucoffee.com',
  'coffeebean.com',
  'biggbycoffee.com',
  'scooterscoffee.com',
  'gregoryscoffee.com',
  'baskinrobbins.com',
  'coldstonecreamery.com',
  'nothingbundtcakes.com',
  'crumblcookies.com',
  'insomniacookies.com',
  'cinnabon.com',
  'krispykreme.com',
  'greatamericancookies.com',
  'marbleslab.com',
  'cava.com',
  'thehalalguys.com',
  'zoeskitchen.com',
  'garbanzo.com',
  'tazikis.com',
  'roti.com',
  'nickthegreek.com',
  'nafnafgrill.com',
  'pitapit.com',
  'hummusandpita.com',
  'goldencorral.com',
  'shadymaple.com',
  'pizzaranch.com',
  'sirloinstockade.com',
  'westernsizzlin.com',
  'hibachigrill.com',
  'oldcountrybuffet.com',
  'chuckarama.com',
  'souplantation.com',
  'buffalowildwings.com',
  'hooters.com',
  'twinpeaksrestaurant.com',
  'daveandbusters.com',
  'walk-ons.com',
  'tiltedkilt.com'
];

function classifyRestaurantOwnership(restaurant) {
  const name = normalizeWriteupText(restaurant?.name || '');
  const websiteDomain = normalizeWriteupText(domainFromUrl(restaurant?.website || ''));
  const combined = [name, websiteDomain].filter(Boolean).join(' ');
  const compactCombined = compactComparableText(combined);

  if (!combined) return 'unknown';
  if (/\bculver\b/.test(combined)) return 'culvers';
  if (
    CHAIN_NAME_HINTS.some((hint) => {
      const normalizedHint = normalizeWriteupText(hint);
      return combined.includes(normalizedHint) || compactCombined.includes(compactComparableText(normalizedHint));
    })
  ) return 'chain';
  if (CHAIN_DOMAIN_HINTS.some((hint) => websiteDomain.includes(normalizeWriteupText(hint)))) return 'chain';
  return 'local';
}

function scoreOwnershipSignal(restaurant) {
  const signal = classifyRestaurantOwnership(restaurant);
  if (signal === 'culvers') return 1.0;
  if (signal === 'local') return 1.5;
  if (signal === 'chain') return -10.0;
  return 0;
}

function scoreChainCuisinePenalty(restaurant, cuisineText, cuisineScore) {
  const cuisine = normalizeWriteupText(cuisineText || '');
  if (!cuisine) return 0;
  if (classifyRestaurantOwnership(restaurant) !== 'chain') return 0;
  if (Number.isFinite(cuisineScore) && cuisineScore >= 1.5) return 0;
  return -20.0;
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

async function fetchWebsiteSignals(url, requestId) {
  const website = String(url || '').trim();
  if (!website) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(website, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; 618FOOD.COM/1.0)'
      }
    });
    if (!response.ok) return null;

    const html = await response.text();
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || '';
    const metaDescription =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ||
      '';
    const bodyText = `${title} ${metaDescription}`.toLowerCase();

    const menuKeywords = [
      { term: 'pizza', label: 'pizza' },
      { term: 'pasta', label: 'pasta' },
      { term: 'steak', label: 'steaks' },
      { term: 'ribeye', label: 'ribeye' },
      { term: 'prime rib', label: 'prime rib' },
      { term: 'burger', label: 'burgers' },
      { term: 'bbq', label: 'bbq' },
      { term: 'barbecue', label: 'barbecue' },
      { term: 'seafood', label: 'seafood' },
      { term: 'coffee', label: 'coffee' },
      { term: 'breakfast', label: 'breakfast' },
      { term: 'brunch', label: 'brunch' },
      { term: 'dessert', label: 'dessert' },
      { term: 'bakery', label: 'bakery' }
    ];

    const menuHighlights = menuKeywords
      .filter(({ term }) => bodyText.includes(term))
      .map(({ label }) => label);

    const menuLinkMentions = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis)]
      .map((match) => ({
        href: String(match[1] || '').trim(),
        text: String(match[2] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }))
      .filter((item) => /menu|order|online|special/i.test(`${item.href} ${item.text}`))
      .slice(0, 3)
      .map((item) => item.text)
      .filter(Boolean);

    return {
      title,
      description: metaDescription,
      menuHighlights,
      menuLinkMentions,
      requestId
    };
  } catch (error) {
    log(requestId, `website fetch skipped for ${website}: ${String(error.message || error)}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildFeaturedWriteup({ restaurant, locationText, cuisineText, websiteSignals }) {
  if (!restaurant || !restaurant.name) return '';

  const locationLabel = locationText || restaurant.city || restaurant.formatted_address || 'the area';
  const ratingText = Number.isFinite(restaurant.rating) ? restaurant.rating.toFixed(1) : '';
  const reviewCount = Number.isFinite(restaurant.review_count) ? restaurant.review_count.toLocaleString() : '';
  const opening = pickByHash(restaurant.name, [
    `#1 pick: ${restaurant.name} is the kind of place locals keep in rotation.`,
    `#1 pick: ${restaurant.name} stands out as the sort of restaurant people point friends toward.`,
    `#1 pick: ${restaurant.name} feels like the most dependable stop on the list.`,
    `#1 pick: ${restaurant.name} has the feel of a true local favorite.`
  ]);
  const themes = extractReviewThemes(restaurant, cuisineText);
  const themeSentence = themes.length
    ? `Customers keep coming back to mention ${humanJoin(themes)}.`
    : 'Customer feedback is a little thinner here, so the rating, review count, and verified business details do most of the talking.';
  const atmosphereSentence = describeAtmosphereFromCategories(restaurant.categories);
  const websiteSentence = (() => {
    const menuHighlights = Array.isArray(websiteSignals?.menuHighlights) ? websiteSignals.menuHighlights.filter(Boolean) : [];
    const menuMentions = Array.isArray(websiteSignals?.menuLinkMentions) ? websiteSignals.menuLinkMentions.filter(Boolean) : [];
    if (menuHighlights.length) {
      return `Its website reinforces that with menu cues around ${humanJoin(menuHighlights)}.`;
    }
    if (menuMentions.length) {
      return `Its site also hints at the menu with links for ${humanJoin(menuMentions)}.`;
    }
    if (typeof websiteSignals?.description === 'string' && websiteSignals.description.trim()) {
      const desc = websiteSignals.description.trim();
      if (desc.length >= 40 && desc.length <= 180) {
        return `The restaurant's own site adds another layer, describing it as ${desc.replace(/\.$/, '')}.`;
      }
    }
    return '';
  })();
  const scoreSentence = ratingText && reviewCount
    ? `A ${ratingText} rating across ${reviewCount} reviews gives it the feel of a place with a real, steady following.`
    : ratingText
      ? `A ${ratingText} rating gives it the feel of a place with a real, steady following.`
      : reviewCount
        ? `Its ${reviewCount} reviews give it the feel of a place with a real, steady following.`
        : 'Its verified business details are enough to land it at the top of the list.';
  const closing = pickByHash(`${restaurant.name}-${locationLabel}`, [
    'Altogether, it reads like a dependable local favorite and an easy first stop if you want a place that feels grounded in the local crowd.',
    'Taken together, it feels like the sort of spot you remember after one visit and circle back to when you want the reliable choice.',
    'Put simply, this is the kind of restaurant that earns repeat visits because it feels familiar, satisfying, and worth the stop.',
    'All told, it has the warmth and credibility of a place that has clearly won over the local crowd.'
  ]);

  return [opening, atmosphereSentence, scoreSentence, themeSentence, websiteSentence, closing]
    .filter(Boolean)
    .join(' ');
}

function compactRestaurantWriteup(text, maxWords = 130) {
  const compact = String(text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!compact) return '';

  const words = compact.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return compact;

  const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
  const selected = [];
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).filter(Boolean);
    if (selected.length && wordCount + sentenceWords.length > maxWords) break;
    selected.push(sentence);
    wordCount += sentenceWords.length;
    if (wordCount >= Math.max(70, maxWords - 15)) break;
  }

  if (selected.length) {
    return selected.join(' ').trim();
  }

  return sentences[0]?.trim() || compact;
}

function buildTopSpotWriteupPrompt({ restaurant, locationText, cuisineText, websiteSignals }) {
  const reviewHighlights = Array.isArray(restaurant.reviewHighlights) ? restaurant.reviewHighlights : [];
  const reviewSnippets = reviewHighlights
    .map((item, index) => {
      const author = String(item?.author || '').trim();
      const relativeTime = String(item?.relativeTime || '').trim();
      const rating = Number.isFinite(item?.rating) ? `${Number(item.rating).toFixed(1)} stars` : '';
      const meta = [author, relativeTime, rating].filter(Boolean).join(' • ');
      return `${index + 1}. ${meta ? `${meta}: ` : ''}${String(item?.text || '').trim()}`;
    })
    .filter(Boolean)
    .slice(0, 4);

  const menuHighlights = Array.isArray(websiteSignals?.menuHighlights) ? websiteSignals.menuHighlights.filter(Boolean) : [];
  const menuMentions = Array.isArray(websiteSignals?.menuLinkMentions) ? websiteSignals.menuLinkMentions.filter(Boolean) : [];

  const facts = [
    `Restaurant name: ${restaurant.name}`,
    `Location focus: ${locationText || restaurant.city || restaurant.formatted_address || 'the area'}`,
    cuisineText ? `Cuisine/query: ${cuisineText}` : '',
    restaurant.formatted_address ? `Address: ${restaurant.formatted_address}` : '',
    restaurant.phone ? `Phone: ${restaurant.phone}` : '',
    Number.isFinite(restaurant.rating) ? `Rating: ${restaurant.rating.toFixed(1)}` : '',
    Number.isFinite(restaurant.review_count) ? `Review count: ${restaurant.review_count.toLocaleString()}` : '',
    Array.isArray(restaurant.categories) && restaurant.categories.length ? `Categories: ${restaurant.categories.join(', ')}` : '',
    restaurant.open_now === true ? 'Open now: yes' : restaurant.open_now === false ? 'Open now: no' : '',
    restaurant.business_status ? `Business status: ${restaurant.business_status}` : '',
    menuHighlights.length ? `Website menu cues: ${menuHighlights.join(', ')}` : '',
    menuMentions.length ? `Website menu links mentioned: ${menuMentions.join(', ')}` : '',
    websiteSignals?.title ? `Website title: ${websiteSignals.title}` : '',
    websiteSignals?.description ? `Website description: ${websiteSignals.description}` : '',
    reviewSnippets.length ? `Customer review snippets:\n${reviewSnippets.map((item) => `- ${item}`).join('\n')}` : 'Customer review snippets: none available.'
  ].filter(Boolean);

  return [
    'Write a polished, magazine-style spotlight for the top restaurant only.',
    'Use only the facts below. Do not mention Google, tools, search mechanics, internal ranking, or the agent.',
    'Do not use a template. Vary the structure so it sounds tailored to this restaurant, not generic.',
    'Focus on atmosphere, menu character, customer praise, and what makes the place memorable.',
    'Ground the copy in the review snippets and website clues when they exist.',
    'If the evidence is thin, stay tasteful and concise rather than inventing details.',
    'Never mention ordering, online ordering, delivery, reservations, partners, coupons, payment, or checkout.',
    'Write exactly 1 complete paragraph, about 65-90 words total. Keep it vivid, but finish cleanly with a complete sentence.',
    'Return only the review text itself, with no heading or bullet list.',
    '',
    ...facts
  ].join('\n');
}

async function generateTopSpotWriteup({ apiKey, model, restaurant, locationText, cuisineText, websiteSignals, requestId }) {
  if (!restaurant || !restaurant.name) return '';

  log(requestId, `generating top-spot writeup for ${restaurant.name}`);
  try {
    const response = await callOpenAiResponses({
      apiKey,
      model,
      conversation: [
        {
          role: 'system',
          content: 'You are a careful food writer who writes vivid but factual restaurant spotlights.'
        },
        {
          role: 'user',
          content: buildTopSpotWriteupPrompt({ restaurant, locationText, cuisineText, websiteSignals })
        }
      ],
      tools: [],
      requestId,
      maxOutputTokens: 260,
      reasoningEffort: 'low'
    });

    const text = compactRestaurantWriteup(extractResponseText(response), 130);
    if (text) {
      return text;
    }
  } catch (error) {
    log(requestId, `top-spot writeup generation failed: ${String(error.message || error)}`);
  }

  return compactRestaurantWriteup(buildFeaturedWriteup({ restaurant, locationText, cuisineText, websiteSignals }), 130);
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

async function callOpenAiResponses({
  apiKey,
  model,
  conversation,
  tools,
  requestId,
  maxOutputTokens = 1200,
  reasoningEffort = 'low'
}) {
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
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
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
      search_query: String(candidate.searchQuery || '').trim() || null,
      business_status: String(candidate.place?.business_status || candidate.place?.businessStatus || '').trim() || null
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
  const looksLikeSpecificPlaceRequest = shouldTreatAsSpecificPlaceRequest(cleanMessage, history, intent);
  const explicitPlaceSubject = looksLikeSpecificPlaceRequest ? cleanPlaceFollowupText(cleanMessage) : '';
  const recentRestaurantContext = explicitPlaceSubject ? null : matchRecentRestaurantContext(cleanMessage, history, intent, pageContext);

  if (explicitPlaceSubject) {
    intent.querySubject = explicitPlaceSubject;
  } else if (recentRestaurantContext) {
    intent.querySubject = recentRestaurantContext.name;
  }

  if (recentRestaurantContext) {
    intent.inferredLocation =
      intent.inferredLocation ||
      recentRestaurantContext.city ||
      String(pageContext?.recentLocation || '').trim();
    intent.queryLocation =
      intent.queryLocation ||
      recentRestaurantContext.city ||
      String(pageContext?.recentLocation || '').trim();
  }
  const locationText = intent.inferredLocation || '';
  const cuisineText = intent.inferredCuisine || '';
  const specificPlaceRequest = looksLikeSpecificPlaceRequest || Boolean(recentRestaurantContext);

  if (!cleanMessage) {
    return {
      reply: 'Please send a town or ZIP for top restaurants, or a restaurant name with a location for a focused profile.',
      restaurants: [],
      sources: [],
      requestId: requestLabel
    };
  }

  if (specificPlaceRequest && googlePlacesKey) {
    log(requestLabel, `specific-place lookup enabled for ${JSON.stringify(cleanMessage)}`);
    try {
      return await runSpecificPlaceLookup({
        message: cleanMessage,
        history,
        pageContext,
        intent,
        googlePlacesKey,
        requestId: requestLabel,
        apiKey
      });
    } catch (error) {
      log(requestLabel, `specific-place lookup failed: ${String(error.message || error)}`);
    }
  }

  if (!likelyRestaurantRequest) {
    return {
      reply: `Hello! I’m ${FOOD_BRAND}. Just tell me a town and what kind of food you want, and I’ll find the top restaurants. You can also enter a restaurant name with a location, and I’ll pull together helpful details about it.`,
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
  finalRestaurants = rankRestaurantsForIntent(finalRestaurants, cuisineText);
  finalRestaurants = finalRestaurants.filter((restaurant) => !isClosedRestaurant(restaurant));
  const rankedTopRestaurant = finalRestaurants[0] || null;
  const websiteSignals = rankedTopRestaurant?.website ? await fetchWebsiteSignals(rankedTopRestaurant.website, requestLabel) : null;

  const finalResultRestaurants = finalRestaurants
    .slice(0, 7)
    .map((restaurant) => {
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

  const replyText = buildReply({
    restaurants: finalResultRestaurants,
    locationText: locationText || String(pageContext?.pageSummary || '').trim(),
    cuisineText
  });

  const sources = buildSources(finalResultRestaurants);
  const topRestaurant = finalResultRestaurants[0] || null;
  const featuredWriteup = finalResultRestaurants.length
    ? (await generateTopSpotWriteup({
          apiKey,
          model: process.env.OPENAI_MODEL || 'gpt-5.4',
          restaurant: finalResultRestaurants[0],
          locationText: locationText || String(pageContext?.pageSummary || '').trim(),
          cuisineText,
          websiteSignals,
          requestId: requestLabel
        }))
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
