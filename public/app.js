const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

const COLS = 96;
const ROWS = 64;
const BASE_TILE = 24;

const TERRAIN_TOOLS = [
  { id: 'grass', label: 'Grass' },
  { id: 'water', label: 'Water' },
  { id: 'forest', label: 'Forest' },
  { id: 'hill', label: 'Raise Land' }
];

const INFRA_TOOLS = [
  { id: 'road', label: 'Road' },
  { id: 'powerplant', label: 'Power Plant' },
  { id: 'park', label: 'Park' },
  { id: 'school', label: 'School' },
  { id: 'police', label: 'Police' },
  { id: 'bulldoze', label: 'Bulldoze' }
];

const ZONE_TOOLS = [
  { id: 'res', label: 'Residential' },
  { id: 'com', label: 'Commercial' },
  { id: 'ind', label: 'Industrial' }
];

const OVERLAYS = [
  { id: 'none', label: 'Default' },
  { id: 'land', label: 'Land Value' },
  { id: 'pollution', label: 'Pollution' },
  { id: 'power', label: 'Power Grid' },
  { id: 'traffic', label: 'Traffic' }
];

const COLORS = {
  terrain: {
    grass: '#7acb5f',
    water: '#3f8de4',
    forest: '#2f8442',
    hill: '#7f9e55'
  },
  zone: {
    res: '#73ccff',
    com: '#ffd361',
    ind: '#d98360'
  },
  service: {
    powerplant: '#9f5f4c',
    park: '#4ebb6e',
    school: '#7584f1',
    police: '#8f66e6'
  },
  road: '#646464',
  grid: 'rgba(0,0,0,0.12)'
};

const game = {
  day: 1,
  money: 180000,
  happiness: 62,
  population: 0,
  jobs: 0,
  demandRes: 0,
  demandCom: 0,
  demandInd: 0,
  speed: 1,
  paused: false,
  brushSize: 1,
  selectedTool: 'road',
  overlay: 'none',
  world: [],
  hover: null,
  painting: false,
  panning: false,
  panLast: null,
  camera: {
    x: 0,
    y: 0,
    zoom: 1
  },
  aiAgent: {
    enabled: false,
    accumulatorMs: 0,
    lastAction: 'Idle',
    actions: 0
  },
  undoStack: [],
  redoStack: [],
  mapNeedsMinimapRefresh: true
};

let simAccumulator = 0;
let lastTimestamp = 0;
let minimapEvery = 0;
let lastAutoSave = 0;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function randomHash(x, y, seed) {
  const n = Math.sin((x * 127.1 + y * 311.7 + seed * 17.13) * 0.0174533) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const n00 = randomHash(xi, yi, seed);
  const n10 = randomHash(xi + 1, yi, seed);
  const n01 = randomHash(xi, yi + 1, seed);
  const n11 = randomHash(xi + 1, yi + 1, seed);

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

function fractalNoise(x, y, seed) {
  let total = 0;
  let amplitude = 0.55;
  let frequency = 0.04;
  for (let i = 0; i < 5; i += 1) {
    total += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 37);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return total;
}

function createTile() {
  return {
    terrain: 'grass',
    elev: 0,
    zone: null,
    service: null,
    road: false,
    density: 0,
    pop: 0,
    jobs: 0,
    power: false,
    traffic: 0,
    pollution: 0,
    landValue: 50
  };
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function forEachBrush(x, y, radius, callback) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(xx, yy)) continue;
      callback(game.world[yy][xx], xx, yy);
    }
  }
}

function countNear(x, y, predicate, radius = 3) {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(xx, yy)) continue;
      if (predicate(game.world[yy][xx], xx, yy)) count += 1;
    }
  }
  return count;
}

function hasRoadNeighbor(x, y) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  return dirs.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return inBounds(nx, ny) && game.world[ny][nx].road;
  });
}

function snapshotForHistory() {
  const state = {
    day: game.day,
    money: game.money,
    happiness: game.happiness,
    population: game.population,
    jobs: game.jobs,
    demandRes: game.demandRes,
    demandCom: game.demandCom,
    demandInd: game.demandInd,
    world: game.world
  };

  if (typeof structuredClone === 'function') {
    return structuredClone(state);
  }
  return JSON.parse(JSON.stringify(state));
}

function restoreFromHistory(state) {
  game.day = state.day;
  game.money = state.money;
  game.happiness = state.happiness;
  game.population = state.population;
  game.jobs = state.jobs;
  game.demandRes = state.demandRes;
  game.demandCom = state.demandCom;
  game.demandInd = state.demandInd;
  game.world = state.world;
  game.mapNeedsMinimapRefresh = true;
}

function pushHistory() {
  game.undoStack.push(snapshotForHistory());
  if (game.undoStack.length > 18) game.undoStack.shift();
  game.redoStack = [];
}

function undo() {
  if (game.undoStack.length <= 1) return;
  const current = game.undoStack.pop();
  game.redoStack.push(current);
  const previous = game.undoStack[game.undoStack.length - 1];
  restoreFromHistory(previous);
}

function redo() {
  if (!game.redoStack.length) return;
  const next = game.redoStack.pop();
  game.undoStack.push(next);
  restoreFromHistory(next);
}

function generateWorld() {
  const seed = Math.floor(Math.random() * 999999);
  game.world = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, createTile));

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      const n = fractalNoise(x, y, seed);
      const m = fractalNoise(x + 217, y - 111, seed + 131);

      if (n < 0.31) tile.terrain = 'water';
      else if (n < 0.51) tile.terrain = 'grass';
      else if (n < 0.72) tile.terrain = 'forest';
      else {
        tile.terrain = 'hill';
        tile.elev = clamp(Math.floor((n - 0.7) * 22), 1, 4);
      }

      if (m > 0.8 && tile.terrain !== 'water') {
        tile.terrain = 'forest';
      }
    }
  }

  carveRiver(seed + 77, 2);

  game.day = 1;
  game.money = 180000;
  game.happiness = 62;
  game.population = 0;
  game.jobs = 0;
  game.demandRes = 0;
  game.demandCom = 0;
  game.demandInd = 0;
  game.camera.x = 0;
  game.camera.y = 0;
  game.camera.zoom = 1;
  game.mapNeedsMinimapRefresh = true;
  game.undoStack = [];
  game.redoStack = [];
  pushHistory();
}

function carveRiver(seed, count) {
  for (let r = 0; r < count; r += 1) {
    let x = Math.floor(randomHash(seed + r, r, seed) * COLS);
    let y = 0;
    for (let i = 0; i < ROWS * 2.6; i += 1) {
      if (!inBounds(x, y)) break;
      forEachBrush(x, y, 1, (tile) => {
        tile.terrain = 'water';
        tile.zone = null;
        tile.service = null;
        tile.road = false;
        tile.density = 0;
        tile.pop = 0;
        tile.jobs = 0;
      });
      x += randomHash(x + seed, y + i, seed) > 0.5 ? 1 : -1;
      y += randomHash(x + i, y + seed, seed) > 0.35 ? 1 : 0;
    }
  }
}

function applyTool(x, y, tool) {
  const radius = game.brushSize - 1;

  if (tool === 'grass' || tool === 'water' || tool === 'forest' || tool === 'hill') {
    forEachBrush(x, y, radius, (tile) => {
      if (tool === 'hill') {
        if (tile.terrain !== 'water') {
          tile.terrain = 'hill';
          tile.elev = clamp(tile.elev + 1, 0, 4);
        }
      } else {
        tile.terrain = tool;
        if (tool === 'water') {
          tile.zone = null;
          tile.service = null;
          tile.road = false;
          tile.pop = 0;
          tile.jobs = 0;
          tile.density = 0;
        }
      }
    });
    game.mapNeedsMinimapRefresh = true;
    return;
  }

  if (tool === 'bulldoze') {
    forEachBrush(x, y, radius, (tile) => {
      tile.zone = null;
      tile.service = null;
      tile.road = false;
      tile.pop = 0;
      tile.jobs = 0;
      tile.density = 0;
      if (tile.terrain === 'water') tile.terrain = 'grass';
    });
    game.money -= 3 * game.brushSize * game.brushSize;
    game.mapNeedsMinimapRefresh = true;
    return;
  }

  if (tool === 'road') {
    forEachBrush(x, y, radius, (tile) => {
      if (tile.terrain === 'water') return;
      tile.road = true;
      tile.service = null;
    });
    game.money -= 9 * game.brushSize * game.brushSize;
    game.mapNeedsMinimapRefresh = true;
    return;
  }

  if (tool === 'powerplant' || tool === 'park' || tool === 'school' || tool === 'police') {
    forEachBrush(x, y, radius, (tile) => {
      if (tile.terrain === 'water') return;
      tile.service = tool;
      tile.road = false;
      tile.zone = null;
      tile.pop = 0;
      tile.jobs = 0;
      tile.density = 0;
    });
    const cost = {
      powerplant: 2400,
      park: 130,
      school: 650,
      police: 800
    }[tool];
    game.money -= cost * game.brushSize * game.brushSize;
    game.mapNeedsMinimapRefresh = true;
    return;
  }

  if (tool === 'res' || tool === 'com' || tool === 'ind') {
    forEachBrush(x, y, radius, (tile) => {
      if (tile.terrain === 'water' || tile.service) return;
      tile.zone = tool;
    });
    game.money -= 4 * game.brushSize * game.brushSize;
    game.mapNeedsMinimapRefresh = true;
  }
}

function zoneCount(zoneType) {
  let total = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (game.world[y][x].zone === zoneType) total += 1;
    }
  }
  return total;
}

function serviceCount(serviceType) {
  let total = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (game.world[y][x].service === serviceType) total += 1;
    }
  }
  return total;
}

function unpoweredZoneCount() {
  let total = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      if (tile.zone && !tile.power && tile.terrain !== 'water') total += 1;
    }
  }
  return total;
}

function bestTileFor(scoreFn, tries = 1200) {
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < tries; i += 1) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    const tile = game.world[y][x];
    const score = scoreFn(tile, x, y);
    if (score > bestScore) {
      bestScore = score;
      best = { x, y };
    }
  }
  return best;
}

function focusCameraOn(x, y) {
  const tileSize = BASE_TILE * game.camera.zoom;
  game.camera.x = x * tileSize - canvas.width / 2;
  game.camera.y = y * tileSize - canvas.height / 2;
  moveCameraBy(0, 0);
}

function aiApply(tool, target, brush = 1, message = 'Action') {
  if (!target) return false;
  pushHistory();
  const prevBrush = game.brushSize;
  game.brushSize = brush;
  game.selectedTool = tool;
  applyTool(target.x, target.y, tool);
  game.brushSize = prevBrush;
  game.aiAgent.lastAction = message;
  game.aiAgent.actions += 1;
  focusCameraOn(target.x, target.y);
  syncToolHighlights();
  return true;
}

function runAIAutoplayStep() {
  const powerPlants = serviceCount('powerplant');
  const schools = serviceCount('school');
  const police = serviceCount('police');
  const parks = serviceCount('park');
  const resTiles = zoneCount('res');
  const comTiles = zoneCount('com');
  const indTiles = zoneCount('ind');
  const noPower = unpoweredZoneCount();

  if (powerPlants === 0 && game.money > 3000) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const waterNear = countNear(x, y, (t) => t.terrain === 'water', 4);
      const roadsNear = countNear(x, y, (t) => t.road, 5);
      return 80 + waterNear * 2 + roadsNear;
    });
    if (aiApply('powerplant', spot, 1, 'Built initial power plant')) return;
  }

  if (noPower > 20 && game.money > 2800) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const zonesNear = countNear(x, y, (t) => Boolean(t.zone), 8);
      return zonesNear * 2 + (tile.landValue / 5);
    });
    if (aiApply('powerplant', spot, 1, 'Expanded power grid')) return;
  }

  if (game.happiness < 55 && parks < Math.max(4, Math.floor(game.population / 1200)) && game.money > 500) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const resNear = countNear(x, y, (t) => t.zone === 'res', 6);
      return resNear * 6 - tile.pollution;
    });
    if (aiApply('park', spot, 1, 'Built park for happiness')) return;
  }

  if (game.population > 900 && schools < Math.floor(game.population / 3500) + 1 && game.money > 1200) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const resNear = countNear(x, y, (t) => t.zone === 'res', 7);
      return resNear * 5 + (tile.landValue / 6);
    });
    if (aiApply('school', spot, 1, 'Built school near neighborhoods')) return;
  }

  if (game.population > 1200 && police < Math.floor(game.population / 4000) + 1 && game.money > 1300) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const comNear = countNear(x, y, (t) => t.zone === 'com', 8);
      const resNear = countNear(x, y, (t) => t.zone === 'res', 8);
      return comNear * 4 + resNear * 2;
    });
    if (aiApply('police', spot, 1, 'Built police coverage')) return;
  }

  const zonePressure = {
    res: game.demandRes + (game.jobs > game.population ? 12 : 0),
    com: game.demandCom + (game.population > 300 ? 8 : 0),
    ind: game.demandInd + (game.jobs < game.population * 0.82 ? 10 : 0)
  };

  let preferredZone = 'res';
  if (zonePressure.com > zonePressure[preferredZone]) preferredZone = 'com';
  if (zonePressure.ind > zonePressure[preferredZone]) preferredZone = 'ind';
  if (preferredZone === 'res' && resTiles < Math.max(comTiles + indTiles, 12)) preferredZone = 'res';

  const zoneSpot = bestTileFor((tile, x, y) => {
    if (tile.terrain === 'water' || tile.service) return -Infinity;
    if (tile.zone && tile.zone !== preferredZone) return -20;
    if (tile.zone === preferredZone && tile.density > 0.55) return -5;

    const roadScore = hasRoadNeighbor(x, y) ? 18 : -25;
    const land = tile.landValue;
    const pollution = tile.pollution;
    const roadsNear = countNear(x, y, (t) => t.road, 4);
    const forestNear = countNear(x, y, (t) => t.terrain === 'forest', 4);
    const resNear = countNear(x, y, (t) => t.zone === 'res', 6);
    const indNear = countNear(x, y, (t) => t.zone === 'ind', 6);
    const comNear = countNear(x, y, (t) => t.zone === 'com', 6);

    if (preferredZone === 'res') return roadScore + land * 0.9 + forestNear * 2 - pollution * 1.2 - indNear * 2;
    if (preferredZone === 'com') return roadScore + land * 0.6 + resNear * 2.5 + roadsNear * 1.1 - pollution * 0.6;
    return roadScore + (100 - land) * 0.35 + comNear * 1.8 + roadsNear * 1.2 - resNear * 2.2;
  }, 1600);

  if (zoneSpot && aiApply(preferredZone, zoneSpot, game.population > 6000 ? 2 : 1, `Zoned ${preferredZone.toUpperCase()} district`)) return;

  const roadSpot = bestTileFor((tile, x, y) => {
    if (tile.terrain === 'water' || tile.road || tile.service) return -Infinity;
    const zoneNear = countNear(x, y, (t) => Boolean(t.zone), 3);
    const roadNear = countNear(x, y, (t) => t.road, 2);
    if (zoneNear === 0 || roadNear === 0) return -Infinity;
    return zoneNear * 6 + roadNear * 4;
  }, 1800);

  if (roadSpot && aiApply('road', roadSpot, 1, 'Expanded road network')) return;

  game.aiAgent.lastAction = 'Holding pattern';
}

function recomputePowerMap() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      game.world[y][x].power = false;
    }
  }

  const queue = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (game.world[y][x].service === 'powerplant') {
        game.world[y][x].power = true;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const node = queue[head];
    head += 1;
    if (node.d > 24) continue;

    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];

    for (const [dx, dy] of neighbors) {
      const nx = node.x + dx;
      const ny = node.y + dy;
      if (!inBounds(nx, ny)) continue;
      const tile = game.world[ny][nx];
      if (tile.power || tile.terrain === 'water') continue;

      // Electricity spreads faster over roads, but can pass across developed tiles.
      if (tile.road || tile.zone || tile.service || hasRoadNeighbor(nx, ny)) {
        tile.power = true;
        queue.push({ x: nx, y: ny, d: node.d + 1 });
      }
    }
  }
}

function recomputeLandAndPollution() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];

      const water = countNear(x, y, (t) => t.terrain === 'water', 4);
      const trees = countNear(x, y, (t) => t.terrain === 'forest', 3);
      const parks = countNear(x, y, (t) => t.service === 'park', 5);
      const industry = countNear(x, y, (t) => t.zone === 'ind', 4);
      const plants = countNear(x, y, (t) => t.service === 'powerplant', 5);

      tile.pollution = clamp(industry * 3.8 + plants * 7.2 - parks * 2.4, 0, 100);

      const baseLand = 38 + water * 1.3 + trees * 1.1 + parks * 1.6 + tile.elev * 2.4;
      tile.landValue = clamp(baseLand - tile.pollution * 0.64, 0, 100);
    }
  }
}

function nearService(x, y, service, radius = 7) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(xx, yy)) continue;
      if (game.world[yy][xx].service === service) return true;
    }
  }
  return false;
}

function simulateStep() {
  recomputePowerMap();
  recomputeLandAndPollution();

  const prevPop = game.population;
  const prevJobs = game.jobs;

  let pop = 0;
  let jobs = 0;
  let roads = 0;
  let serviceCount = 0;
  let taxIncome = 0;
  let upkeep = 180;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      tile.traffic *= 0.88;
      if (tile.road) roads += 1;
      if (tile.service) serviceCount += 1;
    }
  }

  upkeep += roads * 0.36 + serviceCount * 2.2;

  game.demandRes = clamp((prevJobs - prevPop * 0.7) * 0.4 + (game.happiness - 50) * 1.2, -100, 100);
  game.demandCom = clamp((prevPop * 0.46 - prevJobs * 0.23) * 0.5 + 8, -100, 100);
  game.demandInd = clamp((prevPop * 0.25 - prevJobs * 0.45) * 0.6 + 12, -100, 100);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      if (!tile.zone || tile.service || tile.terrain === 'water') continue;

      const roadScore = hasRoadNeighbor(x, y) ? 1.0 : -1.9;
      const powerScore = tile.power ? 1.1 : -2.2;
      const schoolScore = nearService(x, y, 'school', 7) ? 0.38 : 0;
      const policeScore = nearService(x, y, 'police', 7) ? 0.32 : 0;
      const landScore = (tile.landValue - 50) / 20;
      const pollutionPenalty = tile.pollution / 85;

      let marketForce = 0;
      if (tile.zone === 'res') marketForce = game.demandRes / 42;
      if (tile.zone === 'com') marketForce = game.demandCom / 50;
      if (tile.zone === 'ind') marketForce = game.demandInd / 45;

      const growth = roadScore + powerScore + schoolScore + policeScore + landScore + marketForce - pollutionPenalty;
      tile.density = clamp(tile.density + growth * 0.018, 0, 1);

      if (tile.zone === 'res') {
        tile.pop = Math.floor(tile.density * (8 + tile.landValue * 0.08));
        pop += tile.pop;
        taxIncome += tile.pop * 0.2;
      }

      if (tile.zone === 'com') {
        tile.jobs = Math.floor(tile.density * (7 + tile.landValue * 0.06));
        jobs += tile.jobs;
        taxIncome += tile.jobs * 0.31;
        tile.traffic += tile.jobs * 0.015;
      }

      if (tile.zone === 'ind') {
        tile.jobs = Math.floor(tile.density * (10 + (100 - tile.landValue) * 0.05));
        jobs += tile.jobs;
        taxIncome += tile.jobs * 0.28;
        tile.traffic += tile.jobs * 0.018;
      }
    }
  }

  game.population = pop;
  game.jobs = jobs;

  const unemployment = pop <= 0 ? 0 : Math.max(0, (pop - jobs) / Math.max(1, pop));
  const avgPollution = averagePollution();

  game.happiness = clamp(
    game.happiness + 0.15 + (game.money > 0 ? 0.09 : -0.25) - unemployment * 0.8 - avgPollution * 0.005,
    6,
    96
  );

  game.money += Math.floor(taxIncome - upkeep);
  game.day += 1;
}

function averagePollution() {
  let sum = 0;
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      sum += game.world[y][x].pollution;
    }
  }
  return sum / (ROWS * COLS);
}

function toTileFromScreen(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const screenX = ((clientX - rect.left) * canvas.width) / rect.width;
  const screenY = ((clientY - rect.top) * canvas.height) / rect.height;

  const tileSize = BASE_TILE * game.camera.zoom;
  const worldX = (screenX + game.camera.x) / tileSize;
  const worldY = (screenY + game.camera.y) / tileSize;

  return {
    x: Math.floor(worldX),
    y: Math.floor(worldY)
  };
}

function mixColors(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(lerp(pa.r, pb.r, t));
  const g = Math.round(lerp(pa.g, pb.g, t));
  const bl = Math.round(lerp(pa.b, pb.b, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16)
  };
}

function getTileColor(tile, waveShift) {
  if (game.overlay === 'land') {
    return `hsl(${Math.floor(95 + tile.landValue * 0.8)} 62% ${Math.floor(26 + tile.landValue * 0.24)}%)`;
  }
  if (game.overlay === 'pollution') {
    return `hsl(${Math.floor(125 - tile.pollution * 1.2)} 72% 46%)`;
  }
  if (game.overlay === 'power') {
    return tile.power ? '#90f774' : '#5d5d5d';
  }
  if (game.overlay === 'traffic') {
    return `hsl(${Math.floor(120 - clamp(tile.traffic * 100, 0, 100))} 78% 47%)`;
  }

  let color = COLORS.terrain[tile.terrain];

  if (tile.terrain === 'water') {
    const waterPulse = (Math.sin(waveShift) + 1) * 0.05;
    color = mixColors(color, '#7bc2ff', waterPulse);
  }

  if (tile.road) color = COLORS.road;
  if (tile.zone) color = mixColors(color, COLORS.zone[tile.zone], 0.43 + tile.density * 0.36);
  if (tile.service) color = COLORS.service[tile.service];

  return color;
}

function drawScene(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const dayLight = 0.65 + 0.35 * Math.sin((game.day % 160) / 160 * Math.PI * 2);
  const tileSize = BASE_TILE * game.camera.zoom;
  const waveShift = timestamp * 0.004;

  const startX = clamp(Math.floor(game.camera.x / tileSize), 0, COLS - 1);
  const startY = clamp(Math.floor(game.camera.y / tileSize), 0, ROWS - 1);
  const endX = clamp(Math.ceil((game.camera.x + canvas.width) / tileSize), 0, COLS - 1);
  const endY = clamp(Math.ceil((game.camera.y + canvas.height) / tileSize), 0, ROWS - 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = game.world[y][x];
      const px = x * tileSize - game.camera.x;
      const py = y * tileSize - game.camera.y;

      ctx.fillStyle = getTileColor(tile, waveShift + x * 0.11 + y * 0.09);
      ctx.fillRect(px, py, tileSize, tileSize);

      if (game.overlay === 'none') {
        if (tile.terrain === 'hill' && tile.elev > 0) {
          ctx.fillStyle = `rgba(0,0,0,${0.05 + tile.elev * 0.03})`;
          ctx.fillRect(px, py, tileSize, tileSize);
        }

        if (tile.zone && !tile.service && tile.density > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.32)';
          ctx.fillRect(px + 2, py + tileSize - 4, (tileSize - 4) * tile.density, 2);
        }

        if (tile.road) {
          ctx.strokeStyle = 'rgba(255,255,255,0.28)';
          ctx.lineWidth = Math.max(1, tileSize * 0.08);
          ctx.beginPath();
          ctx.moveTo(px + tileSize * 0.5, py + tileSize * 0.14);
          ctx.lineTo(px + tileSize * 0.5, py + tileSize * 0.86);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = COLORS.grid;
      ctx.strokeRect(px, py, tileSize, tileSize);
    }
  }

  if (game.hover && inBounds(game.hover.x, game.hover.y)) {
    const hx = game.hover.x * tileSize - game.camera.x;
    const hy = game.hover.y * tileSize - game.camera.y;
    const pulse = 0.45 + Math.sin(timestamp * 0.008) * 0.25;
    ctx.strokeStyle = `rgba(255,255,255,${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(hx + 1, hy + 1, tileSize - 2, tileSize - 2);
  }

  ctx.fillStyle = `rgba(0, 0, 0, ${1 - dayLight})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawMinimap() {
  if (!game.mapNeedsMinimapRefresh && minimapEvery % 16 !== 0) return;

  const cellW = minimap.width / COLS;
  const cellH = minimap.height / ROWS;

  mctx.clearRect(0, 0, minimap.width, minimap.height);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      mctx.fillStyle = getTileColor(tile, 0);
      mctx.fillRect(x * cellW, y * cellH, cellW + 0.2, cellH + 0.2);
    }
  }

  const tileSize = BASE_TILE * game.camera.zoom;
  const viewX = (game.camera.x / tileSize) * cellW;
  const viewY = (game.camera.y / tileSize) * cellH;
  const viewW = (canvas.width / tileSize) * cellW;
  const viewH = (canvas.height / tileSize) * cellH;

  mctx.strokeStyle = 'rgba(255,255,255,0.9)';
  mctx.lineWidth = 1.3;
  mctx.strokeRect(viewX, viewY, viewW, viewH);

  game.mapNeedsMinimapRefresh = false;
}

function syncToolHighlights() {
  document.querySelectorAll('.tool').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === game.selectedTool || btn.dataset.overlay === game.overlay);
  });

  document.getElementById('speed1Btn').classList.toggle('active', !game.paused && game.speed === 1);
  document.getElementById('speed3Btn').classList.toggle('active', !game.paused && game.speed === 3);
  document.getElementById('speed6Btn').classList.toggle('active', !game.paused && game.speed === 6);
  document.getElementById('pauseBtn').classList.toggle('active', game.paused);
  const aiBtn = document.getElementById('aiAgentBtn');
  aiBtn.classList.toggle('active', game.aiAgent.enabled);
  aiBtn.classList.toggle('ai-on', game.aiAgent.enabled);
  aiBtn.textContent = game.aiAgent.enabled ? 'AI Autoplay: On' : 'AI Autoplay: Off';
}

function renderStats() {
  const stats = [
    ['Day', game.day],
    ['Money', `$${Math.floor(game.money).toLocaleString()}`],
    ['Population', game.population.toLocaleString()],
    ['Jobs', game.jobs.toLocaleString()],
    ['Happiness', `${game.happiness.toFixed(0)}%`],
    ['Demand R/C/I', `${game.demandRes.toFixed(0)} / ${game.demandCom.toFixed(0)} / ${game.demandInd.toFixed(0)}`],
    ['Overlay', game.overlay],
    ['Tool', game.selectedTool]
  ];

  document.getElementById('statsBar').innerHTML = stats
    .map(([name, value]) => `<div class="stat"><strong>${name}</strong>${value}</div>`)
    .join('');

  const overlay = document.getElementById('hudOverlay');
  overlay.innerHTML = `
    <div><strong>Camera:</strong> ${game.camera.zoom.toFixed(2)}x</div>
    <div><strong>Controls:</strong> Pan (RMB) / Zoom (Wheel)</div>
    <div><strong>Mode:</strong> ${game.selectedTool}</div>
    <div><strong>Agent:</strong> ${game.aiAgent.enabled ? 'Active' : 'Off'}</div>
  `;

  document.getElementById('aiAgentStatus').textContent = game.aiAgent.enabled
    ? `Active\nLast: ${game.aiAgent.lastAction}\nActions: ${game.aiAgent.actions}`
    : 'Autoplay disabled.';
}

function renderInspector() {
  const tileInfo = document.getElementById('tileInfo');
  if (!game.hover || !inBounds(game.hover.x, game.hover.y)) {
    tileInfo.textContent = 'Hover over a tile';
    return;
  }

  const tile = game.world[game.hover.y][game.hover.x];
  tileInfo.textContent = [
    `x:${game.hover.x} y:${game.hover.y}`,
    `terrain:${tile.terrain} elev:${tile.elev}`,
    `zone:${tile.zone || 'none'} road:${tile.road ? 'yes' : 'no'}`,
    `service:${tile.service || 'none'} power:${tile.power ? 'yes' : 'no'}`,
    `density:${tile.density.toFixed(2)} land:${tile.landValue.toFixed(0)}`,
    `pollution:${tile.pollution.toFixed(0)} traffic:${tile.traffic.toFixed(1)}`,
    `pop:${tile.pop} jobs:${tile.jobs}`
  ].join('\n');
}

function worldToSave() {
  return {
    day: game.day,
    money: game.money,
    happiness: game.happiness,
    population: game.population,
    jobs: game.jobs,
    demandRes: game.demandRes,
    demandCom: game.demandCom,
    demandInd: game.demandInd,
    speed: game.speed,
    paused: game.paused,
    brushSize: game.brushSize,
    selectedTool: game.selectedTool,
    overlay: game.overlay,
    camera: game.camera,
    aiAgent: game.aiAgent,
    world: game.world
  };
}

function loadFromSave(payload) {
  if (!payload || !Array.isArray(payload.world)) return false;
  game.day = payload.day ?? 1;
  game.money = payload.money ?? 180000;
  game.happiness = payload.happiness ?? 62;
  game.population = payload.population ?? 0;
  game.jobs = payload.jobs ?? 0;
  game.demandRes = payload.demandRes ?? 0;
  game.demandCom = payload.demandCom ?? 0;
  game.demandInd = payload.demandInd ?? 0;
  game.speed = payload.speed ?? 1;
  game.paused = payload.paused ?? false;
  game.brushSize = clamp(payload.brushSize ?? 1, 1, 5);
  game.selectedTool = payload.selectedTool ?? 'road';
  game.overlay = payload.overlay ?? 'none';
  game.camera = payload.camera ?? { x: 0, y: 0, zoom: 1 };
  game.aiAgent = payload.aiAgent ?? { enabled: false, accumulatorMs: 0, lastAction: 'Idle', actions: 0 };
  game.aiAgent.accumulatorMs = 0;
  game.world = payload.world;
  game.mapNeedsMinimapRefresh = true;
  game.undoStack = [];
  game.redoStack = [];
  pushHistory();
  return true;
}

function buildButtons(containerId, items, mode) {
  const root = document.getElementById(containerId);
  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'tool';
    btn.textContent = item.label;

    if (mode === 'tool') {
      btn.dataset.tool = item.id;
      btn.addEventListener('click', () => {
        game.selectedTool = item.id;
        syncToolHighlights();
      });
    }

    if (mode === 'overlay') {
      btn.dataset.overlay = item.id;
      btn.addEventListener('click', () => {
        game.overlay = item.id;
        game.mapNeedsMinimapRefresh = true;
        syncToolHighlights();
      });
    }

    root.appendChild(btn);
  });
}

function applyPaintFromEvent(event) {
  const tile = toTileFromScreen(event.clientX, event.clientY);
  if (!inBounds(tile.x, tile.y)) return;
  game.hover = tile;
  applyTool(tile.x, tile.y, game.selectedTool);
}

function moveCameraBy(dx, dy) {
  const maxX = COLS * BASE_TILE * game.camera.zoom - canvas.width;
  const maxY = ROWS * BASE_TILE * game.camera.zoom - canvas.height;
  game.camera.x = clamp(game.camera.x + dx, 0, Math.max(0, maxX));
  game.camera.y = clamp(game.camera.y + dy, 0, Math.max(0, maxY));
}

function initInteractions() {
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 2) {
      game.panning = true;
      game.panLast = { x: event.clientX, y: event.clientY };
      return;
    }

    if (event.button !== 0) return;
    game.painting = true;
    pushHistory();
    applyPaintFromEvent(event);
  });

  canvas.addEventListener('mousemove', (event) => {
    const tile = toTileFromScreen(event.clientX, event.clientY);
    if (inBounds(tile.x, tile.y)) game.hover = tile;

    if (game.painting) applyPaintFromEvent(event);

    if (game.panning && game.panLast) {
      const dx = game.panLast.x - event.clientX;
      const dy = game.panLast.y - event.clientY;
      game.panLast = { x: event.clientX, y: event.clientY };
      moveCameraBy(dx, dy);
    }
  });

  const stopPaintPan = () => {
    game.painting = false;
    game.panning = false;
    game.panLast = null;
  };

  canvas.addEventListener('mouseup', stopPaintPan);
  window.addEventListener('mouseup', stopPaintPan);

  canvas.addEventListener('mouseleave', () => {
    game.hover = null;
    stopPaintPan();
  });

  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const previousZoom = game.camera.zoom;
    const nextZoom = clamp(previousZoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.45, 2.5);
    if (nextZoom === previousZoom) return;

    const rect = canvas.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const sy = ((event.clientY - rect.top) * canvas.height) / rect.height;

    const worldX = (sx + game.camera.x) / (BASE_TILE * previousZoom);
    const worldY = (sy + game.camera.y) / (BASE_TILE * previousZoom);

    game.camera.zoom = nextZoom;

    game.camera.x = worldX * BASE_TILE * nextZoom - sx;
    game.camera.y = worldY * BASE_TILE * nextZoom - sy;

    moveCameraBy(0, 0);
  }, { passive: false });

  minimap.addEventListener('click', (event) => {
    const rect = minimap.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) * minimap.width) / rect.width;
    const my = ((event.clientY - rect.top) * minimap.height) / rect.height;

    const tileX = Math.floor((mx / minimap.width) * COLS);
    const tileY = Math.floor((my / minimap.height) * ROWS);

    const tileSize = BASE_TILE * game.camera.zoom;
    game.camera.x = tileX * tileSize - canvas.width / 2;
    game.camera.y = tileY * tileSize - canvas.height / 2;
    moveCameraBy(0, 0);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
      event.preventDefault();
      game.paused = !game.paused;
      syncToolHighlights();
    }
    if (event.key === '[') {
      game.brushSize = clamp(game.brushSize - 1, 1, 5);
      document.getElementById('brushSize').value = String(game.brushSize);
    }
    if (event.key === ']') {
      game.brushSize = clamp(game.brushSize + 1, 1, 5);
      document.getElementById('brushSize').value = String(game.brushSize);
    }

    const hotkeys = {
      '1': 'grass',
      '2': 'water',
      '3': 'forest',
      '4': 'road',
      '5': 'res',
      '6': 'com',
      '7': 'ind',
      '8': 'powerplant',
      '9': 'bulldoze'
    };

    if (hotkeys[event.key]) {
      game.selectedTool = hotkeys[event.key];
      syncToolHighlights();
    }

    if (event.key === '0') {
      game.aiAgent.enabled = !game.aiAgent.enabled;
      game.aiAgent.accumulatorMs = 0;
      if (game.aiAgent.enabled) game.aiAgent.lastAction = 'Autoplay engaged';
      syncToolHighlights();
    }
  });
}

async function askAdvisor() {
  const input = document.getElementById('advisorPrompt');
  const reply = document.getElementById('advisorReply');
  const prompt = input.value.trim();

  if (!prompt) {
    reply.textContent = 'Enter a question first.';
    return;
  }

  reply.textContent = 'Thinking...';

  try {
    const snapshot = {
      day: game.day,
      money: Math.floor(game.money),
      population: game.population,
      jobs: game.jobs,
      happiness: Number(game.happiness.toFixed(1)),
      demand: {
        residential: Number(game.demandRes.toFixed(1)),
        commercial: Number(game.demandCom.toFixed(1)),
        industrial: Number(game.demandInd.toFixed(1))
      },
      averagePollution: Number(averagePollution().toFixed(1))
    };

    const response = await fetch('/api/ai/city-advisor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, snapshot })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Advisor failed');
    }

    reply.textContent = data.advice || 'No advice returned.';
  } catch (error) {
    reply.textContent = `Advisor error: ${error.message}`;
  }
}

function initUI() {
  buildButtons('terrainTools', TERRAIN_TOOLS, 'tool');
  buildButtons('infraTools', INFRA_TOOLS, 'tool');
  buildButtons('zoneTools', ZONE_TOOLS, 'tool');
  buildButtons('overlayTools', OVERLAYS, 'overlay');

  document.getElementById('brushSize').addEventListener('input', (event) => {
    game.brushSize = Number(event.target.value);
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    game.paused = !game.paused;
    syncToolHighlights();
  });

  document.getElementById('speed1Btn').addEventListener('click', () => {
    game.paused = false;
    game.speed = 1;
    syncToolHighlights();
  });

  document.getElementById('speed3Btn').addEventListener('click', () => {
    game.paused = false;
    game.speed = 3;
    syncToolHighlights();
  });

  document.getElementById('speed6Btn').addEventListener('click', () => {
    game.paused = false;
    game.speed = 6;
    syncToolHighlights();
  });

  document.getElementById('aiAgentBtn').addEventListener('click', () => {
    game.aiAgent.enabled = !game.aiAgent.enabled;
    game.aiAgent.accumulatorMs = 0;
    if (game.aiAgent.enabled) game.aiAgent.lastAction = 'Autoplay engaged';
    syncToolHighlights();
  });

  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);

  document.getElementById('saveBtn').addEventListener('click', () => {
    localStorage.setItem('skylineProtocolSave', JSON.stringify(worldToSave()));
  });

  document.getElementById('loadBtn').addEventListener('click', () => {
    const raw = localStorage.getItem('skylineProtocolSave');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!loadFromSave(parsed)) return;
    document.getElementById('brushSize').value = String(game.brushSize);
    syncToolHighlights();
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    generateWorld();
  });

  document.getElementById('advisorBtn').addEventListener('click', askAdvisor);

  syncToolHighlights();
}

function frame(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  if (!game.paused) {
    simAccumulator += delta * game.speed;
    while (simAccumulator >= 1000) {
      simulateStep();
      simAccumulator -= 1000;
      game.mapNeedsMinimapRefresh = true;
    }
  }

  if (game.aiAgent.enabled && !game.panning && !game.painting) {
    game.aiAgent.accumulatorMs += delta;
    if (game.aiAgent.accumulatorMs >= 1500) {
      game.aiAgent.accumulatorMs = 0;
      runAIAutoplayStep();
    }
  }

  if (timestamp - lastAutoSave > 18000) {
    lastAutoSave = timestamp;
    localStorage.setItem('skylineProtocolAutosave', JSON.stringify(worldToSave()));
  }

  drawScene(timestamp);
  drawMinimap();
  renderStats();
  renderInspector();

  minimapEvery += 1;
  requestAnimationFrame(frame);
}

function boot() {
  const autosave = localStorage.getItem('skylineProtocolAutosave');
  if (autosave) {
    const parsed = JSON.parse(autosave);
    if (!loadFromSave(parsed)) {
      generateWorld();
    }
  } else {
    generateWorld();
  }

  initUI();
  initInteractions();
  requestAnimationFrame(frame);
}

boot();
