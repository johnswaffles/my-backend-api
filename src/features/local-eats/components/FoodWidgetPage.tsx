import { useMemo, useState } from 'react';
import { search618Food } from '../lib/client';
import { DEFAULT_SEARCH_FILTERS, FOOD_BRAND } from '../schemas';
import type {
  GeoPoint,
  RankedRestaurant,
  SearchFilters,
  SearchMode,
  SearchResponse
} from '../types';
import { ResultCard } from './ResultCard';
import { SearchPanel, TOWN_OPTIONS } from './SearchPanel';

const DEFAULT_ERROR = 'Type a town or ZIP and a food type, then search again.';

function buildFilters(filterFocus: 'localOnly' | 'dogFriendly' | 'patio'): SearchFilters {
  return {
    ...DEFAULT_SEARCH_FILTERS,
    localOnly: filterFocus === 'localOnly',
    dogFriendly: filterFocus === 'dogFriendly',
    patio: filterFocus === 'patio'
  };
}

function pickRandomTown(): string {
  const index = Math.floor(Math.random() * TOWN_OPTIONS.length);
  return TOWN_OPTIONS[index] || 'Mount Vernon, IL';
}

export function FoodWidgetPage(): JSX.Element {
  const [query, setQuery] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<SearchMode>('destination');
  const [radiusMiles, setRadiusMiles] = useState(14);
  const [filterFocus, setFilterFocus] = useState<'localOnly' | 'dogFriendly' | 'patio'>('localOnly');
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [geoLabel, setGeoLabel] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState('');

  const topResult = useMemo(() => response?.results?.[0] || null, [response]);

  async function runSearch(next: {
    query?: string;
    destinationText?: string;
    mode?: SearchMode;
    radiusMiles?: number;
    geoPoint?: GeoPoint | null;
    filterFocus?: 'localOnly' | 'dogFriendly' | 'patio';
  } = {}): Promise<void> {
    const searchQuery = (next.query ?? query).trim() || 'restaurants';
    const searchDestination = (next.destinationText ?? destinationText).trim();
    const searchMode = next.mode ?? mode;
    const searchRadius = next.radiusMiles ?? radiusMiles;
    const searchLocation = next.geoPoint ?? geoPoint;
    const searchFilterFocus = next.filterFocus ?? filterFocus;

    setQuery(searchQuery === 'restaurants' ? '' : searchQuery);
    setDestinationText(searchDestination);
    setMode(searchMode);
    setRadiusMiles(searchRadius);
    setGeoPoint(searchLocation);
    setFilterFocus(searchFilterFocus);
    setIsLoading(true);
    setError('');

    try {
      const nextResponse = await search618Food({
        query: searchQuery,
        destinationText: searchDestination,
        location: searchLocation,
        mealType: 'any',
        mode: searchMode,
        radiusMiles: searchRadius,
        filters: {
          ...buildFilters(searchFilterFocus),
          cuisine: ''
        }
      });

      setResponse(nextResponse);
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : DEFAULT_ERROR;
      setError(message);
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUseLocation(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Browser location is not available on this device.');
      return;
    }

    setError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPoint: GeoPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: 'Current location',
          source: 'browser'
        };
        setGeoPoint(nextPoint);
        setGeoLabel('Current location');
        void runSearch({ geoPoint: nextPoint });
      },
      () => {
        setError('Unable to read your location. Try a town or ZIP instead.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  async function handleQuickTown(value: string): Promise<void> {
    setDestinationText(value);
    await runSearch({ destinationText: value });
  }

  async function handleSurpriseMe(): Promise<void> {
    const town = pickRandomTown();
    setDestinationText(town);
    setQuery('');
    await runSearch({ query: 'restaurants', destinationText: town, mode: 'destination' });
  }

  const results = response?.results || [];
  const hasResults = results.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(250,246,236,0.92)_34%,_rgba(236,244,227,0.98)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,162,98,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(206,179,95,0.14),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.48),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.1%27/%3E%3C/svg%3E')] opacity-25" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[860px] flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5">
        <header className="rounded-[1.7rem] border border-white/72 bg-white/82 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
                618
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-xl font-semibold tracking-tight text-[#173528] sm:text-2xl">
                  {FOOD_BRAND}
                </div>
                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-500">
                  Floating widget
                </div>
              </div>
            </div>

            <a
              href="/"
              className="rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              Home
            </a>
          </div>
        </header>

        <section className="rounded-[1.7rem] border border-white/72 bg-white/82 p-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900">
                Search verified local places
              </div>
              <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-[2.3rem]">
                A compact widget for finding places to eat.
              </h1>
            </div>
            <div className="rounded-[1.25rem] border border-stone-200 bg-white/90 px-3 py-2 text-xs leading-5 text-stone-600">
              Enter a town or ZIP. Add a food type for tighter results.
            </div>
          </div>

          <div className="mt-4">
            <SearchPanel
              query={query}
              destinationText={destinationText}
              mode={mode}
              radiusMiles={radiusMiles}
              filterFocus={filterFocus}
              onQueryChange={setQuery}
              onDestinationChange={setDestinationText}
              onModeChange={setMode}
              onRadiusMilesChange={setRadiusMiles}
              onFilterFocusChange={setFilterFocus}
              onUseLocation={handleUseLocation}
              onSurpriseMe={handleSurpriseMe}
              onQuickTown={handleQuickTown}
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch();
              }}
              geoLabel={geoLabel}
              isLoading={isLoading}
              compact
            />
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-white/72 bg-white/82 p-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">Results</div>
              <div className="mt-1 text-lg font-semibold text-stone-900">
                {response?.intentSummary || 'Your top restaurants will appear here.'}
              </div>
            </div>
            {response?.hasLiveData ? (
              <div className="rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-semibold text-emerald-900">
                Live results
              </div>
            ) : null}
          </div>

          {response?.warnings?.length ? (
            <div className="mt-4 rounded-[1.4rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {response.warnings[0]}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-[1.4rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-stone-200 bg-white/80 px-4 py-8 text-center text-sm text-stone-500">
              Searching verified restaurants...
            </div>
          ) : null}

          {!isLoading && hasResults ? (
            <div className="mt-4 space-y-4">
              {results.slice(0, 7).map((restaurant, index) => (
                <ResultCard
                  key={restaurant.placeId}
                  result={restaurant as RankedRestaurant}
                  rank={index}
                />
              ))}
            </div>
          ) : null}

          {!isLoading && !hasResults ? (
            <div className="mt-4 rounded-[1.4rem] border border-dashed border-stone-200 bg-white/80 px-4 py-8 text-center text-sm text-stone-500">
              Search for a town or ZIP to load the widget results.
            </div>
          ) : null}

          {topResult ? (
            <div className="mt-4 rounded-[1.4rem] border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
              <span className="font-semibold">{topResult.name}</span> is currently at the top of the list.
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
