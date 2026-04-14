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
  'target'
];

function normalizeComparable(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
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

function scoreByRelevance(candidate, request) {
  let score = 0;
  const text = normalizeText(
    [
      candidate.name,
      candidate.formattedAddress,
      candidate.city,
      candidate.categories.join(' ')
    ].join(' ')
  );
  const cuisine = normalizeText(request.filters.cuisine);
  const query = normalizeText(request.query);
  const destination = normalizeText(request.destinationText);

  if (request.filters.openNow && candidate.openNow === true) score += 10;
  if (candidate.rating != null) score += Math.min(10, candidate.rating * 2);
  if (candidate.reviewCount != null) score += Math.min(10, Math.log10(Math.max(candidate.reviewCount, 1)) * 6);
  if (candidate.distanceMiles != null) score += Math.max(0, 12 - candidate.distanceMiles);
  if (request.filters.localOnly && candidate.reviewCount != null && candidate.reviewCount < 500) score += 8;
  if (request.filters.worthTheDrive && candidate.distanceMiles != null && candidate.distanceMiles >= 10) score += 4;
  if (request.mealType !== 'any' && hasKeyword(text, [request.mealType])) score += 8;
  if (cuisine && hasKeyword(text, [cuisine])) score += 8;
  if (query && hasKeyword(text, query.split(/\s+/).filter(Boolean))) score += 4;
  if (destination && hasKeyword(text, destination.split(/\s+/).filter(Boolean))) score += 3;
  if (request.filters.familyFriendly && hasKeyword(text, ['family', 'family-friendly', 'family style'])) score += 4;
  if (request.filters.quickBite && hasKeyword(text, ['fast', 'quick', 'counter', 'casual'])) score += 4;
  if (request.filters.dateNight && hasKeyword(text, ['cozy', 'wine', 'patio', 'bistro'])) score += 4;
  if (request.filters.dogFriendly && hasKeyword(text, ['dog'])) score += 4;
  if (request.filters.patio && hasKeyword(text, ['patio', 'outdoor'])) score += 4;
  if (candidate.priceLevel === 1) score += 3;
  if (candidate.priceLevel === 2) score += 2;
  return score;
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

  if (request.filters.openNow && candidate.openNow === true) reasons.push('open now');
  if (candidate.rating != null) reasons.push(`strong Google Places rating (${candidate.rating.toFixed(1)})`);
  if (candidate.reviewCount != null) reasons.push(`${candidate.reviewCount.toLocaleString()} reviews`);
  if (tags.includes('locals-love-it')) reasons.push('local-favorite signals');
  if (tags.includes('hidden-gem')) reasons.push('small-town hidden-gem profile');
  if (tags.includes('worth-the-drive')) reasons.push('worth-the-drive language or distance');
  if (tags.includes('breakfast-favorite')) reasons.push('breakfast energy');
  if (tags.includes('family-friendly')) reasons.push('family-friendly fit');
  if (tags.includes('quick-casual')) reasons.push('quick casual stop');
  if (tags.includes('date-night')) reasons.push('date-night vibe');

  if (evidence.length) {
    parts.push(`Verified by Google Places and corroborated with ${evidence.length} supporting signal${evidence.length === 1 ? '' : 's'}.`);
  } else {
    parts.push('Verified on Google Places, but corroborating web signals were limited.');
  }

  if (reasons.length) {
    parts.push(`This looks like a fit because it has ${reasons.slice(0, 3).join(', ')}.`);
  }

  if (request.filters.localOnly) {
    parts.push('The ranking is leaning local-first instead of chasing the biggest review count.');
  }

  return parts.join(' ');
}

export function buildWhatWeFound(candidate, evidence) {
  const pieces = [];
  if (candidate.phone) pieces.push('phone verified');
  if (candidate.website) pieces.push('website verified');
  if (candidate.openNow != null) pieces.push(candidate.openNow ? 'open now status available' : 'hours/status available');
  if (candidate.reviewCount != null) pieces.push(`${candidate.reviewCount.toLocaleString()} Google reviews`);
  if (evidence.some((item) => item.sourceType === 'official_site')) pieces.push('official site corroboration');
  if (evidence.some((item) => item.sourceType === 'facebook')) pieces.push('social activity check');
  if (evidence.some((item) => item.sourceType === 'local_news' || item.sourceType === 'local_blog')) pieces.push('local write-up check');

  if (!pieces.length) {
    return 'Verified business identity from Google Places, with limited extra evidence available.';
  }

  return `We found ${pieces.join(', ')}.`;
}

export function rankCandidates({ request, candidates, corroborated = [] }) {
  const corroborationMap = new Map(corroborated.map((entry) => [entry.placeId, entry]));
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
      const heuristicScore = scoreByRelevance(candidate, request);
      const confidenceScore = scoreByConfidence(confidence, evidence.length, Boolean(candidate.website), Boolean(candidate.phone));
      const evidenceScore = Math.min(16, evidence.length * 3);
      const tagScore = [...tags].reduce((total, tag) => total + (TAG_WEIGHTS[tag] || 0), 0);

      return {
        ...candidate,
        score: Math.max(0, Math.round(heuristicScore + confidenceScore + evidenceScore + tagScore)),
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

export function buildAudioSummary(request, results) {
  if (!results.length) {
    return `${FOOD_BRAND} found no verified places within your selected area yet. Try a nearby town, a ZIP code, or a slightly wider radius to widen the net.`;
  }

  const top = results.slice(0, 3).map((result) => result.name).filter(Boolean);
  const scope = request.location?.label || request.destinationText || 'your search area';
  const cuisine = request.filters.cuisine || '';
  const query = request.query || '';
  const searchTopic = cuisine || query || 'local food';

  return `${FOOD_BRAND} found ${results.length} verified ${results.length === 1 ? 'spot' : 'spots'} near ${scope} for ${searchTopic}. The strongest local matches are ${top.join('; ')}.`;
}
