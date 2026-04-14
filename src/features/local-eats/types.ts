export type MealType = 'any' | 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'coffee';

export type SearchMode = 'nearby' | 'destination' | 'traveler' | 'surprise';

export type ConfidenceLevel = 'high' | 'medium' | 'limited';

export type BudgetLevel = 'any' | 'budget' | 'mid' | 'splurge';

export type SourceType =
  | 'google_places'
  | 'official_site'
  | 'facebook'
  | 'instagram'
  | 'local_news'
  | 'local_blog'
  | 'tourism_page'
  | 'ordering_page'
  | 'reservation_page'
  | 'community_discussion'
  | 'other';

export type Freshness = 'fresh' | 'recent' | 'stale' | 'unknown';

export type LocalSignalTag =
  | 'hidden-gem'
  | 'locals-love-it'
  | 'worth-the-drive'
  | 'breakfast-favorite'
  | 'family-friendly'
  | 'patio'
  | 'quick-casual'
  | 'date-night'
  | 'open-now'
  | 'dog-friendly'
  | 'budget-friendly'
  | 'verified'
  | 'preview';

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
  source?: 'browser' | 'manual' | 'ip' | 'unknown';
}

export interface SearchFilters {
  localOnly: boolean;
  openNow: boolean;
  dogFriendly: boolean;
  patio: boolean;
  familyFriendly: boolean;
  quickBite: boolean;
  dateNight: boolean;
  worthTheDrive: boolean;
  budget: BudgetLevel;
  cuisine: string;
}

export interface SearchRequest {
  query: string;
  destinationText: string;
  location?: GeoPoint | null;
  mealType: MealType;
  mode: SearchMode;
  radiusMiles: number;
  filters: SearchFilters;
  demo?: boolean;
}

export interface FoodPlaceCandidate {
  placeId: string;
  name: string;
  formattedAddress?: string;
  city?: string;
  phone?: string;
  website?: string;
  mapsUrl: string;
  categories: string[];
  openNow?: boolean | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceLevel?: number | null;
  coordinates?: GeoPoint | null;
  businessStatus?: string;
  reviews?: string[];
  reviewHighlights?: Array<{
    text: string;
    rating?: number | null;
    relativeTime?: string;
    author?: string;
  }>;
  distanceMiles?: number | null;
}

export interface EvidenceItem {
  sourceType: SourceType;
  title: string;
  url: string;
  snippet: string;
  freshness: Freshness;
  notes?: string;
  consistent: boolean;
}

export interface RankedRestaurant extends FoodPlaceCandidate {
  score: number;
  confidence: ConfidenceLevel;
  tags: LocalSignalTag[];
  whyThisIsAFit: string;
  whatWeFound: string;
  evidence: EvidenceItem[];
}

export interface SearchResponse {
  intentSummary: string;
  results: RankedRestaurant[];
  warnings: string[];
  audioSummary: string;
  buckets?: SearchBucket[];
  hasLiveData: boolean;
  sourceMode: 'live' | 'demo' | 'empty';
}

export interface SearchBucket {
  id: 'best-overall' | 'best-value' | 'closest-good-option' | 'best-upscale-option' | string;
  title: string;
  description: string;
  placeId: string;
  name: string;
  score: number;
  confidence: ConfidenceLevel;
  tags: LocalSignalTag[];
}

export interface FoodAssistantSource {
  title: string;
  url: string;
}

export interface FoodAssistantResponse {
  action: 'answer' | 'search';
  reply: string;
  sources: FoodAssistantSource[];
  searchRequest?: Partial<SearchRequest> | null;
}

export interface LiveSearchState {
  query: string;
  destinationText: string;
  mealType: MealType;
  mode: SearchMode;
  radiusMiles: number;
  filters: SearchFilters;
}
