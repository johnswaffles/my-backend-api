import {
  cancelPlacement,
  placeBuildingAt,
  selectBuildingById,
  setAiLastAction,
  setHoverCell
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

    this.updateAiAutoplay(dtSeconds);
  }

  private updateAiAutoplay(dtSeconds: number): void {
    const state = gameStore.getState();
    if (!state.aiAutoplayEnabled) return;

    this.aiAccumulator += dtSeconds;
    if (this.aiAccumulator < 1.35) return;
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

    const count = {
      road: state.buildings.filter((b) => b.type === 'road').length,
      house: state.buildings.filter((b) => b.type === 'house').length,
      powerPlant: state.buildings.filter((b) => b.type === 'powerPlant').length
    };

    let nextType: 'road' | 'house' | 'powerPlant' = 'house';
    if (count.powerPlant === 0 || state.resources.powerUsed >= state.resources.powerProduced - 4) {
      nextType = 'powerPlant';
    } else if (count.road < count.house * 0.45) {
      nextType = 'road';
    }

    // Try random samples around center for cozy clustered growth.
    const center = Math.floor(state.gridSize / 2);
    for (let i = 0; i < 90; i += 1) {
      const radius = Math.min(16, 3 + Math.floor(i / 6));
      const x = center + Math.floor((Math.random() * 2 - 1) * radius);
      const z = center + Math.floor((Math.random() * 2 - 1) * radius);
      if (x < 0 || z < 0 || x >= state.gridSize || z >= state.gridSize) continue;

      const occupied = state.buildings.some((b) => b.x === x && b.z === z);
      if (occupied) continue;

      if (nextType === 'road') {
        const nearRoad = state.buildings.some((b) => b.type === 'road' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 1);
        if (count.road > 0 && !nearRoad) continue;
      }

      if (nextType === 'house') {
        const nearRoad = state.buildings.some((b) => b.type === 'road' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 1);
        if (!nearRoad && count.road > 2) continue;
      }

      return { type: nextType, x, z };
    }

    return null;
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
