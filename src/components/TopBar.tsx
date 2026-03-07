import { cycleGameSpeed, redoAction, toggleAiAutoplay, undoAction } from '../game/actions';
import type { GameSpeed } from '../game/state';

interface TopBarProps {
  money: number;
  population: number;
  jobs: number;
  powerUsed: number;
  powerProduced: number;
  day: number;
  timeOfDay: number;
  happiness: number;
  gameSpeed: GameSpeed;
  undoCount: number;
  redoCount: number;
  demand: {
    housing: number;
    roads: number;
    power: number;
    commerce: number;
    recreation: number;
    jobs: number;
    essentials: number;
    health: number;
    safety: number;
  };
  aiAutoplayEnabled: boolean;
  aiLastAction: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
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
    <div className="panel-glass min-w-0 rounded-xl px-4 py-2 shadow-glow">
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

function formatClock(timeOfDay: number): string {
  const hours24 = Math.floor(timeOfDay) % 24;
  const minutes = Math.floor((timeOfDay % 1) * 60);
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function TopBar({
  money,
  population,
  jobs,
  powerUsed,
  powerProduced,
  day,
  timeOfDay,
  happiness,
  gameSpeed,
  undoCount,
  redoCount,
  demand,
  aiAutoplayEnabled,
  aiLastAction,
  isFullscreen,
  onToggleFullscreen
}: TopBarProps): JSX.Element {
  const net = powerProduced - powerUsed;
  const speedLabel = gameSpeed === 0 ? 'Pause' : `${gameSpeed}x`;

  return (
    <div className="pointer-events-auto absolute left-4 right-4 top-4 z-30 flex flex-col gap-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="panel-glass rounded-2xl px-5 py-4">
          <div className="text-2xl font-semibold leading-tight text-white">Cozy Town Builder</div>
          <div className="text-xs text-slate-300">Cozy block builder: storefronts, services, and neighborhood growth</div>
          <div className="mt-1 text-xs text-slate-100">Day {day} | {formatClock(timeOfDay)} | Happiness {happiness}%</div>
          <div className="mt-1 max-w-[42rem] truncate text-xs text-cyan-100">AI: {aiLastAction}</div>
        </div>
        <div className="grid shrink-0 grid-cols-[auto_auto] items-start gap-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-400/35 bg-slate-900/35 p-2">
            <button
              type="button"
              onClick={() => undoAction()}
              disabled={undoCount === 0}
              className="rounded-xl border border-slate-300/50 bg-slate-600/20 px-3 py-2 text-sm font-medium text-slate-100 transition enabled:hover:bg-slate-600/35 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Undo ({undoCount})
            </button>
            <button
              type="button"
              onClick={() => redoAction()}
              disabled={redoCount === 0}
              className="rounded-xl border border-slate-300/50 bg-slate-600/20 px-3 py-2 text-sm font-medium text-slate-100 transition enabled:hover:bg-slate-600/35 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Redo ({redoCount})
            </button>
            <button
              type="button"
              onClick={() => undoAction()}
              disabled={undoCount === 0}
              className="rounded-xl border border-slate-400/40 bg-slate-800/45 px-3 py-1.5 text-xs font-medium text-slate-200 transition enabled:hover:bg-slate-700/55 disabled:cursor-not-allowed disabled:opacity-45"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => redoAction()}
              disabled={redoCount === 0}
              className="rounded-xl border border-slate-400/40 bg-slate-800/45 px-3 py-1.5 text-xs font-medium text-slate-200 transition enabled:hover:bg-slate-700/55 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next →
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => cycleGameSpeed()}
              className="rounded-xl border border-amber-300/60 bg-amber-400/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-400/30"
            >
              Speed: {speedLabel}
            </button>
            <button
              type="button"
              onClick={() => toggleAiAutoplay()}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                aiAutoplayEnabled
                  ? 'border-emerald-300/80 bg-emerald-400/25 text-emerald-100'
                  : 'border-slate-400/50 bg-slate-700/35 text-slate-100 hover:border-cyan-300/60 hover:bg-slate-700/55'
              }`}
            >
              {aiAutoplayEnabled ? 'AI Auto: ON' : 'AI Auto: OFF'}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-xl border border-cyan-300/50 bg-cyan-400/12 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/22"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-7">
        <Stat
          label="Money"
          value={formatMoney(money)}
          valueClassName="min-w-[10ch] pr-2 text-right tabular-nums"
        />
        <Stat label="Population" value={population.toLocaleString()} />
        <Stat label="Jobs" value={jobs.toLocaleString()} />
        <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} />
        <Stat
          label="Growth"
          value={`Homes ${demand.housing} • Stores ${demand.commerce} • Jobs ${demand.jobs}`}
          valueClassName="text-sm leading-tight"
        />
        <Stat
          label="Services"
          value={`Food ${demand.essentials} • Health ${demand.health} • Safety ${demand.safety}`}
          valueClassName="text-sm leading-tight"
        />
        <Stat
          label="Town Needs"
          value={`Leisure ${demand.recreation} • Roads ${demand.roads} • Power ${demand.power}`}
          valueClassName="text-sm leading-tight"
        />
      </div>
    </div>
  );
}
