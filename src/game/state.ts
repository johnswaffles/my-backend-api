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
  level: 1 | 2 | 3;
  upgradeProgress: number;
  lastUpgradeAt: number;
  customImageUrl?: string | null;
  customStyleName?: string | null;
  customArtStyle?: string | null;
}

export interface AssetVariation {
  id: string;
  type: BuildType;
  name: string;
  prompt: string;
  imageUrl: string;
  artStyle: string;
  createdAt: number;
  cost: number;
}

export interface BuildingFootprint {
  width: number;
  depth: number;
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
  timeOfDay: number;
  happiness: number;
  demand: Demand;
  gameSpeed: GameSpeed;
  simSeconds: number;
  undoCount: number;
  redoCount: number;
  nextBuildingId: number;
  pendingBuildAsset: AssetVariation | null;
}

const GRID_SIZE = 28;
export type GameSpeed = 0 | 1 | 2 | 10;
export const INFINITE_MONEY = false;
export const STARTING_MONEY = 200000;
export const STARTING_HAPPINESS = 62;
export const DAY_LENGTH_SECONDS = 36;
export const CUSTOMIZABLE_BUILD_TYPES: BuildType[] = [
  'house',
  'shop',
  'restaurant',
  'groceryStore',
  'cornerStore',
  'bank',
  'policeStation',
  'fireStation',
  'hospital',
  'powerPlant'
];

export const BUILDING_FOOTPRINTS: Record<BuildType, BuildingFootprint> = {
  road: { width: 1, depth: 1 },
  house: { width: 1, depth: 1 },
  restaurant: { width: 1, depth: 1 },
  shop: { width: 1, depth: 1 },
  park: { width: 1, depth: 1 },
  workshop: { width: 1, depth: 1 },
  powerPlant: { width: 2, depth: 2 },
  groceryStore: { width: 1, depth: 1 },
  cornerStore: { width: 1, depth: 1 },
  bank: { width: 1, depth: 1 },
  policeStation: { width: 1, depth: 1 },
  fireStation: { width: 1, depth: 1 },
  hospital: { width: 2, depth: 2 }
};

export function footprintForType(type: BuildType): BuildingFootprint {
  return BUILDING_FOOTPRINTS[type];
}

export function requiresGeneratedAsset(type: BuildType): boolean {
  return CUSTOMIZABLE_BUILD_TYPES.includes(type);
}

export function occupiedCellsForPlacement(
  type: BuildType,
  x: number,
  z: number
): Array<{ x: number; z: number }> {
  const { width, depth } = footprintForType(type);
  const cells: Array<{ x: number; z: number }> = [];

  for (let dz = 0; dz < depth; dz += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      cells.push({ x: x + dx, z: z + dz });
    }
  }

  return cells;
}

export function occupiedCellsForBuilding(building: Building): Array<{ x: number; z: number }> {
  return occupiedCellsForPlacement(building.type, building.x, building.z);
}

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
    money: STARTING_MONEY,
    population: 0,
    jobs: 0,
    powerUsed: 0,
    powerProduced: 0
  },
  day: 1,
  timeOfDay: 8,
  happiness: STARTING_HAPPINESS,
  demand: {
    housing: 64,
    roads: 30,
    power: 12,
    commerce: 36,
    recreation: 30,
    jobs: 38,
    essentials: 34,
    health: 22,
    safety: 20
  },
  gameSpeed: 1,
  simSeconds: 0,
  undoCount: 0,
  redoCount: 0,
  nextBuildingId: 1,
  pendingBuildAsset: null
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
