import { BUILDING_ECONOMY, setPlacementMode } from '../game/actions';
import type { BuildType } from '../game/state';

interface BuildItem {
  type: BuildType;
  label: string;
  desc: string;
  icon: string;
  hotkey?: string;
}

const BUILD_SECTIONS: Array<{ title: string; accent: string; items: BuildItem[] }> = [
  {
    title: 'Streets + Homes',
    accent: 'text-cyan-200',
    items: [
      { type: 'road', label: 'Road', desc: 'Block layout and frontage', icon: 'RD', hotkey: '1' },
      { type: 'house', label: 'House', desc: 'Residents and block life', icon: 'HS', hotkey: '2' }
    ]
  },
  {
    title: 'Commerce',
    accent: 'text-amber-200',
    items: [
      { type: 'shop', label: 'Shop', desc: 'Main street retail', icon: 'SH', hotkey: '3' },
      { type: 'restaurant', label: 'Restaurant', desc: 'Food and night glow', icon: 'RT', hotkey: '4' },
      { type: 'groceryStore', label: 'Grocery', desc: 'Essential daily goods', icon: 'GR' },
      { type: 'cornerStore', label: 'Corner Store', desc: 'Small convenience frontage', icon: 'CS' },
      { type: 'bank', label: 'Bank', desc: 'Finance and district prestige', icon: 'BK' }
    ]
  },
  {
    title: 'Civic + Wellness',
    accent: 'text-rose-200',
    items: [
      { type: 'park', label: 'Park', desc: 'Recreation and beauty', icon: 'PK', hotkey: '5' },
      { type: 'hospital', label: 'Hospital', desc: 'Health coverage and jobs', icon: 'HP' },
      { type: 'policeStation', label: 'Police', desc: 'Safety and order', icon: 'PL' },
      { type: 'fireStation', label: 'Fire', desc: 'Emergency response', icon: 'FR' }
    ]
  },
  {
    title: 'Industry + Utilities',
    accent: 'text-violet-200',
    items: [
      { type: 'workshop', label: 'Workshop', desc: 'Block-scale industry', icon: 'WK', hotkey: '6' },
      { type: 'powerPlant', label: 'Power Plant', desc: 'Electricity for growth', icon: 'PW', hotkey: '7' }
    ]
  }
];

interface BuildMenuProps {
  placementMode: BuildType | null;
}

function BuildButton({
  item,
  active
}: {
  item: BuildItem;
  active: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => setPlacementMode(active ? null : item.type)}
      className={`rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-cyan-300 bg-cyan-400/18 shadow-[0_0_0_1px_rgba(103,232,249,0.12)]'
          : 'border-slate-500/30 bg-slate-900/38 hover:border-cyan-200/70 hover:bg-slate-800/70'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
          <span className="rounded-md border border-slate-400/40 bg-slate-700/40 px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-cyan-100">
            {item.icon}
          </span>
          {item.label}
        </span>
        <span className="text-xs text-slate-300">-${BUILDING_ECONOMY[item.type].cost}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3 text-xs text-slate-300">
        <span>{item.desc}</span>
        {item.hotkey ? (
          <span className="rounded border border-slate-500/50 px-1 py-0.5 text-[10px] text-slate-300">
            {item.hotkey}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function BuildMenu({ placementMode }: BuildMenuProps): JSX.Element {
  return (
    <aside className="pointer-events-auto panel-glass flex min-h-0 flex-col rounded-2xl p-4 text-slate-100 shadow-glow">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">Build Palette</div>
        <div className="text-[11px] text-slate-300">Cozy block kit</div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {BUILD_SECTIONS.map((section) => (
          <div key={section.title}>
            <div className={`mb-2 text-[11px] uppercase tracking-[0.16em] ${section.accent}`}>{section.title}</div>
            <div className="grid grid-cols-1 gap-2">
              {section.items.map((item) => (
                <BuildButton key={item.type} item={item} active={placementMode === item.type} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-slate-500/25 pt-3 text-xs text-slate-300">
        <div>Left click: place/select</div>
        <div>Wheel: zoom</div>
        <div>Right click or Esc: cancel</div>
        <div>WASD: pan</div>
        <div>1-7: quick build core tools</div>
        <div>Delete: bulldoze selected</div>
      </div>
    </aside>
  );
}
