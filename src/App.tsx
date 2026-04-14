import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AudioStrip } from './features/local-eats/components/AudioStrip';
import { ResultCard } from './features/local-eats/components/ResultCard';
import { SearchLoadingCard } from './features/local-eats/components/SearchLoadingCard';
import { SearchPanel } from './features/local-eats/components/SearchPanel';
import { DEMO_SEARCH_RESPONSE } from './features/local-eats/mock/demo';
import { DEFAULT_SEARCH_FILTERS, FOOD_BRAND } from './features/local-eats/schemas';
import { playBrowserNarration, request618FoodAudio, search618Food, stopBrowserNarration } from './features/local-eats/lib/client';
import type {
  GeoPoint,
  RankedRestaurant,
  SearchFilters,
  SearchMode,
  SearchResponse,
  SearchRequest
} from './features/local-eats/types';

type FilterFocus = 'localOnly' | 'dogFriendly' | 'patio';

function buildFilterPayload(filterFocus: FilterFocus): SearchFilters {
  return {
    ...DEFAULT_SEARCH_FILTERS,
    localOnly: filterFocus === 'localOnly',
    dogFriendly: filterFocus === 'dogFriendly',
    patio: filterFocus === 'patio',
    openNow: false,
    familyFriendly: false,
    quickBite: false,
    dateNight: false,
    worthTheDrive: false,
    budget: 'any',
    cuisine: ''
  };
}

function summarizeResults(results: RankedRestaurant[]): string {
  if (!results.length) return 'No verified restaurants matched this search yet.';

  const highlights = results.slice(0, 3).map((result) => result.name);

  return `Here are ${results.length} verified ${results.length === 1 ? 'place' : 'places'} worth a look on ${FOOD_BRAND}: ${highlights.join('; ')}.`;
}

function getFallbackAudioText(response: SearchResponse): string {
  if (response.audioSummary) return response.audioSummary;
  return summarizeResults(response.results);
}

const TOWN_SUGGESTIONS = ['Marion, IL', 'Carbondale, IL', 'Harrisburg, IL', 'Anna, IL', 'Metropolis, IL', 'Cairo, IL'];

export default function App(): JSX.Element {
  const demoMode = import.meta.env.VITE_LOCAL_EATS_DEMO_MODE === 'true';
  const [query, setQuery] = useState('');
  const [destinationText, setDestinationText] = useState('');
  const [mode, setMode] = useState<SearchMode>('nearby');
  const [radiusMiles, setRadiusMiles] = useState(18);
  const [filterFocus, setFilterFocus] = useState<FilterFocus>('localOnly');
  const [geoPoint, setGeoPoint] = useState<GeoPoint | null>(null);
  const [geoLabel, setGeoLabel] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [response, setResponse] = useState<SearchResponse>(
    demoMode ? DEMO_SEARCH_RESPONSE : {
      intentSummary: 'Try a town, ZIP, or location to search verified local food.',
      results: [],
      warnings: [],
      audioSummary: '',
      hasLiveData: false,
      sourceMode: 'empty'
    }
  );
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!demoMode) return;
    setResponse(DEMO_SEARCH_RESPONSE);
  }, [demoMode]);

  useEffect(() => {
    return () => {
      stopBrowserNarration();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: 'browser' as const
        };
        setGeoPoint(point);
        setGeoLabel('Browser location ready');
      },
      () => {
        setGeoLabel('Location permission not granted yet');
      },
      {
        maximumAge: 5 * 60 * 1000,
        timeout: 8000
      }
    );
  }, []);

  const activeResults = response.results;

  const resultCountLabel = activeResults.length
    ? `${activeResults.length} verified ${activeResults.length === 1 ? 'spot' : 'spots'}`
    : 'No verified spots yet';

  const headlineSummary = response.intentSummary || 'Search verified local restaurants in Southern Illinois.';

  async function submitSearch(
    event?: FormEvent<HTMLFormElement>,
    overrides: Partial<SearchRequest> = {}
  ): Promise<void> {
    event?.preventDefault();
    setLoading(true);
    setSearchError(null);
    try {
      if (demoMode && !query.trim() && !destinationText.trim() && !geoPoint) {
        setResponse(DEMO_SEARCH_RESPONSE);
        return;
      }

      const payload: SearchRequest = {
        query: query.trim(),
        destinationText: destinationText.trim(),
        location: geoPoint,
        mealType: 'any',
        mode,
        radiusMiles,
        filters: buildFilterPayload(filterFocus),
        ...overrides
      };

      const nextResponse = await search618Food(payload);
      setResponse(nextResponse);
    } catch (error) {
      if (demoMode) {
        setResponse(DEMO_SEARCH_RESPONSE);
      }
      setSearchError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaySummary(): Promise<void> {
    if (!speakerEnabled) return;
    const text = getFallbackAudioText(response);
    if (!text.trim()) return;

    setAudioLoading(true);
    try {
      const audio = await request618FoodAudio(text);
      if (audio.audioBase64) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const mimeType = audio.mimeType || 'audio/mpeg';
        const player = new Audio(`data:${mimeType};base64,${audio.audioBase64}`);
        player.onplay = () => setIsPlaying(true);
        player.onended = () => setIsPlaying(false);
        player.onerror = () => {
          setIsPlaying(false);
        };
        audioRef.current = player;
        await player.play();
        return;
      }
      await playBrowserNarration(text);
      setIsPlaying(false);
    } catch {
      try {
        await playBrowserNarration(text);
      } catch (browserError) {
        setSearchError(browserError instanceof Error ? browserError.message : 'Audio playback failed.');
      } finally {
        setIsPlaying(false);
      }
    } finally {
      setAudioLoading(false);
    }
  }

  function toggleSpeaker(): void {
    setSpeakerEnabled((current) => {
      const next = !current;
      if (!next) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        stopBrowserNarration();
        setIsPlaying(false);
      } else if (audioRef.current && audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
      return next;
    });
  }

  function handleUseLocation(): void {
    if (!geoPoint) {
      setGeoLabel('Looking for browser location...');
      if (typeof window === 'undefined' || !('geolocation' in navigator)) {
        setGeoLabel('Geolocation unavailable in this browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            source: 'browser' as const
          };
          setGeoPoint(nextPoint);
          setGeoLabel(`Browser location ready • ${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`);
        },
        () => {
          setGeoLabel('Location permission not granted yet');
        }
      );
      return;
    }

    setMode('nearby');
    void submitSearch(undefined, { mode: 'nearby' });
  }

  function handleSurpriseMe(): void {
    setMode('surprise');
    setQuery('');
    setDestinationText('');
    void submitSearch(undefined, { mode: 'surprise', query: '', destinationText: '' });
  }

  function handleQuickTown(value: string): void {
    setDestinationText(value);
    setQuery(value);
    setMode('destination');
    void submitSearch(undefined, { mode: 'destination', query: value, destinationText: value });
  }

  function handleFilterFocusChange(value: FilterFocus): void {
    setFilterFocus(value);
  }

  function handleFollowUpSearch(value: string): void {
    setQuery(value);
    void submitSearch(undefined, {
      query: value,
      destinationText: destinationText.trim(),
      mode
    });
  }

  const audioSummary = getFallbackAudioText(response);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(250,246,236,0.82)_34%,_rgba(236,244,227,0.96)_66%,_rgba(247,241,228,1)_100%)] text-stone-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(111,162,98,0.24),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(206,179,95,0.18),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.14%27/%3E%3C/svg%3E')] opacity-25" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/72 px-4 py-4 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-lg font-black text-white shadow-[0_16px_30px_rgba(22,83,44,0.18)]">
                618
              </div>
              <div>
                <div className="font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
                  {FOOD_BRAND}
                </div>
                <div className="text-sm text-stone-600">
                  Verified local restaurants for Southern Illinois
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <span className="rounded-full bg-emerald-700/10 px-3 py-1 text-emerald-900">
                Google Places verified
              </span>
              <span className="rounded-full bg-stone-900/6 px-3 py-1 text-stone-700">
                OpenAI ranking + narration
              </span>
              <span className="rounded-full bg-stone-500/12 px-3 py-1 text-stone-700">
                {resultCountLabel}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-5">
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
            onFilterFocusChange={handleFilterFocusChange}
            onSubmit={submitSearch}
            onUseLocation={handleUseLocation}
            onSurpriseMe={handleSurpriseMe}
            onQuickTown={handleQuickTown}
            geoLabel={geoLabel}
            isLoading={loading}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-4">
            <AudioStrip
              summary={audioSummary}
              speakerEnabled={speakerEnabled}
              isPlaying={isPlaying}
              isLoading={audioLoading}
              onToggleSpeaker={toggleSpeaker}
              onPlay={handlePlaySummary}
              onFollowUpSearch={handleFollowUpSearch}
            />

            {loading ? <SearchLoadingCard /> : null}

            {searchError ? (
              <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {searchError}
              </div>
            ) : null}

            {response.warnings.length ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="font-semibold">Search notes</div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {response.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Recent results
                </div>
                <div className="mt-1 text-xl font-semibold text-stone-900">{headlineSummary}</div>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void submitSearch()}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-400 hover:text-emerald-900 disabled:cursor-wait disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? null : activeResults.length ? (
              <div className="space-y-4">
                {activeResults.map((result, index) => (
                  <ResultCard
                    key={result.placeId}
                    result={result}
                    rank={index}
                    onOpenMap={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/60 p-8 text-center shadow-[0_16px_40px_rgba(61,79,42,0.08)]">
                <div className="font-display text-3xl font-semibold tracking-tight text-[#173528]">
                  Start with a town, ZIP, or location.
                </div>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                  618FOOD.COM returns only verified businesses. If evidence is weak, the app asks
                  you to call ahead instead of guessing.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {TOWN_SUGGESTIONS.map((town) => (
                    <button
                      key={town}
                      type="button"
                      onClick={() => handleQuickTown(town)}
                      className="rounded-full bg-emerald-700/10 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-700/15"
                    >
                      {town}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {demoMode ? (
              <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Demo preview mode is on. Connect Google Places and OpenAI keys to turn 618FOOD.COM
                into the live production experience.
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
