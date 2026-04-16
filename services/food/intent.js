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

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeComparable(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function assumeIllinoisLocationText(value) {
  const text = normalizeText(value);
  if (!text) return '';
  if (/\b\d{5}(?:-\d{4})?\b/.test(text)) return text;
  if (/[A-Za-z]+\s*,\s*[A-Za-z]{2}\b/.test(text)) return text;
  if (/\b(?:illinois|indiana|missouri|kentucky|tennessee|ohio|arkansas|iowa|wisconsin|michigan)\b/i.test(text)) return text;
  if (/\b(?:il|in|mo|ky|tn|oh|ar|ia|wi|mi)\b/i.test(text)) return text;
  return `${text}, IL`;
}

function looksLikeLocationQuery(value) {
  const text = normalizeText(value);
  if (!text) return false;
  if (/\b\d{5}(?:-\d{4})?\b/.test(text)) return true;
  if (/[A-Za-z]+\s*,\s*[A-Za-z]{2}\b/.test(text)) return true;
  if (/[A-Za-z]{2}\s+\d{5}(?:-\d{4})?$/.test(text)) return true;
  const normalized = normalizeComparable(text);
  if (!normalized) return false;
  if (
    /\b(pizza|pizzeria|burger|burgers|hamburger|hamburgers|bbq|barbecue|barbeque|steak|steakhouse|taco|tacos|burrito|burritos|sushi|ramen|coffee|cafe|café|breakfast|brunch|dessert|bakery|diner|restaurant|grill|grille|sandwich|deli|sub|subs)\b/i.test(text)
  ) {
    return false;
  }
  return text.length >= 3 && text.length <= 64 && /[A-Za-z]/.test(text);
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
  const embeddedZip = query.match(/\b\d{5}(?:-\d{4})?\b/)?.[0] || '';
  const queryLooksLikeLocation = looksLikeLocationQuery(query) && !inferCuisineFromText(query);
  const querySubject =
    split.subject ||
    (queryLooksLikeLocation ? '' : query.replace(/\b\d{5}(?:-\d{4})?\b/g, ' ').replace(/\s+/g, ' ').trim()) ||
    query;
  const queryLocation = split.location || embeddedZip || (queryLooksLikeLocation ? query : '');
  const destinationLikeLocation = looksLikeLocationQuery(destinationText) ? destinationText : '';
  const inferredLocation = assumeIllinoisLocationText(destinationLikeLocation || queryLocation);
  const inferredCuisine = inferCuisineFromText([querySubject, destinationText].filter(Boolean).join(' '));
  const preference = inferPreferenceFromText([query, destinationText, inferredCuisine].filter(Boolean).join(' '));

  return {
    querySubject,
    queryLocation,
    inferredLocation,
    inferredCuisine,
    preference,
    looksLikeLocationQuery
  };
}

export function describeFoodIntent(request) {
  const intent = inferFoodIntent(request);
  const parts = [];
  if (request?.mealType && request.mealType !== 'any') parts.push(request.mealType);
  if (request?.filters?.cuisine || intent.inferredCuisine) parts.push(request.filters?.cuisine || intent.inferredCuisine);
  if (request?.filters?.openNow) parts.push('open now');
  if (request?.filters?.localOnly) parts.push('local-first');
  if (request?.filters?.worthTheDrive) parts.push('worth the drive');
  if (request?.destinationText) parts.push(`for ${request.destinationText}`);
  if (request?.location?.label) parts.push(`near ${request.location.label}`);
  if (!parts.length) return 'Ready to search for local food.';
  return `Search tuned for ${parts.join(', ')}.`;
}

export function buildFoodSearchPromptHints(request) {
  const intent = inferFoodIntent(request);
  return {
    querySubject: intent.querySubject,
    inferredLocation: intent.inferredLocation,
    inferredCuisine: intent.inferredCuisine,
    preference: intent.preference,
    destinationText: normalizeText(request?.destinationText),
    query: normalizeText(request?.query)
  };
}

export function normalizeComparableText(value) {
  return normalizeComparable(value);
}
