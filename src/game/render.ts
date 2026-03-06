import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { getAssetCardOptions, paintAssetCard } from './assets';
import type { BuildType, Building, GameState } from './state';
import {
  footprintForType,
  gameStore,
  occupiedCellsForBuilding
} from './state';

interface RoadVisualData {
  connectors: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  stripes: Record<'ns' | 'ew', THREE.Mesh>;
  edgeCaps: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  intersection: THREE.Mesh;
  crosswalks: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
}

interface BuildingPlacement {
  offsetX: number;
  offsetZ: number;
  rotationY: number;
}

export class GameRenderer {
  private readonly container: HTMLElement;

  private readonly scene = new THREE.Scene();

  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

  private readonly composer: EffectComposer;

  private readonly raycaster = new THREE.Raycaster();

  private readonly pointerNdc = new THREE.Vector2();

  private readonly tileMesh: THREE.InstancedMesh;

  private readonly groundPlane: THREE.Mesh;

  private readonly ghostMesh: THREE.Mesh;

  private readonly hoverMesh: THREE.Mesh;

  private readonly placementPulse = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.42, 36),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0 })
  );

  private readonly removalPulse = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.38, 36),
    new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0 })
  );

  private readonly buildingRoot = new THREE.Group();
  private readonly decorRoot = new THREE.Group();

  private readonly buildingMeshes = new Map<number, THREE.Object3D>();

  private readonly selectableMeshes = new Map<number, THREE.Mesh[]>();

  private readonly roadVisuals = new Map<number, RoadVisualData>();

  private readonly houseAnimations = new Map<
    number,
    {
      windows: THREE.Mesh[];
      smoke: THREE.Mesh[];
      baseY: number;
      wobble: number;
    }
  >();

  private readonly buildingByCell = new Map<string, Building>();

  private frameHandle = 0;

  private lastTime = performance.now();

  private frameHook: ((dtSeconds: number) => void) | null = null;

  private readonly cameraDesired = {
    x: 0,
    z: 0,
    distance: 8.8
  };

  private readonly cameraCurrent = {
    x: 0,
    z: 0,
    distance: 8.8
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene.background = new THREE.Color(0xdbeaf3);
    this.scene.fog = new THREE.Fog(0xdbeaf3, 12, 34);

    const state = gameStore.getState();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = 'h-full w-full';
    this.container.appendChild(this.renderer.domElement);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.15, 0.55, 0.92);
    this.composer.addPass(bloomPass);

    const ambient = new THREE.AmbientLight(0xfff6e8, 0.78);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff5da, 1.5);
    directional.position.set(18, 28, 12);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 120;
    directional.shadow.camera.left = -18;
    directional.shadow.camera.right = 18;
    directional.shadow.camera.top = 18;
    directional.shadow.camera.bottom = -18;
    this.scene.add(directional);

    const fill = new THREE.DirectionalLight(0xa6e1ff, 0.52);
    fill.position.set(-25, 18, -18);
    this.scene.add(fill);

    const tileGeometry = new THREE.BoxGeometry(1, 0.14, 1);
    const tileMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.01
    });

    this.tileMesh = new THREE.InstancedMesh(tileGeometry, tileMaterial, state.gridSize * state.gridSize);
    this.tileMesh.receiveShadow = true;
    this.tileMesh.castShadow = false;

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    let idx = 0;
    for (let z = 0; z < state.gridSize; z += 1) {
      for (let x = 0; x < state.gridSize; x += 1) {
        const world = this.gridToWorld(x, z, state.gridSize);
        const tile = state.tiles[idx];
        const heightScale = 1 + tile.elevation;
        matrix.compose(
          new THREE.Vector3(world.x, -0.04 + tile.elevation * 0.2, world.z),
          new THREE.Quaternion(),
          new THREE.Vector3(1, heightScale, 1)
        );
        this.tileMesh.setMatrixAt(idx, matrix);

        const warmPatch = ((x + z) % 3 === 0 ? 0.03 : 0) + Math.max(0, tile.elevation) * 0.08;
        const coolPatch = ((x * 7 + z * 3) % 5 === 0 ? 0.025 : 0);
        color.setRGB(
          (0.5 + warmPatch * 0.4) * tile.tint,
          (0.76 + tile.elevation * 0.16 + warmPatch) * tile.tint,
          (0.52 + coolPatch * 0.2) * tile.tint
        );
        this.tileMesh.setColorAt(idx, color);

        idx += 1;
      }
    }
    this.tileMesh.instanceMatrix.needsUpdate = true;
    if (this.tileMesh.instanceColor) this.tileMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.tileMesh);
    this.scene.add(this.decorRoot);
    this.createGroundDecor(state);

    const planeSize = state.gridSize + 0.2;
    this.groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeSize, planeSize),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.scene.add(this.groundPlane);

    this.hoverMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.03, 1.02),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.35
      })
    );
    this.hoverMesh.visible = false;
    this.hoverMesh.castShadow = false;
    this.hoverMesh.receiveShadow = false;
    this.scene.add(this.hoverMesh);

    this.ghostMesh = new THREE.Mesh(
      this.geometryForType('house'),
      new THREE.MeshStandardMaterial({
        color: 0x4ade80,
        transparent: true,
        opacity: 0.48,
        depthWrite: false
      })
    );
    this.ghostMesh.visible = false;
    this.scene.add(this.ghostMesh);

    this.placementPulse.rotation.x = -Math.PI / 2;
    this.placementPulse.position.y = 0.02;
    this.scene.add(this.placementPulse);
    this.removalPulse.rotation.x = -Math.PI / 2;
    this.removalPulse.position.y = 0.02;
    this.scene.add(this.removalPulse);

    this.scene.add(this.buildingRoot);

    this.resize();
    this.syncFromState(gameStore.getState());

    window.addEventListener('resize', this.resize);
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    this.renderer.dispose();
    this.composer.dispose();
    this.container.innerHTML = '';
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setFrameHook(hook: ((dtSeconds: number) => void) | null): void {
    this.frameHook = hook;
  }

  setPointerFromClient(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  panBy(dx: number, dz: number): void {
    this.cameraDesired.x += dx;
    this.cameraDesired.z += dz;
    this.clampCameraTarget();
  }

  zoomBy(delta: number, focusCell?: { x: number; z: number }): void {
    const previousDistance = this.cameraDesired.distance;
    const nextDistance = THREE.MathUtils.clamp(this.cameraDesired.distance + delta, 5.25, 24);
    this.cameraDesired.distance = nextDistance;

    if (focusCell && previousDistance > 0) {
      const state = gameStore.getState();
      const focus = this.gridToWorld(focusCell.x, focusCell.z, state.gridSize);
      const ratio = nextDistance / previousDistance;
      this.cameraDesired.x = focus.x + (this.cameraDesired.x - focus.x) * ratio;
      this.cameraDesired.z = focus.z + (this.cameraDesired.z - focus.z) * ratio;
    }
    this.clampCameraTarget();
  }

  focusOnCell(x: number, z: number, strength = 0.28, type: BuildType = 'road'): void {
    const state = gameStore.getState();
    const focus = this.placementOriginWorld(type, x, z, state.gridSize);
    this.cameraDesired.x = THREE.MathUtils.lerp(this.cameraDesired.x, focus.x, strength);
    this.cameraDesired.z = THREE.MathUtils.lerp(this.cameraDesired.z, focus.z, strength);
    this.clampCameraTarget();
  }

  playPlacementPulse(x: number, z: number, type: BuildType = 'road'): void {
    const state = gameStore.getState();
    const world = this.placementOriginWorld(type, x, z, state.gridSize);
    this.placementPulse.position.set(world.x, 0.035, world.z);
    const mat = this.placementPulse.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.7;
    this.placementPulse.scale.setScalar(0.45);
  }

  playRemovalPulse(x: number, z: number, type: BuildType = 'road'): void {
    const state = gameStore.getState();
    const world = this.placementOriginWorld(type, x, z, state.gridSize);
    this.removalPulse.position.set(world.x, 0.036, world.z);
    const mat = this.removalPulse.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.75;
    this.removalPulse.scale.setScalar(0.4);
  }

  pickGridCell(): { x: number; z: number } | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.groundPlane, false);
    if (!hits.length) return null;
    const hit = hits[0].point;
    const state = gameStore.getState();
    const half = (state.gridSize - 1) * 0.5;
    const x = Math.round(hit.x + half);
    const z = Math.round(hit.z + half);
    if (x < 0 || z < 0 || x >= state.gridSize || z >= state.gridSize) return null;
    return { x, z };
  }

  pickBuildingId(): number | null {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const targets = Array.from(this.selectableMeshes.values()).flat();
    if (!targets.length) return null;
    const hits = this.raycaster.intersectObjects(targets, true);
    if (!hits.length) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      const maybe = obj.userData.buildingId as number | undefined;
      if (maybe != null) return maybe;
      obj = obj.parent;
    }
    return null;
  }

  private readonly resize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  private readonly loop = (time: number): void => {
    this.frameHandle = requestAnimationFrame(this.loop);
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    if (this.frameHook) this.frameHook(Math.min(0.033, dt));

    this.syncFromState(gameStore.getState());

    this.cameraCurrent.x = THREE.MathUtils.lerp(this.cameraCurrent.x, this.cameraDesired.x, 0.11);
    this.cameraCurrent.z = THREE.MathUtils.lerp(this.cameraCurrent.z, this.cameraDesired.z, 0.11);
    this.cameraCurrent.distance = THREE.MathUtils.lerp(this.cameraCurrent.distance, this.cameraDesired.distance, 0.12);

    const yaw = Math.PI / 4;
    const pitch = THREE.MathUtils.degToRad(52);
    const r = this.cameraCurrent.distance;
    const offset = new THREE.Vector3(
      Math.cos(yaw) * Math.cos(pitch) * r,
      Math.sin(pitch) * r,
      Math.sin(yaw) * Math.cos(pitch) * r
    );

    this.camera.position.set(this.cameraCurrent.x + offset.x, offset.y, this.cameraCurrent.z + offset.z);
    this.camera.lookAt(this.cameraCurrent.x, 0, this.cameraCurrent.z);

    this.animateAmbientBuildings(time / 1000);

    const pulseMat = this.placementPulse.material as THREE.MeshBasicMaterial;
    if (pulseMat.opacity > 0.01) {
      this.placementPulse.scale.multiplyScalar(1 + dt * 2.4);
      pulseMat.opacity *= 0.91;
    }
    const removalMat = this.removalPulse.material as THREE.MeshBasicMaterial;
    if (removalMat.opacity > 0.01) {
      this.removalPulse.scale.multiplyScalar(1 + dt * 2.1);
      removalMat.opacity *= 0.9;
    }

    this.composer.render();
  };

  private animateAmbientBuildings(timeSeconds: number): void {
    for (const [id, anim] of this.houseAnimations.entries()) {
      const object = this.buildingMeshes.get(id);
      if (!object) continue;

      const bob = Math.sin(timeSeconds * 1.1 + anim.wobble) * 0.012;
      object.position.y = anim.baseY + Math.max(0, bob);

      const glow = 0.18 + (Math.sin(timeSeconds * 0.9 + anim.wobble * 1.7) * 0.5 + 0.5) * 0.18;
      for (const windowMesh of anim.windows) {
        const material = windowMesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = glow;
      }

      anim.smoke.forEach((puff, index) => {
        const cycle = (timeSeconds * 0.26 + anim.wobble * 0.11 + index * 0.33) % 1;
        puff.position.y = 0.86 + cycle * 0.34 + index * 0.04;
        puff.position.x = 0.18 + Math.sin(timeSeconds * 0.7 + index) * 0.025;
        puff.position.z = -0.14 + cycle * 0.05;
        puff.scale.setScalar(0.55 + cycle * 0.6);
        const smokeMat = puff.material as THREE.MeshStandardMaterial;
        smokeMat.opacity = Math.max(0, 0.22 - cycle * 0.18);
      });
    }
  }

  private syncFromState(state: GameState): void {
    this.syncBuildingMaps(state);
    this.syncHoverAndGhost(state);
    this.syncSelection(state);
  }

  private syncBuildingMaps(state: GameState): void {
    this.buildingByCell.clear();
    state.buildings.forEach((b) => {
      occupiedCellsForBuilding(b).forEach((cell) => {
        this.buildingByCell.set(`${cell.x}:${cell.z}`, b);
      });
    });

    const seen = new Set<number>();
    for (const b of state.buildings) {
      seen.add(b.id);
      if (!this.buildingMeshes.has(b.id)) {
        const mesh = this.createBuildingObject(b);
        this.buildingMeshes.set(b.id, mesh);
        this.buildingRoot.add(mesh);
      }

      const object = this.buildingMeshes.get(b.id)!;
      const world = this.buildingOriginWorld(b, state.gridSize);
      const placement = this.computeBuildingPlacement(b);
      object.position.set(world.x + placement.offsetX, 0, world.z + placement.offsetZ);
      object.rotation.y = placement.rotationY;

      const ageMs = performance.now() - b.createdAt;
      const t = THREE.MathUtils.clamp(ageMs / 220, 0, 1);
      const s = 0.82 + 0.18 * (1 - Math.pow(1 - t, 2));
      object.scale.setScalar(s);
    }

    for (const [id, obj] of this.buildingMeshes.entries()) {
      if (seen.has(id)) continue;
      this.buildingRoot.remove(obj);
      this.disposeObject(obj);
      this.buildingMeshes.delete(id);
      this.selectableMeshes.delete(id);
      this.roadVisuals.delete(id);
      this.houseAnimations.delete(id);
    }

    this.syncRoadVisuals();
  }

  private syncRoadVisuals(): void {
    for (const [id, roadData] of this.roadVisuals.entries()) {
      const building = this.findBuilding(id);
      if (!building) continue;
      const north = this.buildingByCell.get(`${building.x}:${building.z - 1}`)?.type === 'road';
      const east = this.buildingByCell.get(`${building.x + 1}:${building.z}`)?.type === 'road';
      const south = this.buildingByCell.get(`${building.x}:${building.z + 1}`)?.type === 'road';
      const west = this.buildingByCell.get(`${building.x - 1}:${building.z}`)?.type === 'road';
      roadData.connectors.n.visible = north;
      roadData.connectors.e.visible = east;
      roadData.connectors.s.visible = south;
      roadData.connectors.w.visible = west;
      const roadCount = Number(north) + Number(east) + Number(south) + Number(west);
      roadData.stripes.ns.visible = north || south || roadCount <= 1;
      roadData.stripes.ew.visible = east || west;
      roadData.edgeCaps.n.visible = !north;
      roadData.edgeCaps.e.visible = !east;
      roadData.edgeCaps.s.visible = !south;
      roadData.edgeCaps.w.visible = !west;
      roadData.intersection.visible = roadCount >= 3;
      roadData.crosswalks.n.visible = roadCount >= 3 && north;
      roadData.crosswalks.e.visible = roadCount >= 3 && east;
      roadData.crosswalks.s.visible = roadCount >= 3 && south;
      roadData.crosswalks.w.visible = roadCount >= 3 && west;
    }
  }

  private findBuilding(id: number): Building | undefined {
    return gameStore.getState().buildings.find((b) => b.id === id);
  }

  private footprintCenterOffset(type: BuildType): { x: number; z: number } {
    const footprint = footprintForType(type);
    return {
      x: (footprint.width - 1) * 0.5,
      z: (footprint.depth - 1) * 0.5
    };
  }

  private buildingOriginWorld(building: Building, gridSize: number): { x: number; z: number } {
    const world = this.gridToWorld(building.x, building.z, gridSize);
    const offset = this.footprintCenterOffset(building.type);
    return {
      x: world.x + offset.x,
      z: world.z + offset.z
    };
  }

  private placementOriginWorld(type: BuildType, x: number, z: number, gridSize: number): { x: number; z: number } {
    const world = this.gridToWorld(x, z, gridSize);
    const offset = this.footprintCenterOffset(type);
    return {
      x: world.x + offset.x,
      z: world.z + offset.z
    };
  }

  private roadFrontage(building: Building): { n: number; e: number; s: number; w: number } {
    const cells = occupiedCellsForBuilding(building);
    const sides = { n: 0, e: 0, s: 0, w: 0 };

    for (const cell of cells) {
      if (this.buildingByCell.get(`${cell.x}:${cell.z - 1}`)?.type === 'road') sides.n += 1;
      if (this.buildingByCell.get(`${cell.x + 1}:${cell.z}`)?.type === 'road') sides.e += 1;
      if (this.buildingByCell.get(`${cell.x}:${cell.z + 1}`)?.type === 'road') sides.s += 1;
      if (this.buildingByCell.get(`${cell.x - 1}:${cell.z}`)?.type === 'road') sides.w += 1;
    }

    return sides;
  }

  private computeBuildingPlacement(building: Building): BuildingPlacement {
    if (building.type === 'road' || building.type === 'park') {
      return { offsetX: 0, offsetZ: 0, rotationY: 0 };
    }

    const frontage = this.roadFrontage(building);
    const entries = Object.entries(frontage) as Array<[keyof typeof frontage, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    const primary = entries[0];

    if (primary && primary[1] > 0) {
      const facing =
        primary[0] === 'n'
          ? 'north'
          : primary[0] === 's'
            ? 'south'
            : primary[0] === 'e'
              ? 'east'
              : 'west';
      return this.placementForFacing(facing, building.type);
    }

    return { offsetX: 0, offsetZ: 0, rotationY: 0 };
  }

  private placementForFacing(
    facing: 'north' | 'south' | 'east' | 'west',
    type: BuildType
  ): BuildingPlacement {
    const footprint = footprintForType(type);
    if (footprint.width > 1 || footprint.depth > 1) {
      if (facing === 'north') return { offsetX: 0, offsetZ: 0, rotationY: 0 };
      if (facing === 'south') return { offsetX: 0, offsetZ: 0, rotationY: Math.PI };
      if (facing === 'east') return { offsetX: 0, offsetZ: 0, rotationY: -Math.PI / 2 };
      return { offsetX: 0, offsetZ: 0, rotationY: Math.PI / 2 };
    }

    const setback =
      type === 'house'
        ? 0.14
        : type === 'shop' ||
            type === 'restaurant' ||
            type === 'groceryStore' ||
            type === 'cornerStore' ||
            type === 'bank'
          ? 0.08
          : type === 'hospital' || type === 'policeStation' || type === 'fireStation'
            ? 0.1
            : 0.05;

    if (facing === 'north') return { offsetX: 0, offsetZ: setback, rotationY: 0 };
    if (facing === 'south') return { offsetX: 0, offsetZ: -setback, rotationY: Math.PI };
    if (facing === 'east') return { offsetX: -setback, offsetZ: 0, rotationY: -Math.PI / 2 };
    return { offsetX: setback, offsetZ: 0, rotationY: Math.PI / 2 };
  }

  private syncHoverAndGhost(state: GameState): void {
    if (state.hoverCell) {
      const previewType = state.placementMode ?? 'road';
      const footprint = footprintForType(previewType);
      const world = this.placementOriginWorld(previewType, state.hoverCell.x, state.hoverCell.z, state.gridSize);
      this.hoverMesh.visible = true;
      this.hoverMesh.scale.set(footprint.width, 1, footprint.depth);
      this.hoverMesh.position.set(world.x, 0.03, world.z);

      if (state.placementMode) {
        this.ghostMesh.visible = true;
        this.ghostMesh.geometry = this.geometryForType(state.placementMode);
        this.ghostMesh.scale.set(1, 1, 1);
        this.ghostMesh.position.set(world.x, this.baseHeightForType(state.placementMode), world.z);
        const mat = this.ghostMesh.material as THREE.MeshStandardMaterial;
        mat.color.setHex(state.hoverCell.valid ? 0x4ade80 : 0xf87171);
      } else {
        this.ghostMesh.visible = false;
      }
    } else {
      this.hoverMesh.visible = false;
      this.ghostMesh.visible = false;
    }
  }

  private syncSelection(state: GameState): void {
    for (const [id, meshes] of this.selectableMeshes.entries()) {
      const selected = id === state.selectedBuildingId;
      for (const mesh of meshes) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissive.setHex(selected ? 0x1e293b : 0x000000);
        material.emissiveIntensity = selected ? 0.34 : 0;
      }
    }
  }

  private createBuildingObject(building: Building): THREE.Object3D {
    if (building.type === 'road') {
      const group = new THREE.Group();
      const asphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x404a55, roughness: 0.9, metalness: 0.03 });
      const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x697987, roughness: 0.95, metalness: 0.01 });
      const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd3d9, roughness: 0.94, metalness: 0.01 });

      const asphaltBase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.045, 0.98), asphaltMaterial);
      asphaltBase.position.y = 0.028;
      asphaltBase.receiveShadow = true;
      asphaltBase.castShadow = false;
      asphaltBase.userData.buildingId = building.id;
      group.add(asphaltBase);

      const carriageway = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.02, 0.78), shoulderMaterial);
      carriageway.position.y = 0.053;
      carriageway.receiveShadow = true;
      carriageway.castShadow = false;
      carriageway.userData.buildingId = building.id;
      group.add(carriageway);

      const laneStripeMat = new THREE.MeshStandardMaterial({
        color: 0xe8ecef,
        roughness: 0.6,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.15
      });
      const stripeNS = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.005, 0.62), laneStripeMat);
      stripeNS.position.set(0, 0.08, 0);
      stripeNS.userData.buildingId = building.id;
      group.add(stripeNS);

      const stripeEW = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.005, 0.045), laneStripeMat.clone());
      stripeEW.position.set(0, 0.08, 0);
      stripeEW.userData.buildingId = building.id;
      group.add(stripeEW);

      const intersectionMark = new THREE.Mesh(
        new THREE.CircleGeometry(0.14, 20),
        new THREE.MeshStandardMaterial({
          color: 0xeef2f6,
          roughness: 0.6,
          metalness: 0.02,
          emissive: 0x0f141a,
          emissiveIntensity: 0.12
        })
      );
      intersectionMark.rotation.x = -Math.PI / 2;
      intersectionMark.position.y = 0.083;
      intersectionMark.userData.buildingId = building.id;
      intersectionMark.visible = false;
      group.add(intersectionMark);

      const connectorGeom = new THREE.BoxGeometry(0.3, 0.044, 0.56);
      const connectorMat = asphaltMaterial;
      const n = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const e = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const s = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const w = new THREE.Mesh(connectorGeom, connectorMat.clone());

      n.position.set(0, 0.028, -0.39);
      s.position.set(0, 0.028, 0.39);
      e.position.set(0.39, 0.028, 0);
      w.position.set(-0.39, 0.028, 0);
      e.rotation.y = Math.PI / 2;
      w.rotation.y = Math.PI / 2;
      [n, e, s, w].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        group.add(part);
      });

      const capGeomH = new THREE.BoxGeometry(0.9, 0.04, 0.12);
      const capGeomV = new THREE.BoxGeometry(0.12, 0.04, 0.9);
      const capN = new THREE.Mesh(capGeomH, curbMaterial.clone());
      const capS = new THREE.Mesh(capGeomH, curbMaterial.clone());
      const capE = new THREE.Mesh(capGeomV, curbMaterial.clone());
      const capW = new THREE.Mesh(capGeomV, curbMaterial.clone());
      capN.position.set(0, 0.034, -0.43);
      capS.position.set(0, 0.034, 0.43);
      capE.position.set(0.43, 0.034, 0);
      capW.position.set(-0.43, 0.034, 0);
      [capN, capS, capE, capW].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        group.add(part);
      });

      const crosswalkMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.55,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.06
      });
      const cwN = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.004, 0.08), crosswalkMat);
      const cwS = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.004, 0.08), crosswalkMat.clone());
      const cwE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.44), crosswalkMat.clone());
      const cwW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.44), crosswalkMat.clone());
      cwN.position.set(0, 0.081, -0.27);
      cwS.position.set(0, 0.081, 0.27);
      cwE.position.set(0.27, 0.081, 0);
      cwW.position.set(-0.27, 0.081, 0);
      [cwN, cwS, cwE, cwW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        group.add(part);
      });

      this.selectableMeshes.set(building.id, [
        asphaltBase,
        carriageway,
        n,
        e,
        s,
        w,
        stripeNS,
        stripeEW,
        capN,
        capE,
        capS,
        capW,
        intersectionMark,
        cwN,
        cwE,
        cwS,
        cwW
      ]);
      this.roadVisuals.set(building.id, {
        connectors: { n, e, s, w },
        stripes: { ns: stripeNS, ew: stripeEW },
        edgeCaps: { n: capN, e: capE, s: capS, w: capW },
        intersection: intersectionMark,
        crosswalks: { n: cwN, e: cwE, s: cwS, w: cwW }
      });
      return group;
    }

    if (building.type === 'house') {
      const group = new THREE.Group();
      const variant = building.id % 5;
      const wallPalette = [0xcaa17b, 0xe1c9a9, 0xb78f63, 0xd7b58c, 0xcfa7a1];
      const roofPalette = [0x6d5140, 0x9b5b3e, 0x6f6f72, 0x845742, 0x4d5b71];
      const trimPalette = [0xaf7d52, 0xd9bc93, 0x9b7a57, 0xc69f74, 0xb48c84];
      const wallMat = new THREE.MeshStandardMaterial({
        color: wallPalette[variant],
        roughness: 0.78,
        metalness: 0.02
      });
      const trimMat = new THREE.MeshStandardMaterial({
        color: trimPalette[variant],
        roughness: 0.8,
        metalness: 0.01
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: roofPalette[variant],
        roughness: 0.82,
        metalness: 0.02
      });
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0xffefc7,
        roughness: 0.4,
        metalness: 0.08,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.22
      });

      const lot = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.06, 0.96),
        new THREE.MeshStandardMaterial({ color: 0x7cab72, roughness: 0.96, metalness: 0.01 })
      );
      lot.position.y = 0.03;
      lot.receiveShadow = true;
      lot.userData.buildingId = building.id;

      const path = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.015, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xd2bf9f, roughness: 0.92, metalness: 0.01 })
      );
      path.position.set(0, 0.06, 0.24);
      path.userData.buildingId = building.id;

      const hedgeLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.16, 0.32),
        new THREE.MeshStandardMaterial({ color: 0x5c8f59, roughness: 0.93, metalness: 0.01 })
      );
      hedgeLeft.position.set(-0.34, 0.11, 0.2);
      hedgeLeft.userData.buildingId = building.id;

      const planterRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.1, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x976742, roughness: 0.88, metalness: 0.01 })
      );
      planterRight.position.set(0.33, 0.08, 0.28);
      planterRight.userData.buildingId = building.id;

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.66 + (variant === 4 ? 0.06 : 0), 0.44 + (variant === 3 ? 0.08 : 0), 0.62 + (variant === 0 ? 0.08 : 0)), wallMat);
      base.position.y = 0.235;
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.buildingId = building.id;

      const roof =
        variant === 1
          ? new THREE.Mesh(new THREE.ConeGeometry(0.49, 0.31, 4), roofMat)
          : variant === 4
            ? new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.68), roofMat)
            : new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.11, 0.82), roofMat);
      roof.position.y = variant === 1 ? 0.62 : variant === 3 ? 0.66 : 0.58;
      roof.rotation.y = variant === 1 ? Math.PI / 4 : variant === 2 ? Math.PI / 15 : variant === 4 ? -Math.PI / 22 : 0;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const porch = new THREE.Mesh(new THREE.BoxGeometry(variant === 3 ? 0.38 : 0.32, 0.06, 0.2), trimMat);
      porch.position.set(0, 0.05, 0.36 + (variant === 0 ? 0.02 : 0));
      porch.castShadow = true;
      porch.receiveShadow = true;
      porch.userData.buildingId = building.id;

      const windowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), windowMat.clone());
      windowLeft.position.set(-0.18, 0.28, 0.35);
      windowLeft.userData.buildingId = building.id;
      const windowRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), windowMat.clone());
      windowRight.position.set(0.18, 0.28, 0.35);
      windowRight.userData.buildingId = building.id;

      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.12), windowMat.clone());
      sideWindow.position.set(0.35, 0.27, 0.12);
      sideWindow.userData.buildingId = building.id;

      const atticWindow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.02), windowMat.clone());
      atticWindow.position.set(0, variant === 3 ? 0.52 : 0.42, 0.33);
      atticWindow.userData.buildingId = building.id;
      atticWindow.visible = variant === 0 || variant === 3 || variant === 4;

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.2, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.82, metalness: 0.01 })
      );
      door.position.set(0, 0.15, 0.355);
      door.userData.buildingId = building.id;

      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, variant === 2 ? 0.14 : 0.22, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x7f6659, roughness: 0.88, metalness: 0.01 })
      );
      chimney.position.set(0.19, variant === 2 ? 0.66 : 0.78, -0.14);
      chimney.castShadow = true;
      chimney.receiveShadow = true;
      chimney.userData.buildingId = building.id;
      chimney.visible = variant !== 4;

      const roofStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.86),
        new THREE.MeshStandardMaterial({ color: 0xb0825a, roughness: 0.9, metalness: 0.01 })
      );
      roofStrip.position.set(0, 0.63, 0);
      roofStrip.rotation.y = variant === 1 ? Math.PI / 4 : 0;
      roofStrip.castShadow = true;
      roofStrip.receiveShadow = true;
      roofStrip.userData.buildingId = building.id;
      roofStrip.visible = variant !== 4;

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.055, 0.09, 10),
        new THREE.MeshStandardMaterial({ color: 0x6f7478, roughness: 0.76, metalness: 0.22 })
      );
      barrel.position.set(-0.28, 0.045, 0.28);
      barrel.castShadow = true;
      barrel.receiveShadow = true;
      barrel.userData.buildingId = building.id;

      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.08, 0.11),
        new THREE.MeshStandardMaterial({ color: 0x9a6a3e, roughness: 0.86, metalness: 0.01 })
      );
      crate.position.set(0.27, 0.04, 0.26);
      crate.castShadow = true;
      crate.receiveShadow = true;
      crate.userData.buildingId = building.id;

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.03, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xbe7f4d, roughness: 0.8, metalness: 0.01 })
      );
      awning.position.set(0, 0.29, 0.39);
      awning.castShadow = true;
      awning.receiveShadow = true;
      awning.userData.buildingId = building.id;
      awning.visible = variant === 0 || variant === 3 || variant === 4;

      const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.1), trimMat.clone());
      step.position.set(0, 0.025, 0.43);
      step.castShadow = true;
      step.receiveShadow = true;
      step.userData.buildingId = building.id;

      const sideWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.24),
        wallMat.clone()
      );
      sideWing.position.set(0.29, 0.14, -0.08);
      sideWing.castShadow = true;
      sideWing.receiveShadow = true;
      sideWing.userData.buildingId = building.id;
      sideWing.visible = variant === 2 || variant === 4;

      const fence = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xa97b53, roughness: 0.9, metalness: 0.01 })
      );
      fence.position.set(0, 0.08, -0.4);
      fence.userData.buildingId = building.id;
      fence.visible = variant === 1 || variant === 4;

      const flowerBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.05, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xc45e5d, roughness: 0.82, metalness: 0.01 })
      );
      flowerBox.position.set(-0.19, 0.16, 0.37);
      flowerBox.userData.buildingId = building.id;
      flowerBox.visible = variant !== 2;

      const porchPostLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), trimMat.clone());
      porchPostLeft.position.set(-0.11, 0.14, 0.4);
      porchPostLeft.userData.buildingId = building.id;
      porchPostLeft.visible = variant === 0 || variant === 3 || variant === 4;

      const porchPostRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.03), trimMat.clone());
      porchPostRight.position.set(0.11, 0.14, 0.4);
      porchPostRight.userData.buildingId = building.id;
      porchPostRight.visible = variant === 0 || variant === 3 || variant === 4;

      const yardTreeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.03, 0.16, 8),
        new THREE.MeshStandardMaterial({ color: 0x876547, roughness: 0.9, metalness: 0.01 })
      );
      yardTreeTrunk.position.set(-0.32, 0.11, -0.24);
      yardTreeTrunk.castShadow = true;
      yardTreeTrunk.receiveShadow = true;
      yardTreeTrunk.userData.buildingId = building.id;
      yardTreeTrunk.visible = variant === 1 || variant === 3;

      const yardTreeTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.26, 10),
        new THREE.MeshStandardMaterial({ color: variant === 3 ? 0x6f9d68 : 0x5f875b, roughness: 0.88, metalness: 0.01 })
      );
      yardTreeTop.position.set(-0.32, 0.31, -0.24);
      yardTreeTop.castShadow = true;
      yardTreeTop.receiveShadow = true;
      yardTreeTop.userData.buildingId = building.id;
      yardTreeTop.visible = variant === 1 || variant === 3;

      const bikeShed = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.12, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x7d6a56, roughness: 0.86, metalness: 0.02 })
      );
      bikeShed.position.set(0.28, 0.07, -0.26);
      bikeShed.castShadow = true;
      bikeShed.receiveShadow = true;
      bikeShed.userData.buildingId = building.id;
      bikeShed.visible = variant === 2 || variant === 4;

      const smokePuffs = Array.from({ length: 3 }, (_, index) => {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 10, 10),
          new THREE.MeshStandardMaterial({
            color: 0xe8edf1,
            roughness: 1,
            metalness: 0,
            transparent: true,
            opacity: 0.12
          })
        );
        puff.position.set(0.18, 0.9 + index * 0.05, -0.14);
        puff.userData.buildingId = building.id;
        puff.visible = variant !== 4;
        return puff;
      });

      group.add(lot);
      group.add(path);
      group.add(hedgeLeft);
      group.add(planterRight);
      group.add(base);
      group.add(roof);
      group.add(roofStrip);
      group.add(sideWing);
      group.add(fence);
      group.add(porch);
      group.add(windowLeft);
      group.add(windowRight);
      group.add(sideWindow);
      group.add(atticWindow);
      group.add(flowerBox);
      group.add(door);
      group.add(chimney);
      group.add(barrel);
      group.add(crate);
      group.add(awning);
      group.add(step);
      group.add(porchPostLeft);
      group.add(porchPostRight);
      group.add(yardTreeTrunk);
      group.add(yardTreeTop);
      group.add(bikeShed);
      smokePuffs.forEach((puff) => group.add(puff));

      const houseCard = this.createFacadeCard(building.type, building.id, variant);
      houseCard.position.set(0, 0.29, 0.38);
      group.add(houseCard);

      this.selectableMeshes.set(building.id, [
        lot,
        path,
        base,
        roof,
        roofStrip,
        sideWing,
        porch,
        windowLeft,
        windowRight,
        sideWindow,
        atticWindow,
        door,
        chimney,
        barrel,
        crate,
        awning,
        step,
        fence,
        flowerBox,
        porchPostLeft,
        porchPostRight,
        yardTreeTrunk,
        yardTreeTop,
        bikeShed,
        houseCard,
        ...smokePuffs
      ]);
      this.houseAnimations.set(building.id, {
        windows: [windowLeft, windowRight, sideWindow, atticWindow].filter((mesh) => mesh.visible),
        smoke: smokePuffs.filter((mesh) => mesh.visible),
        baseY: 0,
        wobble: variant * 0.8 + building.id * 0.11
      });
      return group;
    }

    if (
      building.type === 'shop' ||
      building.type === 'restaurant' ||
      building.type === 'groceryStore' ||
      building.type === 'cornerStore' ||
      building.type === 'bank'
    ) {
      const group = new THREE.Group();
      const isShop = building.type === 'shop';
      const isRestaurant = building.type === 'restaurant';
      const isGrocery = building.type === 'groceryStore';
      const isCornerStore = building.type === 'cornerStore';
      const isBank = building.type === 'bank';
      const paintMat = new THREE.MeshStandardMaterial({
        color: 0xf4f7fa,
        roughness: 0.55,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.04
      });
      const wallMat = new THREE.MeshStandardMaterial({
        color: isRestaurant ? 0xe6ccb0 : isGrocery ? 0xdbe4cc : isCornerStore ? 0xe1d5be : isBank ? 0xd8dbe2 : 0xd6d5c8,
        roughness: 0.78,
        metalness: 0.02
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: isRestaurant ? 0x93453b : isGrocery ? 0x55754f : isCornerStore ? 0x7e5f43 : isBank ? 0x546377 : 0x5b636b,
        roughness: 0.8,
        metalness: 0.02
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: isRestaurant ? 0xf4b05f : isGrocery ? 0x8fd18a : isCornerStore ? 0xf1b476 : isBank ? 0xbfd6f7 : 0x76a6cf,
        roughness: 0.72,
        metalness: 0.03
      });

      const lot = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.05, 0.92),
        new THREE.MeshStandardMaterial({ color: 0xd9d1bc, roughness: 0.94, metalness: 0.01 })
      );
      lot.position.y = 0.025;
      lot.receiveShadow = true;
      lot.userData.buildingId = building.id;

      const frontage = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.015, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xc8b694, roughness: 0.9, metalness: 0.01 })
      );
      frontage.position.set(0, 0.055, 0.36);
      frontage.userData.buildingId = building.id;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          isBank ? 0.88 : isCornerStore ? 0.72 : 0.9,
          isShop ? 0.62 : isRestaurant ? 0.46 : isCornerStore ? 0.42 : isBank ? 0.5 : 0.48,
          isCornerStore ? 0.68 : 0.78
        ),
        wallMat
      );
      body.position.y = isShop ? 0.31 : isCornerStore ? 0.21 : 0.24;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.buildingId = building.id;

      const roof =
        isRestaurant
          ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roofMat)
          : isBank
            ? new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.84), roofMat)
            : isCornerStore
              ? new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.74), roofMat)
              : isShop
                ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roofMat)
                : new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.84), roofMat);
      roof.position.y = isShop ? 0.67 : isCornerStore ? 0.47 : 0.56;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(isCornerStore ? 0.62 : isBank ? 0.46 : 0.74, 0.04, 0.18),
        accentMat
      );
      awning.position.set(0, isShop ? 0.3 : isCornerStore ? 0.28 : 0.38, 0.44);
      awning.castShadow = true;
      awning.receiveShadow = true;
      awning.userData.buildingId = building.id;
      awning.visible = !isBank;

      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.44 : isGrocery ? 0.58 : isCornerStore ? 0.36 : isRestaurant ? 0.5 : 0.62, 0.12, 0.04),
        new THREE.MeshStandardMaterial({
          color: isRestaurant ? 0xfbbf24 : isGrocery ? 0x9ae6b4 : isCornerStore ? 0xfbbf24 : isBank ? 0xd8ecff : 0x7dd3fc,
          roughness: 0.5,
          metalness: 0.1,
          emissive: isRestaurant ? 0x7c2d12 : isGrocery ? 0x14532d : isCornerStore ? 0x7c2d12 : 0x0c4a6e,
          emissiveIntensity: 0.2
        })
      );
      sign.position.set(0, isShop ? 0.6 : isCornerStore ? 0.42 : 0.54, 0.42);
      sign.userData.buildingId = building.id;

      const windowL = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.16 : isCornerStore ? 0.14 : 0.24, isShop ? 0.14 : 0.18, 0.02),
        new THREE.MeshStandardMaterial({
          color: 0xfff4c4,
          roughness: 0.35,
          metalness: 0.08,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.18
        })
      );
      windowL.position.set(isCornerStore ? -0.14 : -0.22, isShop ? 0.27 : 0.28, 0.4);
      windowL.userData.buildingId = building.id;
      const windowR = windowL.clone();
      windowR.position.set(isCornerStore ? 0.14 : 0.22, isShop ? 0.27 : 0.28, 0.4);
      windowR.userData.buildingId = building.id;

      const upperWindows = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.12, 0.02),
        new THREE.MeshStandardMaterial({
          color: 0xfff4c4,
          roughness: 0.35,
          metalness: 0.08,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.12
        })
      );
      upperWindows.position.set(0, 0.47, 0.4);
      upperWindows.userData.buildingId = building.id;
      upperWindows.visible = isShop;

      const pediment = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.08, 3),
        roofMat.clone()
      );
      pediment.position.set(0, 0.68, 0.02);
      pediment.rotation.z = Math.PI;
      pediment.userData.buildingId = building.id;
      pediment.visible = isBank;

      const columnLeft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.34, 10),
        new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.7, metalness: 0.02 })
      );
      columnLeft.position.set(-0.18, 0.18, 0.35);
      columnLeft.userData.buildingId = building.id;
      columnLeft.visible = isBank;

      const columnRight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.34, 10),
        new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.7, metalness: 0.02 })
      );
      columnRight.position.set(0.18, 0.18, 0.35);
      columnRight.userData.buildingId = building.id;
      columnRight.visible = isBank;

      const sideAnnex = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.24, 0.22),
        wallMat.clone()
      );
      sideAnnex.position.set(0.3, 0.12, -0.12);
      sideAnnex.castShadow = true;
      sideAnnex.receiveShadow = true;
      sideAnnex.userData.buildingId = building.id;
      sideAnnex.visible = isGrocery || isRestaurant;

      const roofUnit = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.08, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x8a97a4, roughness: 0.68, metalness: 0.12 })
      );
      roofUnit.position.set(0.18, isShop ? 0.75 : 0.62, -0.08);
      roofUnit.userData.buildingId = building.id;
      roofUnit.visible = !isCornerStore;

      const burgerIcon = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0xf6c453, roughness: 0.72, metalness: 0.01 })
      );
      burgerIcon.position.set(0, 0.74, 0.04);
      burgerIcon.scale.set(1.3, 0.55, 1.1);
      burgerIcon.userData.buildingId = building.id;
      burgerIcon.visible = isRestaurant;

      const burgerPatty = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.05, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x7a3f21, roughness: 0.84, metalness: 0.01 })
      );
      burgerPatty.position.set(0, 0.7, 0.04);
      burgerPatty.userData.buildingId = building.id;
      burgerPatty.visible = isRestaurant;

      const cafeTable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10),
        new THREE.MeshStandardMaterial({ color: isRestaurant ? 0x835d3d : 0x8b8f95, roughness: 0.78, metalness: 0.08 })
      );
      cafeTable.position.set(-0.2, 0.095, 0.24);
      cafeTable.userData.buildingId = building.id;
      cafeTable.visible = isRestaurant;

      const cafeStool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.06, 10),
        new THREE.MeshStandardMaterial({ color: 0x78563a, roughness: 0.8, metalness: 0.04 })
      );
      cafeStool.position.set(-0.1, 0.07, 0.22);
      cafeStool.userData.buildingId = building.id;
      cafeStool.visible = isRestaurant;

      const displayRack = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xa57046, roughness: 0.84, metalness: 0.02 })
      );
      displayRack.position.set(0.22, 0.09, 0.24);
      displayRack.userData.buildingId = building.id;
      displayRack.visible = !isRestaurant && !isBank;

      const crateStack = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.14, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.84, metalness: 0.01 })
      );
      crateStack.position.set(-0.22, 0.08, 0.24);
      crateStack.userData.buildingId = building.id;
      crateStack.visible = isGrocery || isCornerStore;

      const atm = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.18, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x75869a, roughness: 0.6, metalness: 0.2 })
      );
      atm.position.set(0.25, 0.1, 0.25);
      atm.userData.buildingId = building.id;
      atm.visible = isBank;

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.22, 0.03),
        new THREE.MeshStandardMaterial({ color: isBank ? 0x56657a : 0x7c5f44, roughness: 0.7, metalness: 0.08 })
      );
      door.position.set(0, 0.15, 0.4);
      door.userData.buildingId = building.id;

      const planter = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8c6547, roughness: 0.85, metalness: 0.01 })
      );
      planter.position.set(-0.3, 0.05, 0.26);
      planter.userData.buildingId = building.id;

      const planterTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 10, 10),
        new THREE.MeshStandardMaterial({ color: isBank ? 0x6f9cb8 : 0x5f915e, roughness: 0.9, metalness: 0.01 })
      );
      planterTop.position.set(-0.3, 0.13, 0.26);
      planterTop.userData.buildingId = building.id;

      const bladeSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.24, 0.14),
        accentMat.clone()
      );
      bladeSign.position.set(0.39, 0.42, 0.18);
      bladeSign.userData.buildingId = building.id;
      bladeSign.visible = isCornerStore || isGrocery;

      const parkingPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.01, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xcfc5b5, roughness: 0.92, metalness: 0.01 })
      );
      parkingPad.position.set(0, 0.055, -0.28);
      parkingPad.userData.buildingId = building.id;
      parkingPad.visible = isShop || isBank;

      const parkingStripeA = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.004, 0.18),
        paintMat.clone()
      );
      parkingStripeA.position.set(-0.12, 0.062, -0.28);
      parkingStripeA.userData.buildingId = building.id;
      parkingStripeA.visible = isShop || isBank;

      const parkingStripeB = new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.004, 0.18),
        paintMat.clone()
      );
      parkingStripeB.position.set(0.12, 0.062, -0.28);
      parkingStripeB.userData.buildingId = building.id;
      parkingStripeB.visible = isShop || isBank;

      const parkedCar =
        isShop || isBank
          ? this.createParkedCar(
              isBank ? 0x3f5f8d : 0x7d6a52,
              0,
              0.07,
              -0.29,
              0,
              building.id,
              isBank ? 1.02 : 0.94
            )
          : null;

      const marketCanopy = this.createAwningStall(
        isGrocery ? 0x7eb06f : 0xd79a54,
        -0.26,
        0.07,
        -0.2,
        building.id
      );
      marketCanopy.visible = isGrocery || isCornerStore;

      const sandwichBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xf1e1bd, roughness: 0.72, metalness: 0.01 })
      );
      sandwichBoard.position.set(0.18, 0.08, 0.22);
      sandwichBoard.rotation.x = -0.18;
      sandwichBoard.userData.buildingId = building.id;
      sandwichBoard.visible = isRestaurant;

      group.add(lot);
      group.add(frontage);
      group.add(body);
      group.add(roof);
      group.add(awning);
      group.add(sign);
      group.add(windowL);
      group.add(windowR);
      group.add(cafeTable);
      group.add(cafeStool);
      group.add(displayRack);
      group.add(crateStack);
      group.add(atm);
      group.add(door);
      group.add(planter);
      group.add(planterTop);
      group.add(bladeSign);
      group.add(upperWindows);
      group.add(pediment);
      group.add(columnLeft);
      group.add(columnRight);
      group.add(sideAnnex);
      group.add(roofUnit);
      group.add(burgerIcon);
      group.add(burgerPatty);
      group.add(parkingPad);
      group.add(parkingStripeA);
      group.add(parkingStripeB);
      if (parkedCar) group.add(parkedCar);
      group.add(marketCanopy);
      group.add(sandwichBoard);
      const facadeCard = this.createFacadeCard(building.type, building.id, building.id);
      facadeCard.position.set(0, isShop ? 0.34 : isCornerStore ? 0.24 : 0.3, 0.42);
      group.add(facadeCard);
      this.selectableMeshes.set(building.id, [
        lot,
        frontage,
        body,
        roof,
        awning,
        sign,
        windowL,
        windowR,
        cafeTable,
        cafeStool,
        displayRack,
        crateStack,
        atm,
        door,
        planter,
        planterTop,
        bladeSign,
        upperWindows,
        pediment,
        columnLeft,
        columnRight,
        sideAnnex,
        roofUnit,
        burgerIcon,
        burgerPatty,
        parkingPad,
        parkingStripeA,
        parkingStripeB,
        ...(parkedCar ? this.collectMeshes(parkedCar) : []),
        ...this.collectMeshes(marketCanopy),
        sandwichBoard,
        facadeCard
      ]);
      return group;
    }

    if (building.type === 'park') {
      const group = new THREE.Group();
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.06, 0.92),
        new THREE.MeshStandardMaterial({ color: 0x6ba367, roughness: 0.95, metalness: 0.01 })
      );
      lawn.position.y = 0.03;
      lawn.castShadow = false;
      lawn.receiveShadow = true;
      lawn.userData.buildingId = building.id;

      const path = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.02, 0.72),
        new THREE.MeshStandardMaterial({ color: 0xcfbc99, roughness: 0.9, metalness: 0.01 })
      );
      path.position.y = 0.055;
      path.userData.buildingId = building.id;

      const treeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0x8d6947, roughness: 0.9, metalness: 0.01 })
      );
      treeTrunk.position.set(-0.22, 0.14, -0.17);
      treeTrunk.castShadow = true;
      treeTrunk.receiveShadow = true;
      treeTrunk.userData.buildingId = building.id;

      const treeTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.13, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: 0x4f8758, roughness: 0.86, metalness: 0.01 })
      );
      treeTop.position.set(-0.22, 0.34, -0.17);
      treeTop.castShadow = true;
      treeTop.receiveShadow = true;
      treeTop.userData.buildingId = building.id;

      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.05, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x956842, roughness: 0.82, metalness: 0.01 })
      );
      bench.position.set(0.18, 0.08, 0.16);
      bench.castShadow = true;
      bench.receiveShadow = true;
      bench.userData.buildingId = building.id;

      group.add(lawn);
      group.add(path);
      group.add(treeTrunk);
      group.add(treeTop);
      group.add(bench);
      this.selectableMeshes.set(building.id, [lawn, path, treeTrunk, treeTop, bench]);
      return group;
    }

    if (building.type === 'workshop') {
      const group = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x9d947f, roughness: 0.82, metalness: 0.04 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x6a727e, roughness: 0.76, metalness: 0.12 });
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6c7782, roughness: 0.72, metalness: 0.16 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.58, 0.86), wallMat);
      body.position.y = 0.29;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.buildingId = building.id;

      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.92), roofMat);
      roof.position.y = 0.63;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10), pipeMat);
      vent.position.set(0.24, 0.83, -0.12);
      vent.castShadow = true;
      vent.receiveShadow = true;
      vent.userData.buildingId = building.id;

      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.12, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x8e6238, roughness: 0.86, metalness: 0.01 })
      );
      crate.position.set(-0.27, 0.06, 0.28);
      crate.castShadow = true;
      crate.receiveShadow = true;
      crate.userData.buildingId = building.id;

      group.add(body);
      group.add(roof);
      group.add(vent);
      group.add(crate);
      this.selectableMeshes.set(building.id, [body, roof, vent, crate]);
      return group;
    }

    if (
      building.type === 'hospital' ||
      building.type === 'policeStation' ||
      building.type === 'fireStation'
    ) {
      const group = new THREE.Group();
      const isHospital = building.type === 'hospital';
      const isPolice = building.type === 'policeStation';
      const lot = new THREE.Mesh(
        new THREE.BoxGeometry(isHospital ? 1.92 : 0.98, 0.05, isHospital ? 1.92 : 0.98),
        new THREE.MeshStandardMaterial({ color: isHospital ? 0xd8ddd8 : isPolice ? 0xd3d9e2 : 0xdbcfca, roughness: 0.95, metalness: 0.01 })
      );
      lot.position.y = 0.025;
      lot.receiveShadow = true;
      lot.userData.buildingId = building.id;

      if (isHospital) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xecf1f5, roughness: 0.72, metalness: 0.03 });
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xd9e3ec, roughness: 0.74, metalness: 0.03 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x9ab0c4, roughness: 0.8, metalness: 0.04 });
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0xcbe8f8,
          roughness: 0.25,
          metalness: 0.08,
          transparent: true,
          opacity: 0.92,
          emissive: 0x7dd3fc,
          emissiveIntensity: 0.08
        });

        const driveway = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.015, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xc7baa8, roughness: 0.9, metalness: 0.01 })
        );
        driveway.position.set(0, 0.055, 0.72);
        driveway.userData.buildingId = building.id;

        const mainWing = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.62, 0.86), wallMat);
        mainWing.position.set(0, 0.31, -0.12);
        mainWing.castShadow = true;
        mainWing.receiveShadow = true;
        mainWing.userData.buildingId = building.id;

        const eastWing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.52, 0.7), wingMat);
        eastWing.position.set(0.58, 0.26, 0.42);
        eastWing.castShadow = true;
        eastWing.receiveShadow = true;
        eastWing.userData.buildingId = building.id;

        const westWing = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.42, 0.68), wingMat.clone());
        westWing.position.set(-0.58, 0.21, 0.4);
        westWing.castShadow = true;
        westWing.receiveShadow = true;
        westWing.userData.buildingId = building.id;

        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.94), roofMat);
        roof.position.set(0, 0.66, -0.12);
        roof.castShadow = true;
        roof.receiveShadow = true;
        roof.userData.buildingId = building.id;

        const atrium = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.24), glassMat);
        atrium.position.set(0, 0.19, 0.53);
        atrium.castShadow = true;
        atrium.receiveShadow = true;
        atrium.userData.buildingId = building.id;

        const helipad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.32, 0.03, 24),
          new THREE.MeshStandardMaterial({ color: 0xa3b4c3, roughness: 0.88, metalness: 0.04 })
        );
        helipad.position.set(0.5, 0.71, -0.18);
        helipad.userData.buildingId = building.id;

        const helipadMarkA = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.01, 0.04),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.02 })
        );
        helipadMarkA.position.set(0.5, 0.73, -0.18);
        helipadMarkA.userData.buildingId = building.id;

        const helipadMarkB = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.01, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.02 })
        );
        helipadMarkB.position.set(0.5, 0.73, -0.18);
        helipadMarkB.userData.buildingId = building.id;

        const redCross = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.22, 0.03),
          new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.08,
            emissive: 0xdc2626,
            emissiveIntensity: 0.2
          })
        );
        redCross.position.set(0, 0.42, 0.83);
        redCross.userData.buildingId = building.id;

        const ambulanceCanopy = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.05, 0.26),
          new THREE.MeshStandardMaterial({ color: 0xc94949, roughness: 0.72, metalness: 0.05 })
        );
        ambulanceCanopy.position.set(-0.48, 0.34, 0.76);
        ambulanceCanopy.castShadow = true;
        ambulanceCanopy.receiveShadow = true;
        ambulanceCanopy.userData.buildingId = building.id;

        const ambulance = this.createParkedCar(0xf3f4f6, -0.52, 0.08, 0.84, Math.PI / 2, building.id, 1.08);
        const medStripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.02, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.66, metalness: 0.02 })
        );
        medStripe.position.set(0, 0.14, 0.06);
        medStripe.userData.buildingId = building.id;
        ambulance.add(medStripe);

        group.add(lot);
        group.add(driveway);
        group.add(mainWing);
        group.add(eastWing);
        group.add(westWing);
        group.add(roof);
        group.add(atrium);
        group.add(helipad);
        group.add(helipadMarkA);
        group.add(helipadMarkB);
        group.add(redCross);
        group.add(ambulanceCanopy);
        group.add(ambulance);
        const hospitalCard = this.createFacadeCard(building.type, building.id, building.id);
        hospitalCard.position.set(0, 0.34, 0.84);
        group.add(hospitalCard);
        this.selectableMeshes.set(building.id, [
          lot,
          driveway,
          mainWing,
          eastWing,
          westWing,
          roof,
          atrium,
          helipad,
          helipadMarkA,
          helipadMarkB,
          redCross,
          ambulanceCanopy,
          ...this.collectMeshes(ambulance),
          hospitalCard
        ]);
        return group;
      }

      if (isPolice) {
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xdfe7f0, roughness: 0.74, metalness: 0.03 });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x4b5f79, roughness: 0.8, metalness: 0.05 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xa8b9cb, roughness: 0.82, metalness: 0.02 });

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.5, 0.7), wallMat);
        body.position.y = 0.25;
        body.castShadow = true;
        body.receiveShadow = true;
        body.userData.buildingId = building.id;

        const roof = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.78), roofMat);
        roof.position.y = 0.56;
        roof.castShadow = true;
        roof.receiveShadow = true;
        roof.userData.buildingId = building.id;

        const portico = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.22), trimMat);
        portico.position.set(0, 0.12, 0.34);
        portico.castShadow = true;
        portico.receiveShadow = true;
        portico.userData.buildingId = building.id;

        const steps = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.05, 0.16),
          new THREE.MeshStandardMaterial({ color: 0xcbbba5, roughness: 0.9, metalness: 0.01 })
        );
        steps.position.set(0, 0.03, 0.45);
        steps.userData.buildingId = building.id;

        const badge = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.09, 0.03, 6),
          new THREE.MeshStandardMaterial({
            color: 0xdbeafe,
            roughness: 0.42,
            metalness: 0.08,
            emissive: 0x2563eb,
            emissiveIntensity: 0.16
          })
        );
        badge.position.set(0, 0.38, 0.37);
        badge.rotation.x = Math.PI / 2;
        badge.userData.buildingId = building.id;

        const lightBar = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.05, 0.08),
          new THREE.MeshStandardMaterial({
            color: 0xdbeafe,
            roughness: 0.4,
            metalness: 0.1,
            emissive: 0x2563eb,
            emissiveIntensity: 0.24
          })
        );
        lightBar.position.set(0.24, 0.1, 0.26);
        lightBar.userData.buildingId = building.id;

        group.add(lot);
        group.add(body);
        group.add(roof);
        group.add(portico);
        group.add(steps);
        group.add(badge);
        group.add(lightBar);
        const policeCard = this.createFacadeCard(building.type, building.id, building.id);
        policeCard.position.set(0, 0.29, 0.38);
        group.add(policeCard);
        this.selectableMeshes.set(building.id, [lot, body, roof, portico, steps, badge, lightBar, policeCard]);
        return group;
      }

      const wallMat = new THREE.MeshStandardMaterial({ color: 0xe4c5bb, roughness: 0.75, metalness: 0.03 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xaf473f, roughness: 0.78, metalness: 0.04 });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x7d2020, roughness: 0.74, metalness: 0.05 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.68), wallMat);
      body.position.y = 0.21;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.buildingId = building.id;

      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.08, 0.76), roofMat);
      roof.position.y = 0.47;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const bayLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.03), doorMat);
      bayLeft.position.set(-0.16, 0.15, 0.35);
      bayLeft.userData.buildingId = building.id;

      const bayRight = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.03), doorMat.clone());
      bayRight.position.set(0.16, 0.15, 0.35);
      bayRight.userData.buildingId = building.id;

      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.62, 0.18), wallMat.clone());
      tower.position.set(0.34, 0.31, -0.08);
      tower.castShadow = true;
      tower.receiveShadow = true;
      tower.userData.buildingId = building.id;

      const siren = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12),
        new THREE.MeshStandardMaterial({
          color: 0xfecaca,
          roughness: 0.4,
          metalness: 0.08,
          emissive: 0xdc2626,
          emissiveIntensity: 0.22
        })
      );
      siren.position.set(0.34, 0.65, -0.08);
      siren.userData.buildingId = building.id;

      group.add(lot);
      group.add(body);
      group.add(roof);
      group.add(bayLeft);
      group.add(bayRight);
      group.add(tower);
      group.add(siren);
      const fireCard = this.createFacadeCard(building.type, building.id, building.id);
      fireCard.position.set(0, 0.27, 0.38);
      group.add(fireCard);
      this.selectableMeshes.set(building.id, [lot, body, roof, bayLeft, bayRight, tower, siren, fireCard]);
      return group;
    }

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x95a7b8, roughness: 0.72, metalness: 0.08 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x7f8a93, roughness: 0.74, metalness: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xd8e0e6, roughness: 0.62, metalness: 0.18 });

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.06, 1.95),
      new THREE.MeshStandardMaterial({ color: 0xb8c1cb, roughness: 0.92, metalness: 0.03 })
    );
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    pad.userData.buildingId = building.id;

    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.6, 0.88), bodyMat);
    hall.position.set(-0.35, 0.3, 0.12);
    hall.castShadow = true;
    hall.receiveShadow = true;
    hall.userData.buildingId = building.id;

    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.96), accentMat);
    hallRoof.position.set(-0.35, 0.64, 0.12);
    hallRoof.castShadow = true;
    hallRoof.receiveShadow = true;
    hallRoof.userData.buildingId = building.id;

    const transformer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.34), accentMat.clone());
    transformer.position.set(-0.72, 0.14, -0.48);
    transformer.castShadow = true;
    transformer.receiveShadow = true;
    transformer.userData.buildingId = building.id;

    const coolingTowerA = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.02, 18), pipeMat);
    coolingTowerA.position.set(0.54, 0.54, -0.22);
    coolingTowerA.castShadow = true;
    coolingTowerA.receiveShadow = true;
    coolingTowerA.userData.buildingId = building.id;

    const coolingTowerB = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.12, 18), pipeMat.clone());
    coolingTowerB.position.set(0.86, 0.6, 0.22);
    coolingTowerB.castShadow = true;
    coolingTowerB.receiveShadow = true;
    coolingTowerB.userData.buildingId = building.id;

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.18, 16), pipeMat.clone());
    stack.position.set(0.1, 0.71, -0.58);
    stack.castShadow = true;
    stack.receiveShadow = true;
    stack.userData.buildingId = building.id;

    const substation = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.2, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xa9b3bc, roughness: 0.8, metalness: 0.14 })
    );
    substation.position.set(0.16, 0.12, 0.62);
    substation.castShadow = true;
    substation.receiveShadow = true;
    substation.userData.buildingId = building.id;

    const powerCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.22, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0xfff1b3,
        roughness: 0.35,
        metalness: 0.08,
        emissive: 0xffb300,
        emissiveIntensity: 0.4
      })
    );
    powerCore.position.set(-0.1, 0.32, 0.58);
    powerCore.castShadow = true;
    powerCore.receiveShadow = true;
    powerCore.userData.buildingId = building.id;

    const fence = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.14, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x69727d, roughness: 0.76, metalness: 0.16 })
    );
    fence.position.set(0, 0.1, 0.94);
    fence.userData.buildingId = building.id;

    const utilityTruck = this.createParkedCar(0xd99b43, -0.66, 0.08, 0.72, Math.PI / 2, building.id, 1.1);
    const yardContainer = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7b8792, roughness: 0.8, metalness: 0.14 })
    );
    yardContainer.position.set(-0.7, 0.12, -0.68);
    yardContainer.castShadow = true;
    yardContainer.receiveShadow = true;
    yardContainer.userData.buildingId = building.id;

    group.add(pad);
    group.add(hall);
    group.add(hallRoof);
    group.add(transformer);
    group.add(coolingTowerA);
    group.add(coolingTowerB);
    group.add(stack);
    group.add(substation);
    group.add(powerCore);
    group.add(fence);
    group.add(utilityTruck);
    group.add(yardContainer);
    const powerCard = this.createFacadeCard(building.type, building.id, building.id);
    powerCard.position.set(-0.28, 0.34, 0.62);
    group.add(powerCard);
    this.selectableMeshes.set(building.id, [
      pad,
      hall,
      hallRoof,
      transformer,
      coolingTowerA,
      coolingTowerB,
      stack,
      substation,
      powerCore,
      fence,
      ...this.collectMeshes(utilityTruck),
      yardContainer,
      powerCard
    ]);
    return group;
  }

  private geometryForType(type: BuildType): THREE.BufferGeometry {
    if (type === 'road') return new THREE.BoxGeometry(0.92, 0.06, 0.92);
    if (type === 'house') return new THREE.BoxGeometry(0.72, 0.88, 0.72);
    if (
      type === 'shop' ||
      type === 'restaurant' ||
      type === 'groceryStore' ||
      type === 'cornerStore' ||
      type === 'bank'
    ) {
      return new THREE.BoxGeometry(0.95, 0.75, 0.8);
    }
    if (type === 'park') return new THREE.BoxGeometry(0.92, 0.36, 0.92);
    if (type === 'workshop') return new THREE.BoxGeometry(1.05, 0.95, 0.86);
    if (type === 'hospital') return new THREE.BoxGeometry(1.92, 0.95, 1.92);
    if (type === 'policeStation' || type === 'fireStation') return new THREE.BoxGeometry(0.98, 0.9, 0.98);
    return new THREE.BoxGeometry(1.92, 1.5, 1.92);
  }

  private baseHeightForType(type: BuildType): number {
    if (type === 'road') return 0.03;
    if (type === 'house') return 0.44;
    if (
      type === 'shop' ||
      type === 'restaurant' ||
      type === 'groceryStore' ||
      type === 'cornerStore' ||
      type === 'bank'
    ) {
      return 0.38;
    }
    if (type === 'park') return 0.18;
    if (type === 'workshop') return 0.48;
    if (type === 'hospital') return 0.48;
    if (type === 'policeStation' || type === 'fireStation') return 0.44;
    return 0.76;
  }

  private collectMeshes(object: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    return meshes;
  }

  private createFacadeCard(type: BuildType, buildingId: number, variant = 0): THREE.Mesh {
    const options = getAssetCardOptions(type, variant);
    if (!options) {
      const fallback = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.78, metalness: 0.02 })
      );
      fallback.userData.buildingId = buildingId;
      return fallback;
    }

    const canvas = document.createElement('canvas');
    if (!paintAssetCard(canvas, options)) {
      const fallback = new THREE.Mesh(
        new THREE.PlaneGeometry(options.width, options.height),
        new THREE.MeshStandardMaterial({ color: options.palette.body, roughness: 0.78, metalness: 0.02 })
      );
      fallback.userData.buildingId = buildingId;
      return fallback;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    texture.needsUpdate = true;

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.74,
      metalness: 0.02
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(options.width, options.height), material);
    mesh.userData.buildingId = buildingId;
    return mesh;
  }

  private createParkedCar(
    color: number,
    x: number,
    y: number,
    z: number,
    rotationY: number,
    buildingId: number,
    scale = 1
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;
    group.scale.setScalar(scale);

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.08 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xbdd9ea,
      roughness: 0.3,
      metalness: 0.08,
      emissive: 0x0f172a,
      emissiveIntensity: 0.04
    });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.86, metalness: 0.08 });

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.14), bodyMat);
    base.position.y = 0.05;
    base.castShadow = true;
    base.receiveShadow = true;
    base.userData.buildingId = buildingId;

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.12), glassMat);
    cabin.position.set(0.01, 0.11, 0);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    cabin.userData.buildingId = buildingId;

    const wheelOffsets: Array<[number, number]> = [
      [-0.08, -0.07],
      [0.08, -0.07],
      [-0.08, 0.07],
      [0.08, 0.07]
    ];
    const wheels = wheelOffsets.map(([wx, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.03, wz);
      wheel.castShadow = true;
      wheel.receiveShadow = true;
      wheel.userData.buildingId = buildingId;
      return wheel;
    });

    group.add(base);
    group.add(cabin);
    wheels.forEach((wheel) => group.add(wheel));
    return group;
  }

  private createAwningStall(
    color: number,
    x: number,
    y: number,
    z: number,
    buildingId: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x896746, roughness: 0.84, metalness: 0.02 });
    const canopyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x9f7448, roughness: 0.84, metalness: 0.01 });

    const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.16), canopyMat);
    top.position.y = 0.18;
    top.castShadow = true;
    top.receiveShadow = true;
    top.userData.buildingId = buildingId;

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.12), crateMat);
    crate.position.y = 0.04;
    crate.castShadow = true;
    crate.receiveShadow = true;
    crate.userData.buildingId = buildingId;

    const postOffsets: Array<[number, number]> = [
      [-0.08, -0.05],
      [0.08, -0.05],
      [-0.08, 0.05],
      [0.08, 0.05]
    ];
    const posts = postOffsets.map(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), postMat);
      post.position.set(px, 0.09, pz);
      post.castShadow = true;
      post.receiveShadow = true;
      post.userData.buildingId = buildingId;
      return post;
    });

    group.add(crate);
    posts.forEach((post) => group.add(post));
    group.add(top);
    return group;
  }

  private gridToWorld(x: number, z: number, gridSize: number): { x: number; z: number } {
    const half = (gridSize - 1) * 0.5;
    return {
      x: x - half,
      z: z - half
    };
  }

  private clampCameraTarget(): void {
    const state = gameStore.getState();
    const half = (state.gridSize - 1) * 0.5;
    const margin = 2.5;
    this.cameraDesired.x = THREE.MathUtils.clamp(this.cameraDesired.x, -half - margin, half + margin);
    this.cameraDesired.z = THREE.MathUtils.clamp(this.cameraDesired.z, -half - margin, half + margin);
  }

  private createGroundDecor(state: GameState): void {
    const treeTrunk = new THREE.CylinderGeometry(0.028, 0.036, 0.16, 8);
    const treeLeaf = new THREE.ConeGeometry(0.14, 0.32, 9);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6645, roughness: 0.95, metalness: 0.01 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5f9566, roughness: 0.86, metalness: 0.01 });

    for (let z = 1; z < state.gridSize - 1; z += 1) {
      for (let x = 1; x < state.gridSize - 1; x += 1) {
        const isBorder = x < 4 || z < 4 || x > state.gridSize - 5 || z > state.gridSize - 5;
        if (!isBorder) continue;

        const n = state.tiles[z * state.gridSize + x].tint;
        if (n < 0.98) continue;

        const world = this.gridToWorld(x, z, state.gridSize);
        const trunk = new THREE.Mesh(treeTrunk, trunkMat);
        trunk.position.set(world.x, 0.08, world.z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;

        const leaf = new THREE.Mesh(treeLeaf, leafMat);
        leaf.position.set(world.x, 0.28, world.z);
        leaf.castShadow = true;
        leaf.receiveShadow = true;

        this.decorRoot.add(trunk);
        this.decorRoot.add(leaf);
      }
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry) return;
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          const material = m as THREE.MeshStandardMaterial & { map?: THREE.Texture | null };
          material.map?.dispose();
          m.dispose();
        });
      } else {
        const material = mesh.material as (THREE.MeshStandardMaterial & { map?: THREE.Texture | null }) | undefined;
        material?.map?.dispose();
        material?.dispose();
      }
    });
  }
}
