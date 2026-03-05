import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { BuildType, Building, GameState } from './state';
import { gameStore } from './state';

interface RoadVisualData {
  connectors: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  stripes: Record<'ns' | 'ew', THREE.Mesh>;
  corners: Record<'ne' | 'se' | 'sw' | 'nw', THREE.Mesh>;
  intersection: THREE.Mesh;
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

  private readonly buildingRoot = new THREE.Group();
  private readonly decorRoot = new THREE.Group();

  private readonly buildingMeshes = new Map<number, THREE.Object3D>();

  private readonly selectableMeshes = new Map<number, THREE.Mesh[]>();

  private readonly roadVisuals = new Map<number, RoadVisualData>();

  private readonly buildingByCell = new Map<string, Building>();

  private frameHandle = 0;

  private lastTime = performance.now();

  private frameHook: ((dtSeconds: number) => void) | null = null;

  private readonly cameraDesired = {
    x: 0,
    z: 0,
    distance: 16
  };

  private readonly cameraCurrent = {
    x: 0,
    z: 0,
    distance: 16
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene.background = new THREE.Color(0xd2eaf8);
    this.scene.fog = new THREE.Fog(0xd2eaf8, 28, 94);

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
    directional.position.set(20, 36, 14);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 120;
    directional.shadow.camera.left = -30;
    directional.shadow.camera.right = 30;
    directional.shadow.camera.top = 30;
    directional.shadow.camera.bottom = -30;
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

        color.setRGB(0.52 * tile.tint, (0.78 + tile.elevation * 0.12) * tile.tint, 0.54 * tile.tint);
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
  }

  zoomBy(delta: number): void {
    this.cameraDesired.distance = THREE.MathUtils.clamp(this.cameraDesired.distance + delta, 9, 45);
  }

  playPlacementPulse(x: number, z: number): void {
    const state = gameStore.getState();
    const world = this.gridToWorld(x, z, state.gridSize);
    this.placementPulse.position.set(world.x, 0.035, world.z);
    const mat = this.placementPulse.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.7;
    this.placementPulse.scale.setScalar(0.45);
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

    const pulseMat = this.placementPulse.material as THREE.MeshBasicMaterial;
    if (pulseMat.opacity > 0.01) {
      this.placementPulse.scale.multiplyScalar(1 + dt * 2.4);
      pulseMat.opacity *= 0.91;
    }

    this.composer.render();
  };

  private syncFromState(state: GameState): void {
    this.syncBuildingMaps(state);
    this.syncHoverAndGhost(state);
    this.syncSelection(state);
  }

  private syncBuildingMaps(state: GameState): void {
    this.buildingByCell.clear();
    state.buildings.forEach((b) => this.buildingByCell.set(`${b.x}:${b.z}`, b));

    const seen = new Set<number>();
    for (const b of state.buildings) {
      seen.add(b.id);
      if (!this.buildingMeshes.has(b.id)) {
        const mesh = this.createBuildingObject(b);
        this.buildingMeshes.set(b.id, mesh);
        this.buildingRoot.add(mesh);
      }

      const object = this.buildingMeshes.get(b.id)!;
      const world = this.gridToWorld(b.x, b.z, state.gridSize);
      object.position.set(world.x, 0, world.z);

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
      roadData.stripes.ns.visible = north || south || (!east && !west);
      roadData.stripes.ew.visible = east || west;
      roadData.corners.ne.visible = north && east && !south && !west;
      roadData.corners.se.visible = south && east && !north && !west;
      roadData.corners.sw.visible = south && west && !north && !east;
      roadData.corners.nw.visible = north && west && !south && !east;
      const roadCount = Number(north) + Number(east) + Number(south) + Number(west);
      roadData.intersection.visible = roadCount >= 3;
    }
  }

  private findBuilding(id: number): Building | undefined {
    return gameStore.getState().buildings.find((b) => b.id === id);
  }

  private syncHoverAndGhost(state: GameState): void {
    if (state.hoverCell) {
      const world = this.gridToWorld(state.hoverCell.x, state.hoverCell.z, state.gridSize);
      this.hoverMesh.visible = true;
      this.hoverMesh.position.set(world.x, 0.03, world.z);

      if (state.placementMode) {
        this.ghostMesh.visible = true;
        this.ghostMesh.geometry = this.geometryForType(state.placementMode);
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
      const asphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x4b5662, roughness: 0.88, metalness: 0.04 });
      const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0x8da1b3, roughness: 0.92, metalness: 0.01 });

      const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.98), sidewalkMaterial);
      sidewalk.position.y = 0.03;
      sidewalk.receiveShadow = true;
      sidewalk.castShadow = false;
      sidewalk.userData.buildingId = building.id;
      group.add(sidewalk);

      const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.84), asphaltMaterial);
      base.position.y = 0.055;
      base.receiveShadow = true;
      base.castShadow = false;
      base.userData.buildingId = building.id;
      group.add(base);

      const laneStripeMat = new THREE.MeshStandardMaterial({
        color: 0xe8ecef,
        roughness: 0.6,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.15
      });
      const stripeNS = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.005, 0.52), laneStripeMat);
      stripeNS.position.set(0, 0.08, 0);
      stripeNS.userData.buildingId = building.id;
      group.add(stripeNS);

      const stripeEW = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.005, 0.08), laneStripeMat.clone());
      stripeEW.position.set(0, 0.08, 0);
      stripeEW.userData.buildingId = building.id;
      group.add(stripeEW);

      const cornerMat = asphaltMaterial.clone();
      const cornerGeom = new THREE.CylinderGeometry(0.31, 0.31, 0.043, 22, 1, false, 0, Math.PI / 2);
      const cornerSE = new THREE.Mesh(cornerGeom, cornerMat);
      const cornerSW = new THREE.Mesh(cornerGeom, cornerMat.clone());
      const cornerNW = new THREE.Mesh(cornerGeom, cornerMat.clone());
      const cornerNE = new THREE.Mesh(cornerGeom, cornerMat.clone());
      cornerSE.position.y = 0.055;
      cornerSW.position.y = 0.055;
      cornerNW.position.y = 0.055;
      cornerNE.position.y = 0.055;
      cornerSW.rotation.y = Math.PI / 2;
      cornerNW.rotation.y = Math.PI;
      cornerNE.rotation.y = Math.PI * 1.5;
      [cornerNE, cornerSE, cornerSW, cornerNW].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        part.visible = false;
        group.add(part);
      });

      const intersectionMark = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 20),
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

      const connectorGeom = new THREE.BoxGeometry(0.26, 0.042, 0.48);
      const connectorMat = asphaltMaterial;
      const n = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const e = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const s = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const w = new THREE.Mesh(connectorGeom, connectorMat.clone());

      n.position.set(0, 0.055, -0.31);
      s.position.set(0, 0.055, 0.31);
      e.position.set(0.31, 0.055, 0);
      w.position.set(-0.31, 0.055, 0);
      e.rotation.y = Math.PI / 2;
      w.rotation.y = Math.PI / 2;
      [n, e, s, w].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        group.add(part);
      });

      this.selectableMeshes.set(building.id, [
        base,
        n,
        e,
        s,
        w,
        stripeNS,
        stripeEW,
        cornerNE,
        cornerSE,
        cornerSW,
        cornerNW,
        intersectionMark
      ]);
      this.roadVisuals.set(building.id, {
        connectors: { n, e, s, w },
        stripes: { ns: stripeNS, ew: stripeEW },
        corners: { ne: cornerNE, se: cornerSE, sw: cornerSW, nw: cornerNW },
        intersection: intersectionMark
      });
      return group;
    }

    if (building.type === 'house') {
      const group = new THREE.Group();
      const variant = building.id % 4;
      const wallPalette = [0xcaa17b, 0xe1c9a9, 0xb78f63, 0xd7b58c];
      const roofPalette = [0x6d5140, 0x9b5b3e, 0x6f6f72, 0x845742];
      const trimPalette = [0xaf7d52, 0xd9bc93, 0x9b7a57, 0xc69f74];
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

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(variant === 3 ? 0.74 : 0.68, 0.46, variant === 0 ? 0.72 : 0.64),
        wallMat
      );
      base.position.y = 0.235;
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.buildingId = building.id;

      const roof =
        variant === 1
          ? new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 4), roofMat)
          : new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.11, 0.82), roofMat);
      roof.position.y = variant === 1 ? 0.62 : 0.58;
      roof.rotation.y = variant === 1 ? Math.PI / 4 : variant === 2 ? Math.PI / 15 : 0;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const porch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.2), trimMat);
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

      const roofStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.86),
        new THREE.MeshStandardMaterial({ color: 0xb0825a, roughness: 0.9, metalness: 0.01 })
      );
      roofStrip.position.set(0, 0.63, 0);
      roofStrip.rotation.y = variant === 1 ? Math.PI / 4 : 0;
      roofStrip.castShadow = true;
      roofStrip.receiveShadow = true;
      roofStrip.userData.buildingId = building.id;

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
      awning.visible = variant === 0 || variant === 3;

      const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.1), trimMat.clone());
      step.position.set(0, 0.025, 0.43);
      step.castShadow = true;
      step.receiveShadow = true;
      step.userData.buildingId = building.id;

      group.add(base);
      group.add(roof);
      group.add(roofStrip);
      group.add(porch);
      group.add(windowLeft);
      group.add(windowRight);
      group.add(sideWindow);
      group.add(door);
      group.add(chimney);
      group.add(barrel);
      group.add(crate);
      group.add(awning);
      group.add(step);

      this.selectableMeshes.set(building.id, [
        base,
        roof,
        roofStrip,
        porch,
        windowLeft,
        windowRight,
        sideWindow,
        door,
        chimney,
        barrel,
        crate,
        awning,
        step
      ]);
      return group;
    }

    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x96a6bb, roughness: 0.7, metalness: 0.1 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x6f7a89, roughness: 0.72, metalness: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xd3dbe5, roughness: 0.58, metalness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.72, 0.92), bodyMat);
    body.position.y = 0.36;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.buildingId = building.id;

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.98), accentMat);
    roof.position.set(0, 0.74, 0);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.buildingId = building.id;

    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.92, 12), pipeMat);
    chimney.position.set(0.31, 0.95, -0.24);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    chimney.userData.buildingId = building.id;

    const chimney2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.76, 12), pipeMat);
    chimney2.position.set(-0.28, 0.85, 0.18);
    chimney2.castShadow = true;
    chimney2.receiveShadow = true;
    chimney2.userData.buildingId = building.id;

    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.22), accentMat);
    vent.position.set(-0.05, 0.84, -0.18);
    vent.castShadow = true;
    vent.receiveShadow = true;
    vent.userData.buildingId = building.id;

    group.add(body);
    group.add(roof);
    group.add(chimney);
    group.add(chimney2);
    group.add(vent);
    this.selectableMeshes.set(building.id, [body, roof, chimney, chimney2, vent]);
    return group;
  }

  private geometryForType(type: BuildType): THREE.BufferGeometry {
    if (type === 'road') return new THREE.BoxGeometry(0.92, 0.06, 0.92);
    if (type === 'house') return new THREE.BoxGeometry(0.72, 0.88, 0.72);
    return new THREE.BoxGeometry(1.1, 1.3, 0.9);
  }

  private baseHeightForType(type: BuildType): number {
    if (type === 'road') return 0.03;
    if (type === 'house') return 0.44;
    return 0.66;
  }

  private gridToWorld(x: number, z: number, gridSize: number): { x: number; z: number } {
    const half = (gridSize - 1) * 0.5;
    return {
      x: x - half,
      z: z - half
    };
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
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material?.dispose();
      }
    });
  }
}
