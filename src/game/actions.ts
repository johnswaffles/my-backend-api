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

export function isInBounds(state: GameState, x: number, z: number): boolean {
  return x >= 0 && z >= 0 && x < state.gridSize && z < state.gridSize;
}

export function canPlaceBuilding(state: GameState, type: BuildType, x: number, z: number): boolean {
  if (!isInBounds(state, x, z)) return false;
  if (buildingAt(state, x, z)) return false;
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
    return {
      ...state,
      nextBuildingId: state.nextBuildingId + 1,
      selectedBuildingId: newBuilding.id,
      buildings: [...state.buildings, newBuilding],
      resources: {
        ...state.resources,
        money: state.resources.money - economy.cost,
        population: state.resources.population + economy.population,
        powerUsed: state.resources.powerUsed + economy.powerUse,
        powerProduced: state.resources.powerProduced + economy.powerProduce
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
