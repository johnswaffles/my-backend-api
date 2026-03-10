import { buildStarterTown, cycleGameSpeed, redoAction, resetGame, toggleAiAutoplay, undoAction } from '../game/actions';
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
  economy: {
    income: number;
    maintenance: number;
    penalties: number;
    happinessBonus: number;
    net: number;
  };
  counts: {
    homes: number;
    stores: number;
    civic: number;
    utility: number;
  };
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
  musicEnabled: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
  onToggleMusic: () => void;
  onToggleMobileHud?: () => void;
  mobileHudExpanded?: boolean;
  onFocusHome?: () => void;
  mobile?: boolean;
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
  economy,
  counts,
  gameSpeed,
  undoCount,
  redoCount,
  demand,
  aiAutoplayEnabled,
  aiLastAction,
  musicEnabled,
  isFullscreen,
  onToggleFullscreen,
  onOpenHelp,
  onToggleMusic,
  onToggleMobileHud,
  mobileHudExpanded = true,
  onFocusHome,
  mobile = false
}: TopBarProps): JSX.Element {
  const net = powerProduced - powerUsed;
  const speedLabel = gameSpeed === 0 ? 'Pause' : `${gameSpeed}x`;

  if (mobile) {
    return (
      <div className="pointer-events-auto absolute left-3 right-3 top-3 z-30 flex flex-col gap-2">
        <div className="panel-glass rounded-2xl px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-semibold leading-tight text-white">Cozy Town Builder</div>
              <div className="mt-1 text-[11px] text-slate-200">
                Day {day} • {formatClock(timeOfDay)} • Happy {happiness}%
              </div>
              <div className="mt-1 truncate text-[11px] text-cyan-100">AI: {aiLastAction}</div>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button
                type="button"
                onClick={onToggleMobileHud}
                className="rounded-xl border border-slate-300/40 bg-slate-800/45 px-3 py-2 text-xs font-medium text-slate-100"
              >
                {mobileHudExpanded ? 'Hide HUD' : 'Show HUD'}
              </button>
              <button
                type="button"
                onClick={() => cycleGameSpeed()}
                className="rounded-xl border border-amber-300/60 bg-amber-400/20 px-3 py-2 text-xs font-medium text-amber-100"
              >
                {speedLabel}
              </button>
              <button
                type="button"
                onClick={onToggleMusic}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  musicEnabled
                    ? 'border-fuchsia-300/70 bg-fuchsia-400/18 text-fuchsia-100'
                    : 'border-slate-300/40 bg-slate-800/45 text-slate-100'
                }`}
              >
                {musicEnabled ? 'Music On' : 'Music Off'}
              </button>
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="rounded-xl border border-cyan-300/50 bg-cyan-400/12 px-3 py-2 text-xs font-medium text-cyan-100"
              >
                {isFullscreen ? 'Exit' : 'Full'}
              </button>
              <button
                type="button"
                onClick={onOpenHelp}
                className="rounded-xl border border-slate-300/40 bg-slate-800/45 px-3 py-2 text-xs font-medium text-slate-100"
              >
                Help
              </button>
              <button
                type="button"
                onClick={onFocusHome}
                className="rounded-xl border border-slate-300/40 bg-slate-800/45 px-3 py-2 text-xs font-medium text-slate-100"
              >
                Home
              </button>
            </div>
          </div>
        </div>
        {mobileHudExpanded ? (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Money" value={formatMoney(money)} valueClassName="text-base tabular-nums" />
            <Stat label="People" value={population.toLocaleString()} valueClassName="text-base" />
            <Stat label="Jobs" value={jobs.toLocaleString()} valueClassName="text-base" />
            <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} valueClassName="text-sm" />
            <Stat
              label="Cashflow"
              value={`${economy.net >= 0 ? '+' : ''}$${economy.net.toFixed(2)}/s`}
              valueClassName="text-sm"
            />
            <Stat
              label="Districts"
              value={`H${counts.homes} S${counts.stores} C${counts.civic} U${counts.utility}`}
              valueClassName="text-sm"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => undoAction()}
            disabled={undoCount === 0}
            className="rounded-xl border border-slate-300/50 bg-slate-600/20 px-3 py-2 text-xs font-medium text-slate-100 disabled:opacity-45"
          >
            Undo {undoCount}
          </button>
          <button
            type="button"
            onClick={() => redoAction()}
            disabled={redoCount === 0}
            className="rounded-xl border border-slate-300/50 bg-slate-600/20 px-3 py-2 text-xs font-medium text-slate-100 disabled:opacity-45"
          >
            Redo {redoCount}
          </button>
          <button
            type="button"
            onClick={() => toggleAiAutoplay()}
            className={`rounded-xl border px-3 py-2 text-xs font-medium ${
              aiAutoplayEnabled
                ? 'border-emerald-300/80 bg-emerald-400/25 text-emerald-100'
                : 'border-slate-400/50 bg-slate-700/35 text-slate-100'
            }`}
          >
            {aiAutoplayEnabled ? 'AI On' : 'AI Off'}
          </button>
          <button
            type="button"
            onClick={() => buildStarterTown()}
            className="rounded-xl border border-emerald-300/60 bg-emerald-500/18 px-3 py-2 text-xs font-medium text-emerald-100"
          >
            Starter
          </button>
          <button
            type="button"
            onClick={() => resetGame()}
            className="rounded-xl border border-rose-300/60 bg-rose-500/18 px-3 py-2 text-xs font-medium text-rose-100"
          >
            Restart
          </button>
        </div>
      </div>
    );
  }

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
              onClick={onToggleMusic}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                musicEnabled
                  ? 'border-fuchsia-300/70 bg-fuchsia-400/18 text-fuchsia-100 hover:bg-fuchsia-400/28'
                  : 'border-slate-300/50 bg-slate-700/35 text-slate-100 hover:border-fuchsia-300/60 hover:bg-slate-700/55'
              }`}
            >
              {musicEnabled ? 'Music: ON' : 'Music: OFF'}
            </button>
            <button
              type="button"
              onClick={onOpenHelp}
              className="rounded-xl border border-slate-300/50 bg-slate-700/35 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-300/60 hover:bg-slate-700/55"
            >
              Help
            </button>
            <button
              type="button"
              onClick={() => buildStarterTown()}
              className="rounded-xl border border-emerald-300/60 bg-emerald-400/20 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-400/30"
            >
              Starter Town
            </button>
            <button
              type="button"
              onClick={() => resetGame()}
              className="rounded-xl border border-rose-300/60 bg-rose-500/18 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/28"
            >
              Restart Map
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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-9">
        <Stat
          label="Money"
          value={formatMoney(money)}
          valueClassName="min-w-[10ch] pr-2 text-right tabular-nums"
        />
        <Stat label="Population" value={population.toLocaleString()} />
        <Stat label="Jobs" value={jobs.toLocaleString()} />
        <Stat label="Power" value={`${powerUsed}/${powerProduced} (${net >= 0 ? '+' : ''}${net})`} />
        <Stat
          label="Cashflow"
          value={`${economy.net >= 0 ? '+' : ''}$${economy.net.toFixed(2)}/s`}
          valueClassName="text-sm"
        />
        <Stat
          label="Districts"
          value={`Homes ${counts.homes} • Stores ${counts.stores} • Civic ${counts.civic} • Utility ${counts.utility}`}
          valueClassName="text-sm leading-tight"
        />
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
          value={`Leisure ${demand.recreation} • Transport ${demand.roads} • Power ${demand.power}`}
          valueClassName="text-sm leading-tight"
        />
      </div>
    </div>
  );
}
