import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AudioStrip } from './features/local-eats/components/AudioStrip';
import { ResultCard } from './features/local-eats/components/ResultCard';
import { SearchPanel } from './features/local-eats/components/SearchPanel';
import { DEMO_SEARCH_RESPONSE } from './features/local-eats/mock/demo';
import { DEFAULT_SEARCH_FILTERS, FOOD_BRAND } from './features/local-eats/schemas';
import { playBrowserNarration, request618FoodAudio, search618Food, stopBrowserNarration } from './features/local-eats/lib/client';
import type {
  ConfidenceLevel,
  GeoPoint,
  RankedRestaurant,
  SearchFilters,
  SearchMode,
  SearchResponse,
  SearchRequest
} from './features/local-eats/types';

function summarizeResults(results: RankedRestaurant[]): string {
  if (!results.length) return 'No verified restaurants matched this search yet.';

  const highlights = results.slice(0, 3).map((result) => {
    const tone = result.confidence === 'high' ? 'strong match' : result.confidence === 'medium' ? 'solid fit' : 'limited signal';
    return `${result.name} (${tone})`;
  });

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
  const [mealType, setMealType] = useState<'any' | 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'coffee'>('any');
  const [mode, setMode] = useState<SearchMode>('nearby');
  const [radiusMiles, setRadiusMiles] = useState(18);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
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

  const activeResults = useMemo(() => response.results, [response.results]);
  const topConfidence = useMemo<ConfidenceLevel>(() => {
    if (!activeResults.length) return 'limited';
    if (activeResults.some((item) => item.confidence === 'high')) return 'high';
    if (activeResults.some((item) => item.confidence === 'medium')) return 'medium';
    return 'limited';
  }, [activeResults]);

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
        mealType,
        mode,
        radiusMiles,
        filters,
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

  function handleFilterChange(key: keyof SearchFilters, value: boolean | string): void {
    setFilters((current) => ({
      ...current,
      [key]: value
    }));
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
              <span className={`rounded-full px-3 py-1 ${topConfidence === 'high' ? 'bg-emerald-700/12 text-emerald-900' : topConfidence === 'medium' ? 'bg-amber-500/12 text-amber-900' : 'bg-stone-500/12 text-stone-700'}`}>
                {resultCountLabel}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2.2rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(246,241,231,0.7))] p-5 shadow-[0_18px_55px_rgba(61,79,42,0.12)] backdrop-blur-2xl sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900">
              Rural-first discovery
            </div>
            <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold tracking-tight text-[#173528] sm:text-6xl">
              Find the places locals actually love.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              618FOOD.COM looks for real, locally loved diners, cafés, BBQ joints, and hidden gems
              across rural Southern Illinois. It uses Google Places for business identity and OpenAI
              for ranking, verification, and clear explanations. It never invents restaurants.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {['Hidden gems', 'Locals love it', 'Worth the drive', 'Breakfast favorites', 'Family-friendly'].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-stone-700 shadow-[0_10px_24px_rgba(61,79,42,0.08)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ['Verified first', 'Every recommendation starts with a real Google Places candidate.'],
                ['Local signals', 'We prefer fresh, lived-in evidence over polished marketing.'],
                ['Audio summary', 'A short narrated overview makes quick decisions easier.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-[1.5rem] border border-stone-200 bg-white/76 p-4">
                  <div className="font-semibold text-stone-900">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-stone-600">{text}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-emerald-700/10 bg-emerald-50/70 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900/70">
                Live location + traveler support
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-emerald-950/80">
                Share your location, enter a town or ZIP, or say where you are driving to. Then
                let 618FOOD.COM surface real places that feel right for the meal, the mood, and
                the route.
              </p>
            </div>
          </article>

          <SearchPanel
            query={query}
            destinationText={destinationText}
            mealType={mealType}
            mode={mode}
            radiusMiles={radiusMiles}
            filters={filters}
            onQueryChange={setQuery}
            onDestinationChange={setDestinationText}
            onMealTypeChange={setMealType}
            onModeChange={setMode}
            onRadiusMilesChange={setRadiusMiles}
            onFilterChange={handleFilterChange}
            onSubmit={submitSearch}
            onUseLocation={handleUseLocation}
            onSurpriseMe={handleSurpriseMe}
            onQuickTown={handleQuickTown}
            geoLabel={geoLabel}
            isLoading={loading}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-[0_16px_50px_rgba(61,79,42,0.1)] backdrop-blur-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              How it works
            </div>
            <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#173528]">
              Trust first. Then rank the best fit.
            </div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-stone-600">
              <p>
                Google Places provides the canonical business identity. OpenAI only helps explain,
                rank, and summarize the verified candidates that already exist.
              </p>
              <p>
                That means 618FOOD.COM can shine in the exact places big-city apps struggle:
                rural towns, half-hidden diners, tiny cafés, and the spots locals keep recommending
                to one another.
              </p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['No invented listings', 'If a place is missing from Google Places, it is not shown.'],
                ['Confidence labels', 'High, medium, or limited confidence keeps the board honest.'],
                ['Open web corroboration', 'Recent menu, social, and local-source signals help ranking.'],
                ['Helpful audio', 'A short voice summary can read the shortlist aloud.']
              ].map(([title, text]) => (
                <div key={title} className="rounded-[1.4rem] border border-stone-200 bg-white/80 p-4">
                  <div className="font-semibold text-stone-900">{title}</div>
                  <div className="mt-2 text-sm leading-6 text-stone-600">{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <AudioStrip
              summary={audioSummary}
              speakerEnabled={speakerEnabled}
              isPlaying={isPlaying}
              isLoading={audioLoading}
              onToggleSpeaker={toggleSpeaker}
              onPlay={handlePlaySummary}
            />

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
                onClick={() => void submitSearch()}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-emerald-400 hover:text-emerald-900"
              >
                Refresh
              </button>
            </div>

            {activeResults.length ? (
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
                  618FOOD.COM will return only verified businesses. If evidence is weak, the app
                  lowers confidence instead of guessing.
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
