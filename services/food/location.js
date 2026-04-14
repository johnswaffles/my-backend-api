const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildUserAgent() {
  return `${process.env.FOOD_USER_AGENT || '618FOOD.COM'} (${process.env.CONTACT_FROM_EMAIL || 'support@618food.com'})`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': buildUserAgent(),
      Referer: 'https://618food.com'
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(`Location lookup failed (${response.status})`);
    error.details = data?.error || data?.display_name || '';
    throw error;
  }

  return data;
}

function labelFromAddress(address = {}) {
  const city = normalizeText(address.city || address.town || address.village || address.municipality);
  const county = normalizeText(address.county);
  const state = normalizeText(address.state_code || address.state);
  const country = normalizeText(address.country_code || address.country);
  const parts = [city, county, state].filter(Boolean);
  if (parts.length) return parts.join(', ');
  if (country) return country.toUpperCase();
  return '';
}

function toLocationResult(point, label, source = 'manual') {
  if (!point) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    label: label || '',
    source
  };
}

export async function geocodeLocationText(text) {
  const query = normalizeText(text);
  if (!query) return null;

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');
  url.searchParams.set('q', query);

  const data = await fetchJson(url);
  if (!Array.isArray(data) || !data.length) return null;
  const first = data[0];
  return toLocationResult({ lat: first.lat, lng: first.lon }, first.display_name || query, 'manual');
}

export async function reverseGeocodePoint(point) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null;

  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(point.lat));
  url.searchParams.set('lon', String(point.lng));
  url.searchParams.set('zoom', '12');

  const data = await fetchJson(url);
  if (!data || typeof data !== 'object') return null;
  return toLocationResult(
    { lat: Number(data.lat), lng: Number(data.lon) },
    labelFromAddress(data.address) || data.display_name || '',
    'browser'
  );
}

export function haversineMiles(lat1, lon1, lat2, lon2) {
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

export async function resolveSearchLocation(request) {
  const requestLocation = request?.location && Number.isFinite(request.location.lat) && Number.isFinite(request.location.lng)
    ? { lat: request.location.lat, lng: request.location.lng, label: normalizeText(request.location.label || ''), source: request.location.source || 'unknown' }
    : null;

  if (requestLocation?.lat != null && requestLocation?.lng != null) {
    const resolved = requestLocation.label
      ? requestLocation
      : (await reverseGeocodePoint(requestLocation)) || requestLocation;
    return { location: resolved, warnings: [] };
  }

  const query = normalizeText(request?.destinationText || request?.query);
  if (!query) return { location: null, warnings: [] };

  try {
    const resolved = await geocodeLocationText(query);
    return { location: resolved, warnings: [] };
  } catch (error) {
    return {
      location: null,
      warnings: [
        `Could not resolve the requested location (${String(error?.message || 'unknown location error')}).`
      ]
    };
  }
}
