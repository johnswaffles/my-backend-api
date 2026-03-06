import { BUILDING_ECONOMY, bulldozeAt } from '../game/actions';
import { footprintForType, gameStore } from '../game/state';
import type { Building } from '../game/state';

interface InfoPanelProps {
  building: Building | null;
}

function prettyType(type: Building['type']): string {
  if (type === 'powerPlant') return 'Power Plant';
  if (type === 'workshop') return 'Workshop';
  if (type === 'groceryStore') return 'Grocery Store';
  if (type === 'cornerStore') return 'Corner Store';
  if (type === 'policeStation') return 'Police Station';
  if (type === 'fireStation') return 'Fire Station';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function iconForType(type: Building['type']): string {
  if (type === 'powerPlant') return 'PW';
  if (type === 'workshop') return 'WK';
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

export function InfoPanel({ building }: InfoPanelProps): JSX.Element {
  const currentVariation =
    building?.assetVariationId == null
      ? null
      : gameStore
          .getState()
          .assetLibrary[building.type]
          ?.find((variation) => variation.id === building.assetVariationId) ?? null;

  return (
    <aside className="pointer-events-auto panel-glass rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-emerald-300">Selection</div>
      {!building ? (
        <div className="rounded-xl border border-slate-500/30 bg-slate-900/40 p-4 text-sm text-slate-300">
          Click a placed building to inspect it.
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
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Style</div>
            <div className="text-sm text-slate-200">{currentVariation?.name ?? 'Default look'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Stats</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              <li>Build Cost: ${BUILDING_ECONOMY[building.type].cost}</li>
              <li>Footprint: {footprintForType(building.type).width}x{footprintForType(building.type).depth}</li>
              <li>Jobs: {BUILDING_ECONOMY[building.type].jobs}</li>
              <li>Housing: {BUILDING_ECONOMY[building.type].housing}</li>
              <li>Power: -{BUILDING_ECONOMY[building.type].powerUse} / +{BUILDING_ECONOMY[building.type].powerProduce}</li>
              <li>Essentials: {BUILDING_ECONOMY[building.type].essentials}</li>
              <li>Health / Safety: {BUILDING_ECONOMY[building.type].health} / {BUILDING_ECONOMY[building.type].safety}</li>
            </ul>
          </div>
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
