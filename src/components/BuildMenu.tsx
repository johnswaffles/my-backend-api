import { BUILDING_ECONOMY, setPlacementMode } from '../game/actions';
import type { BuildType } from '../game/state';
import { useMemo, useState } from 'react';

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
      { type: 'house', label: 'House', desc: 'Homes and neighborhood life', icon: 'HS', hotkey: '2' }
    ]
  },
  {
    title: 'Commerce',
    accent: 'text-amber-200',
    items: [
      { type: 'shop', label: 'Shop', desc: 'Main street retail', icon: 'SH', hotkey: '3' },
      { type: 'restaurant', label: 'Restaurant', desc: 'Dining and street life', icon: 'RT', hotkey: '4' },
      { type: 'groceryStore', label: 'Grocery', desc: 'Daily essentials', icon: 'GR' },
      { type: 'cornerStore', label: 'Corner Store', desc: 'Compact convenience retail', icon: 'CS' },
      { type: 'bank', label: 'Bank', desc: 'Finance and civic prestige', icon: 'BK' }
    ]
  },
  {
    title: 'Civic + Wellness',
    accent: 'text-rose-200',
    items: [
      { type: 'park', label: 'Park', desc: 'Beauty and recreation', icon: 'PK', hotkey: '5' },
      { type: 'hospital', label: 'Hospital', desc: 'Regional care campus', icon: 'HP' },
      { type: 'policeStation', label: 'Police', desc: 'Safety and order', icon: 'PL' },
      { type: 'fireStation', label: 'Fire', desc: 'Fast emergency response', icon: 'FR' }
    ]
  },
  {
    title: 'Industry + Utilities',
    accent: 'text-violet-200',
    items: [
      { type: 'workshop', label: 'Workshop', desc: 'Light industry and jobs', icon: 'WK', hotkey: '6' },
      { type: 'powerPlant', label: 'Power Plant', desc: 'Grid power for expansion', icon: 'PW', hotkey: '7' }
    ]
  }
];

interface BuildMenuProps {
  placementMode: BuildType | null;
  mobile?: boolean;
}

type MobileFilter = 'all' | 'core' | 'commerce' | 'civic' | 'utility';

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
      className={`rounded-xl border px-2.5 py-2.5 text-left transition ${
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
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-300">
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

export function BuildMenu({ placementMode, mobile = false }: BuildMenuProps): JSX.Element {
  const flatItems = BUILD_SECTIONS.flatMap((section) => section.items);
  const [mobileFilter, setMobileFilter] = useState<MobileFilter>('core');

  const filteredMobileItems = useMemo(() => {
    if (mobileFilter === 'all') return flatItems;
    if (mobileFilter === 'core') return flatItems.filter((item) => item.type === 'road' || item.type === 'house' || item.type === 'park');
    if (mobileFilter === 'commerce') {
      return flatItems.filter((item) =>
        ['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'].includes(item.type)
      );
    }
    if (mobileFilter === 'civic') {
      return flatItems.filter((item) =>
        ['hospital', 'policeStation', 'fireStation', 'park'].includes(item.type)
      );
    }
    return flatItems.filter((item) => ['workshop', 'powerPlant'].includes(item.type));
  }, [flatItems, mobileFilter]);

  if (mobile) {
    return (
      <aside className="pointer-events-auto panel-glass rounded-2xl p-3 text-slate-100 shadow-glow">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">Build</div>
          <div className="text-[11px] text-slate-300">Tap a tool, then tap the map</div>
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {[
            ['core', 'Core'],
            ['commerce', 'Commerce'],
            ['civic', 'Civic'],
            ['utility', 'Utility'],
            ['all', 'All']
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMobileFilter(value as MobileFilter)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                mobileFilter === value
                  ? 'border-cyan-300 bg-cyan-400/18 text-cyan-100'
                  : 'border-slate-500/30 bg-slate-900/38 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filteredMobileItems.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setPlacementMode(placementMode === item.type ? null : item.type)}
              className={`rounded-xl border px-2.5 py-2.5 text-left transition ${
                placementMode === item.type
                  ? 'border-cyan-300 bg-cyan-400/18 shadow-[0_0_0_1px_rgba(103,232,249,0.12)]'
                  : 'border-slate-500/30 bg-slate-900/38'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md border border-slate-400/40 bg-slate-700/40 px-1.5 py-0.5 text-[10px] tracking-[0.12em] text-cyan-100">
                  {item.icon}
                </span>
                <span className="text-[11px] text-slate-300">-${BUILDING_ECONOMY[item.type].cost}</span>
              </div>
              <div className="mt-2 text-sm font-medium">{item.label}</div>
              <div className="mt-1 text-[11px] leading-tight text-slate-300">{item.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-slate-300">
          Filter tools by district type. Tap to place. Drag one finger to pan. Pinch to zoom. Tap a building for details. Roads can be painted by dragging after the first tap.
        </div>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto panel-glass flex min-h-0 flex-col rounded-2xl p-3 text-slate-100 shadow-glow">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-300">Build Palette</div>
        <div className="text-[11px] text-slate-300">Direct build palette</div>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
      <div className="mt-3 grid grid-cols-1 gap-y-1 border-t border-slate-500/25 pt-3 text-[11px] text-slate-300">
        <div>Left click: place/select</div>
        <div>Road tool: click-drag to paint</div>
        <div>Alt + drag: bulldoze brush</div>
        <div>Right click or Esc: cancel</div>
        <div>Wheel: zoom</div>
        <div>WASD: pan</div>
        <div>1-7: quick build core tools</div>
        <div>Delete: bulldoze selected</div>
      </div>
    </aside>
  );
}
