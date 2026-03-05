import type { BuildType, Building, GameState } from './state';
import { gameStore } from './state';

interface BuildingEconomy {
  name: string;
  cost: number;
  powerUse: number;
  powerProduce: number;
  housing: number;
  jobs: number;
  commerce: number;
  recreation: number;
  maintenance: number;
}

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
    maintenance: 0.58
  },
  powerPlant: {
    name: 'Power Plant',
    cost: 1200,
    powerUse: 0,
    powerProduce: 20,
    housing: 0,
    jobs: 6,
    commerce: 0,
    recreation: -4,
    maintenance: 0.48
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

function buildingAt(state: GameState, x: number, z: number): Building | undefined {
  return state.buildings.find((b) => b.x === x && b.z === z);
}

function hasRoadNeighbor(state: GameState, x: number, z: number): boolean {
  return (
    buildingAt(state, x + 1, z)?.type === 'road' ||
    buildingAt(state, x - 1, z)?.type === 'road' ||
    buildingAt(state, x, z + 1)?.type === 'road' ||
    buildingAt(state, x, z - 1)?.type === 'road'
  );
}

function hasPowerCoverage(state: GameState, x: number, z: number): boolean {
  return state.buildings.some((b) => b.type === 'powerPlant' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 10);
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

  const housingCapacity = houses.length * BUILDING_ECONOMY.house.housing;
  const jobCapacity =
    workshops * BUILDING_ECONOMY.workshop.jobs +
    restaurants * BUILDING_ECONOMY.restaurant.jobs +
    shops * BUILDING_ECONOMY.shop.jobs +
    plants * BUILDING_ECONOMY.powerPlant.jobs;
  const commercialCapacity =
    restaurants * BUILDING_ECONOMY.restaurant.commerce + shops * BUILDING_ECONOMY.shop.commerce;
  const recreationCapacity = parks * BUILDING_ECONOMY.park.recreation;

  const servicedHomes = houses.filter(
    (h) => hasRoadNeighbor(state, h.x, h.z) && hasPowerCoverage(state, h.x, h.z)
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
  const powerPressure = powerUsed > 0 ? Math.max(0, (powerUsed - powerProduced) / powerUsed) : 0;

  const happiness = clampPercent(
    44 + serviceRatio * 23 + employmentRatio * 20 - powerPressure * 32 - commercialPressure * 12 - recreationPressure * 8 + Math.min(parks, 8) * 1.5
  );

  const demandHousing = clampPercent(
    62 + Math.max(0, blendedPopulation - housingCapacity) * 3 - houses.length * 1.6 + Math.max(0, 65 - happiness) * 0.35
  );
  const demandRoads = clampPercent(
    18 + Math.max(0, (houses.length + restaurants + shops + workshops + parks) * 0.55 - roads) * 7
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
      jobs: demandJobs
    }
  };
}

export function isInBounds(state: GameState, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < state.gridSize && z < state.gridSize;
}

export function canPlaceBuilding(state: GameState, type: BuildType, x: number, z: number): boolean {
  if (!isInBounds(state, x, z)) return false;
  if (buildingAt(state, x, z)) return false;

  if (type !== 'road') {
    const roadsExist = state.buildings.some((b) => b.type === 'road');
    if (roadsExist && type !== 'powerPlant' && !hasRoadNeighbor(state, x, z)) return false;
    if (!roadsExist && type !== 'powerPlant') return false;
  }

  if (type === 'house') {
    const nearWorkshop = state.buildings.some(
      (b) => b.type === 'workshop' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 2
    );
    if (nearWorkshop) return false;
  }

  if (type === 'powerPlant') {
    const nearSensitive = state.buildings.some(
      (b) => (b.type === 'house' || b.type === 'restaurant' || b.type === 'park') && Math.abs(b.x - x) + Math.abs(b.z - z) <= 3
    );
    if (nearSensitive) return false;
  }

  return state.resources.money >= BUILDING_ECONOMY[type].cost;
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
      createdAt: performance.now()
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
        money: state.resources.money - economy.cost
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
                  money: state.resources.money - economy.cost
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
        money: state.resources.money + refund
      }
    };
    const derived = deriveSimulation(nextState);
    return {
      ...nextState,
      resources: {
        ...derived.resources,
        money: Math.round(nextState.resources.money * 100) / 100
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
      countType(state, 'shop') * 0.16 + countType(state, 'restaurant') * 0.14 + countType(state, 'workshop') * 0.12;
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
        money: Math.max(-6000, Math.round((state.resources.money + deltaMoney) * 100) / 100)
      },
      happiness: derived.happiness,
      demand: derived.demand
    };
  });
}
