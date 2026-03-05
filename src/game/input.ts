import {
  bulldozeAt,
  canPlaceBuilding,
  cancelPlacement,
  placeBuildingAt,
  selectBuildingById,
  setAiLastAction,
  setPlacementMode,
  setHoverCell,
  tickSimulation
} from './actions';
import { gameStore } from './state';
import type { BuildType } from './state';
import { GameRenderer } from './render';

type AiAction =
  | { action: 'place'; type: BuildType; x: number; z: number }
  | { action: 'bulldoze'; x: number; z: number };

export class InputController {
  private readonly renderer: GameRenderer;

  private readonly canvas: HTMLCanvasElement;

  private draggingPan = false;

  private lastPan = { x: 0, y: 0 };

  private readonly keySet = new Set<string>();

  private aiAccumulator = 0;

  constructor(renderer: GameRenderer) {
    this.renderer = renderer;
    this.canvas = renderer.getDomElement();

    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('mouseleave', this.onLeave);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  dispose(): void {
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('mouseleave', this.onLeave);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  update(dtSeconds: number): void {
    const speed = 10.5;
    let panX = 0;
    let panZ = 0;

    if (this.keySet.has('w') || this.keySet.has('arrowup')) panZ -= speed * dtSeconds;
    if (this.keySet.has('s') || this.keySet.has('arrowdown')) panZ += speed * dtSeconds;
    if (this.keySet.has('a') || this.keySet.has('arrowleft')) panX -= speed * dtSeconds;
    if (this.keySet.has('d') || this.keySet.has('arrowright')) panX += speed * dtSeconds;

    if (panX !== 0 || panZ !== 0) {
      this.renderer.panBy(panX, panZ);
    }

    const state = gameStore.getState();
    const scaledDt = dtSeconds * state.gameSpeed;
    tickSimulation(scaledDt);
    this.updateAiAutoplay(scaledDt);
  }

  private updateAiAutoplay(dtSeconds: number): void {
    const state = gameStore.getState();
    if (!state.aiAutoplayEnabled) return;

    this.aiAccumulator += dtSeconds;
    if (this.aiAccumulator < 1.2) return;
    this.aiAccumulator = 0;

    const decision = this.pickAiAction();
    if (!decision) {
      setAiLastAction('AI waiting for better options');
      return;
    }

    if (decision.action === 'bulldoze') {
      const removed = bulldozeAt(decision.x, decision.z);
      if (removed) {
        this.renderer.playPlacementPulse(decision.x, decision.z);
        setAiLastAction(`Bulldozed ${removed.type} at (${decision.x}, ${decision.z})`);
      } else {
        setAiLastAction('Bulldoze skipped (no valid target)');
      }
      return;
    }

    const placed = placeBuildingAt(decision.type, decision.x, decision.z);
    if (placed) {
      this.renderer.playPlacementPulse(placed.x, placed.z);
      setAiLastAction(`Placed ${decision.type} at (${decision.x}, ${decision.z})`);
    } else {
      setAiLastAction(`Skipped invalid placement (${decision.x}, ${decision.z})`);
    }
  }

  private pickAiAction(): AiAction | null {
    const state = gameStore.getState();
    if (state.gameSpeed === 0) return null;

    const roads = state.buildings.filter((b) => b.type === 'road').length;
    const money = state.resources.money;

    if (money < 300) {
      const bulldoze = this.pickBulldozeTarget();
      if (bulldoze) return bulldoze;
    }

    const types: BuildType[] = [];
    const d = state.demand;

    if (d.power >= 60) types.push('powerPlant', 'powerPlant');
    if (d.roads >= 45 || roads < 4) types.push('road', 'road');
    if (d.housing >= 45) types.push('house', 'house');
    if (d.commerce >= 45) types.push('shop', 'restaurant');
    if (d.recreation >= 45) types.push('park');
    if (d.jobs >= 45) types.push('workshop', 'shop');

    if (!types.length) {
      types.push('house', 'shop', 'park', 'road');
    }

    const sorted = [...types].sort((a, b) => this.typePriorityScore(b) - this.typePriorityScore(a));
    for (const type of sorted) {
      const best = this.bestPlacementForType(type);
      if (best) return best;
    }

    return this.pickBulldozeTarget();
  }

  private typePriorityScore(type: BuildType): number {
    const state = gameStore.getState();
    const d = state.demand;
    if (type === 'powerPlant') return d.power * 1.3;
    if (type === 'road') return d.roads * 1.1;
    if (type === 'house') return d.housing;
    if (type === 'shop' || type === 'restaurant') return d.commerce * 1.05;
    if (type === 'park') return d.recreation;
    if (type === 'workshop') return d.jobs * 1.1;
    return 10;
  }

  private bestPlacementForType(type: BuildType): AiAction | null {
    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);

    const roads = state.buildings.filter((b) => b.type === 'road');
    const houses = state.buildings.filter((b) => b.type === 'house');
    const commerce = state.buildings.filter((b) => b.type === 'shop' || b.type === 'restaurant');
    const parks = state.buildings.filter((b) => b.type === 'park');
    const industry = state.buildings.filter((b) => b.type === 'workshop' || b.type === 'powerPlant');
    const occupied = new Set(state.buildings.map((b) => `${b.x}:${b.z}`));

    let best: { x: number; z: number; score: number } | null = null;

    for (let i = 0; i < 260; i += 1) {
      const radius = Math.min(19, 3 + Math.floor(i / 8));
      const x = center + Math.floor((Math.random() * 2 - 1) * radius);
      const z = center + Math.floor((Math.random() * 2 - 1) * radius);
      if (x < 0 || z < 0 || x >= state.gridSize || z >= state.gridSize) continue;
      if (occupied.has(`${x}:${z}`)) continue;
      if (!canPlaceBuilding(state, type, x, z)) continue;

      const nearRoad = roads.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 1).length;
      const nearHouses = houses.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearCommerce = commerce.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearParks = parks.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearIndustry = industry.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 4).length;
      const distCenter = Math.abs(x - center) + Math.abs(z - center);
      const tile = state.tiles[z * state.gridSize + x];

      let score = Math.random() * 0.25;
      if (type === 'road') {
        score += nearHouses * 2.6 + nearCommerce * 2.1 + nearRoad * 1.7 - distCenter * 0.04;
      } else if (type === 'house') {
        score += nearRoad * 4.2 + nearParks * 1.5 + nearCommerce * 0.9 - nearIndustry * 2.6 - distCenter * 0.03;
      } else if (type === 'shop') {
        score += nearRoad * 3.1 + nearHouses * 1.8 + nearCommerce * 0.7 - nearIndustry * 0.8;
      } else if (type === 'restaurant') {
        score += nearRoad * 2.7 + nearHouses * 1.6 + nearParks * 1.2 - nearIndustry * 1.2;
      } else if (type === 'park') {
        score += nearHouses * 2.4 + nearRoad * 1.4 + tile.tint * 1.2 - nearIndustry * 1.8;
      } else if (type === 'workshop') {
        score += nearRoad * 2.3 + distCenter * 0.04 - nearHouses * 2.4;
      } else if (type === 'powerPlant') {
        score += nearRoad * 1.5 + distCenter * 0.07 - nearHouses * 3.3;
      }

      if (!best || score > best.score) {
        best = { x, z, score };
      }
    }

    if (!best) return null;
    return { action: 'place', type, x: best.x, z: best.z };
  }

  private pickBulldozeTarget(): AiAction | null {
    const state = gameStore.getState();
    const roads = state.buildings.filter((b) => b.type === 'road');

    let best: { id: number; x: number; z: number; score: number } | null = null;
    for (const b of state.buildings) {
      if (b.type === 'house') continue;

      let score = 0;
      if (b.type === 'road') {
        const roadNeighbors = roads.filter(
          (r) => Math.abs(r.x - b.x) + Math.abs(r.z - b.z) === 1
        ).length;
        score += roadNeighbors === 0 ? 6 : roadNeighbors === 1 ? 2 : -2;
      }

      if (b.type === 'powerPlant') {
        const nearHomes = state.buildings.filter(
          (h) => h.type === 'house' && Math.abs(h.x - b.x) + Math.abs(h.z - b.z) <= 3
        ).length;
        score += nearHomes * 3;
      }

      if (b.type === 'workshop') {
        const nearHomes = state.buildings.filter(
          (h) => h.type === 'house' && Math.abs(h.x - b.x) + Math.abs(h.z - b.z) <= 2
        ).length;
        score += nearHomes * 2.6;
      }

      if (best == null || score > best.score) {
        best = { id: b.id, x: b.x, z: b.z, score };
      }
    }

    if (!best || best.score < 3.5) return null;
    return { action: 'bulldoze', x: best.x, z: best.z };
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    cancelPlacement();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.renderer.setPointerFromClient(event.clientX, event.clientY);

    if (event.button === 1 || event.button === 2) {
      this.draggingPan = true;
      this.lastPan = { x: event.clientX, y: event.clientY };
      return;
    }

    if (event.button !== 0) return;

    const state = gameStore.getState();
    const grid = this.renderer.pickGridCell();
    if (!grid) {
      selectBuildingById(null);
      return;
    }

    if (state.placementMode) {
      const created = placeBuildingAt(state.placementMode, grid.x, grid.z);
      if (created) {
        this.renderer.playPlacementPulse(created.x, created.z);
      }
      return;
    }

    const hitBuildingId = this.renderer.pickBuildingId();
    if (hitBuildingId != null) {
      selectBuildingById(hitBuildingId);
    } else {
      selectBuildingById(null);
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.renderer.setPointerFromClient(event.clientX, event.clientY);

    if (this.draggingPan) {
      const dx = event.clientX - this.lastPan.x;
      const dy = event.clientY - this.lastPan.y;
      this.lastPan = { x: event.clientX, y: event.clientY };
      this.renderer.panBy(-dx * 0.025, -dy * 0.025);
      return;
    }

    const hit = this.renderer.pickGridCell();
    if (hit) {
      setHoverCell(hit);
    } else {
      setHoverCell(null);
    }
  };

  private readonly onPointerUp = (): void => {
    this.draggingPan = false;
  };

  private readonly onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.renderer.zoomBy(event.deltaY * 0.012);
  };

  private readonly onLeave = (): void => {
    setHoverCell(null);
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
    if (typing) return;

    this.keySet.add(event.key.toLowerCase());

    const shortcuts: Record<string, BuildType> = {
      '1': 'road',
      '2': 'house',
      '3': 'shop',
      '4': 'restaurant',
      '5': 'park',
      '6': 'workshop',
      '7': 'powerPlant'
    };

    const shortcutType = shortcuts[event.key];
    if (shortcutType) {
      const state = gameStore.getState();
      setPlacementMode(state.placementMode === shortcutType ? null : shortcutType);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      const selected = gameStore.getState().selectedBuildingId;
      if (selected != null) {
        const building = gameStore.getState().buildings.find((b) => b.id === selected);
        if (building) {
          bulldozeAt(building.x, building.z);
        }
      }
      return;
    }

    if (event.key === 'Escape') {
      cancelPlacement();
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keySet.delete(event.key.toLowerCase());
  };

  private readonly onBlur = (): void => {
    this.keySet.clear();
    this.draggingPan = false;
  };
}
