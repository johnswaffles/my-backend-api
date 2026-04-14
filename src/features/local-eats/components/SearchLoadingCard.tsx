export function SearchLoadingCard(): JSX.Element {
  return (
    <div className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-8 shadow-[0_18px_50px_rgba(62,84,50,0.1)]">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div
            className="absolute inset-4 rounded-full bg-amber-300/25 blur-2xl"
            style={{ animation: 'food-bob 3s ease-in-out infinite' }}
          />
          <div
            className="absolute left-1/2 top-1 h-12 w-1 -translate-x-1/2 rounded-full bg-white/70 blur-[1px]"
            style={{ animation: 'food-steam 2.4s ease-in-out infinite' }}
          />
          <div
            className="absolute left-[52%] top-3 h-10 w-1 -translate-x-1/2 rounded-full bg-white/55 blur-[1px]"
            style={{ animation: 'food-steam 2.4s ease-in-out infinite', animationDelay: '180ms' }}
          />

          <div className="absolute bottom-5 h-5 w-20 rounded-full bg-stone-300/70 shadow-[0_8px_22px_rgba(84,93,71,0.15)]" />
          <div
            className="absolute bottom-[2rem] h-6 w-[4.5rem] rounded-[1rem] bg-amber-700 shadow-[0_10px_18px_rgba(153,93,38,0.18)]"
            style={{ animation: 'food-layer-rise 2.8s ease-in-out infinite' }}
          />
          <div
            className="absolute bottom-[2.7rem] h-2.5 w-16 rounded-full bg-amber-300"
            style={{ animation: 'food-layer-rise 2.8s ease-in-out infinite', animationDelay: '140ms' }}
          />
          <div
            className="absolute bottom-[3.25rem] h-3.5 w-[4.5rem] rounded-full bg-emerald-500/85"
            style={{ animation: 'food-layer-rise 2.8s ease-in-out infinite', animationDelay: '240ms' }}
          />
          <div
            className="absolute bottom-[4rem] h-2.5 w-16 rounded-full bg-rose-400"
            style={{ animation: 'food-layer-rise 2.8s ease-in-out infinite', animationDelay: '320ms' }}
          />
          <div
            className="absolute bottom-[4.6rem] h-4 w-20 rounded-t-[1rem] rounded-b-[0.45rem] bg-amber-200 shadow-[0_10px_20px_rgba(180,109,36,0.12)]"
            style={{ animation: 'food-bob 3s ease-in-out infinite' }}
          />
          <div className="absolute left-5 right-5 top-10 h-1 rounded-full bg-white/60" />
          <div className="absolute left-7 top-8 h-1.5 w-1.5 rounded-full bg-white/90" />
          <div className="absolute right-7 top-9 h-1.5 w-1.5 rounded-full bg-white/90" />
        </div>

        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900/70">
            Cooking up verified matches
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
            618FOOD.COM is checking the map and the web.
          </h3>
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">
            We&apos;re gathering local signals, verifying businesses, and sorting the strongest rural-first pick.
          </p>
        </div>
      </div>
    </div>
  );
}
