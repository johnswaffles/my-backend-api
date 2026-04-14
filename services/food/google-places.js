const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GOOGLE_GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

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
  const cuisine = normalizeText(request.filters?.cuisine);
  const mealType = normalizeText(request.mealType);
  const destination = normalizeText(request.destinationText);
  const query = normalizeText(request.query);
  const locationLikeQuery = looksLikeLocationQuery(query) || looksLikeLocationQuery(destination);

  const mealHints = {
    breakfast: ['breakfast', 'diner', 'coffee', 'cafe'],
    lunch: ['lunch', 'sandwich', 'deli', 'cafe'],
    dinner: ['restaurant', 'dinner', 'bbq', 'steak', 'pizza'],
    dessert: ['dessert', 'ice cream', 'bakery', 'sweet shop'],
    coffee: ['coffee', 'cafe', 'espresso', 'bakery']
  };

  const hints = mealType && mealHints[mealType] ? mealHints[mealType] : ['restaurant', 'diner', 'cafe'];
  const baseQuery = locationLikeQuery ? (cuisine || 'restaurants') : (destination || query || 'local restaurants');
  const locationQueries = locationLikeQuery
    ? [
        cuisine ? `${cuisine} restaurant` : 'restaurant',
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
  const locationLikeRequest = looksLikeLocationQuery(request.destinationText) || looksLikeLocationQuery(request.query);
  let resolvedLocation = location;
  let geocodeWarning = '';
  try {
    if (!resolvedLocation && looksLikeLocationQuery(request.destinationText)) {
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
        url.searchParams.set('radius', String(Math.min(radiusMeters, locationLikeRequest ? milesToMeters(50) : radiusMeters)));
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
    warnings
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
