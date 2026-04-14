import type { RankedRestaurant } from '../types';
import { compactAddress, formatMiles, formatPriceLevel, niceTags, signalBadgeClass } from '../lib/format';

interface ResultCardProps {
  result: RankedRestaurant;
  rank: number;
  onOpenMap?: (url: string) => void;
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

export function ResultCard({ result, rank, onOpenMap }: ResultCardProps): JSX.Element {
  const price = formatPriceLevel(result.priceLevel);
  const distance = formatMiles(result.distanceMiles);
  const websiteDomain = domainFromUrl(result.website);
  const openLabel =
    result.openNow === true ? 'Open now' : result.openNow === false ? 'Closed now' : 'Hours unavailable';
  const isLimited = result.confidence === 'limited';

  return (
    <article className="rounded-[1.8rem] border border-white/80 bg-white/88 p-5 shadow-[0_18px_40px_rgba(62,84,50,0.12)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(62,84,50,0.16)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            <span className="rounded-full bg-emerald-700/10 px-2.5 py-1 text-emerald-900">
              #{rank + 1}
            </span>
            {result.categories[0] ? <span>{result.categories[0]}</span> : null}
            {distance ? <span>• {distance}</span> : null}
            {price ? <span>• {price}</span> : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
              {result.name}
            </h3>
          </div>
          <p className="mt-2 text-sm font-medium text-stone-600">
            {compactAddress(result) || 'Address unavailable'}{' '}
            {result.city && !compactAddress(result) ? `• ${result.city}` : ''}
          </p>
          <div
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              isLimited
                ? 'bg-rose-500/10 text-rose-800 ring-1 ring-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20'
            }`}
          >
            {isLimited
              ? 'Low confidence - please call ahead to confirm hours and availability.'
              : 'Good local match with verified business details.'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
              result.openNow === true
                ? 'bg-emerald-500/12 text-emerald-800 ring-1 ring-emerald-500/20'
                : result.openNow === false
                  ? 'bg-stone-500/12 text-stone-700 ring-1 ring-stone-500/20'
                  : 'bg-slate-500/12 text-slate-600 ring-1 ring-slate-500/20'
            }`}
          >
            {openLabel}
          </span>
          {result.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={`rounded-full px-3 py-1 text-xs font-semibold ${signalBadgeClass(tag)}`}>
              {niceTags([tag])[0]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-stone-200 bg-gradient-to-br from-white to-emerald-50/40 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Why this is a fit
          </div>
          <p className="mt-2 text-sm leading-7 text-stone-700">{result.whyThisIsAFit}</p>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            What we found
          </div>
          <p className="mt-2 text-sm leading-7 text-stone-700">{result.whatWeFound}</p>

          {result.evidence.length ? (
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Evidence
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.evidence.slice(0, 4).map((item) => (
                  <a
                    key={`${result.placeId}-${item.title}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700 transition hover:border-emerald-400 hover:text-emerald-900"
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-[1.5rem] border border-stone-200 bg-white/90 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Details
          </div>
          <div className="mt-3 grid gap-3 text-sm">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Phone</div>
              <div className="mt-1 text-stone-800">{result.phone ?? 'Unavailable'}</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Website</div>
              {websiteDomain ? (
                <a
                  href={result.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-800 transition hover:border-emerald-400 hover:text-emerald-900"
                >
                  {websiteDomain}
                </a>
              ) : (
                <div className="mt-1 text-stone-500">Unavailable</div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Maps</div>
              <button
                type="button"
                onClick={() => onOpenMap?.(result.mapsUrl)}
                className="mt-1 inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-800 transition hover:border-emerald-400 hover:text-emerald-900"
              >
                Open map link
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
