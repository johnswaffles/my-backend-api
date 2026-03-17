import {
  buildMainStreetTemplate,
  buildResidentialTemplate,
  buildStarterTown,
  buildTransitHubTemplate,
  cycleGameSpeed,
  redoAction,
  resetGame,
  undoAction
} from '../game/actions';
import type { GameSpeed, OverlayMode } from '../game/state';

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
  overlayMode: OverlayMode;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenHelp: () => void;
  onToggleMusic: () => void;
  onOverlayChange: (mode: OverlayMode) => void;
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
            </div>
            <div className="flex max-w-[12.75rem] shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onToggleMobileHud}
                className="rounded-xl border border-slate-200/70 bg-slate-800/82 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)]"
              >
                {mobileHudExpanded ? 'Hide HUD' : 'Show HUD'}
              </button>
              <button
                type="button"
                onClick={() => cycleGameSpeed()}
                className="rounded-xl border border-amber-200/80 bg-amber-500/32 px-3 py-1.5 text-[11px] font-semibold text-amber-50 shadow-[0_10px_24px_rgba(120,53,15,0.22)]"
              >
                {speedLabel}
              </button>
              <button
                type="button"
                onClick={onToggleMusic}
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-semibold shadow-[0_10px_24px_rgba(30,41,59,0.24)] ${
                  musicEnabled
                    ? 'border-fuchsia-200/80 bg-fuchsia-500/30 text-fuchsia-50'
                    : 'border-slate-200/70 bg-slate-800/82 text-white'
                }`}
              >
                {musicEnabled ? 'Music On' : 'Music Off'}
              </button>
              <button
                type="button"
                onClick={onOpenHelp}
                className="rounded-xl border border-slate-200/70 bg-slate-800/82 px-3 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)]"
              >
                Help
              </button>
              <button
                type="button"
                onClick={onFocusHome}
                className="rounded-xl border border-cyan-200/75 bg-cyan-500/24 px-3 py-1.5 text-[11px] font-semibold text-cyan-50 shadow-[0_10px_24px_rgba(8,145,178,0.22)]"
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
            onClick={() => buildResidentialTemplate()}
            className="rounded-xl border border-cyan-200/80 bg-cyan-500/28 px-3 py-2 text-xs font-semibold text-cyan-50 shadow-[0_10px_24px_rgba(8,145,178,0.2)]"
          >
            Resi
          </button>
          <button
            type="button"
            onClick={() => buildMainStreetTemplate()}
            className="rounded-xl border border-amber-200/80 bg-amber-500/28 px-3 py-2 text-xs font-semibold text-amber-50 shadow-[0_10px_24px_rgba(180,83,9,0.2)]"
          >
            Street
          </button>
          <button
            type="button"
            onClick={() => buildTransitHubTemplate()}
            className="rounded-xl border border-violet-200/80 bg-violet-500/28 px-3 py-2 text-xs font-semibold text-violet-50 shadow-[0_10px_24px_rgba(109,40,217,0.2)]"
          >
            Hub
          </button>
          <button
            type="button"
            onClick={() => undoAction()}
            disabled={undoCount === 0}
            className="rounded-xl border border-slate-200/70 bg-slate-800/82 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] disabled:opacity-45"
          >
            Undo {undoCount}
          </button>
          <button
            type="button"
            onClick={() => redoAction()}
            disabled={redoCount === 0}
            className="rounded-xl border border-slate-200/70 bg-slate-800/82 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] disabled:opacity-45"
          >
            Redo {redoCount}
          </button>
          <button
            type="button"
            onClick={() => buildStarterTown()}
            className="rounded-xl border border-emerald-200/80 bg-emerald-500/28 px-3 py-2 text-xs font-semibold text-emerald-50 shadow-[0_10px_24px_rgba(5,150,105,0.2)]"
          >
            Starter
          </button>
          <button
            type="button"
            onClick={() => resetGame()}
            className="rounded-xl border border-rose-200/80 bg-rose-500/28 px-3 py-2 text-xs font-semibold text-rose-50 shadow-[0_10px_24px_rgba(225,29,72,0.2)]"
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
        </div>
        <div className="grid shrink-0 grid-cols-[auto_auto] items-start gap-2">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-300/55 bg-slate-900/68 p-2 shadow-[0_18px_32px_rgba(15,23,42,0.22)]">
            <button
              type="button"
              onClick={() => undoAction()}
              disabled={undoCount === 0}
              className="rounded-xl border border-slate-200/70 bg-slate-800/84 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:bg-slate-700/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Undo ({undoCount})
            </button>
            <button
              type="button"
              onClick={() => redoAction()}
              disabled={redoCount === 0}
              className="rounded-xl border border-slate-200/70 bg-slate-800/84 px-3 py-2 text-sm font-semibold text-white transition enabled:hover:bg-slate-700/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Redo ({redoCount})
            </button>
            <button
              type="button"
              onClick={() => undoAction()}
              disabled={undoCount === 0}
              className="rounded-xl border border-slate-200/55 bg-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-100 transition enabled:hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => redoAction()}
              disabled={redoCount === 0}
              className="rounded-xl border border-slate-200/55 bg-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-100 transition enabled:hover:bg-slate-600/90 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next →
            </button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => cycleGameSpeed()}
              className="rounded-xl border border-amber-200/80 bg-amber-500/32 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/42"
            >
              Speed: {speedLabel}
            </button>
            <button
              type="button"
              onClick={onToggleMusic}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                musicEnabled
                  ? 'border-fuchsia-200/80 bg-fuchsia-500/30 text-fuchsia-50 hover:bg-fuchsia-500/40'
                  : 'border-slate-200/70 bg-slate-800/84 text-white hover:border-fuchsia-200/70 hover:bg-slate-700/90'
              }`}
            >
              {musicEnabled ? 'Music: ON' : 'Music: OFF'}
            </button>
            <button
              type="button"
              onClick={onOpenHelp}
              className="rounded-xl border border-slate-200/70 bg-slate-800/84 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-200/70 hover:bg-slate-700/90"
            >
              Help
            </button>
            <button
              type="button"
              onClick={() => buildStarterTown()}
              className="rounded-xl border border-emerald-200/80 bg-emerald-500/30 px-3 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-500/40"
            >
              Starter Town
            </button>
            <button
              type="button"
              onClick={() => buildResidentialTemplate()}
              className="rounded-xl border border-cyan-200/80 bg-cyan-500/28 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/38"
            >
              Resi Block
            </button>
            <button
              type="button"
              onClick={() => buildMainStreetTemplate()}
              className="rounded-xl border border-amber-200/80 bg-amber-500/28 px-3 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-500/38"
            >
              Main Street
            </button>
            <button
              type="button"
              onClick={() => buildTransitHubTemplate()}
              className="rounded-xl border border-violet-200/80 bg-violet-500/28 px-3 py-2 text-sm font-semibold text-violet-50 transition hover:bg-violet-500/38"
            >
              Transit Hub
            </button>
            <button
              type="button"
              onClick={() => resetGame()}
              className="rounded-xl border border-rose-200/80 bg-rose-500/30 px-3 py-2 text-sm font-semibold text-rose-50 transition hover:bg-rose-500/40"
            >
              Restart Map
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="rounded-xl border border-cyan-200/80 bg-cyan-500/24 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-500/34"
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
