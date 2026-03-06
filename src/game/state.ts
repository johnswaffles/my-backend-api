export type BuildType =
  | 'road'
  | 'house'
  | 'restaurant'
  | 'shop'
  | 'park'
  | 'workshop'
  | 'powerPlant'
  | 'groceryStore'
  | 'cornerStore'
  | 'bank'
  | 'policeStation'
  | 'fireStation'
  | 'hospital';

export interface TileData {
  elevation: number;
  tint: number;
}

export interface Building {
  id: number;
  type: BuildType;
  x: number;
  z: number;
  createdAt: number;
}

export interface Resources {
  money: number;
  population: number;
  jobs: number;
  powerUsed: number;
  powerProduced: number;
}

export interface Demand {
  housing: number;
  roads: number;
  power: number;
  commerce: number;
  recreation: number;
  jobs: number;
  essentials: number;
  health: number;
  safety: number;
}

export interface HoverCell {
  x: number;
  z: number;
  valid: boolean;
}

export interface GameState {
  gridSize: number;
  tiles: TileData[];
  buildings: Building[];
  selectedBuildingId: number | null;
  placementMode: BuildType | null;
  hoverCell: HoverCell | null;
  aiAutoplayEnabled: boolean;
  aiLastAction: string;
  resources: Resources;
  day: number;
  happiness: number;
  demand: Demand;
  gameSpeed: 0 | 1 | 2;
  simSeconds: number;
  undoCount: number;
  redoCount: number;
  nextBuildingId: number;
}

const GRID_SIZE = 40;

function seededNoise(x: number, z: number): number {
  const s = Math.sin((x * 12.9898 + z * 78.233) * 0.42) * 43758.5453;
  return s - Math.floor(s);
}

function createTiles(size: number): TileData[] {
  const out: TileData[] = [];
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = seededNoise(x, z);
      out.push({
        elevation: (n - 0.5) * 0.08,
        tint: 0.92 + n * 0.12
      });
    }
  }
  return out;
}

export const initialGameState: GameState = {
  gridSize: GRID_SIZE,
  tiles: createTiles(GRID_SIZE),
  buildings: [],
  selectedBuildingId: null,
  placementMode: null,
  hoverCell: null,
  aiAutoplayEnabled: false,
  aiLastAction: 'Idle',
  resources: {
    money: 12500,
    population: 16,
    jobs: 12,
    powerUsed: 4,
    powerProduced: 16
  },
  day: 1,
  happiness: 65,
  demand: {
    housing: 55,
    roads: 35,
    power: 18,
    commerce: 42,
    recreation: 38,
    jobs: 44,
    essentials: 40,
    health: 28,
    safety: 26
  },
  gameSpeed: 1,
  simSeconds: 0,
  undoCount: 0,
  redoCount: 0,
  nextBuildingId: 1
};

type Listener = () => void;

class GameStore {
  private state: GameState;

  private listeners = new Set<Listener>();

  constructor(initial: GameState) {
    this.state = initial;
  }

  getState(): GameState {
    return this.state;
  }

  setState(next: GameState): void {
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }

  update(updater: (state: GameState) => GameState): void {
    this.setState(updater(this.state));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const gameStore = new GameStore(initialGameState);
