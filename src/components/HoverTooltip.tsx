import { BUILDING_ECONOMY } from '../game/actions';
import type { GameState } from '../game/state';

interface HoverTooltipProps {
  state: GameState;
}

function typeLabel(type: string): string {
  if (type === 'powerPlant') return 'Power Plant';
  if (type === 'bank') return 'Bank';
  if (type === 'hospital') return 'Hospital';
  if (type === 'groceryStore') return 'Grocery Store';
  if (type === 'cornerStore') return 'Corner Store';
  if (type === 'policeStation') return 'Police Station';
  if (type === 'fireStation') return 'Fire Station';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function HoverTooltip({ state }: HoverTooltipProps): JSX.Element | null {
  const cell = state.hoverCell;
  if (!cell) return null;

  const building = state.buildings.find((b) => b.x === cell.x && b.z === cell.z) ?? null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 w-[20rem] -translate-x-1/2 rounded-xl border border-cyan-200/35 bg-slate-900/75 px-4 py-3 text-sm text-slate-100 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200">
        Tile X:{cell.x} Z:{cell.z}
      </div>
      {building ? (
        <div className="mt-1">
          <div className="font-semibold">{typeLabel(building.type)}</div>
          <div className="text-xs text-slate-300">
            Cost ${BUILDING_ECONOMY[building.type].cost} | Jobs {BUILDING_ECONOMY[building.type].jobs} | Housing{' '}
            {BUILDING_ECONOMY[building.type].housing}
          </div>
        </div>
      ) : (
        <div className="mt-1 text-xs text-slate-300">
          {state.placementMode
            ? cell.valid
              ? 'Valid build tile'
              : 'Invalid placement here'
            : 'Empty tile'}
        </div>
      )}
    </div>
  );
}
