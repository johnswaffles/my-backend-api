import type { SearchResponse } from '../types';

export const DEMO_SEARCH_RESPONSE: SearchResponse = {
  intentSummary:
    'Preview mode is showing the layout and evidence style until live OpenAI web-search and narration settings are connected.',
  hasLiveData: false,
  sourceMode: 'demo',
  warnings: [
    'This is preview data only. Connect OpenAI search and narration settings to load verified restaurant results.'
  ],
  audioSummary:
    'Preview mode is active. Once live data is connected, 618FOOD.COM will read a short summary of verified local spots aloud.',
  results: [
    {
      placeId: 'demo-1',
      name: '618FOOD.COM Preview Diner',
      formattedAddress: 'Preview only • connect live sources to replace this card',
      city: 'Southern Illinois',
      phone: '(000) 000-0000',
      website: 'https://example.com',
      mapsUrl: 'https://www.openstreetmap.org',
      categories: ['Diner', 'Preview'],
      openNow: true,
      rating: 4.8,
      reviewCount: 128,
      priceLevel: 1,
      distanceMiles: 3.4,
      score: 92,
      confidence: 'medium',
      tags: ['preview', 'hidden-gem', 'locals-love-it', 'breakfast-favorite'],
      whyThisIsAFit:
        'Preview card showing the kind of explainable result layout 618FOOD.COM will render once live data is connected.',
      whatWeFound:
        'Sample preview content only. This card exists to demonstrate ranking, confidence, and evidence formatting.',
      evidence: [
        {
          sourceType: 'other',
          title: 'Preview fixture',
          url: 'https://example.com',
          snippet: 'Demo data for layout validation.',
          freshness: 'unknown',
          consistent: true
        }
      ]
    },
    {
      placeId: 'demo-2',
      name: 'Preview Smokehouse',
      formattedAddress: 'Preview only • not a real recommendation',
      city: 'Local route sample',
      phone: '(000) 000-0000',
      website: 'https://example.com',
      mapsUrl: 'https://www.openstreetmap.org',
      categories: ['BBQ', 'Preview'],
      openNow: false,
      rating: 4.7,
      reviewCount: 84,
      priceLevel: 2,
      distanceMiles: 9.1,
      score: 87,
      confidence: 'medium',
      tags: ['preview', 'worth-the-drive', 'locals-love-it'],
      whyThisIsAFit:
        'Preview layout for a rural-favorite style result with tags and explainability.',
      whatWeFound:
        'Mock card for testing the evidence block, actions, and compact summary areas.',
      evidence: [
        {
          sourceType: 'other',
          title: 'Preview fixture',
          url: 'https://example.com',
          snippet: 'Placeholder for local web corroboration.',
          freshness: 'unknown',
          consistent: true
        }
      ]
    },
    {
      placeId: 'demo-3',
      name: 'Preview Coffee House',
      formattedAddress: 'Preview only • live data will replace this',
      city: 'Route side stop',
      phone: '(000) 000-0000',
      website: 'https://example.com',
      mapsUrl: 'https://www.openstreetmap.org',
      categories: ['Coffee', 'Preview'],
      openNow: true,
      rating: 4.9,
      reviewCount: 56,
      priceLevel: 2,
      distanceMiles: 15.7,
      score: 85,
      confidence: 'limited',
      tags: ['preview', 'quick-casual'],
      whyThisIsAFit:
        'A compact preview card for coffee and quick-bite discovery on the 618FOOD.COM home screen.',
      whatWeFound:
        'Demo-only content demonstrating map links, confidence, and summary blocks.',
      evidence: [
        {
          sourceType: 'other',
          title: 'Preview fixture',
          url: 'https://example.com',
          snippet: 'Placeholder to show limited confidence styling.',
          freshness: 'unknown',
          consistent: true
        }
      ]
    }
  ]
};
