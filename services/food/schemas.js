export const FOOD_BRAND = '618FOOD.COM';

export const SEARCH_FILTER_KEYS = [
  'localOnly',
  'openNow',
  'dogFriendly',
  'patio',
  'familyFriendly',
  'quickBite',
  'dateNight',
  'worthTheDrive'
];

export const DEFAULT_SEARCH_FILTERS = {
  localOnly: true,
  openNow: false,
  dogFriendly: false,
  patio: false,
  familyFriendly: false,
  quickBite: false,
  dateNight: false,
  worthTheDrive: false,
  budget: 'any',
  cuisine: ''
};

export const SEARCH_REQUEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['query', 'destinationText', 'mealType', 'mode', 'radiusMiles', 'filters'],
  properties: {
    query: { type: 'string' },
    destinationText: { type: 'string' },
    location: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['lat', 'lng'],
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        label: { type: 'string' },
        source: { type: 'string' }
      }
    },
    mealType: {
      type: 'string',
      enum: ['any', 'breakfast', 'lunch', 'dinner', 'dessert', 'coffee']
    },
    mode: {
      type: 'string',
      enum: ['nearby', 'destination', 'traveler', 'surprise']
    },
    radiusMiles: { type: 'number' },
    filters: {
      type: 'object',
      additionalProperties: false,
      required: [
        'localOnly',
        'openNow',
        'dogFriendly',
        'patio',
        'familyFriendly',
        'quickBite',
        'dateNight',
        'worthTheDrive',
        'budget',
        'cuisine'
      ],
      properties: {
        localOnly: { type: 'boolean' },
        openNow: { type: 'boolean' },
        dogFriendly: { type: 'boolean' },
        patio: { type: 'boolean' },
        familyFriendly: { type: 'boolean' },
        quickBite: { type: 'boolean' },
        dateNight: { type: 'boolean' },
        worthTheDrive: { type: 'boolean' },
        budget: { type: 'string', enum: ['any', 'budget', 'mid', 'splurge'] },
        cuisine: { type: 'string' }
      }
    },
    demo: { type: 'boolean' }
  }
};

export const SEARCH_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intentSummary', 'results', 'warnings', 'audioSummary', 'hasLiveData', 'sourceMode'],
  properties: {
    intentSummary: { type: 'string' },
    results: { type: 'array' },
    warnings: { type: 'array' },
    audioSummary: { type: 'string' },
    hasLiveData: { type: 'boolean' },
    sourceMode: { type: 'string', enum: ['live', 'demo', 'empty'] }
  }
};

export function normalizeSearchRequest(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const filters = {
    ...DEFAULT_SEARCH_FILTERS,
    ...(source.filters && typeof source.filters === 'object' ? source.filters : {})
  };

  return {
    query: typeof source.query === 'string' ? source.query.trim() : '',
    destinationText: typeof source.destinationText === 'string' ? source.destinationText.trim() : '',
    location:
      source.location && typeof source.location === 'object'
        ? {
            lat: Number(source.location.lat),
            lng: Number(source.location.lng),
            label: typeof source.location.label === 'string' ? source.location.label : undefined,
            source:
              source.location.source === 'browser' ||
              source.location.source === 'manual' ||
              source.location.source === 'ip'
                ? source.location.source
                : 'unknown'
          }
        : null,
    mealType:
      source.mealType === 'breakfast' ||
      source.mealType === 'lunch' ||
      source.mealType === 'dinner' ||
      source.mealType === 'dessert' ||
      source.mealType === 'coffee'
        ? source.mealType
        : 'any',
    mode:
      source.mode === 'destination' ||
      source.mode === 'traveler' ||
      source.mode === 'surprise'
        ? source.mode
        : 'nearby',
    radiusMiles:
      typeof source.radiusMiles === 'number' && Number.isFinite(source.radiusMiles)
        ? Math.min(50, Math.max(5, source.radiusMiles))
        : 18,
    filters: {
      ...filters,
      localOnly: Boolean(filters.localOnly),
      openNow: Boolean(filters.openNow),
      dogFriendly: Boolean(filters.dogFriendly),
      patio: Boolean(filters.patio),
      familyFriendly: Boolean(filters.familyFriendly),
      quickBite: Boolean(filters.quickBite),
      dateNight: Boolean(filters.dateNight),
      worthTheDrive: Boolean(filters.worthTheDrive),
      budget:
        filters.budget === 'budget' || filters.budget === 'mid' || filters.budget === 'splurge'
          ? filters.budget
          : 'any',
      cuisine: typeof filters.cuisine === 'string' ? filters.cuisine.trim() : ''
    },
    demo: Boolean(source.demo)
  };
}

export function createEmptySearchResponse(intentSummary = 'No search has been run yet.') {
  return {
    intentSummary,
    results: [],
    warnings: [],
    audioSummary: '',
    hasLiveData: false,
    sourceMode: 'empty'
  };
}

export function isSearchRequest(value) {
  return Boolean(value && typeof value === 'object' && value.filters && typeof value.filters === 'object');
}

