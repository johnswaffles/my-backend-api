import { toggleAiAutoplay } from '../game/actions';

interface TopBarProps {
  money: number;
  population: number;
  powerUsed: number;
  powerProduced: number;
  aiAutoplayEnabled: boolean;
  aiLastAction: string;
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="panel-glass rounded-xl px-4 py-2 shadow-glow">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

export function TopBar({
  money,
  population,
  powerUsed,
  powerProduced,
  aiAutoplayEnabled,
  aiLastAction
}: TopBarProps): JSX.Element {
  const net = powerProduced - powerUsed;
  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-4">
      <div className="panel-glass rounded-2xl px-5 py-3">
        <div className="text-xl font-semibold text-white">Cozy Town Builder</div>
        <div className="text-xs text-slate-300">Vertical Slice: Isometric 2.5D Prototype</div>
        <div className="mt-1 text-xs text-cyan-100">AI: {aiLastAction}</div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => toggleAiAutoplay()}
          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
            aiAutoplayEnabled
              ? 'border-emerald-300/80 bg-emerald-400/25 text-emerald-100'
              : 'border-slate-400/50 bg-slate-700/35 text-slate-100 hover:border-cyan-300/60 hover:bg-slate-700/55'
          }`}
        >
          {aiAutoplayEnabled ? 'AI Auto: ON' : 'AI Auto: OFF'}
        </button>
        <Stat label="Money" value={`$${money.toLocaleString()}`} />
        <Stat label="Population" value={population.toLocaleString()} />
        <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} />
      </div>
    </div>
  );
}
