import { cycleGameSpeed, toggleAiAutoplay } from '../game/actions';

interface TopBarProps {
  money: number;
  population: number;
  jobs: number;
  powerUsed: number;
  powerProduced: number;
  day: number;
  happiness: number;
  gameSpeed: 0 | 1 | 2;
  demand: {
    housing: number;
    roads: number;
    power: number;
    commerce: number;
    recreation: number;
    jobs: number;
  };
  aiAutoplayEnabled: boolean;
  aiLastAction: string;
}

function Stat({
  label,
  value,
  valueClassName = ''
}: {
  label: string;
  value: string;
  valueClassName?: string;
}): JSX.Element {
  return (
    <div className="panel-glass min-w-[10.25rem] whitespace-nowrap rounded-xl px-4 py-2 shadow-glow">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">{label}</div>
      <div className={`text-lg font-semibold text-white ${valueClassName}`}>{value}</div>
    </div>
  );
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

export function TopBar({
  money,
  population,
  jobs,
  powerUsed,
  powerProduced,
  day,
  happiness,
  gameSpeed,
  demand,
  aiAutoplayEnabled,
  aiLastAction
}: TopBarProps): JSX.Element {
  const net = powerProduced - powerUsed;
  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-20 flex items-center justify-between gap-4">
      <div className="panel-glass rounded-2xl px-5 py-3">
        <div className="text-xl font-semibold text-white">Cozy Town Builder</div>
        <div className="text-xs text-slate-300">Vertical Slice: Isometric 2.5D Prototype</div>
        <div className="mt-1 text-xs text-slate-100">Day {day} | Happiness {happiness}%</div>
        <div className="mt-1 text-xs text-cyan-100">AI: {aiLastAction}</div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => cycleGameSpeed()}
          className="rounded-xl border border-amber-300/60 bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/30"
        >
          Speed: {gameSpeed === 0 ? 'Pause' : `${gameSpeed}x`}
        </button>
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
        <Stat
          label="Money"
          value={formatMoney(money)}
          valueClassName="min-w-[10ch] pr-2 text-right tabular-nums"
        />
        <Stat label="Population" value={population.toLocaleString()} />
        <Stat label="Jobs" value={jobs.toLocaleString()} />
        <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} />
        <Stat
          label="Demand"
          value={`H ${demand.housing} C ${demand.commerce} J ${demand.jobs} P ${demand.power}`}
          valueClassName="text-base"
        />
      </div>
    </div>
  );
}
