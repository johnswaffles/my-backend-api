import type { ChatTurn, RestaurantAgentRestaurant } from '../types';
import { useState, type FormEvent } from 'react';

interface AudioStripProps {
  summary: string;
  responsePlayed: boolean;
  speakerEnabled: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  assistantLoading: boolean;
  assistantLoadingLabel: string;
  conversation: ChatTurn[];
  onToggleSpeaker: () => void;
  onPlay: () => void;
  onAskAssistant: (value: string) => void | Promise<void>;
}

function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function RestaurantResultRow({
  restaurant,
  rank
}: {
  restaurant: RestaurantAgentRestaurant;
  rank: number;
}): JSX.Element {
  const websiteDomain = domainFromUrl(restaurant.website);
  const ratingText =
    typeof restaurant.rating === 'number' && Number.isFinite(restaurant.rating)
      ? `${restaurant.rating.toFixed(1)}`
      : 'Unrated';
  const reviewText =
    typeof restaurant.review_count === 'number' && Number.isFinite(restaurant.review_count)
      ? `${restaurant.review_count.toLocaleString()} reviews`
      : 'Review count unavailable';

  return (
    <div className="rounded-[1.1rem] border border-stone-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(62,84,50,0.05)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">#{rank}</div>
          <div className="mt-1 text-sm font-semibold text-stone-900">{restaurant.name}</div>
          <div className="mt-1 text-xs leading-5 text-stone-600">
            {ratingText} • {reviewText}
            {typeof restaurant.score === 'number' ? ` • Score ${restaurant.score.toFixed(2)}` : ''}
          </div>
        </div>
        <div className="inline-flex rounded-full bg-emerald-700/10 px-3 py-1 text-xs font-semibold text-emerald-900">
          {typeof restaurant.score === 'number' ? `Score ${restaurant.score.toFixed(1)}` : 'Ranked result'}
        </div>
      </div>

      {restaurant.summary ? <p className="mt-2 text-sm leading-6 text-stone-700">{restaurant.summary}</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {websiteDomain && restaurant.website ? (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            {websiteDomain}
          </a>
        ) : null}
        {restaurant.maps_url ? (
          <a
            href={restaurant.maps_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-700 transition hover:border-emerald-300 hover:text-emerald-900"
          >
            Open map
          </a>
        ) : null}
        {restaurant.phone ? (
          <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
            {restaurant.phone}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function AudioStrip({
  summary,
  responsePlayed,
  speakerEnabled,
  isPlaying,
  isLoading,
  assistantLoading,
  assistantLoadingLabel,
  conversation,
  onToggleSpeaker,
  onPlay,
  onAskAssistant
}: AudioStripProps): JSX.Element {
  const [followUpText, setFollowUpText] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const next = followUpText.trim();
    if (!next) return;
    void onAskAssistant(next);
    setFollowUpText('');
  }

  return (
    <section className="rounded-[1.6rem] border border-stone-200 bg-white/80 p-4 shadow-[0_16px_40px_rgba(62,84,50,0.1)] backdrop-blur-xl">
      <div className="mt-4 rounded-[1.35rem] border border-stone-200 bg-stone-50/90 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Chat
        </div>
        <div className="mt-3 space-y-3">
          {conversation.length ? (
            conversation.map((turn, index) => (
              <div
                key={`${turn.role}-${index}-${turn.content.slice(0, 24)}`}
                className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-[1.2rem] px-4 py-3 text-sm leading-7 ${
                    turn.role === 'user'
                      ? 'bg-emerald-700 text-white shadow-[0_14px_30px_rgba(22,83,44,0.16)]'
                      : 'bg-white text-stone-700 ring-1 ring-stone-200'
                  }`}
                  >
                  {turn.role === 'assistant' && turn.featuredWriteup ? (
                    <div className="mt-4 rounded-[1.15rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Top spot writeup
                      </div>
                      <p className="mt-2 text-sm leading-7 text-stone-700 whitespace-pre-wrap">
                        {turn.featuredWriteup}
                      </p>
                    </div>
                  ) : null}
                  <p className={`${turn.featuredWriteup ? 'mt-4' : ''} whitespace-pre-wrap`}>{turn.content}</p>
                  {turn.role === 'assistant' && turn.restaurants?.length ? (
                    <div className="mt-4 space-y-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                        Top results
                      </div>
                      <div className="space-y-3">
                        {turn.restaurants.map((restaurant, restaurantIndex) => (
                          <RestaurantResultRow
                            key={`${restaurant.place_id}-${restaurantIndex}`}
                            restaurant={restaurant}
                            rank={restaurantIndex + 1}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {turn.role === 'assistant' && turn.sources?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {turn.sources.map((source) => (
                        <a
                          key={`${source.title}-${source.url}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.1rem] border border-dashed border-stone-200 bg-white/80 px-4 py-4 text-sm text-stone-500">
              Ask for a town or ZIP, and 618FOOD.COM will find the top restaurants.
            </div>
          )}

          {assistantLoading ? (
            <div className="flex justify-start">
              <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm leading-7 text-stone-500 ring-1 ring-stone-200">
                {assistantLoadingLabel}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Chat with 618FOOD.COM
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
          <input
            value={followUpText}
            onChange={(event) => setFollowUpText(event.target.value)}
            placeholder="Ask for a town or ZIP..."
            className="min-w-0 h-12 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <button
            type="button"
            onClick={onToggleSpeaker}
            className={`h-12 rounded-full px-4 text-sm font-semibold transition ${
              speakerEnabled
                ? 'bg-emerald-700 text-white shadow-[0_14px_30px_rgba(22,83,44,0.18)]'
                : 'bg-stone-100 text-stone-700'
            }`}
          >
            {speakerEnabled ? 'Speaker on' : 'Speaker off'}
          </button>
          <button
            type="button"
            onClick={onPlay}
            disabled={!summary || isLoading || responsePlayed}
            className="h-12 rounded-full bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? 'Playing...' : 'Play response'}
          </button>
          <button
            type="submit"
            disabled={!followUpText.trim() || isLoading || assistantLoading}
            className="h-12 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assistantLoading ? assistantLoadingLabel : 'Send'}
          </button>
        </div>
      </form>
    </section>
  );
}
