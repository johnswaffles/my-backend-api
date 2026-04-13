interface AudioStripProps {
  summary: string;
  speakerEnabled: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onToggleSpeaker: () => void;
  onPlay: () => void;
}

export function AudioStrip({
  summary,
  speakerEnabled,
  isPlaying,
  isLoading,
  onToggleSpeaker,
  onPlay
}: AudioStripProps): JSX.Element {
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
    </section>
  );
}

