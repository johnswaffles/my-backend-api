import { useEffect, useMemo, useState } from 'react';
import type { RestaurantAgentRestaurant, SponsoredPlacement } from '../types';

interface SponsoredPlacementAdProps {
  placement: SponsoredPlacement | null;
  restaurant: RestaurantAgentRestaurant | null;
}

const DISMISSED_KEY = '618food.dismissedSponsoredPlacements.session';

function loadDismissedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveDismissedIds(ids: Set<string>): void {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage failures.
  }
}

export function SponsoredPlacementAd({ placement, restaurant }: SponsoredPlacementAdProps): JSX.Element | null {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissedIds(loadDismissedIds());
  }, []);

  const isVisible = useMemo(() => {
    if (!placement) return false;
    return !dismissedIds.has(placement.id);
  }, [dismissedIds, placement]);

  if (!isVisible || !placement) return null;

  const websiteUrl = restaurant?.website || placement.website || '#';
  const imageUrl = placement.thumbnailUrl || '';
  const addressLabel = restaurant?.formatted_address || restaurant?.city || 'Sponsored restaurant';

  function handleDismiss(): void {
    if (!placement) return;
    const next = new Set(dismissedIds);
    next.add(placement.id);
    setDismissedIds(next);
    saveDismissedIds(next);
  }

  return (
    <aside className="mt-4 w-full">
      <div className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white shadow-[0_20px_55px_rgba(44,64,37,0.14)]">
        <div className="relative">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss sponsored placement"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-stone-700 shadow-[0_8px_16px_rgba(0,0,0,0.12)] transition hover:bg-white hover:text-stone-900"
          >
            ×
          </button>

          <div className="relative aspect-[16/10] overflow-hidden bg-stone-900 sm:aspect-[21/9]">
            {imageUrl ? (
              <img src={imageUrl} alt={placement.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top_right,_rgba(255,176,53,0.4),_transparent_34%),linear-gradient(135deg,_#101010,_#1f4d39_54%,_#0f172a)] p-4 text-white">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/90">
                    Sponsored placement
                  </div>
                  <div className="mt-2 max-w-[14rem] text-2xl font-semibold leading-tight">
                    {placement.title}
                  </div>
                  <div className="mt-2 max-w-[16rem] text-sm leading-6 text-white/85">
                    {placement.tagline}
                  </div>
                </div>
              </div>
            )}

            {!imageUrl ? <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" /> : null}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
              Sponsored placement
            </div>
            <div className="mt-1 text-base font-semibold text-stone-900">{placement.title}</div>
            <div className="mt-1 text-sm leading-6 text-stone-600">{placement.tagline}</div>
            <div className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-stone-500">
              {addressLabel}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              {placement.callToAction}
            </a>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
