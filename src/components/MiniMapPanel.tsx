import { useMemo, useState } from 'react';
import { buildingContextSummary } from '../game/actions';
import type { BuildType, GameState } from '../game/state';

type OverlayMode = 'base' | 'appeal' | 'power' | 'services' | 'tiers';

interface MiniMapPanelProps {
  state: GameState;
  mobile?: boolean;
  onFocusCell: (x: number, z: number) => void;
}

function buildingColor(type: BuildType): string {
  if (type === 'road') return '#5f6d7b';
  if (type === 'house') return '#b38b6d';
  if (type === 'shop') return '#8cc4f1';
  if (type === 'restaurant') return '#efb57a';
  if (type === 'groceryStore') return '#8ccf8d';
  if (type === 'cornerStore') return '#b7d889';
  if (type === 'bank') return '#d7c07d';
  if (type === 'park') return '#72aa65';
  if (type === 'workshop') return '#a68b74';
  if (type === 'powerPlant') return '#92a2b1';
  if (type === 'hospital') return '#d9e9f5';
  if (type === 'policeStation') return '#8aa6c5';
  if (type === 'fireStation') return '#d48376';
  return '#8aa29a';
}

function tierColor(level: number): string {
  if (level >= 10) return '#f43f5e';
  if (level === 9) return '#fb7185';
  if (level === 8) return '#c084fc';
  if (level === 7) return '#a78bfa';
  if (level === 6) return '#22d3ee';
  if (level >= 5) return '#f59e0b';
  if (level === 4) return '#fb7185';
  if (level === 3) return '#60a5fa';
  if (level === 2) return '#86efac';
  return '#cbd5e1';
}

function gradientColor(percent: number, low: [number, number, number], high: [number, number, number]): string {
  const t = Math.max(0, Math.min(1, percent / 100));
  const r = Math.round(low[0] + (high[0] - low[0]) * t);
  const g = Math.round(low[1] + (high[1] - low[1]) * t);
  const b = Math.round(low[2] + (high[2] - low[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function MiniMapPanel({ state, mobile = false, onFocusCell }: MiniMapPanelProps): JSX.Element {
  const [mode, setMode] = useState<OverlayMode>('base');

  const buildingByCell = useMemo(() => {
    const map = new Map<string, typeof state.buildings[number]>();
    state.buildings.forEach((building) => {
      const footprint =
        building.type === 'hospital' || building.type === 'powerPlant'
          ? { width: 2, depth: 2 }
          : { width: 1, depth: 1 };
      for (let dz = 0; dz < footprint.depth; dz += 1) {
        for (let dx = 0; dx < footprint.width; dx += 1) {
          map.set(`${building.x + dx}:${building.z + dz}`, building);
        }
      }
    });
    return map;
  }, [state.buildings]);

  const cells = useMemo(() => {
    const items: Array<{ x: number; z: number; color: string; label: string }> = [];
    for (let z = 0; z < state.gridSize; z += 1) {
      for (let x = 0; x < state.gridSize; x += 1) {
        const building = buildingByCell.get(`${x}:${z}`);
        let color = '#567064';
        let label = 'Empty';

        if (building) {
          label = building.type;
          if (mode === 'base') {
            color = buildingColor(building.type);
          } else if (mode === 'tiers') {
            color = tierColor(building.level);
            label = `Tier ${building.level}`;
          } else if (mode === 'appeal') {
            const context = buildingContextSummary(state, building);
            color = gradientColor(context.appeal, [180, 68, 68], [44, 182, 125]);
            label = `Appeal ${context.appeal}%`;
          } else if (mode === 'power') {
            const context = buildingContextSummary(state, building);
            color = building.type === 'powerPlant' ? '#60a5fa' : context.powerAccess ? '#4ade80' : '#f87171';
            label = context.powerAccess ? 'Powered' : 'No power';
          } else if (mode === 'services') {
            const context = buildingContextSummary(state, building);
            const supportScore = Math.min(100, context.commerceSupport * 10 + context.civicSupport * 18 + context.parkSupport * 12);
            color = gradientColor(supportScore, [148, 163, 184], [250, 204, 21]);
            label = `Support ${supportScore}`;
          }
        } else if (mode === 'base') {
          color = '#4f6f57';
        } else {
          color = '#334155';
        }

        items.push({ x, z, color, label });
      }
    }
    return items;
  }, [buildingByCell, mode, state]);

  const panelClass = mobile
    ? 'pointer-events-auto panel-glass rounded-2xl p-3 shadow-glow'
    : 'pointer-events-auto panel-glass rounded-2xl p-3 shadow-glow';

  return (
    <aside className={panelClass}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200">City Map</div>
        <div className="text-[10px] text-slate-300">Tap a cell to focus</div>
      </div>
      <div className="mb-3 grid grid-cols-5 gap-1">
        {(['base', 'appeal', 'power', 'services', 'tiers'] as OverlayMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-lg px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] transition ${
              mode === option
                ? 'bg-cyan-400/20 text-cyan-100'
                : 'bg-slate-900/40 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div
        className="grid overflow-hidden rounded-xl border border-slate-400/30 bg-slate-950/45"
        style={{ gridTemplateColumns: `repeat(${state.gridSize}, minmax(0, 1fr))` }}
      >
        {cells.map((cell) => (
          <button
            key={`${cell.x}:${cell.z}`}
            type="button"
            title={`${cell.x},${cell.z} • ${cell.label}`}
            onClick={() => onFocusCell(cell.x, cell.z)}
            className="aspect-square border border-slate-950/10"
            style={{ backgroundColor: cell.color }}
          />
        ))}
      </div>
    </aside>
  );
}
