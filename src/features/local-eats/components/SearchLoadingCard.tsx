export function SearchLoadingCard(): JSX.Element {
  return (
    <div className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-6 py-8 shadow-[0_18px_50px_rgba(62,84,50,0.1)]">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-x-1/2 top-2 h-3 w-8 -translate-x-1/2 rounded-full bg-orange-200/80 blur-sm animate-pulse" />
          <div className="absolute inset-x-1/2 top-5 h-2 w-10 -translate-x-1/2 rounded-full bg-orange-100/70 blur-sm animate-pulse [animation-delay:120ms]" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-orange-200 bg-white shadow-[0_12px_30px_rgba(180,109,36,0.12)]">
            <div className="absolute top-3 flex gap-1">
              <span className="h-3 w-3 rounded-full bg-amber-200" />
              <span className="h-3 w-3 rounded-full bg-amber-200" />
            </div>
            <div className="absolute inset-x-4 bottom-5 h-5 rounded-b-[1rem] rounded-t-[0.7rem] bg-gradient-to-r from-amber-500 via-orange-400 to-emerald-600 shadow-inner" />
            <div className="absolute inset-x-5 bottom-8 h-2 rounded-full bg-amber-200/80" />
            <div className="absolute left-4 right-4 top-9 h-5 rounded-[0.8rem] bg-rose-200/70" />
            <div className="absolute bottom-2 left-3 right-3 h-3 rounded-full bg-emerald-300/70" />
          </div>
        </div>

        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-900/70">
            Cooking up verified matches
          </div>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[#173528] sm:text-3xl">
            618FOOD.COM is checking the map and the web.
          </h3>
          <p className="mt-2 text-sm leading-7 text-stone-600 sm:text-base">
            We&apos;re gathering local signals, verifying businesses, and sorting out the best rural-first options.
          </p>
        </div>
      </div>
    </div>
  );
}
