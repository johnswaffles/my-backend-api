import type { ChatTurn } from '../types';
import { useState, type FormEvent } from 'react';

interface AudioStripProps {
  summary: string;
  speakerEnabled: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  assistantLoading: boolean;
  conversation: ChatTurn[];
  onToggleSpeaker: () => void;
  onPlay: () => void;
  onAskAssistant: (value: string) => void | Promise<void>;
}

export function AudioStrip({
  summary,
  speakerEnabled,
  isPlaying,
  isLoading,
  assistantLoading,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Audio summary
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-700">
            {summary || 'Find a few verified local favorites, then use audio to hear the shortlist aloud.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSpeaker}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
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
            disabled={!summary || isLoading}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPlaying ? 'Playing...' : 'Play summary'}
          </button>
        </div>
      </div>

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
                  <p className="whitespace-pre-wrap">{turn.content}</p>
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
              Ask anything and 618FOOD.COM will chat back.
            </div>
          )}

          {assistantLoading ? (
            <div className="flex justify-start">
              <div className="rounded-[1.2rem] bg-white px-4 py-3 text-sm leading-7 text-stone-500 ring-1 ring-stone-200">
                Thinking...
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
          Chat with 618FOOD.COM
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={followUpText}
            onChange={(event) => setFollowUpText(event.target.value)}
            placeholder="Ask anything you want..."
            className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
          />
          <button
            type="submit"
            disabled={!followUpText.trim() || isLoading || assistantLoading}
            className="rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {assistantLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
      </form>
    </section>
  );
}
