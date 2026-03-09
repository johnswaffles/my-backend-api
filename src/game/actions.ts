import type { AssetVariation, BuildType, Building, GameState } from './state';
import {
  DAY_LENGTH_SECONDS,
  gameStore,
  INFINITE_MONEY,
  MAX_BUILDING_LEVEL,
  occupiedCellsForBuilding,
  occupiedCellsForPlacement
} from './state';
import type { GameSpeed } from './state';

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

export const ECONOMY_TUNING = {
  residentTaxPerCitizen: 0.03,
  employmentTaxPerWorker: 0.024,
  shopRevenue: 0.13,
  restaurantRevenue: 0.16,
  workshopRevenue: 0.1,
  groceryRevenue: 0.18,
  cornerStoreRevenue: 0.1,
  bankRevenue: 0.2,
  powerDeficitPenalty: 0.22,
  happinessIncomeFactor: 0.012,
  upgradedHousingRevenuePerLevel: 0.08,
  apartmentRevenuePerTile: 0.11,
  highRiseRevenuePerTile: 0.22,
  tier4ResidentialRevenuePerTile: 0.34,
  tier5ResidentialRevenuePerTile: 0.52,
  minimumMoney: -20000
} as const;

type StateSnapshot = Pick<
  GameState,
  | 'buildings'
  | 'selectedBuildingId'
  | 'resources'
  | 'happiness'
  | 'demand'
  | 'day'
  | 'timeOfDay'
  | 'simSeconds'
  | 'nextBuildingId'
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
    timeOfDay: state.timeOfDay,
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
    timeOfDay: snapshot.timeOfDay,
    simSeconds: snapshot.simSeconds,
    nextBuildingId: snapshot.nextBuildingId,
    ...stackCounts()
  };
}

function isCommercialType(type: BuildType): boolean {
  return (
    type === 'shop' ||
    type === 'restaurant' ||
    type === 'groceryStore' ||
    type === 'cornerStore' ||
    type === 'bank'
  );
}

function comboFamilyForType(type: BuildType): 'residential' | 'commercial' | 'civic' | 'industrial' | 'utility' | 'park' | 'street' {
  if (type === 'road') return 'street';
  if (type === 'house') return 'residential';
  if (isCommercialType(type)) return 'commercial';
  if (type === 'policeStation' || type === 'fireStation' || type === 'hospital') return 'civic';
  if (type === 'workshop') return 'industrial';
  if (type === 'powerPlant') return 'utility';
  return 'park';
}

function buildingHasPowerCoverage(state: GameState, building: Building): boolean {
  return occupiedCellsForBuilding(building).some((cell) => hasPowerCoverage(state, cell.x, cell.z));
}

function buildingHasRoadAccess(state: GameState, building: Building): boolean {
  return hasRoadAccess(state, building.type, building.x, building.z);
}

function adjacentBuildings(state: GameState, building: Building): Building[] {
  const cells = occupiedCellsForBuilding(building);
  return state.buildings.filter(
    (other) => other.id !== building.id && minDistanceToBuildingCells(cells, other) === 1
  );
}

function sameTypeConnectedCluster(state: GameState, building: Building): Building[] {
  const cluster = new Map<number, Building>();
  const queue: Building[] = [building];
  cluster.set(building.id, building);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    for (const other of adjacentBuildings(state, current)) {
      if (other.type !== building.type || cluster.has(other.id)) continue;
      cluster.set(other.id, other);
      queue.push(other);
    }
  }

  return [...cluster.values()];
}

function nearbyTypeCount(state: GameState, building: Building, types: BuildType[], range: number): number {
  const cells = occupiedCellsForBuilding(building);
  return state.buildings.filter(
    (other) => other.id !== building.id && types.includes(other.type) && minDistanceToBuildingCells(cells, other) <= range
  ).length;
}

function commercialComboBonus(state: GameState): number {
  const seen = new Set<string>();
  let bonus = 0;
  for (const building of state.buildings) {
    if (!isCommercialType(building.type)) continue;
    for (const other of adjacentBuildings(state, building)) {
      if (!isCommercialType(other.type)) continue;
      const key = building.id < other.id ? `${building.id}:${other.id}` : `${other.id}:${building.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bonus += 4;
    }
  }
  return bonus;
}

function residentialComboBonus(state: GameState): number {
  const seen = new Set<string>();
  let bonus = 0;
  for (const building of state.buildings) {
    if (building.type !== 'house') continue;
    for (const other of adjacentBuildings(state, building)) {
      if (other.type !== 'house') continue;
      const key = building.id < other.id ? `${building.id}:${other.id}` : `${other.id}:${building.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      bonus += 2;
    }
  }
  return bonus;
}

function buildingLevelFactor(building: Building): number {
  return 1 + (building.level - 1) * 0.28;
}

function upgradeThresholdFor(building: Building): number {
  const base =
    building.type === 'house'
      ? 20
      : isCommercialType(building.type)
        ? 24
        : building.type === 'park'
          ? 18
          : building.type === 'workshop'
            ? 28
            : building.type === 'powerPlant'
              ? 34
              : 30;
  return base + (building.level - 1) * 18;
}

export function upgradeCostForBuilding(building: Building): number {
  return Math.round(BUILDING_ECONOMY[building.type].cost * (0.14 + building.level * 0.08));
}

export function upgradeCostForSelection(state: GameState, building: Building): number {
  return sameTypeConnectedCluster(state, building)
    .filter((member) => member.level < MAX_BUILDING_LEVEL)
    .reduce((sum, member) => sum + upgradeCostForBuilding(member), 0);
}

export function canUpgradeBuilding(state: GameState, building: Building): boolean {
  const upgradableMembers = sameTypeConnectedCluster(state, building).filter((member) => member.level < MAX_BUILDING_LEVEL);
  if (!upgradableMembers.length) return false;
  return INFINITE_MONEY || state.resources.money >= upgradeCostForSelection(state, building);
}

function buildingAppealScore(state: GameState, building: Building): number {
  const roadAccess = buildingHasRoadAccess(state, building) || building.type === 'powerPlant';
  const powerAccess = buildingHasPowerCoverage(state, building) || building.type === 'powerPlant';
  const parkSupport = nearbyTypeCount(state, building, ['park'], 3);
  const commerceSupport = nearbyTypeCount(state, building, ['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'], 3);
  const civicSupport = nearbyTypeCount(state, building, ['hospital', 'policeStation', 'fireStation'], 4);
  const directAdjacency = adjacentBuildings(state, building).filter(
    (other) => comboFamilyForType(other.type) === comboFamilyForType(building.type)
  ).length;
  const industrialPressure = nearbyTypeCount(state, building, ['workshop', 'powerPlant'], building.type === 'house' ? 3 : 2);
  const utilityPressure = building.type === 'park' ? nearbyTypeCount(state, building, ['powerPlant'], 4) : 0;

  return clampPercent(
    34 +
      (roadAccess ? 20 : 0) +
      (powerAccess ? 16 : 0) +
      parkSupport * 6 +
      commerceSupport * 3 +
      civicSupport * 4 +
      directAdjacency * 7 +
      (building.level - 1) * 10 +
      Math.max(0, state.happiness - 50) * 0.35 -
      (building.type === 'house' ? industrialPressure * 9 : industrialPressure * 3) -
      utilityPressure * 7
  );
}

function evolveBuildings(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state;
  const nextBuildings = state.buildings.map((building) => ({ ...building }));
  let availableMoney = state.resources.money;
  let upgradedAny = false;

  for (const building of nextBuildings) {
    if (building.type === 'road') continue;
    const roadAccess = buildingHasRoadAccess(state, building) || building.type === 'powerPlant';
    const powerAccess = buildingHasPowerCoverage(state, building) || building.type === 'powerPlant';
    const serviceFactor = (roadAccess ? 1 : 0.32) * (powerAccess ? 1 : 0.45);
    const parkSupport = nearbyTypeCount(state, building, ['park'], 3);
    const commerceSupport = nearbyTypeCount(state, building, ['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'], 3);
    const civicSupport = nearbyTypeCount(state, building, ['hospital', 'policeStation', 'fireStation'], 4);
    const directAdjacency = adjacentBuildings(state, building).filter(
      (other) => comboFamilyForType(other.type) === comboFamilyForType(building.type)
    ).length;
    const appeal = buildingAppealScore(state, building);
    const appealFactor =
      0.45 +
      (appeal / 100) * 0.9 +
      parkSupport * 0.04 +
      commerceSupport * 0.025 +
      civicSupport * 0.02 +
      directAdjacency * 0.08;
    const typeFactor =
      building.type === 'house'
        ? 1.16
        : isCommercialType(building.type)
          ? 1.05
          : building.type === 'park'
            ? 1.22
            : building.type === 'workshop'
              ? 0.86
              : building.type === 'powerPlant'
                ? 0.78
                : 0.92;

    building.upgradeProgress += dtSeconds * serviceFactor * appealFactor * typeFactor;
    if (building.level >= MAX_BUILDING_LEVEL) continue;

    const threshold = upgradeThresholdFor(building);
    const upgradeCost = upgradeCostForBuilding(building);
    if (building.upgradeProgress < threshold) continue;
    if (!roadAccess || !powerAccess) continue;
    if (!INFINITE_MONEY && availableMoney < upgradeCost) continue;

    availableMoney -= upgradeCost;
    building.upgradeProgress = 0;
    building.level = Math.min(MAX_BUILDING_LEVEL, building.level + 1) as 1 | 2 | 3 | 4 | 5;
    building.lastUpgradeAt = performance.now();
    upgradedAny = true;
  }

  if (!upgradedAny && availableMoney === state.resources.money) return state;
  return {
    ...state,
    buildings: nextBuildings,
    resources: {
      ...state.resources,
      money: availableMoney
    }
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

function clusterBonuses(state: GameState): {
  housing: number;
  jobs: number;
  commercial: number;
  recreation: number;
  essentials: number;
  health: number;
  safety: number;
  power: number;
  happiness: number;
} {
  const seen = new Set<number>();
  const bonuses = {
    housing: 0,
    jobs: 0,
    commercial: 0,
    recreation: 0,
    essentials: 0,
    health: 0,
    safety: 0,
    power: 0,
    happiness: 0
  };

  for (const building of state.buildings) {
    if (seen.has(building.id) || building.type === 'road') continue;
    const cluster = sameTypeConnectedCluster(state, building);
    cluster.forEach((member) => seen.add(member.id));
    const size = cluster.length;
    if (size < 2) continue;
    const avgLevel = cluster.reduce((sum, member) => sum + member.level, 0) / size;

    if (building.type === 'house' && size >= 4) {
      bonuses.housing += size * 3 + Math.round(avgLevel * 2);
      bonuses.happiness += 2 + avgLevel;
    } else if (building.type === 'shop' && size >= 3) {
      bonuses.jobs += size * 3;
      bonuses.commercial += size * 6 + Math.round(avgLevel * 3);
      bonuses.essentials += size;
      bonuses.happiness += 1 + avgLevel * 0.4;
    } else if (building.type === 'restaurant' && size >= 2) {
      bonuses.jobs += size * 2;
      bonuses.commercial += size * 4;
      bonuses.recreation += size * 2 + Math.round(avgLevel);
      bonuses.happiness += 1 + avgLevel * 0.5;
    } else if (building.type === 'groceryStore' && size >= 4) {
      bonuses.jobs += size * 3;
      bonuses.commercial += size * 4;
      bonuses.essentials += size * 8 + Math.round(avgLevel * 3);
      bonuses.health += Math.round(avgLevel);
    } else if ((building.type === 'cornerStore' || building.type === 'bank') && size >= 2) {
      bonuses.jobs += size * 2;
      bonuses.commercial += size * 3 + Math.round(avgLevel * 2);
      if (building.type === 'cornerStore') bonuses.essentials += size * 3;
      if (building.type === 'bank') bonuses.safety += size * 2;
    } else if (building.type === 'park' && size >= 4) {
      bonuses.recreation += size * 6 + Math.round(avgLevel * 2);
      bonuses.health += Math.round(avgLevel * 2);
      bonuses.happiness += 3 + avgLevel;
    } else if (building.type === 'workshop' && size >= 2) {
      bonuses.jobs += size * 5 + Math.round(avgLevel * 2);
      bonuses.commercial += size;
    } else if (building.type === 'hospital' && size >= 4) {
      bonuses.jobs += size * 2;
      bonuses.health += size * 8 + Math.round(avgLevel * 4);
      bonuses.safety += size;
    } else if ((building.type === 'policeStation' || building.type === 'fireStation') && size >= 2) {
      bonuses.jobs += size * 2;
      bonuses.safety += size * 7 + Math.round(avgLevel * 3);
    } else if (building.type === 'powerPlant' && size >= 4) {
      bonuses.jobs += size;
      bonuses.power += size * 8 + Math.round(avgLevel * 5);
    }
  }

  return bonuses;
}

function residentialUpgradeRevenueBonus(state: GameState): number {
  const seen = new Set<number>();
  let bonus = 0;

  for (const building of state.buildings) {
    if (building.type !== 'house' || seen.has(building.id)) continue;
    const cluster = sameTypeConnectedCluster(state, building);
    cluster.forEach((member) => seen.add(member.id));
    const avgLevel = cluster.reduce((sum, member) => sum + member.level, 0) / cluster.length;

    if (cluster.length >= 4) {
      if (avgLevel >= 5) {
        bonus += cluster.length * ECONOMY_TUNING.tier5ResidentialRevenuePerTile;
      } else if (avgLevel >= 4) {
        bonus += cluster.length * ECONOMY_TUNING.tier4ResidentialRevenuePerTile;
      } else if (avgLevel >= 3) {
        bonus += cluster.length * ECONOMY_TUNING.highRiseRevenuePerTile;
      } else if (avgLevel >= 2) {
        bonus += cluster.length * ECONOMY_TUNING.apartmentRevenuePerTile;
      }
    }

    bonus += cluster.reduce(
      (sum, member) => sum + Math.max(0, member.level - 1) * ECONOMY_TUNING.upgradedHousingRevenuePerLevel,
      0
    );
  }

  return bonus;
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

  let housingCapacity = 0;
  let jobCapacity = 0;
  let commercialCapacity = 0;
  let recreationCapacity = 0;
  let essentialsCapacity = 0;
  let healthCapacity = 0;
  let safetyCapacity = 0;

  for (const building of state.buildings) {
    const econ = BUILDING_ECONOMY[building.type];
    const factor = buildingLevelFactor(building);
    housingCapacity += econ.housing * factor;
    jobCapacity += econ.jobs * factor;
    commercialCapacity += econ.commerce * factor;
    recreationCapacity += econ.recreation * factor;
    essentialsCapacity += econ.essentials * factor;
    healthCapacity += econ.health * factor;
    safetyCapacity += econ.safety * factor;
  }

  const clusterBoost = clusterBonuses(state);
  housingCapacity += residentialComboBonus(state);
  commercialCapacity += commercialComboBonus(state);
  housingCapacity += clusterBoost.housing;
  jobCapacity += clusterBoost.jobs;
  commercialCapacity += clusterBoost.commercial;
  recreationCapacity += clusterBoost.recreation;
  essentialsCapacity += clusterBoost.essentials;
  healthCapacity += clusterBoost.health;
  safetyCapacity += clusterBoost.safety;

  const servicedHomes = houses.filter(
    (h) => buildingHasRoadAccess(state, h) && buildingHasPowerCoverage(state, h)
  ).length;

  const serviceRatio = houses.length > 0 ? servicedHomes / houses.length : 1;
  const activeBuildings = state.buildings.filter((building) => building.type !== 'road');
  const averageAppeal =
    activeBuildings.length > 0
      ? activeBuildings.reduce((sum, building) => sum + buildingAppealScore(state, building), 0) / activeBuildings.length
      : 58;
  const residentialAppeal =
    houses.length > 0
      ? houses.reduce((sum, building) => sum + buildingAppealScore(state, building), 0) / houses.length
      : averageAppeal;
  const commercialBuildings = state.buildings.filter((building) => isCommercialType(building.type));
  const commercialAppeal =
    commercialBuildings.length > 0
      ? commercialBuildings.reduce((sum, building) => sum + buildingAppealScore(state, building), 0) /
        commercialBuildings.length
      : averageAppeal;

  let powerUsed = roads * 0.2;
  let powerProduced = 0;
  for (const building of state.buildings) {
    const econ = BUILDING_ECONOMY[building.type];
    const factor = buildingLevelFactor(building);
    powerUsed += econ.powerUse * (building.type === 'house' ? factor : 1 + (building.level - 1) * 0.14);
    powerProduced += econ.powerProduce * (building.type === 'powerPlant' ? 1 + (building.level - 1) * 0.18 : factor);
  }
  powerProduced += clusterBoost.power;

  const targetPopulation = Math.max(
    houses.length > 0 ? 4 : 0,
    Math.min(
      housingCapacity,
      Math.round(
        jobCapacity * 1.05 +
          commercialCapacity * 0.12 +
          recreationCapacity * 0.08 +
          Math.max(0, residentialAppeal - 55) * 0.22
      )
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
      Math.min(parks, 8) * 1.4 +
      Math.max(0, averageAppeal - 55) * 0.42 +
      Math.max(0, residentialAppeal - 58) * 0.16 +
      state.buildings.reduce((sum, building) => sum + (building.level - 1) * 0.75, 0) +
      commercialComboBonus(state) * 0.15 +
      residentialComboBonus(state) * 0.2 +
      clusterBoost.happiness
  );

  const demandHousing = clampPercent(
    62 +
      Math.max(0, blendedPopulation - housingCapacity) * 3 -
      houses.length * 1.6 +
      Math.max(0, 65 - happiness) * 0.35 -
      Math.max(0, residentialAppeal - 60) * 0.2
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
    28 +
      Math.max(0, blendedPopulation - commercialCapacity) * 2.8 -
      (restaurants + shops) * 1.2 -
      Math.max(0, commercialAppeal - 58) * 0.22
  );
  const demandRecreation = clampPercent(
    24 +
      Math.max(0, blendedPopulation - recreationCapacity) * 1.4 -
      parks * 2.8 +
      Math.max(0, 55 - happiness) * 0.5 -
      Math.max(0, averageAppeal - 62) * 0.1
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
      jobs: Math.round(jobCapacity),
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
    const next: GameSpeed =
      state.gameSpeed === 0 ? 1 : state.gameSpeed === 1 ? 2 : state.gameSpeed === 2 ? 10 : 0;
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
  const hit = buildingAt(state, x, z);
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
      level: 1,
      upgradeProgress: 0,
      lastUpgradeAt: performance.now(),
      customImageUrl: null,
      customStyleName: null,
      customArtStyle: null
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

export function queueGeneratedAsset(type: BuildType, variation: AssetVariation): { ok: boolean; error?: string } {
  let result: { ok: boolean; error?: string } = { ok: false, error: 'Unknown error' };

  gameStore.update((state) => {
    const cost = ASSET_GENERATION_COST[type] ?? 0;
    if (!INFINITE_MONEY && state.resources.money < cost) {
      result = { ok: false, error: 'Not enough money to generate this asset.' };
      return state;
    }

    result = { ok: true };
    return {
      ...state,
      pendingBuildAsset: variation,
      resources: {
        ...state.resources,
        money: Math.round((state.resources.money - cost) * 100) / 100
      }
    };
  });

  return result;
}

export function clearPendingBuildAsset(): void {
  gameStore.update((state) => {
    return {
      ...state,
      pendingBuildAsset: null
    };
  });
}

export function applyGeneratedAssetToBuilding(buildingId: number, variation: AssetVariation): void {
  gameStore.update((state) => ({
    ...state,
    buildings: state.buildings.map((building) =>
      building.id === buildingId
        ? {
            ...building,
            customImageUrl: variation.imageUrl,
            customStyleName: variation.name,
            customArtStyle: variation.artStyle
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

export function upgradeBuildingById(buildingId: number): boolean {
  let upgraded = false;

  gameStore.update((state) => {
    const target = state.buildings.find((building) => building.id === buildingId);
    if (!target || !canUpgradeBuilding(state, target)) return state;
    pushUndo(state);

    const cluster = sameTypeConnectedCluster(state, target);
    const upgradeCost = upgradeCostForSelection(state, target);
    const nextBuildings = state.buildings.map((building) =>
      cluster.some((member) => member.id === building.id) && building.level < MAX_BUILDING_LEVEL
        ? {
            ...building,
            level: Math.min(MAX_BUILDING_LEVEL, building.level + 1) as 1 | 2 | 3 | 4 | 5,
            upgradeProgress: 0,
            lastUpgradeAt: performance.now()
          }
        : building
    );

    upgraded = true;
    const nextState = {
      ...state,
      buildings: nextBuildings,
      resources: {
        ...state.resources,
        money: state.resources.money - upgradeCost
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

  return upgraded;
}

export function selectedBuilding(state: GameState): Building | null {
  if (state.selectedBuildingId == null) return null;
  return state.buildings.find((b) => b.id === state.selectedBuildingId) ?? null;
}

export function buildingContextSummary(state: GameState, building: Building): {
  appeal: number;
  roadAccess: boolean;
  powerAccess: boolean;
  adjacentMatches: number;
  parkSupport: number;
  civicSupport: number;
  commerceSupport: number;
  clusterSize: number;
} {
  const roadAccess = buildingHasRoadAccess(state, building) || building.type === 'powerPlant';
  const powerAccess = buildingHasPowerCoverage(state, building) || building.type === 'powerPlant';
  const parkSupport = nearbyTypeCount(state, building, ['park'], 3);
  const commerceSupport = nearbyTypeCount(state, building, ['shop', 'restaurant', 'groceryStore', 'cornerStore', 'bank'], 3);
  const civicSupport = nearbyTypeCount(state, building, ['hospital', 'policeStation', 'fireStation'], 4);
  const adjacentMatches = adjacentBuildings(state, building).filter(
    (other) => comboFamilyForType(other.type) === comboFamilyForType(building.type)
  ).length;
  const clusterSize = sameTypeConnectedCluster(state, building).length;

  return {
    appeal: buildingAppealScore(state, building),
    roadAccess,
    powerAccess,
    adjacentMatches,
    parkSupport,
    civicSupport,
    commerceSupport,
    clusterSize
  };
}

export function economySummary(state: GameState): {
  income: number;
  maintenance: number;
  penalties: number;
  happinessBonus: number;
  net: number;
} {
  const derived = deriveSimulation(state);

  let maintenance = 0;
  for (const b of state.buildings) {
    maintenance += BUILDING_ECONOMY[b.type].maintenance;
  }

  const residentTax = derived.resources.population * ECONOMY_TUNING.residentTaxPerCitizen;
  const employmentTax =
    Math.min(derived.resources.population, derived.resources.jobs) * ECONOMY_TUNING.employmentTaxPerWorker;
  const commercialTax =
    countType(state, 'shop') * ECONOMY_TUNING.shopRevenue +
    countType(state, 'restaurant') * ECONOMY_TUNING.restaurantRevenue +
    countType(state, 'workshop') * ECONOMY_TUNING.workshopRevenue +
    countType(state, 'groceryStore') * ECONOMY_TUNING.groceryRevenue +
    countType(state, 'cornerStore') * ECONOMY_TUNING.cornerStoreRevenue +
    countType(state, 'bank') * ECONOMY_TUNING.bankRevenue;
  const upgradedHousingRevenue = residentialUpgradeRevenueBonus(state);
  const powerPenalty =
    Math.max(0, derived.resources.powerUsed - derived.resources.powerProduced) * ECONOMY_TUNING.powerDeficitPenalty;
  const happinessBonus = (derived.happiness - 50) * ECONOMY_TUNING.happinessIncomeFactor;

  const income = residentTax + employmentTax + commercialTax + upgradedHousingRevenue;
  const penalties = powerPenalty;
  const net = income + happinessBonus - maintenance - penalties;

  return {
    income: Math.round(income * 100) / 100,
    maintenance: Math.round(maintenance * 100) / 100,
    penalties: Math.round(penalties * 100) / 100,
    happinessBonus: Math.round(happinessBonus * 100) / 100,
    net: Math.round(net * 100) / 100
  };
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
    const evolvedState = evolveBuildings(state, dtSeconds);
    const derived = deriveSimulation(evolvedState);

    let maintenancePerSecond = 0;
    for (const b of evolvedState.buildings) {
      maintenancePerSecond += BUILDING_ECONOMY[b.type].maintenance;
    }

    const residentTax = derived.resources.population * ECONOMY_TUNING.residentTaxPerCitizen;
    const employmentTax =
      Math.min(derived.resources.population, derived.resources.jobs) * ECONOMY_TUNING.employmentTaxPerWorker;
    const commercialTax =
      countType(evolvedState, 'shop') * ECONOMY_TUNING.shopRevenue +
      countType(evolvedState, 'restaurant') * ECONOMY_TUNING.restaurantRevenue +
      countType(evolvedState, 'workshop') * ECONOMY_TUNING.workshopRevenue +
      countType(evolvedState, 'groceryStore') * ECONOMY_TUNING.groceryRevenue +
      countType(evolvedState, 'cornerStore') * ECONOMY_TUNING.cornerStoreRevenue +
      countType(evolvedState, 'bank') * ECONOMY_TUNING.bankRevenue;
    const upgradedHousingRevenue = residentialUpgradeRevenueBonus(evolvedState);
    const powerPenalty =
      Math.max(0, derived.resources.powerUsed - derived.resources.powerProduced) * ECONOMY_TUNING.powerDeficitPenalty;
    const happinessBonus = (derived.happiness - 50) * ECONOMY_TUNING.happinessIncomeFactor;

    const deltaMoney =
      (
        residentTax +
        employmentTax +
        commercialTax +
        upgradedHousingRevenue -
        maintenancePerSecond -
        powerPenalty +
        happinessBonus
      ) * dtSeconds;

    const simSeconds = evolvedState.simSeconds + dtSeconds;
    const day = Math.floor(simSeconds / DAY_LENGTH_SECONDS) + 1;
    const timeOfDay = ((simSeconds / DAY_LENGTH_SECONDS) * 24 + 8) % 24;

    return {
      ...evolvedState,
      simSeconds,
      day,
      timeOfDay,
      resources: {
        ...derived.resources,
        money: Math.max(
          ECONOMY_TUNING.minimumMoney,
          Math.round((evolvedState.resources.money + deltaMoney) * 100) / 100
        )
      },
      happiness: derived.happiness,
      demand: derived.demand
    };
  });
}
