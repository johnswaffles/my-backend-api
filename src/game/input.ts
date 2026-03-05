import {
  canPlaceBuilding,
  cancelPlacement,
  placeBuildingAt,
  selectBuildingById,
  setAiLastAction,
  setHoverCell,
  tickSimulation
} from './actions';
import { gameStore } from './state';
import { GameRenderer } from './render';

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
    if (this.aiAccumulator < 1.15) return;
    this.aiAccumulator = 0;

    const decision = this.pickAiPlacement();
    if (!decision) {
      setAiLastAction('AI waiting');
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

  private pickAiPlacement(): { type: 'road' | 'house' | 'powerPlant'; x: number; z: number } | null {
    const state = gameStore.getState();
    if (state.gameSpeed === 0) return null;

    const roads = state.buildings.filter((b) => b.type === 'road');
    const houses = state.buildings.filter((b) => b.type === 'house');
    const plants = state.buildings.filter((b) => b.type === 'powerPlant');

    const powerGap = state.resources.powerProduced - state.resources.powerUsed;
    const needPower = plants.length === 0 || powerGap < Math.max(4, houses.length * 0.7);
    const needRoads = roads.length < Math.max(4, Math.floor(houses.length * 0.9));
    const needHousing = state.demand.housing >= Math.max(state.demand.roads, state.demand.power) - 8;

    const weightedTypes: Array<'road' | 'house' | 'powerPlant'> = [];
    if (needPower) weightedTypes.push('powerPlant', 'powerPlant');
    if (needRoads) weightedTypes.push('road', 'road');
    if (needHousing) weightedTypes.push('house', 'house', 'house');
    if (!weightedTypes.length) weightedTypes.push('house', 'road');

    const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];
    return this.bestPlacementForType(type);
  }

  private bestPlacementForType(type: 'road' | 'house' | 'powerPlant'): { type: 'road' | 'house' | 'powerPlant'; x: number; z: number } | null {
    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);

    const roads = state.buildings.filter((b) => b.type === 'road');
    const houses = state.buildings.filter((b) => b.type === 'house');
    const plants = state.buildings.filter((b) => b.type === 'powerPlant');
    const occupied = new Set(state.buildings.map((b) => `${b.x}:${b.z}`));

    let best: { x: number; z: number; score: number } | null = null;
    for (let i = 0; i < 220; i += 1) {
      const radius = Math.min(18, 3 + Math.floor(i / 8));
      const x = center + Math.floor((Math.random() * 2 - 1) * radius);
      const z = center + Math.floor((Math.random() * 2 - 1) * radius);
      if (x < 0 || z < 0 || x >= state.gridSize || z >= state.gridSize) continue;
      if (occupied.has(`${x}:${z}`)) continue;
      if (!canPlaceBuilding(state, type, x, z)) continue;

      const nearRoad = roads.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 1).length;
      const nearHouses = houses.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 2).length;
      const nearPlants = plants.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 5).length;
      const distCenter = Math.abs(x - center) + Math.abs(z - center);
      const tile = state.tiles[z * state.gridSize + x];

      let score = Math.random() * 0.35;
      if (type === 'road') {
        score += nearHouses * 2.8 + nearRoad * 1.8 - distCenter * 0.05 + tile.tint * 0.4;
      } else if (type === 'house') {
        score += nearRoad * 4 + nearHouses * 0.8 - nearPlants * 3.2 - distCenter * 0.03 + tile.tint;
      } else {
        score += nearRoad * 1.2 + distCenter * 0.08 - nearHouses * 2.6;
      }

      if (!best || score > best.score) {
        best = { x, z, score };
      }
    }

    if (!best) return null;
    return { type, x: best.x, z: best.z };
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
    this.keySet.add(event.key.toLowerCase());
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
