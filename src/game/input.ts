import { cancelPlacement, placeBuildingAt, selectBuildingById, setHoverCell } from './actions';
import { gameStore } from './state';
import { GameRenderer } from './render';

export class InputController {
  private readonly renderer: GameRenderer;

  private readonly canvas: HTMLCanvasElement;

  private draggingPan = false;

  private lastPan = { x: 0, y: 0 };

  private readonly keySet = new Set<string>();

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
}
