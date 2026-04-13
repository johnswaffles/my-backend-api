import type { ConfidenceLevel, RankedRestaurant } from '../types';

export function formatMiles(distanceMiles?: number | null): string {
  if (typeof distanceMiles !== 'number' || !Number.isFinite(distanceMiles)) return '';
  if (distanceMiles < 1) return `${Math.round(distanceMiles * 5280)} ft`;
  if (distanceMiles < 10) return `${distanceMiles.toFixed(1)} mi`;
  return `${Math.round(distanceMiles)} mi`;
}

export function formatConfidence(confidence: ConfidenceLevel): string {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'medium') return 'Good confidence';
  return 'Limited confidence';
}

export function formatPriceLevel(priceLevel?: number | null): string | null {
  if (priceLevel == null) return null;
  if (priceLevel <= 0) return '$';
  if (priceLevel === 1) return '$';
  if (priceLevel === 2) return '$$';
  if (priceLevel === 3) return '$$$';
  return '$$$$';
}

export function formatPhone(phone?: string | null): string | null {
  if (!phone) return null;
  return phone.trim();
}

export function compactAddress(place: RankedRestaurant): string {
  const parts = [place.formattedAddress, place.city].filter(Boolean);
  return parts.join(' • ');
}

export function confidenceClass(confidence: ConfidenceLevel): string {
  if (confidence === 'high') return 'bg-emerald-500/14 text-emerald-700 ring-1 ring-emerald-500/25';
  if (confidence === 'medium') return 'bg-amber-500/14 text-amber-700 ring-1 ring-amber-500/25';
  return 'bg-slate-500/12 text-slate-600 ring-1 ring-slate-500/18';
}

export function signalBadgeClass(tag: string): string {
  switch (tag) {
    case 'worth-the-drive':
      return 'bg-sky-500/12 text-sky-700 ring-1 ring-sky-500/20';
    case 'locals-love-it':
      return 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/20';
    case 'hidden-gem':
      return 'bg-violet-500/12 text-violet-700 ring-1 ring-violet-500/20';
    case 'breakfast-favorite':
      return 'bg-orange-500/12 text-orange-700 ring-1 ring-orange-500/20';
    case 'family-friendly':
      return 'bg-rose-500/12 text-rose-700 ring-1 ring-rose-500/20';
    case 'quick-casual':
      return 'bg-cyan-500/12 text-cyan-700 ring-1 ring-cyan-500/20';
    case 'date-night':
      return 'bg-fuchsia-500/12 text-fuchsia-700 ring-1 ring-fuchsia-500/20';
    case 'patio':
      return 'bg-lime-500/12 text-lime-700 ring-1 ring-lime-500/20';
    case 'budget-friendly':
      return 'bg-green-500/12 text-green-700 ring-1 ring-green-500/20';
    default:
      return 'bg-slate-500/12 text-slate-600 ring-1 ring-slate-500/18';
  }
}

export function niceTags(tags: string[]): string[] {
  return tags
    .map((tag) => tag.replace(/-/g, ' '))
    .map((tag) =>
      tag
        .split(' ')
        .map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1))
        .join(' ')
    );
}

