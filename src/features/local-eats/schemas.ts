import type { SearchFilters, SearchRequest, SearchResponse } from './types';

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
] as const;

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
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

export const DEFAULT_SEARCH_REQUEST: SearchRequest = {
  query: '',
  destinationText: '',
  location: null,
  mealType: 'any',
  mode: 'nearby',
  radiusMiles: 18,
  filters: DEFAULT_SEARCH_FILTERS,
  demo: false
};

export const SearchRequestSchema = {
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
} as const;

export const SearchResponseSchema = {
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
} as const;

export function isSearchFilters(value: unknown): value is SearchFilters {
  if (!value || typeof value !== 'object') return false;
  const filters = value as Record<string, unknown>;
  return SEARCH_FILTER_KEYS.every((key) => typeof filters[key] === 'boolean')
    && typeof filters.budget === 'string'
    && typeof filters.cuisine === 'string';
}

export function normalizeSearchRequest(raw: unknown): SearchRequest {
  const candidate = (raw && typeof raw === 'object' ? raw : {}) as Partial<SearchRequest> & {
    filters?: Partial<SearchFilters>;
  };

  const filters: SearchFilters = {
    ...DEFAULT_SEARCH_FILTERS,
    ...(candidate.filters && typeof candidate.filters === 'object' ? candidate.filters : {})
  };

  return {
    query: typeof candidate.query === 'string' ? candidate.query.trim() : '',
    destinationText:
      typeof candidate.destinationText === 'string' ? candidate.destinationText.trim() : '',
    location:
      candidate.location && typeof candidate.location === 'object'
        ? {
            lat: Number(candidate.location.lat),
            lng: Number(candidate.location.lng),
            label: typeof candidate.location.label === 'string' ? candidate.location.label : undefined,
            source:
              candidate.location.source === 'browser' ||
              candidate.location.source === 'manual' ||
              candidate.location.source === 'ip'
                ? candidate.location.source
                : 'unknown'
          }
        : null,
    mealType:
      candidate.mealType === 'breakfast' ||
      candidate.mealType === 'lunch' ||
      candidate.mealType === 'dinner' ||
      candidate.mealType === 'dessert' ||
      candidate.mealType === 'coffee'
        ? candidate.mealType
        : 'any',
    mode:
      candidate.mode === 'destination' ||
      candidate.mode === 'traveler' ||
      candidate.mode === 'surprise'
        ? candidate.mode
        : 'nearby',
    radiusMiles:
      typeof candidate.radiusMiles === 'number' && Number.isFinite(candidate.radiusMiles)
        ? Math.min(50, Math.max(5, candidate.radiusMiles))
        : DEFAULT_SEARCH_REQUEST.radiusMiles,
    filters: {
      ...filters,
      localOnly: candidate.filters?.localOnly ?? DEFAULT_SEARCH_FILTERS.localOnly,
      openNow: candidate.filters?.openNow ?? DEFAULT_SEARCH_FILTERS.openNow,
      dogFriendly: candidate.filters?.dogFriendly ?? DEFAULT_SEARCH_FILTERS.dogFriendly,
      patio: candidate.filters?.patio ?? DEFAULT_SEARCH_FILTERS.patio,
      familyFriendly: candidate.filters?.familyFriendly ?? DEFAULT_SEARCH_FILTERS.familyFriendly,
      quickBite: candidate.filters?.quickBite ?? DEFAULT_SEARCH_FILTERS.quickBite,
      dateNight: candidate.filters?.dateNight ?? DEFAULT_SEARCH_FILTERS.dateNight,
      worthTheDrive: candidate.filters?.worthTheDrive ?? DEFAULT_SEARCH_FILTERS.worthTheDrive,
      budget:
        candidate.filters?.budget === 'budget' ||
        candidate.filters?.budget === 'mid' ||
        candidate.filters?.budget === 'splurge'
          ? candidate.filters.budget
          : DEFAULT_SEARCH_FILTERS.budget,
      cuisine:
        typeof candidate.filters?.cuisine === 'string'
          ? candidate.filters.cuisine.trim()
          : DEFAULT_SEARCH_FILTERS.cuisine
    },
    demo: Boolean(candidate.demo)
  };
}

export function createEmptyResponse(intentSummary = 'No search has been run yet.'): SearchResponse {
  return {
    intentSummary,
    results: [],
    warnings: [],
    audioSummary: '',
    hasLiveData: false,
    sourceMode: 'empty'
  };
}

