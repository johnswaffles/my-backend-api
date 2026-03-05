import type { BuildType, Building, GameState } from './state';
import { gameStore } from './state';

interface BuildingEconomy {
  cost: number;
  population: number;
  powerUse: number;
  powerProduce: number;
}

const BUILDING_ECONOMY: Record<BuildType, BuildingEconomy> = {
  road: { cost: 12, population: 0, powerUse: 0, powerProduce: 0 },
  house: { cost: 180, population: 7, powerUse: 2, powerProduce: 0 },
  powerPlant: { cost: 1200, population: 0, powerUse: 0, powerProduce: 18 }
};

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
  return state.buildings.some(
    (b) => b.type === 'powerPlant' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 9
  );
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function deriveSimulation(state: GameState): Pick<GameState, 'resources' | 'happiness' | 'demand'> {
  const roads = state.buildings.filter((b) => b.type === 'road');
  const houses = state.buildings.filter((b) => b.type === 'house');
  const plants = state.buildings.filter((b) => b.type === 'powerPlant');

  const servicedHouses = houses.filter((h) => hasRoadNeighbor(state, h.x, h.z) && hasPowerCoverage(state, h.x, h.z)).length;
  const unservicedHouses = houses.length - servicedHouses;

  const targetPopulation = Math.max(8, servicedHouses * 11 + unservicedHouses * 3);
  const blendedPopulation = Math.round(state.resources.population + (targetPopulation - state.resources.population) * 0.35);

  const powerUsed = houses.length * 2 + Math.round(roads.length * 0.15);
  const powerProduced = plants.length * 18;

  const powerPressure = powerUsed > 0 ? Math.max(0, (powerUsed - powerProduced) / powerUsed) : 0;
  const serviceRatio = houses.length > 0 ? servicedHouses / houses.length : 1;
  const roadCoverage = houses.length > 0 ? houses.filter((h) => hasRoadNeighbor(state, h.x, h.z)).length / houses.length : 1;

  const happiness = clampPercent(52 + serviceRatio * 24 + roadCoverage * 14 - powerPressure * 34);

  const demandHousing = clampPercent(70 - houses.length * 3 + Math.max(0, 62 - happiness) * 0.4);
  const demandRoads = clampPercent(22 + Math.max(0, houses.length * 0.8 - roads.length * 1.2) * 8);
  const demandPower = clampPercent(18 + Math.max(0, powerUsed - powerProduced) * 6 + plants.length * 2);

  return {
    resources: {
      ...state.resources,
      population: blendedPopulation,
      powerUsed,
      powerProduced
    },
    happiness,
    demand: {
      housing: demandHousing,
      roads: demandRoads,
      power: demandPower
    }
  };
}

export function isInBounds(state: GameState, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < state.gridSize && z < state.gridSize;
}

export function canPlaceBuilding(state: GameState, type: BuildType, x: number, z: number): boolean {
  if (!isInBounds(state, x, z)) return false;
  if (buildingAt(state, x, z)) return false;
  if (type === 'house') {
    const roadsExist = state.buildings.some((b) => b.type === 'road');
    if (roadsExist && !hasRoadNeighbor(state, x, z)) return false;
  }
  if (type === 'powerPlant') {
    const nearHouse = state.buildings.some((b) => b.type === 'house' && Math.abs(b.x - x) + Math.abs(b.z - z) <= 2);
    if (nearHouse) return false;
  }
  return state.resources.money >= BUILDING_ECONOMY[type].cost;
}

export function setPlacementMode(type: BuildType | null): void {
  gameStore.update((state) => ({
    ...state,
    placementMode: type,
    hoverCell: state.hoverCell ? { ...state.hoverCell, valid: type ? canPlaceBuilding(state, type, state.hoverCell.x, state.hoverCell.z) : false } : null
  }));
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

    const valid = state.placementMode
      ? canPlaceBuilding(state, state.placementMode, cell.x, cell.z)
      : false;

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
      demand: derived.demand
    };
  });

  return created;
}

export function selectedBuilding(state: GameState): Building | null {
  if (state.selectedBuildingId == null) return null;
  return state.buildings.find((b) => b.id === state.selectedBuildingId) ?? null;
}

export interface AiGameCommand {
  action: 'place';
  type: BuildType;
  x: number;
  z: number;
}

export function executeAiCommands(commands: AiGameCommand[]): { placed: number; failed: number } {
  let placed = 0;
  let failed = 0;

  for (const command of commands.slice(0, 10)) {
    if (command.action !== 'place') {
      failed += 1;
      continue;
    }
    const created = placeBuildingAt(command.type, command.x, command.z);
    if (created) {
      placed += 1;
    } else {
      failed += 1;
    }
  }

  return { placed, failed };
}

export function tickSimulation(dtSeconds: number): void {
  if (dtSeconds <= 0) return;
  gameStore.update((state) => {
    const derived = deriveSimulation(state);

    const houses = state.buildings.filter((b) => b.type === 'house').length;
    const roads = state.buildings.filter((b) => b.type === 'road').length;
    const plants = state.buildings.filter((b) => b.type === 'powerPlant').length;

    const incomePerSecond = derived.resources.population * 0.085;
    const maintenancePerSecond = houses * 0.42 + roads * 0.06 + plants * 1.6;
    const powerPenalty = Math.max(0, derived.resources.powerUsed - derived.resources.powerProduced) * 0.5;
    const happinessBonus = (derived.happiness - 50) * 0.015;
    const deltaMoney = (incomePerSecond - maintenancePerSecond - powerPenalty + happinessBonus) * dtSeconds;

    const simSeconds = state.simSeconds + dtSeconds;
    const day = Math.floor(simSeconds / 30) + 1;

    return {
      ...state,
      simSeconds,
      day,
      resources: {
        ...derived.resources,
        money: Math.max(-5000, Math.round((state.resources.money + deltaMoney) * 100) / 100)
      },
      happiness: derived.happiness,
      demand: derived.demand
    };
  });
}
