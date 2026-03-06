import {
  bulldozeAt,
  canPlaceBuilding,
  cancelPlacement,
  placeBuildingAt,
  redoAction,
  selectBuildingById,
  setAiLastAction,
  setPlacementMode,
  setHoverCell,
  tickSimulation,
  undoAction
} from './actions';
import { gameStore } from './state';
import type { BuildType } from './state';
import { GameRenderer } from './render';

type AiAction =
  | { action: 'place'; type: BuildType; x: number; z: number }
  | { action: 'bulldoze'; x: number; z: number };

class SoundFx {
  private context: AudioContext | null = null;

  unlock(): void {
    if (this.context) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    try {
      this.context = new Ctx();
    } catch {
      this.context = null;
    }
  }

  beep(frequency: number, duration = 0.06, type: OscillatorType = 'triangle', volume = 0.03): void {
    if (!this.context) return;
    const ctx = this.context;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
}

export class InputController {
  private readonly renderer: GameRenderer;

  private readonly canvas: HTMLCanvasElement;

  private draggingPan = false;

  private lastPan = { x: 0, y: 0 };

  private readonly keySet = new Set<string>();

  private aiAccumulator = 0;

  private readonly sfx = new SoundFx();

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
        this.renderer.playRemovalPulse(decision.x, decision.z);
        this.renderer.focusOnCell(decision.x, decision.z, 0.36);
        this.sfx.beep(190, 0.08, 'sawtooth', 0.025);
        setAiLastAction(`Bulldozed ${removed.type} at (${decision.x}, ${decision.z})`);
      } else {
        this.sfx.beep(145, 0.04, 'square', 0.02);
        setAiLastAction('Bulldoze skipped (no valid target)');
      }
      return;
    }

    const placed = placeBuildingAt(decision.type, decision.x, decision.z);
    if (placed) {
      this.renderer.playPlacementPulse(placed.x, placed.z);
      this.renderer.focusOnCell(placed.x, placed.z, 0.32);
      this.sfx.beep(420, 0.07, 'triangle', 0.026);
      setAiLastAction(`Placed ${decision.type} at (${decision.x}, ${decision.z})`);
    } else {
      this.sfx.beep(145, 0.04, 'square', 0.02);
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
    if (d.roads >= 36 || roads < 10) types.push('road', 'road', 'road');
    if (d.housing >= 45) types.push('house', 'house');
    if (d.commerce >= 45) types.push('shop', 'restaurant', 'bank');
    if (d.recreation >= 45) types.push('park');
    if (d.jobs >= 45) types.push('workshop', 'shop');
    if (d.essentials >= 42) types.push('groceryStore', 'cornerStore', 'cornerStore');
    if (d.health >= 42) types.push('hospital');
    if (d.safety >= 40) types.push('policeStation', 'fireStation');

    if (!types.length) {
      types.push('house', 'shop', 'cornerStore', 'park', 'road', 'road');
    }

    if (d.roads >= 36 || roads < 10) {
      const roadAction = this.planRoadExpansion();
      if (roadAction) return roadAction;
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
    if (type === 'shop' || type === 'restaurant' || type === 'bank') return d.commerce * 1.05;
    if (type === 'groceryStore' || type === 'cornerStore') return d.essentials * 1.08;
    if (type === 'park') return d.recreation;
    if (type === 'hospital') return d.health * 1.12;
    if (type === 'policeStation' || type === 'fireStation') return d.safety * 1.1;
    if (type === 'workshop') return d.jobs * 1.1;
    return 10;
  }

  private bestPlacementForType(type: BuildType): AiAction | null {
    if (type === 'road') {
      return this.planRoadExpansion();
    }

    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);

    const roads = state.buildings.filter((b) => b.type === 'road');
    const houses = state.buildings.filter((b) => b.type === 'house');
    const commerce = state.buildings.filter(
      (b) =>
        b.type === 'shop' ||
        b.type === 'restaurant' ||
        b.type === 'groceryStore' ||
        b.type === 'cornerStore' ||
        b.type === 'bank'
    );
    const parks = state.buildings.filter((b) => b.type === 'park');
    const industry = state.buildings.filter((b) => b.type === 'workshop' || b.type === 'powerPlant');
    const civic = state.buildings.filter(
      (b) =>
        b.type === 'hospital' ||
        b.type === 'policeStation' ||
        b.type === 'fireStation' ||
        b.type === 'bank' ||
        b.type === 'groceryStore' ||
        b.type === 'cornerStore'
    );
    const occupied = new Set(state.buildings.map((b) => `${b.x}:${b.z}`));

    let best: { x: number; z: number; score: number } | null = null;

    for (const { x, z } of this.collectCandidateCells(type)) {
      if (occupied.has(`${x}:${z}`)) continue;

      const nearRoadCells = roads.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 1);
      const nearRoad = nearRoadCells.length;
      const roadDirections = this.roadNeighborFlags(x, z);
      const roadFrontageCount =
        Number(roadDirections.n) + Number(roadDirections.e) + Number(roadDirections.s) + Number(roadDirections.w);
      const nearHouses = houses.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearCommerce = commerce.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearParks = parks.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 3).length;
      const nearIndustry = industry.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 4).length;
      const nearCivic = civic.filter((b) => Math.abs(b.x - x) + Math.abs(b.z - z) <= 4).length;
      const distCenter = Math.abs(x - center) + Math.abs(z - center);
      const tile = state.tiles[z * state.gridSize + x];
      const nearbyIntersections = roads.filter((b) => {
        if (Math.abs(b.x - x) + Math.abs(b.z - z) > 2) return false;
        const flags = this.roadNeighborFlags(b.x, b.z);
        return Number(flags.n) + Number(flags.e) + Number(flags.s) + Number(flags.w) >= 3;
      }).length;

      let score = ((x * 17 + z * 31) % 11) * 0.01;
      if (type === 'house') {
        score +=
          nearRoad * 5.8 +
          nearParks * 1.8 +
          nearCommerce * 0.8 -
          nearIndustry * 2.8 -
          nearbyIntersections * 0.5 -
          distCenter * 0.024;
        if (roadFrontageCount === 1) score += 1.2;
        if (roadFrontageCount >= 3) score -= 0.8;
      } else if (type === 'shop') {
        score += nearRoad * 3.8 + nearHouses * 2.1 + nearCommerce * 0.8 + nearbyIntersections * 1.1 - nearIndustry * 0.8;
      } else if (type === 'restaurant') {
        score += nearRoad * 3.4 + nearHouses * 1.7 + nearParks * 1.5 + nearbyIntersections * 0.8 - nearIndustry * 1.2;
      } else if (type === 'groceryStore') {
        score += nearRoad * 4.2 + nearHouses * 2.4 + nearCommerce * 0.7 + nearbyIntersections * 0.9 - nearIndustry * 1.1 - distCenter * 0.018;
      } else if (type === 'cornerStore') {
        score += nearRoad * 4.4 + nearHouses * 1.8 + nearCommerce * 0.5 + nearbyIntersections * 1.4 - nearIndustry * 0.8;
      } else if (type === 'bank') {
        score += nearRoad * 3.6 + nearCommerce * 1.7 + nearCivic * 0.7 + nearbyIntersections * 1.2 - nearIndustry * 0.8 - distCenter * 0.008;
      } else if (type === 'park') {
        score += nearHouses * 2.5 + nearRoad * 1.4 + tile.tint * 1.2 - nearIndustry * 1.8 - nearbyIntersections * 0.4;
      } else if (type === 'hospital') {
        score += nearRoad * 4 + nearHouses * 1.8 + nearParks * 0.8 + nearCivic * 0.5 + nearbyIntersections * 0.7 - nearIndustry * 1.6 - distCenter * 0.01;
      } else if (type === 'policeStation' || type === 'fireStation') {
        score += nearRoad * 3.8 + nearHouses * 1.2 + nearCivic * 0.5 + nearbyIntersections * 1 - nearIndustry * 0.4 - distCenter * 0.01;
      } else if (type === 'workshop') {
        score += nearRoad * 2.3 + distCenter * 0.04 - nearHouses * 2.4;
      } else if (type === 'powerPlant') {
        score += nearRoad * 1.9 + distCenter * 0.075 - nearHouses * 3.5 - nearCommerce * 2.2 - nearCivic * 2.4;
      }

      if (!best || score > best.score) {
        best = { x, z, score };
      }
    }

    if (!best) return null;
    return { action: 'place', type, x: best.x, z: best.z };
  }

  private collectCandidateCells(type: BuildType): Array<{ x: number; z: number }> {
    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);
    const cells: Array<{ x: number; z: number; dist: number; tie: number }> = [];

    for (let z = 0; z < state.gridSize; z += 1) {
      for (let x = 0; x < state.gridSize; x += 1) {
        if (!canPlaceBuilding(state, type, x, z)) continue;
        const dist = Math.abs(x - center) + Math.abs(z - center);
        const tie = ((x * 13 + z * 29) % 7) * 0.01;
        cells.push({ x, z, dist, tie });
      }
    }

    cells.sort((a, b) => a.dist + a.tie - (b.dist + b.tie));
    return cells.map(({ x, z }) => ({ x, z }));
  }

  private planRoadExpansion(): AiAction | null {
    const starter = this.pickStarterRoad();
    if (starter) return starter;

    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);
    const roads = state.buildings.filter((b) => b.type === 'road');
    let best: { x: number; z: number; score: number } | null = null;

    const addCandidate = (x: number, z: number, scoreBias = 0): void => {
      if (!canPlaceBuilding(state, 'road', x, z)) return;
      const graph = this.roadPlacementScore(x, z);
      const nearbyBuildings = state.buildings.filter(
        (b) => b.type !== 'road' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 3
      );
      const nearbyHomes = nearbyBuildings.filter((b) => b.type === 'house').length;
      const nearbyCommerce = nearbyBuildings.filter(
        (b) =>
          b.type === 'shop' ||
          b.type === 'restaurant' ||
          b.type === 'groceryStore' ||
          b.type === 'cornerStore' ||
          b.type === 'bank'
      ).length;
      const nearbyCivic = nearbyBuildings.filter(
        (b) => b.type === 'hospital' || b.type === 'policeStation' || b.type === 'fireStation'
      ).length;
      const distCenter = Math.abs(x - center) + Math.abs(z - center);

      let score =
        graph.connectivity * 1.4 +
        graph.straightness * 1.35 +
        graph.lotPotential * 1.5 +
        graph.frontier -
        graph.junkPenalty * 1.55 +
        nearbyHomes * 1.7 +
        nearbyCommerce * 1.4 +
        nearbyCivic * 0.9 +
        scoreBias -
        distCenter * 0.012;

      if (nearbyBuildings.length === 0 && roads.length > 6) score -= 1.8;

      if (!best || score > best.score) {
        best = { x, z, score };
      }
    };

    for (const road of roads) {
      const flags = this.roadNeighborFlags(road.x, road.z);
      const neighborCount = Number(flags.n) + Number(flags.e) + Number(flags.s) + Number(flags.w);

      if (neighborCount === 1) {
        if (flags.n) addCandidate(road.x, road.z + 1, 3.2);
        if (flags.s) addCandidate(road.x, road.z - 1, 3.2);
        if (flags.e) addCandidate(road.x - 1, road.z, 3.2);
        if (flags.w) addCandidate(road.x + 1, road.z, 3.2);
      }

      if (flags.n && flags.s) {
        addCandidate(road.x, road.z - 1, 1.4);
        addCandidate(road.x, road.z + 1, 1.4);
        if (Math.abs(road.x - center) % 4 === 0) {
          addCandidate(road.x + 1, road.z, 2.4);
          addCandidate(road.x - 1, road.z, 2.4);
        }
      }

      if (flags.e && flags.w) {
        addCandidate(road.x - 1, road.z, 1.4);
        addCandidate(road.x + 1, road.z, 1.4);
        if (Math.abs(road.z - center) % 4 === 0) {
          addCandidate(road.x, road.z + 1, 2.4);
          addCandidate(road.x, road.z - 1, 2.4);
        }
      }

      if (neighborCount >= 2) {
        addCandidate(road.x + 1, road.z, 0.5);
        addCandidate(road.x - 1, road.z, 0.5);
        addCandidate(road.x, road.z + 1, 0.5);
        addCandidate(road.x, road.z - 1, 0.5);
      }
    }

    const chosen = best as { x: number; z: number; score: number } | null;
    if (!chosen) return null;
    return { action: 'place', type: 'road', x: chosen.x, z: chosen.z };
  }

  private pickStarterRoad(): AiAction | null {
    const state = gameStore.getState();
    const center = Math.floor(state.gridSize / 2);
    const blueprint: Array<[number, number]> = [
      [center, center],
      [center + 1, center],
      [center - 1, center],
      [center, center + 1],
      [center, center - 1],
      [center + 2, center],
      [center - 2, center],
      [center, center + 2],
      [center, center - 2],
      [center + 2, center + 1],
      [center + 2, center - 1],
      [center - 2, center + 1],
      [center - 2, center - 1],
      [center + 1, center + 2],
      [center - 1, center + 2],
      [center + 1, center - 2],
      [center - 1, center - 2]
    ];

    for (const [x, z] of blueprint) {
      if (canPlaceBuilding(state, 'road', x, z)) {
        return { action: 'place', type: 'road', x, z };
      }
    }

    return null;
  }

  private roadNeighborFlags(x: number, z: number): { n: boolean; e: boolean; s: boolean; w: boolean } {
    const state = gameStore.getState();
    const isRoad = (tx: number, tz: number) =>
      state.buildings.some((b) => b.type === 'road' && b.x === tx && b.z === tz);

    return {
      n: isRoad(x, z - 1),
      e: isRoad(x + 1, z),
      s: isRoad(x, z + 1),
      w: isRoad(x - 1, z)
    };
  }

  private pickBulldozeTarget(): AiAction | null {
    const state = gameStore.getState();
    const roads = state.buildings.filter((b) => b.type === 'road');

    let best: { id: number; x: number; z: number; score: number } | null = null;
    for (const b of state.buildings) {
      if (b.type === 'house') continue;

      let score = 0;
      if (b.type === 'road') {
        const roadNeighbors = roads.filter((r) => Math.abs(r.x - b.x) + Math.abs(r.z - b.z) === 1).length;
        score += roadNeighbors === 0 ? 7.5 : roadNeighbors === 1 ? 2.2 : -2.2;
        const nearDeveloped = state.buildings.filter(
          (o) =>
            o.type !== 'road' &&
            (Math.abs(o.x - b.x) + Math.abs(o.z - b.z) <= 2)
        ).length;
        if (nearDeveloped === 0 && roadNeighbors <= 1) score += 2.6;
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

  private roadPlacementScore(x: number, z: number): {
    connectivity: number;
    straightness: number;
    frontier: number;
    lotPotential: number;
    junkPenalty: number;
  } {
    const state = gameStore.getState();
    const isRoadAt = (tx: number, tz: number) =>
      state.buildings.some((b) => b.type === 'road' && b.x === tx && b.z === tz);

    const n = isRoadAt(x, z - 1);
    const e = isRoadAt(x + 1, z);
    const s = isRoadAt(x, z + 1);
    const w = isRoadAt(x - 1, z);
    const neighbors = Number(n) + Number(e) + Number(s) + Number(w);

    let connectivity = 0;
    if (neighbors === 1) connectivity += 4.2; // extend endpoint
    if (neighbors === 2) connectivity += 2.6; // continue a line/corner
    if (neighbors === 3) connectivity += 0.6; // T junction
    if (neighbors === 4) connectivity -= 0.4; // avoid too many 4-ways

    let straightness = 0;
    if ((n && s) || (e && w)) straightness += 2.2; // prefer straight street segments
    if ((n && e) || (e && s) || (s && w) || (w && n)) straightness += 0.7;

    // Encourage block spacing: roads 3 tiles away create frontage blocks.
    const blockParallel =
      Number(isRoadAt(x + 3, z)) + Number(isRoadAt(x - 3, z)) + Number(isRoadAt(x, z + 3)) + Number(isRoadAt(x, z - 3));
    if (blockParallel > 0) {
      straightness += blockParallel * 0.8;
    }

    // Favor intersections every few tiles instead of chaotic turns.
    const blockInterval = ((x + z) % 4 === 0) ? 0.7 : 0;
    straightness += neighbors >= 1 ? blockInterval : 0;

    // Reward roads that create buildable frontage.
    let lotPotential = 0;
    const around: Array<[number, number]> = [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1]
    ];
    for (const [tx, tz] of around) {
      if (tx < 0 || tz < 0 || tx >= state.gridSize || tz >= state.gridSize) continue;
      const occupied = state.buildings.some((b) => b.x === tx && b.z === tz);
      if (!occupied) lotPotential += 0.8;
    }

    // Encourage outward growth but not far-away spam roads.
    const center = Math.floor(state.gridSize / 2);
    const dist = Math.abs(x - center) + Math.abs(z - center);
    const frontier = Math.max(0, Math.min(2.2, dist * 0.06));

    // Penalize isolated roads or pointless micro-jogs.
    let junkPenalty = 0;
    if (neighbors === 0) junkPenalty += 3.6;
    if (neighbors === 2 && ((n && e) || (e && s) || (s && w) || (w && n))) {
      const nearbyRoads = state.buildings.filter(
        (b) => b.type === 'road' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 2
      ).length;
      if (nearbyRoads < 3) junkPenalty += 1.5;
    }

    return { connectivity, straightness, frontier, lotPotential, junkPenalty };
  }

  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    cancelPlacement();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.sfx.unlock();
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
        this.sfx.beep(520, 0.075, 'triangle', 0.03);
      } else {
        this.sfx.beep(150, 0.05, 'square', 0.022);
      }
      return;
    }

    const hitBuildingId = this.renderer.pickBuildingId();
    if (hitBuildingId != null) {
      selectBuildingById(hitBuildingId);
      this.sfx.beep(300, 0.03, 'triangle', 0.02);
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
    this.renderer.setPointerFromClient(event.clientX, event.clientY);
    const focus = this.renderer.pickGridCell();
    this.renderer.zoomBy(event.deltaY * 0.012, focus ?? undefined);
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
      this.sfx.beep(320, 0.04, 'triangle', 0.02);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (undoAction()) this.sfx.beep(210, 0.06, 'triangle', 0.025);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      if (redoAction()) this.sfx.beep(360, 0.06, 'triangle', 0.025);
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      const selected = gameStore.getState().selectedBuildingId;
      if (selected != null) {
        const building = gameStore.getState().buildings.find((b) => b.id === selected);
        if (building) {
          const removed = bulldozeAt(building.x, building.z);
          if (removed) {
            this.renderer.playRemovalPulse(building.x, building.z);
            this.sfx.beep(180, 0.08, 'sawtooth', 0.03);
          }
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
