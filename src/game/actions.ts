import type { AssetVariation, BuildType, Building, GameState } from './state';
import { DISPLAY_MONEY_AMOUNT, gameStore, INFINITE_MONEY, occupiedCellsForBuilding, occupiedCellsForPlacement } from './state';

interface BuildingEconomy {
  name: string;
  cost: number;
  powerUse: number;
  powerProduce: number;
  housing: number;
  jobs: number;
  commerce: number;
  recreation: number;
  essentials: number;
  health: number;
  safety: number;
  maintenance: number;
}

export const ASSET_GENERATION_COST: Record<BuildType, number> = {
  road: 0,
  house: 80,
  restaurant: 130,
  shop: 120,
  park: 65,
  workshop: 110,
  powerPlant: 220,
  groceryStore: 140,
  cornerStore: 90,
  bank: 170,
  policeStation: 160,
  fireStation: 155,
  hospital: 210
};

export const BUILDING_ECONOMY: Record<BuildType, BuildingEconomy> = {
  road: {
    name: 'Road',
    cost: 12,
    powerUse: 0,
    powerProduce: 0,
    housing: 0,
    jobs: 0,
    commerce: 0,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 0,
    maintenance: 0.02
  },
  house: {
    name: 'House',
    cost: 180,
    powerUse: 2,
    powerProduce: 0,
    housing: 12,
    jobs: 0,
    commerce: 0,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 0,
    maintenance: 0.13
  },
  restaurant: {
    name: 'Restaurant',
    cost: 520,
    powerUse: 4,
    powerProduce: 0,
    housing: 0,
    jobs: 8,
    commerce: 14,
    recreation: 3,
    essentials: 4,
    health: 0,
    safety: 0,
    maintenance: 0.34
  },
  shop: {
    name: 'Shop',
    cost: 430,
    powerUse: 3,
    powerProduce: 0,
    housing: 0,
    jobs: 10,
    commerce: 20,
    recreation: 1,
    essentials: 6,
    health: 0,
    safety: 0,
    maintenance: 0.3
  },
  park: {
    name: 'Park',
    cost: 260,
    powerUse: 0,
    powerProduce: 0,
    housing: 0,
    jobs: 2,
    commerce: 0,
    recreation: 24,
    essentials: 0,
    health: 4,
    safety: 0,
    maintenance: 0.1
  },
  workshop: {
    name: 'Workshop',
    cost: 780,
    powerUse: 8,
    powerProduce: 0,
    housing: 0,
    jobs: 24,
    commerce: 5,
    recreation: -3,
    essentials: 0,
    health: 0,
    safety: -2,
    maintenance: 0.58
  },
  powerPlant: {
    name: 'Power Plant',
    cost: 1200,
    powerUse: 0,
    powerProduce: 32,
    housing: 0,
    jobs: 6,
    commerce: 0,
    recreation: -4,
    essentials: 0,
    health: -2,
    safety: -3,
    maintenance: 0.42
  },
  groceryStore: {
    name: 'Grocery Store',
    cost: 680,
    powerUse: 4,
    powerProduce: 0,
    housing: 0,
    jobs: 12,
    commerce: 18,
    recreation: 1,
    essentials: 34,
    health: 4,
    safety: 0,
    maintenance: 0.4
  },
  cornerStore: {
    name: 'Corner Store',
    cost: 320,
    powerUse: 2,
    powerProduce: 0,
    housing: 0,
    jobs: 5,
    commerce: 10,
    recreation: 1,
    essentials: 16,
    health: 0,
    safety: 0,
    maintenance: 0.2
  },
  bank: {
    name: 'Bank',
    cost: 940,
    powerUse: 5,
    powerProduce: 0,
    housing: 0,
    jobs: 18,
    commerce: 22,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 8,
    maintenance: 0.56
  },
  policeStation: {
    name: 'Police Station',
    cost: 1150,
    powerUse: 6,
    powerProduce: 0,
    housing: 0,
    jobs: 16,
    commerce: 0,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 40,
    maintenance: 0.62
  },
  fireStation: {
    name: 'Fire Station',
    cost: 1080,
    powerUse: 6,
    powerProduce: 0,
    housing: 0,
    jobs: 14,
    commerce: 0,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 34,
    maintenance: 0.58
  },
  hospital: {
    name: 'Hospital',
    cost: 1550,
    powerUse: 10,
    powerProduce: 0,
    housing: 0,
    jobs: 26,
    commerce: 0,
    recreation: 0,
    essentials: 0,
    health: 52,
    safety: 6,
    maintenance: 0.82
  }
};

type StateSnapshot = Pick<
  GameState,
  'buildings' | 'selectedBuildingId' | 'resources' | 'happiness' | 'demand' | 'day' | 'simSeconds' | 'nextBuildingId'
>;

const MAX_HISTORY = 10;
const undoStack: StateSnapshot[] = [];
const redoStack: StateSnapshot[] = [];

function cloneSnapshot(state: GameState): StateSnapshot {
  return {
    buildings: state.buildings.map((b) => ({ ...b })),
    selectedBuildingId: state.selectedBuildingId,
    resources: { ...state.resources },
    happiness: state.happiness,
    demand: { ...state.demand },
    day: state.day,
    simSeconds: state.simSeconds,
    nextBuildingId: state.nextBuildingId
  };
}

function stackCounts() {
  return { undoCount: undoStack.length, redoCount: redoStack.length };
}

function pushUndo(state: GameState): void {
  undoStack.push(cloneSnapshot(state));
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack.length = 0;
}

function applySnapshot(state: GameState, snapshot: StateSnapshot): GameState {
  return {
    ...state,
    buildings: snapshot.buildings.map((b) => ({ ...b })),
    selectedBuildingId: snapshot.selectedBuildingId,
    resources: { ...snapshot.resources },
    happiness: snapshot.happiness,
    demand: { ...snapshot.demand },
    day: snapshot.day,
    simSeconds: snapshot.simSeconds,
    nextBuildingId: snapshot.nextBuildingId,
    ...stackCounts()
  };
}

function placementTouchesCell(type: BuildType, x: number, z: number, targetX: number, targetZ: number): boolean {
  return occupiedCellsForPlacement(type, x, z).some((cell) => cell.x === targetX && cell.z === targetZ);
}

function buildingAt(state: GameState, x: number, z: number): Building | undefined {
  return state.buildings.find((b) => placementTouchesCell(b.type, b.x, b.z, x, z));
}

function minDistanceToBuildingCells(
  cells: Array<{ x: number; z: number }>,
  building: Building
): number {
  const occupied = occupiedCellsForBuilding(building);
  let min = Number.POSITIVE_INFINITY;

  for (const cell of cells) {
    for (const target of occupied) {
      min = Math.min(min, Math.abs(cell.x - target.x) + Math.abs(cell.z - target.z));
    }
  }

  return min;
}

function hasRoadAccess(state: GameState, type: BuildType, x: number, z: number): boolean {
  const occupied = occupiedCellsForPlacement(type, x, z);
  const occupiedKeys = new Set(occupied.map((cell) => `${cell.x}:${cell.z}`));

  return occupied.some((cell) => {
    const neighbors = [
      { x: cell.x + 1, z: cell.z },
      { x: cell.x - 1, z: cell.z },
      { x: cell.x, z: cell.z + 1 },
      { x: cell.x, z: cell.z - 1 }
    ];

    return neighbors.some((neighbor) => {
      if (occupiedKeys.has(`${neighbor.x}:${neighbor.z}`)) return false;
      return buildingAt(state, neighbor.x, neighbor.z)?.type === 'road';
    });
  });
}

function hasPowerCoverage(state: GameState, x: number, z: number): boolean {
  return state.buildings.some((b) => {
    if (b.type !== 'powerPlant') return false;
    return minDistanceToBuildingCells([{ x, z }], b) <= 10;
  });
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countType(state: GameState, type: BuildType): number {
  return state.buildings.filter((b) => b.type === type).length;
}

function deriveSimulation(state: GameState): Pick<GameState, 'resources' | 'happiness' | 'demand'> {
  const roads = countType(state, 'road');
  const houses = state.buildings.filter((b) => b.type === 'house');
  const restaurants = countType(state, 'restaurant');
  const shops = countType(state, 'shop');
  const parks = countType(state, 'park');
  const workshops = countType(state, 'workshop');
  const plants = countType(state, 'powerPlant');
  const groceries = countType(state, 'groceryStore');
  const cornerStores = countType(state, 'cornerStore');
  const banks = countType(state, 'bank');
  const policeStations = countType(state, 'policeStation');
  const fireStations = countType(state, 'fireStation');
  const hospitals = countType(state, 'hospital');

  const housingCapacity = houses.length * BUILDING_ECONOMY.house.housing;
  const jobCapacity =
    workshops * BUILDING_ECONOMY.workshop.jobs +
    restaurants * BUILDING_ECONOMY.restaurant.jobs +
    shops * BUILDING_ECONOMY.shop.jobs +
    plants * BUILDING_ECONOMY.powerPlant.jobs +
    groceries * BUILDING_ECONOMY.groceryStore.jobs +
    cornerStores * BUILDING_ECONOMY.cornerStore.jobs +
    banks * BUILDING_ECONOMY.bank.jobs +
    policeStations * BUILDING_ECONOMY.policeStation.jobs +
    fireStations * BUILDING_ECONOMY.fireStation.jobs +
    hospitals * BUILDING_ECONOMY.hospital.jobs;
  const commercialCapacity =
    restaurants * BUILDING_ECONOMY.restaurant.commerce +
    shops * BUILDING_ECONOMY.shop.commerce +
    groceries * BUILDING_ECONOMY.groceryStore.commerce +
    cornerStores * BUILDING_ECONOMY.cornerStore.commerce +
    banks * BUILDING_ECONOMY.bank.commerce;
  const recreationCapacity = parks * BUILDING_ECONOMY.park.recreation;
  const essentialsCapacity =
    groceries * BUILDING_ECONOMY.groceryStore.essentials +
    cornerStores * BUILDING_ECONOMY.cornerStore.essentials +
    restaurants * BUILDING_ECONOMY.restaurant.essentials +
    shops * BUILDING_ECONOMY.shop.essentials;
  const healthCapacity = hospitals * BUILDING_ECONOMY.hospital.health + parks * BUILDING_ECONOMY.park.health;
  const safetyCapacity =
    policeStations * BUILDING_ECONOMY.policeStation.safety +
    fireStations * BUILDING_ECONOMY.fireStation.safety +
    banks * BUILDING_ECONOMY.bank.safety;

  const servicedHomes = houses.filter(
    (h) => hasRoadAccess(state, h.type, h.x, h.z) && hasPowerCoverage(state, h.x, h.z)
  ).length;

  const serviceRatio = houses.length > 0 ? servicedHomes / houses.length : 1;

  let powerUsed = roads * 0.2;
  let powerProduced = 0;
  for (const building of state.buildings) {
    const econ = BUILDING_ECONOMY[building.type];
    powerUsed += econ.powerUse;
    powerProduced += econ.powerProduce;
  }

  const targetPopulation = Math.max(
    8,
    Math.min(
      housingCapacity + 8,
      Math.round(jobCapacity * 1.05 + commercialCapacity * 0.12 + recreationCapacity * 0.08)
    )
  );
  const blendedPopulation = Math.round(
    state.resources.population + (targetPopulation - state.resources.population) * 0.25
  );

  const employmentRatio = blendedPopulation > 0 ? Math.min(1, jobCapacity / blendedPopulation) : 1;
  const commercialPressure = blendedPopulation > 0 ? Math.max(0, (blendedPopulation - commercialCapacity) / blendedPopulation) : 0;
  const recreationPressure = blendedPopulation > 0 ? Math.max(0, (blendedPopulation - recreationCapacity) / blendedPopulation) : 0;
  const essentialsPressure = blendedPopulation > 0 ? Math.max(0, (blendedPopulation - essentialsCapacity) / blendedPopulation) : 0;
  const healthPressure = blendedPopulation > 0 ? Math.max(0, (blendedPopulation - healthCapacity) / blendedPopulation) : 0;
  const safetyPressure = blendedPopulation > 0 ? Math.max(0, (blendedPopulation - safetyCapacity) / blendedPopulation) : 0;
  const powerPressure = powerUsed > 0 ? Math.max(0, (powerUsed - powerProduced) / powerUsed) : 0;

  const happiness = clampPercent(
    42 +
      serviceRatio * 21 +
      employmentRatio * 18 -
      powerPressure * 30 -
      commercialPressure * 9 -
      recreationPressure * 8 -
      essentialsPressure * 14 -
      healthPressure * 12 -
      safetyPressure * 10 +
      Math.min(parks, 8) * 1.4
  );

  const demandHousing = clampPercent(
    62 + Math.max(0, blendedPopulation - housingCapacity) * 3 - houses.length * 1.6 + Math.max(0, 65 - happiness) * 0.35
  );
  const demandRoads = clampPercent(
    18 +
      Math.max(
        0,
        (houses.length +
          restaurants +
          shops +
          groceries +
          cornerStores +
          banks +
          workshops +
          parks +
          policeStations +
          fireStations +
          hospitals) *
          0.55 -
          roads
      ) *
        7
  );
  const demandPower = clampPercent(
    14 + Math.max(0, powerUsed - powerProduced) * 6 + Math.max(0, houses.length - plants * 4)
  );
  const demandCommerce = clampPercent(
    28 + Math.max(0, blendedPopulation - commercialCapacity) * 2.8 - (restaurants + shops) * 1.2
  );
  const demandRecreation = clampPercent(
    24 + Math.max(0, blendedPopulation - recreationCapacity) * 1.4 - parks * 2.8 + Math.max(0, 55 - happiness) * 0.5
  );
  const demandJobs = clampPercent(
    30 + Math.max(0, blendedPopulation - jobCapacity) * 2.2 - workshops * 2.4 - (restaurants + shops) * 0.8
  );
  const demandEssentials = clampPercent(
    24 + Math.max(0, blendedPopulation - essentialsCapacity) * 2.1 - groceries * 1.8 - cornerStores * 1.1
  );
  const demandHealth = clampPercent(
    18 + Math.max(0, blendedPopulation - healthCapacity) * 1.6 - hospitals * 2.4 + Math.max(0, 52 - happiness) * 0.5
  );
  const demandSafety = clampPercent(
    18 + Math.max(0, blendedPopulation - safetyCapacity) * 1.7 - policeStations * 1.8 - fireStations * 1.7 + Math.max(0, 54 - happiness) * 0.45
  );

  return {
    resources: {
      ...state.resources,
      population: blendedPopulation,
      jobs: jobCapacity,
      powerUsed: Math.round(powerUsed),
      powerProduced: Math.round(powerProduced)
    },
    happiness,
    demand: {
      housing: demandHousing,
      roads: demandRoads,
      power: demandPower,
      commerce: demandCommerce,
      recreation: demandRecreation,
      jobs: demandJobs,
      essentials: demandEssentials,
      health: demandHealth,
      safety: demandSafety
    }
  };
}

export function isInBounds(state: GameState, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < state.gridSize && z < state.gridSize;
}

export function canPlaceBuilding(state: GameState, type: BuildType, x: number, z: number): boolean {
  const occupied = occupiedCellsForPlacement(type, x, z);
  if (!occupied.length) return false;
  if (occupied.some((cell) => !isInBounds(state, cell.x, cell.z))) return false;
  if (occupied.some((cell) => buildingAt(state, cell.x, cell.z))) return false;

  if (type !== 'road') {
    const roadsExist = state.buildings.some((b) => b.type === 'road');
    if (roadsExist && type !== 'powerPlant' && !hasRoadAccess(state, type, x, z)) return false;
    if (!roadsExist && type !== 'powerPlant') return false;
  }

  if (type === 'house') {
    const nearWorkshop = state.buildings.some(
      (b) => b.type === 'workshop' && minDistanceToBuildingCells(occupied, b) <= 2
    );
    if (nearWorkshop) return false;
  }

  if (type === 'powerPlant') {
    const nearSensitive = state.buildings.some(
      (b) =>
        (b.type === 'house' ||
          b.type === 'restaurant' ||
          b.type === 'park' ||
          b.type === 'hospital' ||
          b.type === 'groceryStore') &&
        minDistanceToBuildingCells(occupied, b) <= 2
    );
    if (nearSensitive) return false;
  }

  if (type === 'workshop') {
    const nearSensitive = state.buildings.some(
      (b) =>
        (b.type === 'house' || b.type === 'hospital' || b.type === 'park') &&
        minDistanceToBuildingCells(occupied, b) <= 2
    );
    if (nearSensitive) return false;
  }

  return INFINITE_MONEY || state.resources.money >= BUILDING_ECONOMY[type].cost;
}

export function setPlacementMode(type: BuildType | null): void {
  gameStore.update((state) => ({
    ...state,
    placementMode: type,
    hoverCell: state.hoverCell
      ? {
          ...state.hoverCell,
          valid: type ? canPlaceBuilding(state, type, state.hoverCell.x, state.hoverCell.z) : false
        }
      : null
  }));
}

export function undoAction(): boolean {
  const state = gameStore.getState();
  const previous = undoStack.pop();
  if (!previous) return false;
  redoStack.push(cloneSnapshot(state));
  gameStore.setState(applySnapshot(state, previous));
  return true;
}

export function redoAction(): boolean {
  const state = gameStore.getState();
  const next = redoStack.pop();
  if (!next) return false;
  undoStack.push(cloneSnapshot(state));
  gameStore.setState(applySnapshot(state, next));
  return true;
}

export function cancelPlacement(): void {
  gameStore.update((state) => ({
    ...state,
    placementMode: null,
    hoverCell: state.hoverCell ? { ...state.hoverCell, valid: false } : null
  }));
}

export function setAiAutoplayEnabled(enabled: boolean): void {
  gameStore.update((state) => ({
    ...state,
    aiAutoplayEnabled: enabled,
    aiLastAction: enabled ? 'Autoplay enabled' : 'Autoplay disabled'
  }));
}

export function toggleAiAutoplay(): void {
  const state = gameStore.getState();
  setAiAutoplayEnabled(!state.aiAutoplayEnabled);
}

export function setAiLastAction(message: string): void {
  gameStore.update((state) => ({
    ...state,
    aiLastAction: message
  }));
}

export function cycleGameSpeed(): void {
  gameStore.update((state) => {
    const next: 0 | 1 | 2 = state.gameSpeed === 0 ? 1 : state.gameSpeed === 1 ? 2 : 0;
    return {
      ...state,
      gameSpeed: next
    };
  });
}

export function setHoverCell(cell: { x: number; z: number } | null): void {
  gameStore.update((state) => {
    if (!cell) {
      return { ...state, hoverCell: null };
    }

    if (!isInBounds(state, cell.x, cell.z)) {
      return { ...state, hoverCell: null };
    }

    const valid = state.placementMode ? canPlaceBuilding(state, state.placementMode, cell.x, cell.z) : false;

    return {
      ...state,
      hoverCell: {
        x: cell.x,
        z: cell.z,
        valid
      }
    };
  });
}

export function selectBuildingById(buildingId: number | null): void {
  gameStore.update((state) => ({
    ...state,
    selectedBuildingId: buildingId
  }));
}

export function selectBuildingAt(x: number, z: number): number | null {
  const state = gameStore.getState();
  const hit = state.buildings.find((b) => b.x === x && b.z === z);
  selectBuildingById(hit?.id ?? null);
  return hit?.id ?? null;
}

export function placeBuildingAt(type: BuildType, x: number, z: number): Building | null {
  let created: Building | null = null;

  gameStore.update((state) => {
    if (!canPlaceBuilding(state, type, x, z)) return state;
    pushUndo(state);

    const newBuilding: Building = {
      id: state.nextBuildingId,
      type,
      x,
      z,
      createdAt: performance.now(),
      assetVariationId: state.activeAssetVariation[type] ?? null
    };
    created = newBuilding;

    const economy = BUILDING_ECONOMY[type];
    const nextState = {
      ...state,
      nextBuildingId: state.nextBuildingId + 1,
      selectedBuildingId: newBuilding.id,
      buildings: [...state.buildings, newBuilding],
      resources: {
        ...state.resources,
        money: INFINITE_MONEY ? DISPLAY_MONEY_AMOUNT : state.resources.money - economy.cost
      },
      hoverCell: state.hoverCell
        ? {
            ...state.hoverCell,
            valid: canPlaceBuilding(
              {
                ...state,
                buildings: [...state.buildings, newBuilding],
                resources: {
                  ...state.resources,
                  money: INFINITE_MONEY ? DISPLAY_MONEY_AMOUNT : state.resources.money - economy.cost
                }
              },
              type,
              state.hoverCell.x,
              state.hoverCell.z
            )
          }
        : state.hoverCell
    };
    const derived = deriveSimulation(nextState);
    return {
      ...nextState,
      resources: {
        ...derived.resources,
        money: nextState.resources.money
      },
      happiness: derived.happiness,
      demand: derived.demand,
      ...stackCounts()
    };
  });

  return created;
}

export function setActiveAssetVariation(type: BuildType, variationId: string | null): void {
  gameStore.update((state) => ({
    ...state,
    activeAssetVariation: {
      ...state.activeAssetVariation,
      [type]: variationId
    }
  }));
}

export function saveAssetVariation(type: BuildType, variation: AssetVariation): { ok: boolean; error?: string } {
  let result: { ok: boolean; error?: string } = { ok: false, error: 'Unknown error' };

  gameStore.update((state) => {
    const cost = ASSET_GENERATION_COST[type] ?? 0;
    if (!INFINITE_MONEY && state.resources.money < cost) {
      result = { ok: false, error: 'Not enough money to generate this asset.' };
      return state;
    }

    const existing = state.assetLibrary[type] ?? [];
    const nextList = [variation, ...existing.filter((item) => item.id !== variation.id)].slice(0, 4);
    result = { ok: true };
    return {
      ...state,
      assetLibrary: {
        ...state.assetLibrary,
        [type]: nextList
      },
      activeAssetVariation: {
        ...state.activeAssetVariation,
        [type]: variation.id
      },
      resources: {
        ...state.resources,
        money: INFINITE_MONEY ? DISPLAY_MONEY_AMOUNT : Math.round((state.resources.money - cost) * 100) / 100
      }
    };
  });

  return result;
}

export function removeAssetVariation(type: BuildType, variationId: string): void {
  gameStore.update((state) => {
    const current = state.assetLibrary[type] ?? [];
    const nextList = current.filter((item) => item.id !== variationId);
    const nextActive =
      state.activeAssetVariation[type] === variationId ? nextList[0]?.id ?? null : state.activeAssetVariation[type] ?? null;

    return {
      ...state,
      assetLibrary: {
        ...state.assetLibrary,
        [type]: nextList
      },
      activeAssetVariation: {
        ...state.activeAssetVariation,
        [type]: nextActive
      }
    };
  });
}

export function applyAssetVariationToBuilding(buildingId: number, variationId: string | null): void {
  gameStore.update((state) => ({
    ...state,
    buildings: state.buildings.map((building) =>
      building.id === buildingId
        ? {
            ...building,
            assetVariationId: variationId
          }
        : building
    )
  }));
}

export function bulldozeAt(x: number, z: number): Building | null {
  let removed: Building | null = null;
  gameStore.update((state) => {
    const target = buildingAt(state, x, z);
    if (!target) return state;
    pushUndo(state);

    removed = target;
    const refund = BUILDING_ECONOMY[target.type].cost * 0.45;

    const nextState = {
      ...state,
      buildings: state.buildings.filter((b) => b.id !== target.id),
      selectedBuildingId: state.selectedBuildingId === target.id ? null : state.selectedBuildingId,
      resources: {
        ...state.resources,
        money: INFINITE_MONEY ? DISPLAY_MONEY_AMOUNT : state.resources.money + refund
      }
    };
    const derived = deriveSimulation(nextState);
    return {
      ...nextState,
      resources: {
        ...derived.resources,
        money: INFINITE_MONEY ? DISPLAY_MONEY_AMOUNT : Math.round(nextState.resources.money * 100) / 100
      },
      happiness: derived.happiness,
      demand: derived.demand,
      ...stackCounts()
    };
  });

  return removed;
}

export function selectedBuilding(state: GameState): Building | null {
  if (state.selectedBuildingId == null) return null;
  return state.buildings.find((b) => b.id === state.selectedBuildingId) ?? null;
}

export type AiGameCommand =
  | { action: 'place'; type: BuildType; x: number; z: number }
  | { action: 'bulldoze'; x: number; z: number };

export function executeAiCommands(commands: AiGameCommand[]): { placed: number; removed: number; failed: number } {
  let placed = 0;
  let removed = 0;
  let failed = 0;

  for (const command of commands.slice(0, 12)) {
    if (command.action === 'place') {
      const created = placeBuildingAt(command.type, command.x, command.z);
      if (created) {
        placed += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    if (command.action === 'bulldoze') {
      const deleted = bulldozeAt(command.x, command.z);
      if (deleted) {
        removed += 1;
      } else {
        failed += 1;
      }
      continue;
    }

    failed += 1;
  }

  return { placed, removed, failed };
}

export function tickSimulation(dtSeconds: number): void {
  if (dtSeconds <= 0) return;
  gameStore.update((state) => {
    const derived = deriveSimulation(state);

    let maintenancePerSecond = 0;
    for (const b of state.buildings) {
      maintenancePerSecond += BUILDING_ECONOMY[b.type].maintenance;
    }

    const residentTax = derived.resources.population * 0.044;
    const employmentTax = Math.min(derived.resources.population, derived.resources.jobs) * 0.031;
    const commercialTax =
      countType(state, 'shop') * 0.16 +
      countType(state, 'restaurant') * 0.14 +
      countType(state, 'workshop') * 0.12 +
      countType(state, 'groceryStore') * 0.19 +
      countType(state, 'cornerStore') * 0.11 +
      countType(state, 'bank') * 0.18;
    const powerPenalty = Math.max(0, derived.resources.powerUsed - derived.resources.powerProduced) * 0.2;
    const happinessBonus = (derived.happiness - 50) * 0.008;

    const deltaMoney =
      (residentTax + employmentTax + commercialTax - maintenancePerSecond - powerPenalty + happinessBonus) * dtSeconds;

    const simSeconds = state.simSeconds + dtSeconds;
    const day = Math.floor(simSeconds / 30) + 1;

    return {
      ...state,
      simSeconds,
      day,
      resources: {
        ...derived.resources,
        money: INFINITE_MONEY
          ? DISPLAY_MONEY_AMOUNT
          : Math.max(-6000, Math.round((state.resources.money + deltaMoney) * 100) / 100)
      },
      happiness: derived.happiness,
      demand: derived.demand
    };
  });
}
