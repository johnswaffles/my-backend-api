import {
  BUILDING_ECONOMY,
  autoFixBuildingById,
  bulldozeAt,
  buildingContextSummary,
  canUpgradeBuilding,
  scaledEconomyForBuilding,
  upgradeBuildingById,
  upgradeCostForSelection
} from '../game/actions';
import { footprintForType, gameStore, MAX_BUILDING_LEVEL } from '../game/state';
import type { Building } from '../game/state';

interface InfoPanelProps {
  building: Building | null;
  onFocusBuilding?: (x: number, z: number) => void;
}

function prettyType(type: Building['type']): string {
  if (type === 'powerPlant') return 'Power Plant';
  if (type === 'powerLine') return 'Power Line';
  if (type === 'railLine') return 'Rail Line';
  if (type === 'workshop') return 'Workshop';
  if (type === 'substation') return 'Substation';
  if (type === 'trainStation') return 'Train Station';
  if (type === 'cityHall') return 'City Hall';
  if (type === 'groceryStore') return 'Grocery Store';
  if (type === 'cornerStore') return 'Corner Store';
  if (type === 'policeStation') return 'Police Station';
  if (type === 'fireStation') return 'Fire Station';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function iconForType(type: Building['type']): string {
  if (type === 'powerPlant') return 'PW';
  if (type === 'powerLine') return 'PL';
  if (type === 'railLine') return 'RL';
  if (type === 'workshop') return 'WK';
  if (type === 'substation') return 'SS';
  if (type === 'trainStation') return 'TS';
  if (type === 'cityHall') return 'CH';
  if (type === 'restaurant') return 'RT';
  if (type === 'shop') return 'SH';
  if (type === 'groceryStore') return 'GR';
  if (type === 'cornerStore') return 'CS';
  if (type === 'bank') return 'BK';
  if (type === 'policeStation') return 'PL';
  if (type === 'fireStation') return 'FR';
  if (type === 'hospital') return 'HP';
  if (type === 'park') return 'PK';
  if (type === 'house') return 'HS';
  return 'RD';
}

function formatStat(value: number, digits = 0): string {
  if (Math.abs(value) < 0.005) return '0';
  const rounded = Number(value.toFixed(digits));
  return digits > 0 ? rounded.toFixed(digits) : Math.round(rounded).toString();
}

export function InfoPanel({ building, onFocusBuilding }: InfoPanelProps): JSX.Element {
  const state = gameStore.getState();
  const context = building ? buildingContextSummary(state, building) : null;
  const canUpgrade = building ? canUpgradeBuilding(state, building) : false;
  const upgradeCost = building ? upgradeCostForSelection(state, building) : 0;
  const liveStats = building ? scaledEconomyForBuilding(building) : null;
  const nextTierStats =
    building && building.level < MAX_BUILDING_LEVEL
      ? scaledEconomyForBuilding({ type: building.type, level: (building.level + 1) as Building['level'] })
      : null;

  return (
    <aside className="pointer-events-auto panel-glass rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-emerald-300">Selection</div>
      {!building ? (
        <div className="rounded-xl border border-slate-500/30 bg-slate-900/40 p-4 text-sm text-slate-300">
          Select a placed building to inspect it.
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-emerald-300/30 bg-slate-900/50 p-4">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Type</div>
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <span className="rounded-md border border-slate-400/40 bg-slate-700/40 px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-cyan-100">
                {iconForType(building.type)}
              </span>
              {prettyType(building.type)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Grid Position</div>
            <div className="text-sm">X: {building.x} | Z: {building.z}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Level</div>
              <div className="text-sm text-slate-100">Tier {building.level}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Upgrade</div>
              <div className="text-sm text-slate-200">
                {building.level >= MAX_BUILDING_LEVEL ? 'Maxed' : `${Math.round(building.upgradeProgress)} pts`}
              </div>
            </div>
          </div>
          {context ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-500/25 bg-slate-950/30 p-3">
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Appeal</div>
                <div className="text-sm font-medium text-emerald-100">{context.appeal}%</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Block Match</div>
                <div className="text-sm text-slate-100">{context.adjacentMatches}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Cluster</div>
                <div className="text-sm text-slate-100">{context.clusterSize}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Transport / Power</div>
                <div className="text-sm text-slate-100">
                  {context.transportAccess ? 'Connected' : 'No route'} • {context.powerAccess ? 'Powered' : 'No power'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Status</div>
                <div className="text-sm text-slate-100">{context.active ? 'Live' : 'Offline'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Support</div>
                <div className="text-sm text-slate-100">
                  P{context.parkSupport} C{context.commerceSupport} S{context.civicSupport}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Influence</div>
                <div className="text-sm text-slate-100">
                  {['park', 'shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'].includes(building.type)
                    ? 'Local radius'
                    : ['hospital', 'policeStation', 'fireStation', 'trainStation'].includes(building.type)
                      ? 'District radius'
                      : building.type === 'cityHall'
                        ? 'City-core radius'
                        : building.type === 'substation'
                          ? 'Grid radius'
                          : 'Direct frontage'}
                </div>
              </div>
            </div>
          ) : null}
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Style</div>
            <div className="text-sm text-slate-200">{building.customStyleName ?? 'Default look'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Stats</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              <li>Build Cost: ${BUILDING_ECONOMY[building.type].cost}</li>
              <li>Footprint: {footprintForType(building.type).width}x{footprintForType(building.type).depth}</li>
              <li>Jobs: {formatStat(liveStats?.jobs ?? 0)}</li>
              <li>Housing: {formatStat(liveStats?.housing ?? 0)}</li>
              <li>Commerce / Leisure: {formatStat(liveStats?.commerce ?? 0)} / {formatStat(liveStats?.recreation ?? 0)}</li>
              <li>Power: -{formatStat(liveStats?.powerUse ?? 0, 1)} / +{formatStat(liveStats?.powerProduce ?? 0, 1)}</li>
              <li>Essentials: {formatStat(liveStats?.essentials ?? 0)}</li>
              <li>Health / Safety: {formatStat(liveStats?.health ?? 0)} / {formatStat(liveStats?.safety ?? 0)}</li>
              <li>Maintenance: ${formatStat(liveStats?.maintenance ?? 0, 2)}/s</li>
            </ul>
          </div>
          {nextTierStats ? (
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/8 p-3">
              <div className="text-xs uppercase tracking-[0.15em] text-cyan-200">Next Tier Gain</div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-cyan-50">
                <div>Jobs +{formatStat(nextTierStats.jobs - (liveStats?.jobs ?? 0))}</div>
                <div>Housing +{formatStat(nextTierStats.housing - (liveStats?.housing ?? 0))}</div>
                <div>Commerce +{formatStat(nextTierStats.commerce - (liveStats?.commerce ?? 0))}</div>
                <div>Leisure +{formatStat(nextTierStats.recreation - (liveStats?.recreation ?? 0))}</div>
                <div>Essentials +{formatStat(nextTierStats.essentials - (liveStats?.essentials ?? 0))}</div>
                <div>Health +{formatStat(nextTierStats.health - (liveStats?.health ?? 0))}</div>
                <div>Safety +{formatStat(nextTierStats.safety - (liveStats?.safety ?? 0))}</div>
                <div>Power +{formatStat(nextTierStats.powerProduce - (liveStats?.powerProduce ?? 0), 1)}</div>
              </div>
            </div>
          ) : null}
          {building.level < MAX_BUILDING_LEVEL ? (
            <button
              type="button"
              onClick={() => upgradeBuildingById(building.id)}
              disabled={!canUpgrade}
              className="w-full rounded-lg border border-cyan-300/60 bg-cyan-500/18 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/28 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Upgrade to Tier {building.level + 1} (${upgradeCost})
            </button>
          ) : null}
          {!context?.active ? (
            <button
              type="button"
              onClick={() => autoFixBuildingById(building.id)}
              className="w-full rounded-lg border border-amber-300/60 bg-amber-500/18 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-500/28"
            >
              Auto-Fix Connections
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onFocusBuilding?.(building.x, building.z)}
            className="w-full rounded-lg border border-emerald-300/60 bg-emerald-500/16 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/26"
          >
            Focus In View
          </button>
          <button
            type="button"
            onClick={() => bulldozeAt(building.x, building.z)}
            className="w-full rounded-lg border border-rose-300/60 bg-rose-500/20 px-3 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
          >
            Bulldoze (+45% refund)
          </button>
        </div>
      )}
    </aside>
  );
}
