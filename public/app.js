const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const minimap = document.getElementById('minimap');
const mctx = minimap.getContext('2d');

const COLS = 48;
const ROWS = 34;
const BASE_TILE = 40;
const SPRITE_SIZE = 128;

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

const AI_PROFILES = {
  balanced: {
    label: 'Balanced',
    cadenceMs: 1500,
    parkBias: 1,
    schoolBias: 1,
    policeBias: 1,
    industryBias: 1,
    residentialBias: 1,
    commercialBias: 1
  },
  aggressive: {
    label: 'Aggressive Growth',
    cadenceMs: 950,
    parkBias: 0.55,
    schoolBias: 0.75,
    policeBias: 0.75,
    industryBias: 1.5,
    residentialBias: 1.22,
    commercialBias: 1.24
  },
  eco: {
    label: 'Eco City',
    cadenceMs: 1850,
    parkBias: 1.85,
    schoolBias: 1.2,
    policeBias: 1.1,
    industryBias: 0.45,
    residentialBias: 1.08,
    commercialBias: 0.95
  }
};

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
    actions: 0,
    profile: 'balanced',
    followCamera: false
  },
  undoStack: [],
  redoStack: [],
  mapNeedsMinimapRefresh: true
};

let simAccumulator = 0;
let lastTimestamp = 0;
let minimapEvery = 0;
let lastAutoSave = 0;

const sprites = {
  terrain: {},
  road: {},
  zone: { res: [], com: [], ind: [] },
  service: {}
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function makeSprite(drawFn) {
  const s = document.createElement('canvas');
  s.width = SPRITE_SIZE;
  s.height = SPRITE_SIZE;
  const sctx = s.getContext('2d');
  drawFn(sctx);
  return s;
}

function hash2d(x, y, salt = 0) {
  return (((x * 73856093) ^ (y * 19349663) ^ salt) >>> 0);
}

function buildSprites() {
  buildTerrainSprites();
  buildRoadSprites();
  buildZoneSprites();
  buildServiceSprites();
}

function paintTextureDots(sctx, count, color, size = 2, alpha = 0.2) {
  sctx.fillStyle = color;
  sctx.globalAlpha = alpha;
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * SPRITE_SIZE);
    const y = Math.floor(Math.random() * SPRITE_SIZE);
    sctx.beginPath();
    sctx.arc(x, y, size * (0.35 + Math.random() * 0.8), 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.globalAlpha = 1;
}

function paintBaseGradient(sctx, top, bottom) {
  const grad = sctx.createLinearGradient(0, 0, 0, SPRITE_SIZE);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
}

function buildTerrainSprites() {
  sprites.terrain.grass = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#9adf7f', '#61b058');
    paintTextureDots(sctx, 240, '#a9e695', 2.4, 0.2);
    paintTextureDots(sctx, 170, '#4b9344', 2.1, 0.16);
  });

  sprites.terrain.water0 = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#63b7ff', '#2e76c6');
    sctx.strokeStyle = 'rgba(223,244,255,0.35)';
    sctx.lineWidth = 3;
    for (let i = 0; i < 7; i += 1) {
      const y = 12 + i * 16;
      sctx.beginPath();
      sctx.moveTo(4, y);
      sctx.quadraticCurveTo(SPRITE_SIZE * 0.3, y - 5, SPRITE_SIZE * 0.6, y);
      sctx.quadraticCurveTo(SPRITE_SIZE * 0.82, y + 4, SPRITE_SIZE - 5, y);
      sctx.stroke();
    }
  });

  sprites.terrain.water1 = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#59b0f7', '#2b6eb8');
    sctx.strokeStyle = 'rgba(237,250,255,0.34)';
    sctx.lineWidth = 3;
    for (let i = 0; i < 7; i += 1) {
      const y = 11 + i * 16;
      sctx.beginPath();
      sctx.moveTo(3, y);
      sctx.quadraticCurveTo(SPRITE_SIZE * 0.2, y + 4, SPRITE_SIZE * 0.46, y);
      sctx.quadraticCurveTo(SPRITE_SIZE * 0.74, y - 5, SPRITE_SIZE - 4, y);
      sctx.stroke();
    }
  });

  sprites.terrain.forest = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#6fbf66', '#4e9850');
    for (let i = 0; i < 9; i += 1) {
      const x = 18 + (i % 3) * 34 + Math.random() * 8;
      const y = 20 + Math.floor(i / 3) * 34 + Math.random() * 8;
      sctx.fillStyle = '#2d6f35';
      sctx.beginPath();
      sctx.arc(x, y, 14 + Math.random() * 8, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = 'rgba(110,188,108,0.55)';
      sctx.beginPath();
      sctx.arc(x - 4, y - 4, 8 + Math.random() * 6, 0, Math.PI * 2);
      sctx.fill();
    }
  });

  sprites.terrain.hill = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#a9bf7a', '#6f8f4d');
    const ridge = sctx.createLinearGradient(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    ridge.addColorStop(0, 'rgba(255,255,255,0.22)');
    ridge.addColorStop(1, 'rgba(0,0,0,0.22)');
    sctx.fillStyle = ridge;
    sctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    paintTextureDots(sctx, 120, '#8aa55e', 2.6, 0.2);
  });
}

function buildRoadSprites() {
  for (let mask = 0; mask < 16; mask += 1) {
    sprites.road[mask] = makeSprite((sctx) => {
      sctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      const laneW = 18;
      const cx = SPRITE_SIZE / 2;
      const cy = SPRITE_SIZE / 2;

      sctx.fillStyle = '#7b7b7b';
      sctx.beginPath();
      sctx.arc(cx, cy, laneW, 0, Math.PI * 2);
      sctx.fill();
      if (mask & 1) sctx.fillRect(cx - laneW, 0, laneW * 2, cy);
      if (mask & 2) sctx.fillRect(cx, cy - laneW, SPRITE_SIZE - cx, laneW * 2);
      if (mask & 4) sctx.fillRect(cx - laneW, cy, laneW * 2, SPRITE_SIZE - cy);
      if (mask & 8) sctx.fillRect(0, cy - laneW, cx, laneW * 2);
      if (mask === 0) sctx.fillRect(cx - laneW, 0, laneW * 2, SPRITE_SIZE);

      sctx.fillStyle = 'rgba(255,255,255,0.11)';
      sctx.fillRect(0, 0, SPRITE_SIZE, 10);
      sctx.strokeStyle = 'rgba(255,255,255,0.28)';
      sctx.lineWidth = 3;
      sctx.beginPath();
      if (mask & 1 || mask === 0) { sctx.moveTo(cx, cy); sctx.lineTo(cx, 0); }
      if (mask & 2) { sctx.moveTo(cx, cy); sctx.lineTo(SPRITE_SIZE, cy); }
      if (mask & 4 || mask === 0) { sctx.moveTo(cx, cy); sctx.lineTo(cx, SPRITE_SIZE); }
      if (mask & 8) { sctx.moveTo(cx, cy); sctx.lineTo(0, cy); }
      sctx.stroke();
    });
  }
}

function buildZoneSprites() {
  const zoneDefs = [
    ['res', '#79cfff', '#e8f6ff'],
    ['com', '#ffd87c', '#fff1c8'],
    ['ind', '#d78c6a', '#f2c8b5']
  ];

  for (const [zoneKey, base, tint] of zoneDefs) {
    for (let level = 0; level < 4; level += 1) {
      sprites.zone[zoneKey][level] = makeSprite((sctx) => {
        sctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
        const width = 44 + level * 12;
        const height = 34 + level * 20;
        const bx = Math.floor((SPRITE_SIZE - width) / 2);
        const by = SPRITE_SIZE - height - 10;

        sctx.fillStyle = 'rgba(0,0,0,0.24)';
        sctx.fillRect(bx + 4, by + height, width - 8, 7);

        const wall = sctx.createLinearGradient(0, by, 0, by + height);
        wall.addColorStop(0, tint);
        wall.addColorStop(1, base);
        sctx.fillStyle = wall;
        sctx.fillRect(bx, by, width, height);

        sctx.fillStyle = 'rgba(255,255,255,0.35)';
        sctx.fillRect(bx, by, width, 7);
        sctx.fillStyle = 'rgba(0,0,0,0.14)';
        sctx.fillRect(bx, by + height - 5, width, 5);

        if (zoneKey !== 'ind') {
          sctx.fillStyle = 'rgba(255,255,255,0.38)';
          for (let wy = by + 11; wy < by + height - 9; wy += 10) {
            sctx.fillRect(bx + 8, wy, 7, 5);
            sctx.fillRect(bx + width - 15, wy, 7, 5);
          }
        } else {
          sctx.fillStyle = '#91543f';
          sctx.fillRect(bx + width - 14, by - 10, 8, 12);
          sctx.fillStyle = 'rgba(255,255,255,0.18)';
          sctx.fillRect(bx + width - 14, by - 10, 8, 3);
        }
      });
    }
  }
}

function buildServiceSprites() {
  sprites.service.powerplant = makeSprite((sctx) => {
    sctx.fillStyle = '#b26c55';
    sctx.fillRect(18, 40, 92, 68);
    sctx.fillStyle = '#8f523f';
    sctx.fillRect(84, 18, 18, 34);
    sctx.fillStyle = 'rgba(255,255,255,0.28)';
    sctx.fillRect(18, 40, 92, 8);
    sctx.fillStyle = 'rgba(0,0,0,0.25)';
    sctx.fillRect(8, 108, 110, 9);
  });

  sprites.service.park = makeSprite((sctx) => {
    paintBaseGradient(sctx, '#83d68b', '#59b672');
    for (let i = 0; i < 6; i += 1) {
      const x = 18 + i * 17;
      const y = 28 + (i % 2) * 20;
      sctx.fillStyle = '#2f8442';
      sctx.beginPath();
      sctx.arc(x, y, 11, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.fillStyle = '#c09a6a';
    sctx.fillRect(16, 84, 96, 8);
  });

  sprites.service.school = makeSprite((sctx) => {
    sctx.fillStyle = '#8d9bfa';
    sctx.fillRect(18, 38, 92, 68);
    sctx.fillStyle = '#e9edff';
    sctx.fillRect(18, 38, 92, 8);
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(34, 58, 14, 14);
    sctx.fillRect(78, 58, 14, 14);
    sctx.fillStyle = 'rgba(0,0,0,0.24)';
    sctx.fillRect(8, 106, 110, 10);
  });

  sprites.service.police = makeSprite((sctx) => {
    sctx.fillStyle = '#a082f0';
    sctx.fillRect(18, 38, 92, 68);
    sctx.fillStyle = '#e5dcff';
    sctx.fillRect(18, 38, 92, 8);
    sctx.fillStyle = '#f2f2f2';
    sctx.fillRect(56, 56, 16, 32);
    sctx.fillRect(48, 64, 32, 16);
    sctx.fillStyle = 'rgba(0,0,0,0.24)';
    sctx.fillRect(8, 106, 110, 10);
  });
}

function tryLoadImage(url, onLoad) {
  const img = new Image();
  img.onload = () => onLoad(img);
  img.onerror = () => {};
  img.src = url;
}

function tryLoadExternalSprites() {
  const terrainMap = {
    grass: '/assets/terrain_grass.png',
    forest: '/assets/terrain_forest.png',
    hill: '/assets/terrain_hill.png',
    water0: '/assets/terrain_water0.png',
    water1: '/assets/terrain_water1.png'
  };

  Object.entries(terrainMap).forEach(([key, url]) => {
    tryLoadImage(url, (img) => {
      sprites.terrain[key] = img;
      game.mapNeedsMinimapRefresh = true;
    });
  });

  for (let mask = 0; mask < 16; mask += 1) {
    tryLoadImage(`/assets/road_${mask}.png`, (img) => {
      sprites.road[mask] = img;
      game.mapNeedsMinimapRefresh = true;
    });
  }

  const zoneTypes = ['res', 'com', 'ind'];
  zoneTypes.forEach((zoneType) => {
    for (let level = 0; level < 4; level += 1) {
      tryLoadImage(`/assets/${zoneType}_${level}.png`, (img) => {
        sprites.zone[zoneType][level] = img;
        game.mapNeedsMinimapRefresh = true;
      });
    }
  });

  const serviceTypes = ['powerplant', 'park', 'school', 'police'];
  serviceTypes.forEach((service) => {
    tryLoadImage(`/assets/service_${service}.png`, (img) => {
      sprites.service[service] = img;
      game.mapNeedsMinimapRefresh = true;
    });
  });
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
  game.aiAgent.accumulatorMs = 0;
  game.aiAgent.actions = 0;
  game.aiAgent.lastAction = 'Idle';
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
  if (game.aiAgent.followCamera) {
    focusCameraOn(target.x, target.y);
  }
  syncToolHighlights();
  return true;
}

function runAIAutoplayStep() {
  const profile = AI_PROFILES[game.aiAgent.profile] || AI_PROFILES.balanced;
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

  if (
    game.happiness < 58 &&
    parks < Math.max(3, Math.floor((game.population / 1300) * profile.parkBias)) &&
    game.money > 450
  ) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const resNear = countNear(x, y, (t) => t.zone === 'res', 6);
      return resNear * (5.5 + profile.parkBias) - tile.pollution * 0.9;
    });
    if (aiApply('park', spot, 1, 'Built park for happiness')) return;
  }

  if (
    game.population > 900 &&
    schools < Math.floor((game.population / 3600) * profile.schoolBias) + 1 &&
    game.money > 1100
  ) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const resNear = countNear(x, y, (t) => t.zone === 'res', 7);
      return resNear * (4.8 + profile.schoolBias * 0.8) + (tile.landValue / 6);
    });
    if (aiApply('school', spot, 1, 'Built school near neighborhoods')) return;
  }

  if (
    game.population > 1200 &&
    police < Math.floor((game.population / 4100) * profile.policeBias) + 1 &&
    game.money > 1200
  ) {
    const spot = bestTileFor((tile, x, y) => {
      if (tile.terrain === 'water' || tile.service) return -Infinity;
      const comNear = countNear(x, y, (t) => t.zone === 'com', 8);
      const resNear = countNear(x, y, (t) => t.zone === 'res', 8);
      return comNear * (3.5 + profile.policeBias) + resNear * 2;
    });
    if (aiApply('police', spot, 1, 'Built police coverage')) return;
  }

  const zonePressure = {
    res: (game.demandRes + (game.jobs > game.population ? 12 : 0)) * profile.residentialBias,
    com: (game.demandCom + (game.population > 300 ? 8 : 0)) * profile.commercialBias,
    ind: (game.demandInd + (game.jobs < game.population * 0.82 ? 10 : 0)) * profile.industryBias
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

    if (preferredZone === 'res') {
      return roadScore + land * 0.9 + forestNear * (1.3 + profile.parkBias * 0.5) - pollution * 1.2 - indNear * (1.6 + profile.parkBias * 0.3);
    }
    if (preferredZone === 'com') {
      return roadScore + land * 0.6 + resNear * (2 + profile.commercialBias) + roadsNear * 1.1 - pollution * 0.6;
    }
    return roadScore + (100 - land) * 0.35 + comNear * (1.2 + profile.industryBias * 0.8) + roadsNear * 1.2 - resNear * (1.4 + profile.parkBias * 0.8);
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

function roadMask(x, y) {
  if (!game.world[y][x].road) return 0;
  let mask = 0;
  if (inBounds(x, y - 1) && game.world[y - 1][x].road) mask |= 1;
  if (inBounds(x + 1, y) && game.world[y][x + 1].road) mask |= 2;
  if (inBounds(x, y + 1) && game.world[y + 1][x].road) mask |= 4;
  if (inBounds(x - 1, y) && game.world[y][x - 1].road) mask |= 8;
  return mask;
}

function drawRoadDetail(px, py, tileSize, mask) {
  const cx = px + tileSize * 0.5;
  const cy = py + tileSize * 0.5;
  const lane = Math.max(1, tileSize * 0.08);

  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = lane;
  ctx.beginPath();
  if (mask & 1) {
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, py);
  }
  if (mask & 2) {
    ctx.moveTo(cx, cy);
    ctx.lineTo(px + tileSize, cy);
  }
  if (mask & 4) {
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, py + tileSize);
  }
  if (mask & 8) {
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, cy);
  }
  if (mask === 0) {
    ctx.moveTo(cx, py + tileSize * 0.2);
    ctx.lineTo(cx, py + tileSize * 0.8);
  }
  ctx.stroke();
}

function drawForestDetail(px, py, tileSize, x, y) {
  const sway = (Math.sin((x * 0.5 + y * 0.8 + game.day * 0.06)) + 1) * 0.5;
  ctx.fillStyle = 'rgba(18, 77, 30, 0.78)';
  const r1 = tileSize * (0.2 + 0.08 * sway);
  const r2 = tileSize * (0.16 + 0.05 * sway);
  ctx.beginPath();
  ctx.arc(px + tileSize * 0.32, py + tileSize * 0.44, r1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + tileSize * 0.62, py + tileSize * 0.54, r2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuildingDetail(tile, px, py, tileSize) {
  if (!tile.zone || tile.density <= 0.05) return;

  const baseW = tileSize * (0.34 + tile.density * 0.34);
  const baseH = tileSize * (0.28 + tile.density * 0.52);
  const bx = px + (tileSize - baseW) * 0.5;
  const by = py + tileSize - baseH - tileSize * 0.08;

  const tint = tile.zone === 'res' ? '#bde9ff' : tile.zone === 'com' ? '#ffe7ad' : '#eab39c';
  const wall = mixColors(COLORS.zone[tile.zone], tint, 0.35);
  const roof = mixColors(wall, '#ffffff', 0.22);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(bx + tileSize * 0.05, by + baseH, baseW * 0.92, tileSize * 0.08);

  ctx.fillStyle = wall;
  ctx.fillRect(bx, by, baseW, baseH);
  ctx.fillStyle = roof;
  ctx.fillRect(bx, by, baseW, Math.max(2, tileSize * 0.08));

  if (tile.zone !== 'ind') {
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    const winRows = Math.max(1, Math.floor(baseH / (tileSize * 0.18)));
    for (let r = 0; r < winRows; r += 1) {
      const wy = by + tileSize * 0.12 + r * tileSize * 0.16;
      ctx.fillRect(bx + tileSize * 0.08, wy, baseW * 0.16, tileSize * 0.05);
      ctx.fillRect(bx + tileSize * 0.34, wy, baseW * 0.16, tileSize * 0.05);
    }
  }
}

function spriteForTerrain(tile, x, y, waveShift) {
  if (tile.terrain === 'water') {
    return Math.sin(waveShift + x * 0.35 + y * 0.22) > 0 ? sprites.terrain.water0 : sprites.terrain.water1;
  }
  if (tile.terrain === 'forest') return sprites.terrain.forest;
  if (tile.terrain === 'hill') return sprites.terrain.hill;
  return sprites.terrain.grass;
}

function drawSprite(sprite, px, py, tileSize) {
  if (!sprite) return;
  ctx.drawImage(sprite, px, py, tileSize, tileSize);
}

function drawScene(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const tileSize = BASE_TILE * game.camera.zoom;
  const waveShift = timestamp * 0.004;
  ctx.imageSmoothingEnabled = tileSize > 18;

  const startX = clamp(Math.floor(game.camera.x / tileSize), 0, COLS - 1);
  const startY = clamp(Math.floor(game.camera.y / tileSize), 0, ROWS - 1);
  const endX = clamp(Math.ceil((game.camera.x + canvas.width) / tileSize), 0, COLS - 1);
  const endY = clamp(Math.ceil((game.camera.y + canvas.height) / tileSize), 0, ROWS - 1);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const tile = game.world[y][x];
      const px = x * tileSize - game.camera.x;
      const py = y * tileSize - game.camera.y;

      if (game.overlay === 'none') {
        drawSprite(spriteForTerrain(tile, x, y, waveShift), px, py, tileSize);
      } else {
        ctx.fillStyle = getTileColor(tile, waveShift + x * 0.11 + y * 0.09);
        ctx.fillRect(px, py, tileSize, tileSize);
      }

      if (game.overlay === 'none') {
        if (tile.terrain === 'water') {
          const shore = countNear(x, y, (t) => t.terrain !== 'water', 1);
          if (shore > 0) {
            ctx.fillStyle = 'rgba(180, 225, 255, 0.24)';
            ctx.fillRect(px, py + tileSize * 0.08, tileSize, tileSize * 0.18);
          }
        }

        if (tile.terrain === 'hill' && tile.elev > 0) {
          ctx.fillStyle = `rgba(0,0,0,${0.05 + tile.elev * 0.03})`;
          ctx.fillRect(px, py, tileSize, tileSize);
        }

        if (tile.road) {
          drawSprite(sprites.road[roadMask(x, y)], px, py, tileSize);
        }

        if (tile.service) {
          drawSprite(sprites.service[tile.service], px, py, tileSize);
        }

        if (tile.zone && !tile.service) {
          const level = clamp(Math.floor(tile.density * 3.999), 0, 3);
          drawSprite(sprites.zone[tile.zone][level], px, py, tileSize);
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

  document.querySelectorAll('.ai-profile').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.profile === game.aiAgent.profile);
  });

  document.getElementById('speed1Btn').classList.toggle('active', !game.paused && game.speed === 1);
  document.getElementById('speed3Btn').classList.toggle('active', !game.paused && game.speed === 3);
  document.getElementById('speed6Btn').classList.toggle('active', !game.paused && game.speed === 6);
  document.getElementById('pauseBtn').classList.toggle('active', game.paused);
  const aiBtn = document.getElementById('aiAgentBtn');
  aiBtn.classList.toggle('active', game.aiAgent.enabled);
  aiBtn.classList.toggle('ai-on', game.aiAgent.enabled);
  aiBtn.textContent = game.aiAgent.enabled ? 'AI Autoplay: On' : 'AI Autoplay: Off';
  const followBtn = document.getElementById('aiFollowBtn');
  followBtn.classList.toggle('active', game.aiAgent.followCamera);
  followBtn.textContent = game.aiAgent.followCamera ? 'Follow AI Cam: On' : 'Follow AI Cam: Off';
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
    <div><strong>Style:</strong> ${(AI_PROFILES[game.aiAgent.profile] || AI_PROFILES.balanced).label}</div>
    <div><strong>AI Camera:</strong> ${game.aiAgent.followCamera ? 'Follow' : 'Locked'}</div>
  `;

  document.getElementById('aiAgentStatus').textContent = game.aiAgent.enabled
    ? `Active (${(AI_PROFILES[game.aiAgent.profile] || AI_PROFILES.balanced).label})\nCamera: ${game.aiAgent.followCamera ? 'Following AI' : 'Static'}\nLast: ${game.aiAgent.lastAction}\nActions: ${game.aiAgent.actions}`
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
    aiAgent: {
      enabled: game.aiAgent.enabled,
      accumulatorMs: game.aiAgent.accumulatorMs,
      lastAction: game.aiAgent.lastAction,
      actions: game.aiAgent.actions,
      profile: game.aiAgent.profile,
      followCamera: game.aiAgent.followCamera
    },
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
  game.aiAgent = payload.aiAgent ?? {
    enabled: false,
    accumulatorMs: 0,
    lastAction: 'Idle',
    actions: 0,
    profile: 'balanced',
    followCamera: false
  };
  if (!AI_PROFILES[game.aiAgent.profile]) game.aiAgent.profile = 'balanced';
  if (typeof game.aiAgent.followCamera !== 'boolean') game.aiAgent.followCamera = false;
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

    if (event.key.toLowerCase() === 'f') {
      game.aiAgent.followCamera = !game.aiAgent.followCamera;
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

  document.getElementById('aiFollowBtn').addEventListener('click', () => {
    game.aiAgent.followCamera = !game.aiAgent.followCamera;
    syncToolHighlights();
  });

  document.querySelectorAll('.ai-profile').forEach((button) => {
    button.addEventListener('click', () => {
      game.aiAgent.profile = button.dataset.profile;
      game.aiAgent.lastAction = `Switched to ${(AI_PROFILES[game.aiAgent.profile] || AI_PROFILES.balanced).label}`;
      game.aiAgent.accumulatorMs = 0;
      syncToolHighlights();
    });
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
    const cadenceMs = (AI_PROFILES[game.aiAgent.profile] || AI_PROFILES.balanced).cadenceMs;
    if (game.aiAgent.accumulatorMs >= cadenceMs) {
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
  buildSprites();
  tryLoadExternalSprites();

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
