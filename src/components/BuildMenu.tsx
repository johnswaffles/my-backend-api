import { BUILDING_ECONOMY, setPlacementMode } from '../game/actions';
import type { BuildType } from '../game/state';

const BUILD_ITEMS: Array<{ type: BuildType; label: string; desc: string }> = [
  { type: 'road', label: 'Road', desc: 'Connects every district' },
  { type: 'house', label: 'House', desc: 'Adds residents' },
  { type: 'shop', label: 'Shop', desc: 'Commerce + neighborhood jobs' },
  { type: 'restaurant', label: 'Restaurant', desc: 'Food economy + appeal' },
  { type: 'park', label: 'Park', desc: 'Recreation + happiness boost' },
  { type: 'workshop', label: 'Workshop', desc: 'Heavy job producer' },
  { type: 'powerPlant', label: 'Power Plant', desc: 'City-wide electricity' }
];

interface BuildMenuProps {
  placementMode: BuildType | null;
}

export function BuildMenu({ placementMode }: BuildMenuProps): JSX.Element {
  return (
    <aside className="pointer-events-auto panel-glass absolute left-4 top-40 z-20 w-[19.5rem] rounded-2xl p-4 text-slate-100">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-cyan-300">Build Menu</div>
      <div className="max-h-[46vh] overflow-y-auto pr-1">
        <div className="flex flex-col gap-2">
        {BUILD_ITEMS.map((item) => {
          const active = placementMode === item.type;
          return (
            <button
              key={item.type}
              type="button"
              onClick={() => setPlacementMode(active ? null : item.type)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? 'border-cyan-300 bg-cyan-400/20'
                  : 'border-slate-500/30 bg-slate-900/40 hover:border-cyan-200/70 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-slate-300">-${BUILDING_ECONOMY[item.type].cost}</span>
              </div>
              <div className="mt-1 text-xs text-slate-300">{item.desc}</div>
            </button>
          );
        })}
        </div>
      </div>
      <div className="mt-4 text-xs text-slate-300">
        <div>Controls:</div>
        <div>Left click place/select</div>
        <div>Right click or Esc cancel</div>
        <div>Drag RMB/MMB to pan, wheel to zoom</div>
        <div>WASD or arrows to pan</div>
        <div>Top bar toggles AI autoplay</div>
      </div>
    </aside>
  );
}
