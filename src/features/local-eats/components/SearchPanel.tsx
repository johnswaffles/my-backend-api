import type { FormEvent } from 'react';
import { FOOD_BRAND } from '../schemas';
import type { SearchMode } from '../types';

interface SearchPanelProps {
  query: string;
  destinationText: string;
  mode: SearchMode;
  radiusMiles: number;
  filterFocus: 'localOnly' | 'dogFriendly' | 'patio';
  onQueryChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onModeChange: (value: SearchMode) => void;
  onRadiusMilesChange: (value: number) => void;
  onFilterFocusChange: (value: 'localOnly' | 'dogFriendly' | 'patio') => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseLocation: () => void;
  onSurpriseMe: () => void;
  onQuickTown: (value: string) => void;
  geoLabel?: string;
  isLoading: boolean;
}

const MODES: Array<{ value: SearchMode; label: string }> = [
  { value: 'nearby', label: 'Nearby' },
  { value: 'destination', label: 'Town / ZIP' },
  { value: 'traveler', label: 'Traveler mode' }
];

const FILTER_OPTIONS: Array<{ value: 'localOnly' | 'dogFriendly' | 'patio'; label: string; description: string }> = [
  { value: 'localOnly', label: 'Local restaurants only', description: 'Default: keep the search focused on locally loved places.' },
  { value: 'dogFriendly', label: 'Dog-friendly spots', description: 'Prioritize places that welcome dogs.' },
  { value: 'patio', label: 'Patio seating', description: 'Prioritize places with outdoor seating.' }
];

export const TOWN_OPTIONS = [
  'Marion, IL',
  'Carbondale, IL',
  'Harrisburg, IL',
  'Anna, IL',
  'Metropolis, IL',
  'Cairo, IL',
  'Fairview Heights, IL',
  'Shiloh, IL',
  'Edwardsville, IL',
  'Belleville, IL',
  "O'Fallon, IL",
  'Collinsville, IL',
  'Waterloo, IL',
  'Highland, IL',
  'Alton, IL',
  'Granite City, IL',
  'Lebanon, IL',
  'Carlyle, IL',
  'Trenton, IL',
  'Breese, IL',
  'Nashville, IL',
  'Pinckneyville, IL',
  'Du Quoin, IL',
  'Herrin, IL',
  'Carterville, IL',
  'Mount Vernon, IL',
  'Vienna, IL',
  'Chester, IL',
  'Steeleville, IL',
  'Okawville, IL'
];

export function SearchPanel({
  query,
  destinationText,
  mode,
  radiusMiles,
  filterFocus,
  onQueryChange,
  onDestinationChange,
  onModeChange,
  onRadiusMilesChange,
  onFilterFocusChange,
  onSubmit,
  onUseLocation,
  onSurpriseMe,
  onQuickTown,
  geoLabel,
  isLoading
}: SearchPanelProps): JSX.Element {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[2rem] border border-white/60 bg-white/72 p-5 shadow-[0_18px_70px_rgba(68,92,65,0.12)] backdrop-blur-2xl"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900">
            {FOOD_BRAND}
          </div>
          <h2 className="mt-4 max-w-3xl font-display text-3xl font-semibold tracking-tight text-[#173528] sm:text-[2.6rem]">
            Search verified local places.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
            Try natural searches like “pasta in Mount Vernon, Illinois” or “burgers near me” and
            618FOOD.COM will map the food, the town, and the radius together.
          </p>
        </div>

        <div className="flex w-full max-w-[24rem] flex-col gap-2 rounded-[1.6rem] border border-emerald-700/10 bg-emerald-50/60 p-3 text-sm text-emerald-950/80">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-900/70">
              Location
            </span>
            <button
              type="button"
              onClick={onUseLocation}
              className="rounded-full border border-emerald-700/20 bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-900 transition hover:bg-white"
            >
              Use my location
            </button>
          </div>
          <div className="text-sm font-medium text-emerald-900">
            {geoLabel ?? 'No browser location yet'}
          </div>
          <div className="text-xs leading-5 text-emerald-900/70">
            Tip: you can also enter a town, ZIP, or destination and we’ll handle the rest.
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Find food near
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Pasta in Mount Vernon, IL, burgers near me, or a town/ZIP"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Driving to
          </span>
          <input
            value={destinationText}
            onChange={(event) => onDestinationChange(event.target.value)}
            placeholder="A town, route stop, or destination"
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <div className="mt-2 text-xs leading-5 text-stone-500">
            Optional. Use this for traveler mode or route-aware searches.
          </div>
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Search mode + radius
          </div>
          <div className="flex flex-wrap gap-2">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onModeChange(item.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === item.value
                    ? 'bg-emerald-700 text-white shadow-[0_14px_35px_rgba(22,83,44,0.18)]'
                    : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onSurpriseMe}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Surprise me
            </button>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-700">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Radius
            </span>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={radiusMiles}
              onChange={(event) => onRadiusMilesChange(Number(event.target.value))}
              className="w-32 accent-emerald-700"
            />
            <span className="tabular-nums">{radiusMiles} mi</span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Filter focus
          </div>
          <label className="block">
            <select
              value={filterFocus}
              onChange={(event) => onFilterFocusChange(event.target.value as 'localOnly' | 'dogFriendly' | 'patio')}
              className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              {FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            {FILTER_OPTIONS.find((option) => option.value === filterFocus)?.description}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Browse towns
          </div>
          <select
            defaultValue=""
            onChange={(event) => {
              const nextTown = event.currentTarget.value;
              if (!nextTown) return;
              onQuickTown(nextTown);
              event.currentTarget.selectedIndex = 0;
            }}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            <option value="" disabled>
              Pick a town with good food
            </option>
            {TOWN_OPTIONS.map((town) => (
              <option key={town} value={town}>
                {town}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Select one to fill the search bar above and launch 618FOOD.COM instantly.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-stone-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-stone-600">
          {destinationText ? (
            <span>
              Traveler mode focused on <span className="font-semibold text-stone-900">{destinationText}</span>.
            </span>
          ) : (
            <span>
              Search keeps `618FOOD.COM` grounded in local, verified business identity first.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(22,83,44,0.2)] transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? 'Searching 618FOOD.COM...' : 'Search 618FOOD.COM'}
          </button>
        </div>
      </div>
    </form>
  );
}
