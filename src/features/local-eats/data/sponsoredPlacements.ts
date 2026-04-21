import type { RestaurantAgentRestaurant, SponsoredPlacement } from '../types';

const SPONSORED_PLACEMENTS: SponsoredPlacement[] = [
  {
    id: 'casa-raya',
    restaurantName: 'Casa Raya Mexican Restaurant & Taqueria',
    title: 'Casa Raya Mexican Restaurant & Taqueria',
    tagline: 'Authentic flavor. Made fresh. Made for you.',
    callToAction: 'Visit website',
    website: 'https://casarayatogo.com',
    aliases: [
      'Casa Raya',
      'Casa Raya Mexican Restaurant Taqueria',
      'Casa Raya Mexican Restaurant & Taqueria, Mt Vernon IL'
    ]
  }
];

function normalizePlacementText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function restaurantMatchesPlacement(restaurant: RestaurantAgentRestaurant, placement: SponsoredPlacement): boolean {
  const name = normalizePlacementText(restaurant.name || '');
  const title = normalizePlacementText(placement.restaurantName || placement.title || '');
  const aliases = (placement.aliases || []).map(normalizePlacementText).filter(Boolean);
  const candidates = [title, ...aliases].filter(Boolean);

  if (!name || !candidates.length) return false;

  return candidates.some((candidate) => {
    return (
      name === candidate ||
      name.includes(candidate) ||
      candidate.includes(name) ||
      name.split(' ').every((token) => candidate.includes(token))
    );
  });
}

export function findSponsoredPlacement(restaurants: RestaurantAgentRestaurant[] | undefined): {
  placement: SponsoredPlacement;
  restaurant: RestaurantAgentRestaurant;
} | null {
  if (!Array.isArray(restaurants) || !restaurants.length) return null;

  for (const placement of SPONSORED_PLACEMENTS) {
    const matchedRestaurant = restaurants.find((restaurant) => restaurantMatchesPlacement(restaurant, placement));
    if (matchedRestaurant) {
      return {
        placement,
        restaurant: matchedRestaurant
      };
    }
  }

  return null;
}

export { SPONSORED_PLACEMENTS };
