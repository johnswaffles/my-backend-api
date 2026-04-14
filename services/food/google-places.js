const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

const FOOD_CUISINE_ALIASES = [
  { terms: ['pasta', 'italian', 'lasagna', 'spaghetti', 'ravioli', 'fettuccine', 'marinara'], cuisine: 'Italian' },
  { terms: ['pizza', 'pizzeria', 'calzone', 'stromboli'], cuisine: 'pizza' },
  { terms: ['burger', 'burgers', 'hamburger', 'hamburgers', 'cheeseburger', 'cheeseburgers'], cuisine: 'burgers' },
  { terms: ['bbq', 'barbecue', 'barbeque', 'smoked', 'smokehouse'], cuisine: 'BBQ' },
  { terms: ['taco', 'tacos', 'burrito', 'burritos', 'quesadilla', 'mexican'], cuisine: 'Mexican' },
  { terms: ['sushi', 'ramen', 'japanese', 'hibachi'], cuisine: 'Japanese' },
  { terms: ['chinese', 'dumpling', 'noodle', 'lo mein'], cuisine: 'Chinese' },
  { terms: ['thai'], cuisine: 'Thai' },
  { terms: ['seafood', 'fish fry', 'catfish', 'shrimp'], cuisine: 'seafood' },
  { terms: ['steak', 'steakhouse', 'prime rib', 'ribeye', 't-bone', 'sirloin', 'filet', 'porterhouse', 'chophouse', 'chop house', 'grill', 'grille', 'roadhouse'], cuisine: 'Steakhouse' },
  { terms: ['deli', 'sandwich', 'subs', 'sub', 'hoagie'], cuisine: 'deli' },
  { terms: ['coffee', 'espresso', 'latte', 'cafe', 'café'], cuisine: 'coffee' },
  { terms: ['breakfast', 'brunch', 'pancake', 'pancakes', 'biscuits', 'omelet', 'omelette'], cuisine: 'breakfast' },
  { terms: ['dessert', 'ice cream', 'bakery', 'pie', 'sweet'], cuisine: 'dessert' }
];

const FOOD_PREFERENCE_ALIASES = [
  { terms: ['best overall', 'best', 'top pick', 'overall'], preference: 'best overall' },
  { terms: ['best value', 'value', 'cheap', 'affordable', 'budget', 'inexpensive'], preference: 'value' },
  { terms: ['upscale', 'fine dining', 'fancy', 'elevated', 'premium'], preference: 'upscale' },
  { terms: ['casual', 'laid back', 'laid-back', 'easygoing'], preference: 'casual' },
  { terms: ['romantic', 'date night', 'date-night'], preference: 'romantic' },
  { terms: ['quiet', 'calm', 'peaceful', 'low key', 'low-key'], preference: 'quiet' }
];

const LOCATION_JOINERS = /\b(?:in|near|around|at|toward|to|by)\b/i;

function milesToMeters(miles) {
  return Math.max(1000, Math.round(miles * 1609.34));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function looksLikeLocationQuery(value) {
  const text = normalizeText(value);
  if (!text) return false;
  if (/\b\d{5}(?:-\d{4})?\b/.test(text)) return true;
  if (/[A-Za-z]+\s*,\s*[A-Za-z]{2}\b/.test(text)) return true;
  if (/[A-Za-z]{2}\s+\d{5}(?:-\d{4})?$/.test(text)) return true;
  return text.length >= 3 && text.length <= 64 && /[A-Za-z]/.test(text) && /\b(il|mo|ky|tn|in|oh|ar)\b/i.test(text);
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function inferCuisineFromText(text) {
  const normalized = normalizeComparable(text);
  for (const item of FOOD_CUISINE_ALIASES) {
    if (item.terms.some((term) => normalized.includes(normalizeComparable(term)))) {
      return item.cuisine;
    }
  }
  return '';
}

function inferPreferenceFromText(text) {
  const normalized = normalizeComparable(text);
  for (const item of FOOD_PREFERENCE_ALIASES) {
    if (item.terms.some((term) => normalized.includes(normalizeComparable(term)))) {
      return item.preference;
    }
  }
  return 'best overall';
}

function splitQueryLocation(value) {
  const text = normalizeText(value);
  if (!text) return { subject: '', location: '' };

  const match = text.match(new RegExp(`^(.*?)\\s+${LOCATION_JOINERS.source}\\s+(.+)$`, 'i'));
  if (match) {
    return {
      subject: normalizeText(match[1]),
      location: normalizeText(match[2])
    };
  }

  return { subject: text, location: '' };
}

export function inferFoodIntent(request) {
  const query = normalizeText(request?.query);
  const destinationText = normalizeText(request?.destinationText);
  const split = splitQueryLocation(query);
  const querySubject = split.subject || query;
  const queryLocation = split.location;
  const destinationLikeLocation = looksLikeLocationQuery(destinationText) ? destinationText : '';
  const inferredLocation = destinationLikeLocation || queryLocation;
  const inferredCuisine = inferCuisineFromText([querySubject, destinationText].filter(Boolean).join(' '));
  const preference = inferPreferenceFromText([query, destinationText, inferredCuisine].filter(Boolean).join(' '));

  return {
    querySubject,
    queryLocation,
    inferredLocation,
    inferredCuisine,
    preference
  };
}

async function geocodeSearchText(apiKey, text) {
  const query = normalizeText(text);
  if (!query) return null;

  const url = new URL(GOOGLE_GEOCODE_BASE);
  url.searchParams.set('address', query);
  url.searchParams.set('region', 'us');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.status !== 'OK' || !Array.isArray(data.results) || !data.results.length) {
    const error = new Error(`Google geocode failed (${data.status || response.status})`);
    error.details = data?.error_message || '';
    throw error;
  }

  const first = data.results[0];
  const lat = first?.geometry?.location?.lat;
  const lng = first?.geometry?.location?.lng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: first.formatted_address || query,
    source: 'manual'
  };
}

export function buildFoodQueries(request) {
  const intent = inferFoodIntent(request);
  const cuisine = normalizeText(request.filters?.cuisine) || intent.inferredCuisine;
  const preference = intent.preference;
  const mealType = normalizeText(request.mealType);
  const destination = normalizeText(intent.inferredLocation || request.destinationText);
  const query = normalizeText(intent.querySubject || request.query);
  const locationLikeQuery = Boolean(destination) || looksLikeLocationQuery(request.query) || looksLikeLocationQuery(request.destinationText);

  const mealHints = {
    breakfast: ['breakfast', 'diner', 'coffee', 'cafe'],
    lunch: ['lunch', 'sandwich', 'deli', 'cafe'],
    dinner: ['restaurant', 'dinner', 'bbq', 'steakhouse', 'steak', 'grill', 'chophouse'],
    dessert: ['dessert', 'ice cream', 'bakery', 'sweet shop'],
    coffee: ['coffee', 'cafe', 'espresso', 'bakery']
  };

  const hints = mealType && mealHints[mealType] ? mealHints[mealType] : ['restaurant', 'diner', 'cafe'];
  const steakIntent = /steak|steakhouse|prime rib|ribeye|t-bone|sirloin|filet|porterhouse|chop house|chophouse|grill|grille|roadhouse/i.test(
    [cuisine, query, destination].filter(Boolean).join(' ')
  );
  const steakQueries = steakIntent ? ['steakhouse', 'steak restaurant', 'chophouse', 'grill', 'steak'] : [];
  const preferenceQueries =
    {
      value: ['affordable', 'budget friendly', 'cheap eats', 'value restaurant'],
      upscale: ['fine dining', 'bistro', 'upscale restaurant', 'steakhouse'],
      casual: ['casual restaurant', 'family restaurant', 'comfort food'],
      romantic: ['romantic restaurant', 'date night restaurant', 'cozy restaurant'],
      quiet: ['quiet restaurant', 'cozy restaurant', 'low key restaurant'],
      'best overall': ['best restaurant', 'local favorite', 'popular restaurant']
    }[preference] || [];
  const baseQuery = locationLikeQuery ? (cuisine || query || 'restaurants') : (destination || query || 'local restaurants');
  const locationQueries = locationLikeQuery
    ? [
        cuisine ? `${cuisine} restaurant` : 'restaurant',
        ...steakQueries,
        ...preferenceQueries,
        'restaurants',
        'diner',
        'cafe',
        'bbq'
      ]
    : [
        `restaurants near ${destination || query}`,
        `food near ${destination || query}`,
        `${destination || query} restaurants`
      ];
  const searches = [
    baseQuery,
    ...locationQueries,
    locationLikeQuery ? null : `${baseQuery} ${hints[0]}`,
    locationLikeQuery ? null : `${baseQuery} ${hints[1]}`,
    cuisine && !locationLikeQuery ? `${baseQuery} ${cuisine}` : null,
    request.filters?.worthTheDrive ? `${baseQuery} worth the drive` : null,
    request.filters?.localOnly ? `${baseQuery} locally owned` : null
  ];

  return [...new Set(searches.filter(Boolean).map((item) => item.trim()))].slice(0, 5);
}

export async function searchGooglePlaces(request, apiKey) {
  const location = request.location && Number.isFinite(request.location.lat) && Number.isFinite(request.location.lng)
    ? request.location
    : null;
  const intent = inferFoodIntent(request);
  const locationLikeRequest = Boolean(intent.inferredLocation) || looksLikeLocationQuery(request.destinationText) || looksLikeLocationQuery(request.query);
  let resolvedLocation = location;
  let geocodeWarning = '';
  try {
    if (intent.inferredLocation) {
      resolvedLocation = await geocodeSearchText(apiKey, intent.inferredLocation);
    } else if (!resolvedLocation && looksLikeLocationQuery(request.destinationText)) {
      resolvedLocation = await geocodeSearchText(apiKey, request.destinationText);
    } else if (!resolvedLocation && looksLikeLocationQuery(request.query)) {
      resolvedLocation = await geocodeSearchText(apiKey, request.query);
    }
  } catch (error) {
    const status = String(error?.message || 'unknown');
    const details = typeof error?.details === 'string' && error.details ? ` ${error.details}` : '';
    geocodeWarning = `Google geocode had trouble (${status}).${details}`;
  }
  const radiusMeters = milesToMeters(request.radiusMiles || 18);
  const queries = buildFoodQueries(request);
  const allCandidates = [];
  const warnings = [];

  const searchPlans = resolvedLocation && locationLikeRequest
    ? [
        { kind: 'nearby', searchQuery: '' },
        { kind: 'nearby', searchQuery: intent.inferredCuisine ? `${intent.inferredCuisine} restaurant` : 'restaurant' },
        { kind: 'nearby', searchQuery: 'restaurant' },
        { kind: 'nearby', searchQuery: 'food' },
        { kind: 'nearby', searchQuery: 'cafe' },
        ...queries.map((searchQuery) => ({ kind: 'nearby', searchQuery }))
      ]
    : queries.map((searchQuery) => ({ kind: 'text', searchQuery }));

  for (const plan of searchPlans) {
    try {
      const url = plan.kind === 'nearby'
        ? new URL(`${GOOGLE_PLACES_BASE}/nearbysearch/json`)
        : new URL(`${GOOGLE_PLACES_BASE}/textsearch/json`);

      if (resolvedLocation && plan.kind === 'nearby') {
        url.searchParams.set('location', `${resolvedLocation.lat},${resolvedLocation.lng}`);
        url.searchParams.set('radius', String(radiusMeters));
        url.searchParams.set('type', 'restaurant');
        if (plan.searchQuery) {
          url.searchParams.set('keyword', plan.searchQuery);
        }
      } else {
        url.searchParams.set('query', plan.searchQuery);
        url.searchParams.set('region', 'us');
      }

      url.searchParams.set('key', apiKey);

      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
        const status = data?.status || response.status || 'unknown';
        const detail = data?.error_message ? ` ${data.error_message}` : '';
        warnings.push(`Google Places search had trouble (${status}) for "${plan.searchQuery || 'nearby restaurants'}".${detail}`);
        continue;
      }

      for (const place of data.results || []) {
        allCandidates.push({
          placeId: place.place_id,
          name: place.name,
          place,
          searchQuery: plan.searchQuery
        });
      }
    } catch {
      warnings.push(`Google Places search failed for "${plan.searchQuery || 'nearby restaurants'}".`);
    }
  }

  if (geocodeWarning) {
    warnings.push(geocodeWarning);
  }

  if (!resolvedLocation && (looksLikeLocationQuery(request.destinationText) || looksLikeLocationQuery(request.query))) {
    warnings.push('Google Places could not geocode the requested town or ZIP.');
  }

  const deduped = new Map();
  for (const candidate of allCandidates) {
    if (!candidate.placeId || deduped.has(candidate.placeId)) continue;
    deduped.set(candidate.placeId, candidate);
  }

  return {
    candidates: [...deduped.values()],
    warnings,
    resolvedLocation
  };
}

export async function fetchGooglePlaceDetails(placeId, apiKey) {
  const url = new URL(`${GOOGLE_PLACES_BASE}/details/json`);
  url.searchParams.set(
    'fields',
    [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'website',
      'formatted_phone_number',
      'international_phone_number',
      'opening_hours',
      'price_level',
      'rating',
      'user_ratings_total',
      'url',
      'types',
      'business_status',
      'reviews'
    ].join(',')
  );
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('key', apiKey);

  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.status !== 'OK') {
    throw new Error(`Google Places details failed (${data.status || response.status})`);
  }

  return data.result;
}

export function normalizeGooglePlace(detail, searchSeed = null, request = null) {
  const lat = detail?.geometry?.location?.lat ?? null;
  const lng = detail?.geometry?.location?.lng ?? null;
  const reviews = Array.isArray(detail?.reviews)
    ? detail.reviews
        .map((review) => review?.text)
        .filter((text) => typeof text === 'string' && text.trim())
        .slice(0, 3)
    : [];

  const distanceMiles =
    request?.location && Number.isFinite(lat) && Number.isFinite(lng)
      ? haversineMiles(request.location.lat, request.location.lng, lat, lng)
      : null;

  return {
    placeId: detail.place_id,
    name: detail.name || searchSeed?.name || 'Unknown place',
    formattedAddress: detail.formatted_address || '',
    city: cityFromAddress(detail.formatted_address),
    phone: detail.formatted_phone_number || detail.international_phone_number || '',
    website: detail.website || '',
    mapsUrl: detail.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.name || searchSeed?.name || '')}`,
    categories: Array.isArray(detail.types) ? detail.types.filter(Boolean) : [],
    openNow: detail.opening_hours && typeof detail.opening_hours.open_now === 'boolean'
      ? detail.opening_hours.open_now
      : null,
    rating: typeof detail.rating === 'number' ? detail.rating : null,
    reviewCount: typeof detail.user_ratings_total === 'number' ? detail.user_ratings_total : null,
    priceLevel: typeof detail.price_level === 'number' ? detail.price_level : null,
    coordinates: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    businessStatus: detail.business_status || '',
    reviews,
    distanceMiles
  };
}

function cityFromAddress(address) {
  if (typeof address !== 'string' || !address.trim()) return '';
  const pieces = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (pieces.length >= 2) return pieces[pieces.length - 3] || pieces[pieces.length - 2] || '';
  return '';
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
