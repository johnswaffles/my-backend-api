import { FOOD_BRAND } from './schemas.js';

const TAG_WEIGHTS = {
  'hidden-gem': 12,
  'locals-love-it': 14,
  'worth-the-drive': 10,
  'breakfast-favorite': 8,
  'family-friendly': 6,
  patio: 4,
  'quick-casual': 5,
  'date-night': 5,
  'open-now': 6,
  'dog-friendly': 4,
  'budget-friendly': 5,
  verified: 8,
  preview: -40
};

function normalizeText(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasKeyword(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword));
}

const STEAKHOUSE_TERMS = [
  'steak',
  'steakhouse',
  'prime rib',
  'ribeye',
  't-bone',
  'sirloin',
  'filet',
  'porterhouse',
  'chophouse',
  'chop house',
  'grill',
  'grille',
  'roadhouse'
];

const STEAKHOUSE_NEGATIVE_TERMS = [
  'sandwich',
  'sub',
  'subs',
  'hoagie',
  'deli',
  'wrap',
  'subway',
  'fast food',
  'takeout only',
  'pizza'
];

const CUISINE_PROFILES = [
  {
    keys: ['pizza'],
    label: 'pizza',
    strictTerms: ['pizza', 'pizzeria', 'calzone', 'stromboli', 'pizza place', 'pizza parlor'],
    softTerms: ['italian', 'flatbread', 'slice shop', 'pizza restaurant', 'pizza joint'],
    blockedTerms: ['burger', 'sandwich', 'deli', 'sub', 'subs', 'sushi', 'bbq']
  },
  {
    keys: ['steakhouse', 'steak', 'chophouse', 'chop house'],
    label: 'steakhouse',
    strictTerms: ['steakhouse', 'chophouse', 'chop house', 'prime rib', 'ribeye', 't-bone', 'sirloin', 'filet', 'porterhouse'],
    softTerms: ['steak', 'grill', 'grille', 'roadhouse', 'bar and grill', 'bar & grill'],
    blockedTerms: ['sandwich', 'sub', 'subs', 'hoagie', 'deli', 'pizza']
  },
  {
    keys: ['italian'],
    label: 'Italian',
    strictTerms: ['italian', 'trattoria', 'ristorante', 'pasta', 'lasagna', 'spaghetti', 'ravioli', 'fettuccine'],
    softTerms: ['pizza', 'pizzeria', 'marinara', 'parmigiana'],
    blockedTerms: ['burger', 'deli', 'subway']
  },
  {
    keys: ['burgers', 'burger', 'hamburger', 'hamburgers'],
    label: 'burgers',
    strictTerms: ['burger', 'burgers', 'hamburger', 'hamburgers', 'cheeseburger', 'cheeseburgers', 'burger bar', 'burger joint'],
    softTerms: ['smashburger', 'burger shack', 'burger place'],
    blockedTerms: ['pizza', 'steakhouse', 'sushi', 'bbq']
  },
  {
    keys: ['bbq', 'barbecue', 'barbeque', 'smokehouse'],
    label: 'BBQ',
    strictTerms: ['bbq', 'barbecue', 'barbeque', 'smokehouse', 'smoked meat', 'smoker'],
    softTerms: ['grill', 'roadhouse', 'pit', 'smoked'],
    blockedTerms: ['sandwich', 'deli', 'sub']
  },
  {
    keys: ['mexican', 'taco', 'tacos', 'burrito', 'burritos'],
    label: 'Mexican',
    strictTerms: ['mexican', 'taco', 'tacos', 'burrito', 'burritos', 'taqueria', 'quesadilla', 'enchilada'],
    softTerms: ['cantina', 'fiesta', 'south of the border'],
    blockedTerms: ['pizza', 'sushi']
  },
  {
    keys: ['japanese', 'sushi', 'ramen', 'hibachi'],
    label: 'Japanese',
    strictTerms: ['japanese', 'sushi', 'ramen', 'hibachi', 'teppanyaki'],
    softTerms: ['roll', 'sashimi', 'noodle'],
    blockedTerms: ['burger', 'pizza', 'deli']
  },
  {
    keys: ['chinese'],
    label: 'Chinese',
    strictTerms: ['chinese', 'dumpling', 'lo mein', 'fried rice', 'wok', 'szechuan'],
    softTerms: ['noodle', 'asian'],
    blockedTerms: ['burger', 'pizza']
  },
  {
    keys: ['thai'],
    label: 'Thai',
    strictTerms: ['thai', 'pad thai', 'thai kitchen'],
    softTerms: ['noodle', 'curries'],
    blockedTerms: ['burger', 'pizza']
  },
  {
    keys: ['seafood', 'fish fry', 'catfish', 'shrimp'],
    label: 'seafood',
    strictTerms: ['seafood', 'fish fry', 'catfish', 'shrimp', 'oyster', 'crab', 'fish house'],
    softTerms: ['fried fish', 'grill', 'dock'],
    blockedTerms: ['burger', 'pizza', 'deli']
  },
  {
    keys: ['deli', 'sandwich', 'subs', 'sub', 'hoagie'],
    label: 'deli',
    strictTerms: ['deli', 'sandwich', 'subs', 'sub', 'hoagie', 'panini'],
    softTerms: ['luncheonette', 'sandwich shop'],
    blockedTerms: ['pizza', 'steakhouse']
  },
  {
    keys: ['coffee', 'espresso', 'latte', 'cafe', 'café'],
    label: 'coffee',
    strictTerms: ['coffee', 'espresso', 'latte', 'cafe', 'café', 'coffee house', 'coffee shop'],
    softTerms: ['bakery', 'barista', 'roastery'],
    blockedTerms: ['steakhouse', 'bbq']
  },
  {
    keys: ['breakfast', 'brunch', 'pancake', 'pancakes', 'biscuits', 'omelet', 'omelette'],
    label: 'breakfast',
    strictTerms: ['breakfast', 'brunch', 'pancake', 'pancakes', 'biscuits', 'omelet', 'omelette', 'diner', 'breakfast house'],
    softTerms: ['morning', 'supper club', 'cafe'],
    blockedTerms: ['steakhouse', 'sushi']
  },
  {
    keys: ['dessert', 'ice cream', 'bakery', 'pie', 'sweet'],
    label: 'dessert',
    strictTerms: ['dessert', 'ice cream', 'bakery', 'pie', 'sweet', 'sweet shop', 'pastry'],
    softTerms: ['cake', 'cookie', 'donut'],
    blockedTerms: ['steakhouse', 'bbq']
  }
];

const LARGE_CHAIN_NAMES = [
  'mcdonalds',
  "mcdonald's",
  'burger king',
  'wendys',
  "wendy's",
  'taco bell',
  'kfc',
  'kentucky fried chicken',
  'subway',
  'dominos',
  "domino's",
  'pizza hut',
  'little caesars',
  "little caesar's",
  'sonic',
  'arbys',
  "arby's",
  'hardees',
  "hardee's",
  'chilis',
  "chili's",
  'olive garden',
  'applebee',
  "applebee's",
  'red lobster',
  'long john silver',
  "long john silver's",
  'cracker barrel',
  'dairy queen',
  'dq',
  'panda express',
  'buffalo wild wings',
  'jack in the box',
  'white castle',
  'whataburger',
  'culvers',
  "culver's",
  'panera',
  'panera bread',
  'chipotle',
  'sbarro',
  'costco',
  'walmart',
  'target',
  "jimmy john's",
  'jimmy johns'
];

function normalizeComparable(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
}

function getCuisineProfile(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return null;
  return CUISINE_PROFILES.find((profile) => profile.keys.some((key) => normalized.includes(key))) || null;
}

function collectCuisineText(candidate, evidence = []) {
  return [
    candidate.name,
    candidate.formattedAddress,
    candidate.city,
    candidate.categories.join(' '),
    candidate.reviews?.join(' ') || '',
    evidence.map((item) => `${item.title} ${item.snippet} ${item.notes || ''}`).join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function classifyCuisineCandidate(candidate, request, intent, evidence = []) {
  const cuisine = normalizeText(request.filters.cuisine) || normalizeText(intent?.inferredCuisine);
  const profile = getCuisineProfile(cuisine);
  if (!profile) {
    return { profile: null, exact: false, soft: false, blocked: false };
  }

  const text = collectCuisineText(candidate, evidence);
  const exact = profile.strictTerms.some((term) => hasKeyword(text, [term]));
  const soft = exact || profile.softTerms.some((term) => hasKeyword(text, [term]));
  const blocked = profile.blockedTerms.some((term) => hasKeyword(text, [term]));

  return { profile, exact, soft, blocked };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isLargeChain(candidate) {
  const name = normalizeText(candidate.name);
  const website = normalizeText(candidate.website);
  const websiteDomain = website ? (() => {
    try {
      return new URL(website).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  })() : '';
  const haystack = [name, websiteDomain].map(normalizeComparable).join(' ');
  return LARGE_CHAIN_NAMES.some((chain) => haystack.includes(normalizeComparable(chain)));
}

export function heuristicTags(candidate, request, evidence = []) {
  const tags = new Set(['verified']);
  const reviewText = (candidate.reviews || []).join(' ').toLowerCase();
  const haystack = [
    candidate.name,
    candidate.formattedAddress,
    candidate.city,
    candidate.categories.join(' '),
    reviewText,
    evidence.map((item) => `${item.title} ${item.snippet}`).join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    candidate.reviewCount != null &&
    candidate.reviewCount < 500 &&
    candidate.rating != null &&
    candidate.rating >= 4.4
  ) {
    tags.add('hidden-gem');
  }
  if (
    hasKeyword(haystack, ['local', 'locals', 'home style', 'family owned', 'small town', 'neighbor']) ||
    request.filters.localOnly
  ) {
    tags.add('locals-love-it');
  }
  if (request.filters.worthTheDrive || hasKeyword(haystack, ['worth the drive', 'road trip', 'drive for'])) {
    tags.add('worth-the-drive');
  }
  if (hasKeyword(haystack, ['breakfast', 'brunch', 'biscuits', 'pancakes'])) tags.add('breakfast-favorite');
  if (request.filters.familyFriendly || hasKeyword(haystack, ['kids', 'family', 'kid friendly'])) {
    tags.add('family-friendly');
  }
  if (request.filters.patio || hasKeyword(haystack, ['patio', 'outdoor seating'])) tags.add('patio');
  if (request.filters.quickBite || hasKeyword(haystack, ['quick', 'grab and go', 'casual'])) {
    tags.add('quick-casual');
  }
  if (request.filters.dateNight || hasKeyword(haystack, ['date night', 'romantic', 'cozy'])) {
    tags.add('date-night');
  }
  if (request.filters.dogFriendly || hasKeyword(haystack, ['dog friendly', 'dog-friendly'])) {
    tags.add('dog-friendly');
  }
  if (candidate.priceLevel === 1 || hasKeyword(haystack, ['budget', 'cheap', 'affordable'])) {
    tags.add('budget-friendly');
  }
  if (candidate.openNow === true || evidence.some((item) => item.sourceType === 'official_site')) {
    tags.add('open-now');
  }

  return [...tags];
}

function scoreByConfidence(confidence, evidenceCount, hasWebsite, hasPhone) {
  let score = 0;
  if (confidence === 'high') score += 22;
  if (confidence === 'medium') score += 14;
  if (confidence === 'limited') score += 2;
  score += Math.min(10, evidenceCount * 3);
  if (hasWebsite) score += 4;
  if (hasPhone) score += 2;
  return score;
}

function computeWeightedRating(candidate, averageRating, minimumReviews = 50) {
  const rating = Number.isFinite(candidate.rating) ? candidate.rating : null;
  const reviewCount = Number.isFinite(candidate.reviewCount) ? candidate.reviewCount : 0;
  const fallback = Number.isFinite(averageRating) && averageRating > 0 ? averageRating : rating || 0;
  if (!rating && !fallback) return 0;

  const effectiveRating = rating || fallback;
  const m = Math.max(1, minimumReviews);
  return (reviewCount / (reviewCount + m)) * effectiveRating + (m / (reviewCount + m)) * fallback;
}

function scoreQuality(candidate, averageRating) {
  const weighted = computeWeightedRating(candidate, averageRating);
  return clamp((weighted / 5) * 100, 0, 100);
}

function scoreIntentMatch(candidate, request, intent, evidence = []) {
  const text = normalizeText(
    [
      candidate.name,
      candidate.formattedAddress,
      candidate.city,
      candidate.categories.join(' '),
      candidate.reviews?.join(' ') || '',
      evidence.map((item) => `${item.title} ${item.snippet} ${item.notes || ''}`).join(' ')
    ].join(' ')
  );
  const cuisine = normalizeText(request.filters.cuisine) || normalizeText(intent?.inferredCuisine);
  const query = normalizeText(request.query);
  const destination = normalizeText(request.destinationText);
  const searchText = [cuisine, query, destination].filter(Boolean).join(' ');
  const preference = normalizeText(intent?.preference);
  const steakIntent = hasKeyword(normalizeText(searchText), STEAKHOUSE_TERMS);
  const cuisineMatch = classifyCuisineCandidate(candidate, request, intent, evidence);
  let score = 0;

  if (request.mealType !== 'any' && hasKeyword(text, [request.mealType])) score += 8;
  if (query && hasKeyword(text, query.split(/\s+/).filter(Boolean))) score += 8;
  if (destination && hasKeyword(text, destination.split(/\s+/).filter(Boolean))) score += 5;

  if (cuisineMatch.profile) {
    if (cuisineMatch.exact) score += 28;
    else if (cuisineMatch.soft) score += 14;
    else score -= 18;

    if (cuisineMatch.blocked) score -= 24;
  } else if (cuisine && hasKeyword(text, [cuisine])) {
    score += 22;
  }

  if (preference === 'best overall') score += 3;
  if (preference === 'value' && hasKeyword(text, ['budget', 'affordable', 'value', 'cheap'])) score += 10;
  if (preference === 'upscale' && hasKeyword(text, ['bistro', 'fine dining', 'steakhouse', 'chophouse', 'upscale'])) score += 16;
  if (preference === 'casual' && hasKeyword(text, ['casual', 'diner', 'grill', 'family'])) score += 10;
  if (preference === 'romantic' && hasKeyword(text, ['cozy', 'date', 'wine', 'bistro', 'quiet'])) score += 12;
  if (preference === 'quiet' && hasKeyword(text, ['quiet', 'cozy', 'low key', 'low-key'])) score += 10;

  if (steakIntent && hasKeyword(text, STEAKHOUSE_TERMS)) score += 28;
  if (steakIntent && hasKeyword(text, ['steakhouse', 'chophouse', 'chop house', 'prime rib', 'ribeye', 't-bone'])) score += 18;
  if (steakIntent && hasKeyword(text, ['grill', 'grille', 'roadhouse', 'bar and grill', 'bar & grill'])) score += 8;
  if (steakIntent && hasKeyword(text, STEAKHOUSE_NEGATIVE_TERMS)) score -= 18;
  if (steakIntent && !hasKeyword(text, STEAKHOUSE_TERMS)) score -= 14;

  return clamp(score, 0, 100);
}

function scoreDistance(candidate, request) {
  if (candidate.distanceMiles == null) return 50;
  const radius = Math.max(1, request.radiusMiles || 18);
  const ratio = candidate.distanceMiles / radius;
  return clamp(100 - ratio * 100, 0, 100);
}

function scorePriceFit(candidate, request, intent) {
  const preference = normalizeText(intent?.preference);
  const price = candidate.priceLevel;
  if (!Number.isFinite(price)) return 45;

  if (preference === 'value') {
    if (price <= 1) return 100;
    if (price === 2) return 82;
    if (price === 3) return 40;
    return 20;
  }

  if (preference === 'upscale' || preference === 'romantic') {
    if (price >= 3) return 92;
    if (price === 2) return 62;
    return 35;
  }

  if (preference === 'casual' || preference === 'best overall') {
    if (price === 1) return 78;
    if (price === 2) return 82;
    if (price === 3) return 68;
    return 40;
  }

  if (request.filters.localOnly && price <= 2) return 72;

  return clamp(70 - Math.max(0, price - 1) * 8, 20, 80);
}

function scoreOpenNow(candidate, request) {
  if (request.filters.openNow) {
    if (candidate.openNow === true) return 100;
    if (candidate.openNow === false) return 0;
    return 45;
  }

  if (candidate.openNow === true) return 65;
  if (candidate.openNow === false) return 35;
  return 50;
}

function scoreContext(candidate, request, evidence = []) {
  const tags = heuristicTags(candidate, request, evidence);
  const evidenceText = evidence.map((item) => `${item.title} ${item.snippet} ${item.notes || ''}`).join(' ').toLowerCase();
  let score = tags.reduce((total, tag) => total + (TAG_WEIGHTS[tag] || 0), 0);

  if (evidence.some((item) => item.sourceType === 'official_site')) score += 10;
  if (evidence.some((item) => item.sourceType === 'facebook')) score += 6;
  if (evidence.some((item) => item.sourceType === 'local_news' || item.sourceType === 'local_blog')) score += 8;
  if (hasKeyword(evidenceText, ['menu', 'daily special', 'specials', 'menu photos', 'special of the day'])) score += 8;
  if (hasKeyword(evidenceText, ['locals', 'local favorite', 'worth the drive', 'hidden gem'])) score += 8;
  if (request.filters.familyFriendly && hasKeyword(evidenceText, ['kids', 'family', 'family-friendly'])) score += 4;
  if (request.filters.quickBite && hasKeyword(evidenceText, ['quick', 'fast', 'grab and go'])) score += 4;
  if (request.filters.dateNight && hasKeyword(evidenceText, ['cozy', 'wine', 'romantic', 'date night'])) score += 4;
  if (request.filters.patio && hasKeyword(evidenceText, ['patio', 'outdoor seating'])) score += 4;
  if (request.filters.dogFriendly && hasKeyword(evidenceText, ['dog friendly', 'dog-friendly'])) score += 4;

  return clamp(score, -20, 100);
}

export function deriveConfidence(candidate, evidence, request) {
  const evidenceCount = evidence.length;
  const hasWebsite = Boolean(candidate.website);
  const hasPhone = Boolean(candidate.phone);
  const freshSignals = evidence.filter((item) => item.freshness === 'fresh' || item.freshness === 'recent').length;

  if (evidenceCount >= 3 && freshSignals >= 2 && (hasWebsite || hasPhone)) return 'high';
  if (evidenceCount >= 1 || hasWebsite || hasPhone) return 'medium';
  if (request.filters.localOnly && candidate.reviewCount != null && candidate.reviewCount < 300) return 'medium';
  return 'limited';
}

export function buildWhyThisIsAFit(candidate, request, evidence, tags) {
  const reasons = [];
  const parts = [];
  const cuisine = normalizeText(request.filters.cuisine);
  const cuisineMatch = classifyCuisineCandidate(candidate, request, null, evidence);

  if (request.filters.openNow && candidate.openNow === true) reasons.push('open now');
  if (cuisineMatch.profile && cuisineMatch.exact) {
    reasons.push(`verified ${cuisineMatch.profile.label} match`);
  } else if (cuisineMatch.profile && cuisineMatch.soft) {
    reasons.push(`related ${cuisineMatch.profile.label} signals`);
  }
  if (candidate.rating != null) reasons.push(`strong rating (${candidate.rating.toFixed(1)})`);
  if (candidate.reviewCount != null) reasons.push(`${candidate.reviewCount.toLocaleString()} reviews`);
  if (tags.includes('locals-love-it')) reasons.push('local-favorite signals');
  if (tags.includes('hidden-gem')) reasons.push('small-town hidden-gem profile');
  if (tags.includes('worth-the-drive')) reasons.push('worth-the-drive language or distance');
  if (tags.includes('breakfast-favorite')) reasons.push('breakfast energy');
  if (tags.includes('family-friendly')) reasons.push('family-friendly fit');
  if (tags.includes('quick-casual')) reasons.push('quick casual stop');
  if (tags.includes('date-night')) reasons.push('date-night vibe');

  if (evidence.length) {
    parts.push(`Verified from the web search bundle and corroborated with ${evidence.length} supporting signal${evidence.length === 1 ? '' : 's'}.`);
  } else {
    parts.push('Verified from the web search bundle, but corroborating web signals were limited.');
  }

  if (reasons.length) {
    parts.push(`This looks like a fit because it has ${reasons.slice(0, 3).join(', ')}.`);
  }

  if (cuisine) {
    parts.push(`The ranking is being tuned specifically for ${cuisine}.`);
  }

  if (request.filters.localOnly) {
    parts.push('The ranking is leaning local-first instead of chasing the biggest review count.');
  }

  return parts.join(' ');
}

export function buildWhatWeFound(candidate, evidence) {
  const pieces = [];
  const reviewHighlights = Array.isArray(candidate.reviewHighlights) ? candidate.reviewHighlights : [];
  const reviewLanguage = [
    (candidate.reviews || []).join(' ').trim(),
    reviewHighlights.map((item) => item.text).join(' ').trim()
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const reviewKeywordHits = ['pizza', 'steak', 'burger', 'italian', 'bbq', 'sushi', 'taco', 'mexican', 'coffee', 'breakfast'].filter((term) =>
    reviewLanguage.toLowerCase().includes(term)
  );
  if (candidate.phone) pieces.push('phone verified');
  if (candidate.website) pieces.push('website verified');
  if (candidate.openNow != null) pieces.push(candidate.openNow ? 'open now status available' : 'hours/status available');
  if (candidate.reviewCount != null) pieces.push(`${candidate.reviewCount.toLocaleString()} reviews`);
  if (reviewHighlights.length) pieces.push(`${reviewHighlights.length} review highlight${reviewHighlights.length === 1 ? '' : 's'}`);
  if (evidence.some((item) => item.sourceType === 'official_site')) pieces.push('official site corroboration');
  if (evidence.some((item) => item.sourceType === 'facebook')) pieces.push('social activity check');
  if (evidence.some((item) => item.sourceType === 'local_news' || item.sourceType === 'local_blog')) pieces.push('local write-up check');
  if (reviewKeywordHits.length) pieces.push(`review language around ${reviewKeywordHits.slice(0, 2).join(' and ')}`);

  if (!pieces.length) {
    return 'Verified business identity from the web search bundle, with limited extra evidence available. Please call ahead if you need the latest hours or menu details.';
  }

  return `We found ${pieces.join(', ')}.`;
}

export function rankCandidates({ request, intent = null, candidates, corroborated = [] }) {
  const corroborationMap = new Map(corroborated.map((entry) => [entry.placeId, entry]));
  const ratings = candidates
    .map((candidate) => candidate.rating)
    .filter((rating) => Number.isFinite(rating));
  const averageRating = ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
  const ranked = candidates
    .map((candidate) => {
      if (isLargeChain(candidate)) {
        return null;
      }
      const corroboration = corroborationMap.get(candidate.placeId);
      const evidence = corroboration?.evidence?.length ? corroboration.evidence : [];
      const tags = new Set([
        ...heuristicTags(candidate, request, evidence),
        ...(Array.isArray(corroboration?.tags) ? corroboration.tags.filter(Boolean) : [])
      ]);
      const confidence = corroboration?.confidence || deriveConfidence(candidate, evidence, request);
      const qualityScore = scoreQuality(candidate, averageRating);
      const intentMatchScore = scoreIntentMatch(candidate, request, intent, evidence);
      const distanceScore = scoreDistance(candidate, request);
      const priceFitScore = scorePriceFit(candidate, request, intent);
      const openNowScore = scoreOpenNow(candidate, request);
      const contextScore = scoreContext(candidate, request, evidence);
      const confidenceScore = scoreByConfidence(confidence, evidence.length, Boolean(candidate.website), Boolean(candidate.phone));
      const evidenceScore = Math.min(12, evidence.length * 2);
      const tagScore = [...tags].reduce((total, tag) => total + (TAG_WEIGHTS[tag] || 0), 0);
      const compositeScore = Math.round(
        0.35 * qualityScore +
        0.20 * intentMatchScore +
        0.15 * distanceScore +
        0.10 * priceFitScore +
        0.10 * openNowScore +
        0.10 * contextScore +
        confidenceScore +
        evidenceScore +
        tagScore
      );

      return {
        ...candidate,
        score: Math.max(0, compositeScore),
        confidence,
        tags: [...tags],
        whyThisIsAFit:
          corroboration?.whyThisIsAFit ||
          buildWhyThisIsAFit(candidate, request, evidence, [...tags]),
        whatWeFound:
          corroboration?.whatWeFound ||
          buildWhatWeFound(candidate, evidence),
        evidence
      };
    })
    .filter(Boolean);

  ranked.sort((a, b) => {
    if (a.confidence === b.confidence) return b.score - a.score;
    const rank = { high: 3, medium: 2, limited: 1 };
    return (rank[b.confidence] || 1) - (rank[a.confidence] || 1);
  });

  return ranked;
}

export function applyCuisineGate(ranked, request, intent = null) {
  if (!Array.isArray(ranked) || !ranked.length) {
    return { results: [], warnings: [] };
  }

  const profile = getCuisineProfile(normalizeText(request?.filters?.cuisine) || normalizeText(intent?.inferredCuisine));
  if (!profile) {
    return { results: ranked, warnings: [] };
  }

  const classified = ranked.map((candidate) => ({
    candidate,
    match: classifyCuisineCandidate(candidate, request, intent, candidate?.evidence || [])
  }));
  const strictMatches = classified.filter(({ match }) => match.profile && match.exact && !match.blocked).map(({ candidate }) => candidate);
  if (strictMatches.length) {
    const secondaryMatches = classified
      .filter(({ match }) => match.profile && match.soft && !match.exact && !match.blocked)
      .map(({ candidate }) => candidate);
    return {
      results: [...strictMatches, ...secondaryMatches],
      warnings: [
        `Showing verified ${profile.label} matches first.`,
        secondaryMatches.length ? `A few closely related verified options are shown underneath the exact ${profile.label} matches.` : null
      ].filter(Boolean)
    };
  }

  const softMatches = classified.filter(({ match }) => match.profile && match.soft && !match.blocked).map(({ candidate }) => candidate);
  if (softMatches.length) {
    return {
      results: softMatches,
      warnings: [`No verified exact ${profile.label} match was found, so 618FOOD.COM is showing the closest related options.`]
    };
  }

  return {
    results: ranked,
    warnings: [`No verified ${profile.label} match was found, so 618FOOD.COM is showing the closest verified options.`]
  };
}

function bucketCandidate(candidates, predicate) {
  return candidates.find((candidate) => predicate(candidate)) || null;
}

export function buildResultBuckets(ranked, request = null, intent = null) {
  if (!Array.isArray(ranked) || !ranked.length) return [];

  const buckets = [];
  const seen = new Set();
  const addBucket = (id, title, description, candidate) => {
    if (!candidate || seen.has(candidate.placeId)) return;
    seen.add(candidate.placeId);
    buckets.push({
      id,
      title,
      description,
      placeId: candidate.placeId,
      name: candidate.name,
      score: candidate.score,
      confidence: candidate.confidence,
      tags: candidate.tags
    });
  };

  const topOverall = ranked[0];
  addBucket('best-overall', 'Best overall', 'Strongest verified match across the current search.', topOverall);

  const valueBucket = bucketCandidate(
    ranked,
    (candidate) =>
      candidate.priceLevel <= 2 &&
      candidate.confidence !== 'limited' &&
      (candidate.tags.includes('budget-friendly') || candidate.score >= 65)
  ) || ranked.find((candidate) => candidate.priceLevel <= 2 && candidate.confidence !== 'limited');
  addBucket('best-value', 'Best value', 'Good match with a friendly price level.', valueBucket);

  const closestBucket = bucketCandidate(
    ranked,
    (candidate) => candidate.distanceMiles != null && candidate.distanceMiles <= Math.max(6, (request?.radiusMiles || 18) * 0.4) && candidate.score >= 55
  ) || ranked.find((candidate) => candidate.distanceMiles != null && candidate.score >= 55);
  addBucket('closest-good-option', 'Closest good option', 'The nearest verified place that still looks like a solid fit.', closestBucket);

  const preference = normalizeText(intent?.preference);
  const upscaleBucket = bucketCandidate(
    ranked,
    (candidate) =>
      (candidate.priceLevel >= 3 || candidate.tags.includes('date-night')) &&
      (preference === 'upscale' || preference === 'romantic' || preference === 'best overall') &&
      candidate.score >= 55
  ) || ranked.find((candidate) => (candidate.priceLevel >= 3 || candidate.tags.includes('date-night')) && candidate.score >= 55);
  addBucket('best-upscale-option', 'Best upscale option', 'The strongest higher-end or date-night-friendly match.', upscaleBucket);

  return buckets;
}

export function buildAudioSummary(request, results) {
  if (!results.length) {
    return `${FOOD_BRAND} found no verified places within your selected area yet. Try a nearby town, a ZIP code, or a slightly wider radius to widen the net.`;
  }

  const top = results[0];
  const scope = request.location?.label || request.destinationText || 'your search area';
  const category = top.categories?.[0] ? top.categories[0].toLowerCase() : 'local spot';
  const distance = typeof top.distanceMiles === 'number' ? `about ${top.distanceMiles.toFixed(1)} miles away` : 'close by';
  const localSignals = [];
  if (top.tags?.includes('locals-love-it')) localSignals.push('locals seem to love it');
  if (top.tags?.includes('hidden-gem')) localSignals.push('it has hidden-gem energy');
  if (top.tags?.includes('worth-the-drive')) localSignals.push('it is worth the drive');
  if (top.openNow === true) localSignals.push('it is open now');

  const fitLine = localSignals.length
    ? ` It stands out because ${localSignals.slice(0, 2).join(' and ')}.`
    : ' It is the strongest verified local match in the current search.';

  return `${FOOD_BRAND}'s number one pick near ${scope} is ${top.name}, a ${category} ${distance}.${fitLine}`;
}
