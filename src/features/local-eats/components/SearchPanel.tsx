import type { FormEvent } from 'react';
import { FOOD_BRAND } from '../schemas';
import type { BudgetLevel, MealType, SearchFilters, SearchMode } from '../types';

interface SearchPanelProps {
  query: string;
  destinationText: string;
  mealType: MealType;
  mode: SearchMode;
  radiusMiles: number;
  filters: SearchFilters;
  onQueryChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onMealTypeChange: (value: MealType) => void;
  onModeChange: (value: SearchMode) => void;
  onRadiusMilesChange: (value: number) => void;
  onFilterChange: (key: keyof SearchFilters, value: boolean | BudgetLevel | string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUseLocation: () => void;
  onSurpriseMe: () => void;
  onQuickTown: (value: string) => void;
  geoLabel?: string;
  isLoading: boolean;
}

const MEAL_TYPES: Array<{ value: MealType; label: string }> = [
  { value: 'any', label: 'Any time' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'coffee', label: 'Coffee' }
];

const MODES: Array<{ value: SearchMode; label: string }> = [
  { value: 'nearby', label: 'Nearby' },
  { value: 'destination', label: 'Town / ZIP' },
  { value: 'traveler', label: 'Traveler mode' },
  { value: 'surprise', label: 'Surprise me' }
];

const TOGGLE_FILTERS: Array<{ key: keyof SearchFilters; label: string }> = [
  { key: 'localOnly', label: 'Local only' },
  { key: 'openNow', label: 'Open now' },
  { key: 'dogFriendly', label: 'Dog-friendly' },
  { key: 'patio', label: 'Patio' },
  { key: 'familyFriendly', label: 'Family-friendly' },
  { key: 'quickBite', label: 'Quick bite' },
  { key: 'dateNight', label: 'Date night' },
  { key: 'worthTheDrive', label: 'Worth the drive' }
];

const QUICK_TOWNS = ['Marion, IL', 'Carbondale, IL', 'Harrisburg, IL', 'Anna, IL', 'Metropolis, IL', 'Cairo, IL'];

export function SearchPanel({
  query,
  destinationText,
  mealType,
  mode,
  radiusMiles,
  filters,
  onQueryChange,
  onDestinationChange,
  onMealTypeChange,
  onModeChange,
  onRadiusMilesChange,
  onFilterChange,
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/10 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900">
            {FOOD_BRAND}
          </div>
          <h2 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight text-[#173528] sm:text-5xl">
            Search the places locals actually talk about.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
            Rural-first discovery for Southern Illinois, built to verify real businesses before
            they ever reach the page. No invented restaurants. No fake phone numbers. Just useful,
            explainable results.
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
            placeholder="Town, ZIP, or 'I'm driving to...'"
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
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Meal type
          </span>
          <select
            value={mealType}
            onChange={(event) => onMealTypeChange(event.target.value as MealType)}
            className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          >
            {MEAL_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Filters
          </div>
          <div className="flex flex-wrap gap-2">
            {TOGGLE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  onFilterChange(key, !Boolean(filters[key]))
                }
                className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  Boolean(filters[key])
                    ? 'bg-emerald-700 text-white shadow-[0_10px_25px_rgba(22,83,44,0.18)]'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-stone-200 bg-white/92 p-4">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Budget + cuisine
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Budget
              </span>
              <select
                value={filters.budget}
                onChange={(event) => onFilterChange('budget', event.target.value as BudgetLevel)}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              >
                <option value="any">Any budget</option>
                <option value="budget">$ Budget</option>
                <option value="mid">$$ Mid-range</option>
                <option value="splurge">$$$ Splurge</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Cuisine
              </span>
              <input
                value={filters.cuisine}
                onChange={(event) => onFilterChange('cuisine', event.target.value)}
                placeholder="BBQ, diner, coffee, Mexican..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {QUICK_TOWNS.map((town) => (
          <button
            key={town}
            type="button"
            onClick={() => onQuickTown(town)}
            className="rounded-full border border-emerald-700/12 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:bg-emerald-100"
          >
            {town}
          </button>
        ))}
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
