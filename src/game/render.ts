import * as THREE from 'three';
import type { BuildType, Building, GameState } from './state';
import { gameStore } from './state';

interface RoadVisualData {
  connectors: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
}

export class GameRenderer {
  private readonly container: HTMLElement;

  private readonly scene = new THREE.Scene();

  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);

  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

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
    distance: 28
  };

  private readonly cameraCurrent = {
    x: 0,
    z: 0,
    distance: 28
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene.background = new THREE.Color(0xb9d7ec);
    this.scene.fog = new THREE.Fog(0xb9d7ec, 44, 95);

    const state = gameStore.getState();

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.className = 'h-full w-full';
    this.container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xfff6e8, 0.68);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xfff5da, 1.35);
    directional.position.set(24, 38, 18);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 120;
    directional.shadow.camera.left = -30;
    directional.shadow.camera.right = 30;
    directional.shadow.camera.top = 30;
    directional.shadow.camera.bottom = -30;
    this.scene.add(directional);

    const fill = new THREE.DirectionalLight(0xa6e1ff, 0.35);
    fill.position.set(-25, 18, -18);
    this.scene.add(fill);

    const tileGeometry = new THREE.BoxGeometry(1, 0.12, 1);
    const tileMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.02
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

        color.setRGB(0.56 * tile.tint, 0.8 * tile.tint, 0.52 * tile.tint);
        this.tileMesh.setColorAt(idx, color);

        idx += 1;
      }
    }
    this.tileMesh.instanceMatrix.needsUpdate = true;
    if (this.tileMesh.instanceColor) this.tileMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.tileMesh);

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
    this.cameraDesired.distance = THREE.MathUtils.clamp(this.cameraDesired.distance + delta, 11, 55);
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

    this.renderer.render(this.scene, this.camera);
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
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.05, 0.92),
        new THREE.MeshStandardMaterial({ color: 0x3f4a56, roughness: 0.92, metalness: 0.02 })
      );
      base.position.y = 0.025;
      base.receiveShadow = true;
      base.castShadow = false;
      base.userData.buildingId = building.id;
      group.add(base);

      const connectorGeom = new THREE.BoxGeometry(0.28, 0.052, 0.5);
      const connectorMat = new THREE.MeshStandardMaterial({ color: 0x3f4a56, roughness: 0.94, metalness: 0.02 });
      const n = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const e = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const s = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const w = new THREE.Mesh(connectorGeom, connectorMat.clone());

      n.position.set(0, 0.026, -0.33);
      s.position.set(0, 0.026, 0.33);
      e.position.set(0.33, 0.026, 0);
      w.position.set(-0.33, 0.026, 0);
      e.rotation.y = Math.PI / 2;
      w.rotation.y = Math.PI / 2;
      [n, e, s, w].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        group.add(part);
      });

      this.selectableMeshes.set(building.id, [base, n, e, s, w]);
      this.roadVisuals.set(building.id, { connectors: { n, e, s, w } });
      return group;
    }

    if (building.type === 'house') {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.5, 0.72),
        new THREE.MeshStandardMaterial({ color: 0xf3e6c6, roughness: 0.8, metalness: 0.01 })
      );
      base.position.y = 0.25;
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.buildingId = building.id;

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(0.56, 0.36, 4),
        new THREE.MeshStandardMaterial({ color: 0xd97745, roughness: 0.78, metalness: 0.01 })
      );
      roof.position.y = 0.68;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      group.add(base);
      group.add(roof);
      this.selectableMeshes.set(building.id, [base, roof]);
      return group;
    }

    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.75, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x8b9aae, roughness: 0.73, metalness: 0.08 })
    );
    body.position.y = 0.38;
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.buildingId = building.id;

    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.16, 0.95, 12),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.86, metalness: 0.06 })
    );
    chimney.position.set(0.3, 0.95, -0.2);
    chimney.castShadow = true;
    chimney.receiveShadow = true;
    chimney.userData.buildingId = building.id;

    group.add(body);
    group.add(chimney);
    this.selectableMeshes.set(building.id, [body, chimney]);
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
