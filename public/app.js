const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLS = 48;
const ROWS = 32;
const TILE = 20;

const TERRAIN_TOOLS = [
  { id: 'grass', label: 'Grass' },
  { id: 'water', label: 'Water' },
  { id: 'forest', label: 'Forest' }
];

const CITY_TOOLS = [
  { id: 'road', label: 'Road' },
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'bulldoze', label: 'Bulldoze' }
];

const colors = {
  grass: '#8ecf6a',
  water: '#3f89d9',
  forest: '#2e7d32',
  road: '#676767',
  residential: '#7ad3ff',
  commercial: '#ffd166',
  industrial: '#d97d54',
  grid: 'rgba(0,0,0,0.09)'
};

const game = {
  day: 1,
  money: 25000,
  happiness: 60,
  speed: 1,
  paused: false,
  selectedTool: 'grass',
  brushSize: 1,
  population: 0,
  jobs: 0,
  world: [],
  hover: null,
  dragPainting: false
};

function createTile() {
  return {
    terrain: 'grass',
    structure: null,
    occupancy: 0
  };
}

function newWorld() {
  game.world = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => createTile())
  );

  // Seed natural-looking water and forests.
  for (let i = 0; i < 280; i += 1) {
    paintCluster(Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS), 'forest', 2);
  }
  for (let i = 0; i < 170; i += 1) {
    paintCluster(Math.floor(Math.random() * COLS), Math.floor(Math.random() * ROWS), 'water', 2);
  }

  game.day = 1;
  game.money = 25000;
  game.happiness = 60;
}

function paintCluster(cx, cy, terrain, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (!inBounds(x, y)) continue;
      if (Math.random() < 0.65) {
        const tile = game.world[y][x];
        tile.terrain = terrain;
        if (terrain === 'water') {
          tile.structure = null;
          tile.occupancy = 0;
        }
      }
    }
  }
}

function inBounds(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function hasRoadNeighbor(x, y) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  return dirs.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return inBounds(nx, ny) && game.world[ny][nx].structure === 'road';
  });
}

function countNearby(x, y, terrainOrStructure, radius = 3) {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(xx, yy)) continue;
      const tile = game.world[yy][xx];
      if (tile.terrain === terrainOrStructure || tile.structure === terrainOrStructure) {
        count += 1;
      }
    }
  }
  return count;
}

function buildToolButtons(rootId, tools) {
  const root = document.getElementById(rootId);
  tools.forEach((tool) => {
    const btn = document.createElement('button');
    btn.className = 'tool';
    btn.textContent = tool.label;
    btn.dataset.tool = tool.id;
    btn.addEventListener('click', () => {
      game.selectedTool = tool.id;
      syncToolActive();
    });
    root.appendChild(btn);
  });
}

function syncToolActive() {
  document.querySelectorAll('.tool').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tool === game.selectedTool);
  });
}

function setSpeed(speed) {
  game.paused = false;
  game.speed = speed;
  document.getElementById('pauseBtn').classList.remove('active');
  document.getElementById('speed1Btn').classList.toggle('active', speed === 1);
  document.getElementById('speed3Btn').classList.toggle('active', speed === 3);
}

function paintAt(pixelX, pixelY) {
  const tileX = Math.floor(pixelX / TILE);
  const tileY = Math.floor(pixelY / TILE);
  const radius = game.brushSize - 1;

  for (let y = tileY - radius; y <= tileY + radius; y += 1) {
    for (let x = tileX - radius; x <= tileX + radius; x += 1) {
      if (!inBounds(x, y)) continue;
      applyTool(x, y, game.selectedTool);
    }
  }
}

function applyTool(x, y, tool) {
  const tile = game.world[y][x];

  if (tool === 'bulldoze') {
    tile.structure = null;
    tile.occupancy = 0;
    if (tile.terrain === 'water') tile.terrain = 'grass';
    return;
  }

  if (tool === 'grass' || tool === 'water' || tool === 'forest') {
    tile.terrain = tool;
    if (tool === 'water') {
      tile.structure = null;
      tile.occupancy = 0;
    }
    return;
  }

  if (tile.terrain === 'water') return;

  if (tool === 'road') {
    tile.structure = 'road';
    tile.occupancy = 0;
  }

  if (tool === 'residential' || tool === 'commercial' || tool === 'industrial') {
    tile.structure = tool;
    if (tool !== 'residential') tile.occupancy = 0;
  }
}

function simulateStep() {
  let jobsCapacity = 0;
  let roadCount = 0;
  let activeCommercial = 0;
  let activeIndustrial = 0;
  let residentialTiles = 0;
  let totalPop = 0;
  let pollutionScore = 0;

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      if (tile.structure === 'road') roadCount += 1;

      if (tile.structure === 'commercial' && hasRoadNeighbor(x, y)) {
        activeCommercial += 1;
      }
      if (tile.structure === 'industrial' && hasRoadNeighbor(x, y)) {
        activeIndustrial += 1;
        pollutionScore += 1 + countNearby(x, y, 'industrial', 2) * 0.05;
      }
      if (tile.structure === 'residential') {
        residentialTiles += 1;
      }
    }
  }

  jobsCapacity = activeCommercial * 14 + activeIndustrial * 22;
  const idealPop = Math.min(residentialTiles * 12, Math.floor(jobsCapacity * 1.35));
  const demandRatio = residentialTiles === 0 ? 0 : idealPop / Math.max(1, residentialTiles * 12);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      if (tile.structure !== 'residential') continue;

      const connected = hasRoadNeighbor(x, y);
      const trees = countNearby(x, y, 'forest', 2);
      const industry = countNearby(x, y, 'industrial', 2);

      const localScore =
        (connected ? 0.9 : -1.6) +
        demandRatio * 0.7 +
        (game.happiness - 50) / 120 +
        trees * 0.02 -
        industry * 0.09;

      tile.occupancy = Math.max(0, Math.min(12, tile.occupancy + localScore));
      totalPop += tile.occupancy;
    }
  }

  game.population = Math.floor(totalPop);
  game.jobs = jobsCapacity;

  const income = Math.floor(
    game.population * 2.2 +
      activeCommercial * 10 +
      activeIndustrial * 15
  );
  const upkeep = Math.floor(140 + roadCount * 0.9 + (activeIndustrial + activeCommercial) * 0.5);
  game.money += income - upkeep;

  const pollutionPenalty = pollutionScore / 12;
  const serviceBonus = Math.min(7, Math.max(-7, (game.money - 10000) / 4000));
  game.happiness = Math.max(
    5,
    Math.min(95, game.happiness + 0.2 + serviceBonus * 0.04 - pollutionPenalty * 0.06)
  );

  game.day += 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const tile = game.world[y][x];
      const px = x * TILE;
      const py = y * TILE;

      ctx.fillStyle = colors[tile.terrain];
      ctx.fillRect(px, py, TILE, TILE);

      if (tile.structure) {
        ctx.fillStyle = colors[tile.structure];
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);

        if (tile.structure === 'residential' && tile.occupancy > 0) {
          const fill = Math.min(1, tile.occupancy / 12);
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(px + 4, py + TILE - 4, (TILE - 8) * fill, 2);
        }
      }

      ctx.strokeStyle = colors.grid;
      ctx.strokeRect(px, py, TILE, TILE);
    }
  }

  if (game.hover) {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(game.hover.x * TILE + 1, game.hover.y * TILE + 1, TILE - 2, TILE - 2);
    ctx.lineWidth = 1;
  }
}

function renderHud() {
  const stats = [
    ['Day', game.day],
    ['Money', `$${game.money.toLocaleString()}`],
    ['Population', game.population.toLocaleString()],
    ['Jobs', game.jobs.toLocaleString()],
    ['Happiness', `${game.happiness.toFixed(0)}%`],
    ['Mode', game.selectedTool]
  ];

  const statsBar = document.getElementById('statsBar');
  statsBar.innerHTML = stats
    .map(([name, value]) => `<div class="stat"><strong>${name}</strong>${value}</div>`)
    .join('');

  const eco = document.getElementById('economyInfo');
  eco.innerHTML = `
    <div>Cashflow responds to roads, zoning, and occupied homes.</div>
    <div>Low happiness slows growth. Excess industry increases pollution.</div>
  `;

  const tileInfo = document.getElementById('tileInfo');
  if (!game.hover) {
    tileInfo.textContent = 'Hover over a tile';
    return;
  }
  const tile = game.world[game.hover.y][game.hover.x];
  tileInfo.innerHTML = `
    <div><strong>Coords:</strong> ${game.hover.x}, ${game.hover.y}</div>
    <div><strong>Terrain:</strong> ${tile.terrain}</div>
    <div><strong>Structure:</strong> ${tile.structure || 'none'}</div>
    <div><strong>Residents:</strong> ${tile.structure === 'residential' ? tile.occupancy.toFixed(1) : 0}</div>
  `;
}

function worldToSave() {
  return {
    day: game.day,
    money: game.money,
    happiness: game.happiness,
    speed: game.speed,
    paused: game.paused,
    selectedTool: game.selectedTool,
    brushSize: game.brushSize,
    world: game.world
  };
}

function loadSave(data) {
  if (!data || !Array.isArray(data.world)) return false;
  game.day = data.day ?? 1;
  game.money = data.money ?? 25000;
  game.happiness = data.happiness ?? 60;
  game.speed = data.speed ?? 1;
  game.paused = data.paused ?? false;
  game.selectedTool = data.selectedTool ?? 'grass';
  game.brushSize = Math.min(3, Math.max(1, data.brushSize ?? 1));
  game.world = data.world;
  return true;
}

function initUI() {
  buildToolButtons('terrainTools', TERRAIN_TOOLS);
  buildToolButtons('cityTools', CITY_TOOLS);
  syncToolActive();

  document.getElementById('brushSize').addEventListener('input', (event) => {
    game.brushSize = Number(event.target.value);
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    game.paused = !game.paused;
    document.getElementById('pauseBtn').classList.toggle('active', game.paused);
  });
  document.getElementById('speed1Btn').addEventListener('click', () => setSpeed(1));
  document.getElementById('speed3Btn').addEventListener('click', () => setSpeed(3));

  document.getElementById('saveBtn').addEventListener('click', () => {
    localStorage.setItem('worldBuilderSave', JSON.stringify(worldToSave()));
  });

  document.getElementById('loadBtn').addEventListener('click', () => {
    const raw = localStorage.getItem('worldBuilderSave');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    loadSave(parsed);
    document.getElementById('brushSize').value = String(game.brushSize);
    syncToolActive();
  });

  document.getElementById('newBtn').addEventListener('click', () => {
    newWorld();
  });

  canvas.addEventListener('mousedown', (event) => {
    game.dragPainting = true;
    paintAt(event.offsetX, event.offsetY);
  });

  canvas.addEventListener('mousemove', (event) => {
    const x = Math.floor(event.offsetX / TILE);
    const y = Math.floor(event.offsetY / TILE);
    if (inBounds(x, y)) {
      game.hover = { x, y };
    }
    if (game.dragPainting) {
      paintAt(event.offsetX, event.offsetY);
    }
  });

  const stopDrag = () => {
    game.dragPainting = false;
  };

  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('mouseleave', () => {
    stopDrag();
    game.hover = null;
  });
  window.addEventListener('mouseup', stopDrag);
}

let simAccumulator = 0;
let lastTs = 0;

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const delta = ts - lastTs;
  lastTs = ts;

  if (!game.paused) {
    simAccumulator += delta * game.speed;
    while (simAccumulator >= 1000) {
      simulateStep();
      simAccumulator -= 1000;
    }
  }

  draw();
  renderHud();
  requestAnimationFrame(loop);
}

function start() {
  newWorld();
  initUI();
  requestAnimationFrame(loop);
}

start();
