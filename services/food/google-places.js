const GOOGLE_PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

function milesToMeters(miles) {
  return Math.max(1000, Math.round(miles * 1609.34));
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function buildFoodQueries(request) {
  const cuisine = normalizeText(request.filters?.cuisine);
  const mealType = normalizeText(request.mealType);
  const destination = normalizeText(request.destinationText);
  const query = normalizeText(request.query);

  const mealHints = {
    breakfast: ['breakfast', 'diner', 'coffee', 'cafe'],
    lunch: ['lunch', 'sandwich', 'deli', 'cafe'],
    dinner: ['restaurant', 'dinner', 'bbq', 'steak', 'pizza'],
    dessert: ['dessert', 'ice cream', 'bakery', 'sweet shop'],
    coffee: ['coffee', 'cafe', 'espresso', 'bakery']
  };

  const hints = mealType && mealHints[mealType] ? mealHints[mealType] : ['restaurant', 'diner', 'cafe'];
  const baseQuery = query || destination || 'local restaurants';
  const searches = [
    baseQuery,
    `${baseQuery} ${hints[0]}`,
    `${baseQuery} ${hints[1]}`,
    cuisine ? `${baseQuery} ${cuisine}` : null,
    request.filters?.worthTheDrive ? `${baseQuery} worth the drive` : null,
    request.filters?.localOnly ? `${baseQuery} locally owned` : null
  ];

  return [...new Set(searches.filter(Boolean).map((item) => item.trim()))].slice(0, 5);
}

export async function searchGooglePlaces(request, apiKey) {
  const location = request.location && Number.isFinite(request.location.lat) && Number.isFinite(request.location.lng)
    ? request.location
    : null;
  const radiusMeters = milesToMeters(request.radiusMiles || 18);
  const queries = buildFoodQueries(request);
  const allCandidates = [];

  for (const searchQuery of queries) {
    const url = location
      ? new URL(`${GOOGLE_PLACES_BASE}/nearbysearch/json`)
      : new URL(`${GOOGLE_PLACES_BASE}/textsearch/json`);

    if (location) {
      url.searchParams.set('location', `${location.lat},${location.lng}`);
      url.searchParams.set('radius', String(radiusMeters));
      url.searchParams.set('type', 'restaurant');
      url.searchParams.set('keyword', searchQuery);
    } else {
      url.searchParams.set('query', searchQuery);
      url.searchParams.set('region', 'us');
    }

    url.searchParams.set('key', apiKey);

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places search failed (${data.status || response.status})`);
    }

    for (const place of data.results || []) {
      allCandidates.push({
        placeId: place.place_id,
        name: place.name,
        place,
        searchQuery
      });
    }
  }

  const deduped = new Map();
  for (const candidate of allCandidates) {
    if (!candidate.placeId || deduped.has(candidate.placeId)) continue;
    deduped.set(candidate.placeId, candidate);
  }

  return [...deduped.values()];
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

