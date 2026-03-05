import type { Building } from '../game/state';

interface InfoPanelProps {
  building: Building | null;
}

function prettyType(type: Building['type']): string {
  if (type === 'powerPlant') return 'Power Plant';
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function InfoPanel({ building }: InfoPanelProps): JSX.Element {
  return (
    <aside className="pointer-events-auto panel-glass absolute right-4 top-28 z-20 w-80 rounded-2xl p-4 text-slate-100">
      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-emerald-300">Selection</div>
      {!building ? (
        <div className="rounded-xl border border-slate-500/30 bg-slate-900/40 p-4 text-sm text-slate-300">
          Click a placed building to inspect it.
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-emerald-300/30 bg-slate-900/50 p-4">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Type</div>
            <div className="text-lg font-semibold text-white">{prettyType(building.type)}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Grid Position</div>
            <div className="text-sm">X: {building.x} | Z: {building.z}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-slate-400">Stats (Placeholder)</div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
              <li>Condition: 100%</li>
              <li>Efficiency: 92%</li>
              <li>Maintenance: Low</li>
            </ul>
          </div>
        </div>
      )}
    </aside>
  );
}
