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

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  restaurants?: RestaurantAgentRestaurant[];
  featuredWriteup?: string;
}

export interface ChatSource {
  title: string;
  url: string;
}

export interface RestaurantAgentRestaurant {
  name: string;
  rating: number | null;
  review_count: number | null;
  score: number;
  summary: string;
  place_id: string;
  formatted_address?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
  maps_url?: string | null;
  reviews?: string[];
  reviewHighlights?: Array<{
    text: string;
    rating?: number | null;
    relativeTime?: string;
    author?: string;
  }>;
}

export interface GeneralChatRequest {
  message: string;
  history?: ChatTurn[];
  pageContext?: {
    brand?: string;
    pageTitle?: string;
    pageSummary?: string;
    recentLocation?: string;
    recentRestaurants?: Array<{
      place_id?: string;
      name: string;
      formatted_address?: string | null;
      city?: string | null;
      phone?: string | null;
      website?: string | null;
    }>;
  };
}

export interface GeneralChatResponse {
  reply: string;
  sources: ChatSource[];
  restaurants?: RestaurantAgentRestaurant[];
  featuredWriteup?: string;
  requestId?: string;
}

export interface SponsoredPlacement {
  id: string;
  restaurantName: string;
  title: string;
  tagline: string;
  callToAction: string;
  website?: string | null;
  thumbnailUrl?: string | null;
  aliases?: string[];
}

export interface LiveSearchState {
  query: string;
  destinationText: string;
  mealType: MealType;
  mode: SearchMode;
  radiusMiles: number;
  filters: SearchFilters;
}
