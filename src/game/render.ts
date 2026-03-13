import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { buildingContextSummary } from './actions';
import { getAssetCardOptions, paintAssetCard, paintAssetSideCard, paintHeroAsset } from './assets';
import type { BuildType, Building, GameState, OverlayMode } from './state';
import {
  footprintForType,
  gameStore,
  occupiedCellsForBuilding
} from './state';

interface RoadVisualData {
  connectors: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  laneSegments: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  edgeCaps: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  intersection: THREE.Mesh;
  crosswalks: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  stopBars: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  turnArrows: Record<'n' | 'e' | 's' | 'w', THREE.Mesh>;
  cornerSidewalks: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Mesh>;
  curbRamps: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Mesh>;
  cornerBollards: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Mesh>;
  cornerLamps: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Group>;
  cornerPlanters: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Group>;
  majorSignals: Record<'ne' | 'nw' | 'se' | 'sw', THREE.Group>;
  centerIsland: THREE.Mesh;
  centerPlanting: THREE.Group;
  medianX: THREE.Mesh;
  medianZ: THREE.Mesh;
  boulevardMedianX: THREE.Mesh;
  boulevardMedianZ: THREE.Mesh;
  boulevardTreesX: THREE.Group;
  boulevardTreesZ: THREE.Group;
  boulevardShelterX: THREE.Group;
  boulevardShelterZ: THREE.Group;
}

interface BuildingPlacement {
  offsetX: number;
  offsetZ: number;
  rotationY: number;
}

interface BuildingClusterData {
  members: Building[];
  size: number;
  originWidth: number;
  originDepth: number;
  tileWidth: number;
  tileDepth: number;
  filled: boolean;
  minOriginX: number;
  maxOriginX: number;
  minOriginZ: number;
  maxOriginZ: number;
  anchorId: number;
}

interface RoadRun {
  axis: 'x' | 'z';
  fixed: number;
  start: number;
  end: number;
}

interface AmbientCarState {
  progress: number;
  speed: number;
  direction: 1 | -1;
  lane: number;
  length?: number;
}

interface SmokeAnimation {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  phase: number;
  drift: number;
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
  private readonly ambientRoot = new THREE.Group();
  private readonly overlayRoot = new THREE.Group();
  private readonly statusRoot = new THREE.Group();

  private readonly buildingMeshes = new Map<number, THREE.Object3D>();
  private readonly buildingRenderSignatures = new Map<number, string>();
  private readonly cellBuildings = new Map<string, Building[]>();

  private readonly selectableMeshes = new Map<number, THREE.Mesh[]>();

  private readonly roadVisuals = new Map<number, RoadVisualData>();

  private readonly ambient = new THREE.AmbientLight(0xfff6e8, 0.78);
  private readonly directional = new THREE.DirectionalLight(0xfff5da, 1.5);
  private readonly fill = new THREE.DirectionalLight(0xa6e1ff, 0.52);

  private readonly ambientCars = Array.from({ length: 6 }, () => new THREE.Group());
  private readonly ambientTrains = Array.from({ length: 3 }, () => new THREE.Group());
  private readonly ambientPedestrians = Array.from({ length: 10 }, () => new THREE.Group());
  private roadRuns: RoadRun[] = [];
  private railRuns: RoadRun[] = [];

  private readonly houseAnimations = new Map<
    number,
    {
      windows: THREE.Mesh[];
      smoke: THREE.Mesh[];
      baseY: number;
      wobble: number;
    }
  >();

  private readonly utilityAnimations = new Map<
    number,
    {
      smoke: SmokeAnimation[];
      glow: THREE.Mesh[];
      phase: number;
    }
  >();

  private readonly buildingByCell = new Map<string, Building>();

  private decorSignature = '';

  private frameHandle = 0;

  private lastTime = performance.now();

  private frameHook: ((dtSeconds: number) => void) | null = null;

  private readonly cameraDesired = {
    x: 0,
    z: 0,
    distance: 6.7
  };

  private readonly cameraCurrent = {
    x: 0,
    z: 0,
    distance: 6.7
  };

  private overlayMode: OverlayMode = 'base';

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

    this.scene.add(this.ambient);

    this.directional.position.set(18, 28, 12);
    this.directional.castShadow = true;
    this.directional.shadow.mapSize.set(2048, 2048);
    this.directional.shadow.camera.near = 1;
    this.directional.shadow.camera.far = 120;
    this.directional.shadow.camera.left = -18;
    this.directional.shadow.camera.right = 18;
    this.directional.shadow.camera.top = 18;
    this.directional.shadow.camera.bottom = -18;
    this.scene.add(this.directional);

    this.fill.position.set(-25, 18, -18);
    this.scene.add(this.fill);

    const terrainBase = new THREE.Mesh(
      new THREE.PlaneGeometry(state.gridSize + 6, state.gridSize + 6),
      new THREE.MeshStandardMaterial({
        color: 0x88b07f,
        roughness: 0.96,
        metalness: 0.01
      })
    );
    terrainBase.rotation.x = -Math.PI / 2;
    terrainBase.position.y = -0.05;
    terrainBase.receiveShadow = true;
    this.scene.add(terrainBase);

    const tileGeometry = new THREE.BoxGeometry(1.01, 0.07, 1.01);
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
          new THREE.Vector3(world.x, -0.01 + tile.elevation * 0.09, world.z),
          new THREE.Quaternion(),
          new THREE.Vector3(1, heightScale, 1)
        );
        this.tileMesh.setMatrixAt(idx, matrix);

        const warmPatch = ((x + z) % 3 === 0 ? 0.03 : 0.01) + Math.max(0, tile.elevation) * 0.05;
        const coolPatch = ((x * 7 + z * 3) % 5 === 0 ? 0.018 : 0.006);
        color.setRGB(
          (0.58 + warmPatch * 0.28) * tile.tint,
          (0.82 + tile.elevation * 0.08 + warmPatch) * tile.tint,
          (0.6 + coolPatch * 0.16) * tile.tint
        );
        this.tileMesh.setColorAt(idx, color);

        idx += 1;
      }
    }
    this.tileMesh.instanceMatrix.needsUpdate = true;
    if (this.tileMesh.instanceColor) this.tileMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.tileMesh);
    this.scene.add(this.decorRoot);
    this.scene.add(this.overlayRoot);
    this.scene.add(this.statusRoot);
    this.scene.add(this.ambientRoot);
    this.rebuildGroundDecor(state);
    this.initAmbientActors();

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

  setOverlayMode(mode: OverlayMode): void {
    this.overlayMode = mode;
    this.refreshOverlay(gameStore.getState());
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
    const nextDistance = THREE.MathUtils.clamp(this.cameraDesired.distance + delta, 4.2, 18);
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
      const pitch = THREE.MathUtils.degToRad(39);
    const r = this.cameraCurrent.distance;
    const offset = new THREE.Vector3(
      Math.cos(yaw) * Math.cos(pitch) * r,
      Math.sin(pitch) * r,
      Math.sin(yaw) * Math.cos(pitch) * r
    );

    this.camera.position.set(this.cameraCurrent.x + offset.x, offset.y, this.cameraCurrent.z + offset.z);
    this.camera.lookAt(this.cameraCurrent.x, 0.38, this.cameraCurrent.z);

    this.animateAmbientBuildings(time / 1000, Math.min(0.033, dt));

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

  private animateAmbientBuildings(timeSeconds: number, dtSeconds: number): void {
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

    for (const [id, anim] of this.utilityAnimations.entries()) {
      if (!this.buildingMeshes.has(id)) continue;

      const glow = 0.18 + (Math.sin(timeSeconds * 1.35 + anim.phase) * 0.5 + 0.5) * 0.28;
      for (const glowMesh of anim.glow) {
        const material = glowMesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = glow;
      }

      anim.smoke.forEach((puff, index) => {
        const cycle = (timeSeconds * (0.22 + puff.drift * 0.03) + puff.phase + index * 0.21) % 1;
        puff.mesh.position.set(
          puff.baseX + Math.sin(timeSeconds * 0.58 + puff.phase) * 0.03,
          puff.baseY + cycle * 0.82,
          puff.baseZ + cycle * 0.08
        );
        puff.mesh.scale.setScalar(0.68 + cycle * 0.95);
        const smokeMat = puff.mesh.material as THREE.MeshStandardMaterial;
        smokeMat.opacity = Math.max(0, 0.28 - cycle * 0.22);
      });
    }

    this.animateAmbientAgents(timeSeconds, dtSeconds);
  }

  private initAmbientActors(): void {
    const carMats = [
      new THREE.MeshStandardMaterial({ color: 0xf3b34c, roughness: 0.72, metalness: 0.16 }),
      new THREE.MeshStandardMaterial({ color: 0x5d88b7, roughness: 0.72, metalness: 0.16 }),
      new THREE.MeshStandardMaterial({ color: 0xd97757, roughness: 0.72, metalness: 0.16 }),
      new THREE.MeshStandardMaterial({ color: 0x8ab36b, roughness: 0.72, metalness: 0.16 })
    ];
    const pedestrianMats = [
      new THREE.MeshStandardMaterial({ color: 0xe9d2b0, roughness: 0.84, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0xbfd4e9, roughness: 0.84, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0xd6c0df, roughness: 0.84, metalness: 0.02 }),
      new THREE.MeshStandardMaterial({ color: 0xc8ddb4, roughness: 0.84, metalness: 0.02 })
    ];
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2b3139, roughness: 0.86, metalness: 0.08 });

    this.ambientCars.forEach((group, index) => {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.34), carMats[index % carMats.length]);
      body.position.y = 0.1;
      body.castShadow = true;
      body.receiveShadow = true;

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.06, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xdbe8f2, roughness: 0.46, metalness: 0.08 })
      );
      cabin.position.set(0, 0.15, -0.02);
      cabin.castShadow = true;
      cabin.receiveShadow = true;

      const wheelOffsets = [
        [-0.08, 0.04, -0.1],
        [0.08, 0.04, -0.1],
        [-0.08, 0.04, 0.1],
        [0.08, 0.04, 0.1]
      ] as const;
      wheelOffsets.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        wheel.castShadow = true;
        wheel.receiveShadow = true;
        group.add(wheel);
      });

      group.add(body);
      group.add(cabin);
      group.userData.motion = {
        progress: index * 0.75,
        speed: 0.58 + index * 0.06,
        direction: index % 2 === 0 ? 1 : -1,
        lane: index % 3 === 0 ? -0.14 : index % 3 === 1 ? 0.14 : 0
      } as AmbientCarState;
      group.visible = false;
      this.ambientRoot.add(group);
    });

    this.ambientTrains.forEach((group, index) => {
      const bodyMat = new THREE.MeshStandardMaterial({
        color: index % 2 === 0 ? 0x4f6f92 : 0x9b544f,
        roughness: 0.68,
        metalness: 0.18
      });
      const engine = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.58), bodyMat);
      engine.position.set(0, 0.12, -0.58);
      engine.castShadow = true;
      engine.receiveShadow = true;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.12, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xdfe8ef, roughness: 0.32, metalness: 0.12 })
      );
      cabin.position.set(0, 0.22, -0.66);
      cabin.castShadow = true;
      cabin.receiveShadow = true;
      const noseLight = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.05, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.24, metalness: 0.08, emissive: 0xfff3c2, emissiveIntensity: 0.24 })
      );
      noseLight.position.set(0, 0.14, -0.88);
      noseLight.castShadow = true;
      noseLight.receiveShadow = true;
      const carA = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.44), bodyMat.clone());
      carA.position.set(0, 0.11, -0.04);
      carA.castShadow = true;
      carA.receiveShadow = true;
      const carB = carA.clone();
      carB.position.z = 0.5;
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2a3138, roughness: 0.76, metalness: 0.2 });
      [-0.1, 0.1].forEach((x) => {
        [-0.66, -0.2, 0.16, 0.7].forEach((z) => {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), wheelMat);
          wheel.rotation.z = Math.PI / 2;
          wheel.position.set(x, 0.04, z);
          wheel.castShadow = true;
          wheel.receiveShadow = true;
          group.add(wheel);
        });
      });
      group.add(engine, cabin, noseLight, carA, carB);
      group.userData.motion = {
        progress: index * 0.48,
        speed: 0.72 + index * 0.05,
        direction: index % 2 === 0 ? 1 : -1,
        lane: 0,
        length: 1.72
      } as AmbientCarState;
      group.visible = false;
      this.ambientRoot.add(group);
    });

    this.ambientPedestrians.forEach((group, index) => {
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.08, 4, 8),
        pedestrianMats[index % pedestrianMats.length]
      );
      body.position.y = 0.09;
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      group.visible = false;
      this.ambientRoot.add(group);
    });
  }

  private animateAmbientAgents(timeSeconds: number, dtSeconds: number): void {
    const state = gameStore.getState();
    this.ambientCars.forEach((group, index) => {
      const preferredAxis: 'x' | 'z' = index % 2 === 0 ? 'x' : 'z';
      const runs = this.roadRuns.filter((run) => run.axis === preferredAxis && run.end - run.start >= 2);
      const run = runs[index % Math.max(1, runs.length)];
      if (!run) {
        group.visible = false;
        return;
      }

      const motion = group.userData.motion as AmbientCarState;
      motion.progress = (motion.progress + dtSeconds * motion.speed) % (run.end - run.start + 1.8);
      const startWorld =
        run.axis === 'x'
          ? this.gridToWorld(run.start, run.fixed, state.gridSize)
          : this.gridToWorld(run.fixed, run.start, state.gridSize);
      const span = run.end - run.start + 1;
      const along = motion.direction === 1 ? motion.progress : span + 0.8 - motion.progress;
      const laneOffset = motion.lane;

      if (run.axis === 'x') {
        group.position.set(startWorld.x - 0.4 + along, 0.02, startWorld.z + laneOffset);
        group.rotation.y = motion.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        group.position.set(startWorld.x + laneOffset, 0.02, startWorld.z - 0.4 + along);
        group.rotation.y = motion.direction === 1 ? 0 : Math.PI;
      }
      group.visible = true;
    });

    this.ambientTrains.forEach((group, index) => {
      const preferredAxis: 'x' | 'z' = index % 2 === 0 ? 'x' : 'z';
      const runs = this.railRuns.filter((run) => run.axis === preferredAxis && run.end - run.start >= 3);
      const run = runs[index % Math.max(1, runs.length)];
      if (!run) {
        group.visible = false;
        return;
      }

      const motion = group.userData.motion as AmbientCarState;
      const trainLength = motion.length ?? 1.76;
      motion.progress = (motion.progress + dtSeconds * motion.speed) % (run.end - run.start + trainLength);
      const startWorld =
        run.axis === 'x'
          ? this.gridToWorld(run.start, run.fixed, state.gridSize)
          : this.gridToWorld(run.fixed, run.start, state.gridSize);
      const span = run.end - run.start + 1;
      const along =
        motion.direction === 1
          ? -trainLength * 0.5 + motion.progress
          : span - 0.5 + trainLength * 0.5 - motion.progress;

      if (run.axis === 'x') {
        group.position.set(startWorld.x + along, 0.03, startWorld.z);
        group.rotation.y = motion.direction === 1 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        group.position.set(startWorld.x, 0.03, startWorld.z + along);
        group.rotation.y = motion.direction === 1 ? 0 : Math.PI;
      }
      group.visible = true;
    });

    const frontageBuildings = state.buildings.filter(
      (building) =>
        !['road', 'railLine', 'powerLine'].includes(building.type) &&
        building.type !== 'park' &&
        this.roadFrontage(building).n + this.roadFrontage(building).e + this.roadFrontage(building).s + this.roadFrontage(building).w > 0
    );

    this.ambientPedestrians.forEach((group, index) => {
      const building = frontageBuildings[index % frontageBuildings.length];
      if (!building) {
        group.visible = false;
        return;
      }

      const world = this.buildingOriginWorld(building, state.gridSize);
      const frontage = this.roadFrontage(building);
      const entries = Object.entries(frontage) as Array<[keyof typeof frontage, number]>;
      entries.sort((a, b) => b[1] - a[1]);
      const side: 'n' | 'e' | 's' | 'w' = entries[0] && entries[0][1] > 0 ? entries[0][0] : 's';
      const forward = 0.34 + Math.sin(timeSeconds * 0.8 + index) * 0.04;
      const lateral = ((index % 3) - 1) * 0.08;
      const pos =
        side === 'n'
          ? { x: world.x - lateral, z: world.z - forward }
          : side === 'e'
            ? { x: world.x + forward, z: world.z - lateral }
            : side === 'w'
              ? { x: world.x - forward, z: world.z + lateral }
              : { x: world.x + lateral, z: world.z + forward };
      group.position.set(pos.x, 0.02 + Math.abs(Math.sin(timeSeconds * 2 + index)) * 0.01, pos.z);
      group.rotation.y = side === 'e' ? Math.PI / 2 : side === 'w' ? -Math.PI / 2 : side === 'n' ? Math.PI : 0;
      group.visible = true;
    });
  }

  private syncFromState(state: GameState): void {
    this.syncBuildingMaps(state);
    this.syncHoverAndGhost(state);
    this.syncSelection(state);
    this.refreshOverlay(state);
    this.syncStatusMarkers(state);
  }

  private syncBuildingMaps(state: GameState): void {
    this.buildingByCell.clear();
    this.cellBuildings.clear();
    state.buildings.forEach((b) => {
      occupiedCellsForBuilding(b).forEach((cell) => {
        const key = `${cell.x}:${cell.z}`;
        const stack = this.cellBuildings.get(key) ?? [];
        stack.push(b);
        this.cellBuildings.set(key, stack);
      });
    });
    this.cellBuildings.forEach((stack, key) => {
      const priority = (type: BuildType): number => {
        if (type !== 'road' && type !== 'railLine' && type !== 'powerLine') return 3;
        if (type === 'road') return 2;
        if (type === 'railLine') return 1;
        return 0;
      };
      const primary = [...stack].sort((a, b) => priority(b.type) - priority(a.type))[0];
      if (primary) this.buildingByCell.set(key, primary);
    });

    this.rebuildGroundDecor(state);

    const seen = new Set<number>();
    for (const b of state.buildings) {
      seen.add(b.id);
      const nextSignature = this.renderSignatureForBuilding(b);
      const currentObject = this.buildingMeshes.get(b.id);
      if (currentObject && this.buildingRenderSignatures.get(b.id) !== nextSignature) {
        this.buildingRoot.remove(currentObject);
        this.disposeObject(currentObject);
        this.buildingMeshes.delete(b.id);
        this.selectableMeshes.delete(b.id);
        this.roadVisuals.delete(b.id);
        this.houseAnimations.delete(b.id);
        this.utilityAnimations.delete(b.id);
      }

      if (!this.buildingMeshes.has(b.id)) {
        const mesh = this.createBuildingObject(b);
        this.addLateTierEnhancements(mesh, b);
        this.buildingMeshes.set(b.id, mesh);
        this.buildingRenderSignatures.set(b.id, nextSignature);
        this.buildingRoot.add(mesh);
      }

      const object = this.buildingMeshes.get(b.id)!;
      const world = this.buildingOriginWorld(b, state.gridSize);
      const placement = this.computeBuildingPlacement(b);
      object.position.set(world.x + placement.offsetX, 0, world.z + placement.offsetZ);
      object.rotation.y = this.shouldUseIllustratedAsset(b.type) ? 0 : placement.rotationY;

      const ageMs = performance.now() - b.createdAt;
      const evolveMs = performance.now() - b.lastUpgradeAt;
      const t = THREE.MathUtils.clamp(Math.max(ageMs, evolveMs) / 220, 0, 1);
      const s = 0.82 + 0.18 * (1 - Math.pow(1 - t, 2));
      object.scale.setScalar(s);
    }

    for (const [id, obj] of this.buildingMeshes.entries()) {
      if (seen.has(id)) continue;
      this.buildingRoot.remove(obj);
      this.disposeObject(obj);
      this.buildingMeshes.delete(id);
      this.buildingRenderSignatures.delete(id);
      this.selectableMeshes.delete(id);
      this.roadVisuals.delete(id);
      this.houseAnimations.delete(id);
      this.utilityAnimations.delete(id);
    }

    this.syncRoadVisuals();
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      this.disposeObject(child);
    }
  }

  private refreshOverlay(state: GameState): void {
    this.clearGroup(this.overlayRoot);
    if (this.overlayMode === 'base') return;

    for (const building of state.buildings) {
      if (building.type === 'road') continue;
      const context = buildingContextSummary(state, building);
      const cells = occupiedCellsForBuilding(building);
      let color = 0x334155;
      let opacity = 0.3;

      if (this.overlayMode === 'appeal') {
        color = context.appeal >= 75 ? 0x22c55e : context.appeal >= 55 ? 0xfacc15 : 0xef4444;
      } else if (this.overlayMode === 'power') {
        color = context.powerAccess ? 0x38bdf8 : 0xef4444;
      } else if (this.overlayMode === 'transport') {
        color = context.transportAccess ? 0x22c55e : 0xf97316;
      } else if (this.overlayMode === 'services') {
        const support = context.parkSupport + context.commerceSupport + context.civicSupport;
        color = support >= 8 ? 0xfacc15 : support >= 4 ? 0x60a5fa : 0x64748b;
      } else if (this.overlayMode === 'tiers') {
        color =
          building.level >= 10 ? 0xf43f5e :
          building.level >= 8 ? 0xa855f7 :
          building.level >= 6 ? 0x06b6d4 :
          building.level >= 4 ? 0xf59e0b :
          building.level >= 2 ? 0x4ade80 : 0xcbd5e1;
      } else if (this.overlayMode === 'offline') {
        color = context.active ? 0x22c55e : context.powerAccess ? 0xf59e0b : 0xef4444;
        opacity = 0.36;
      }

      for (const cell of cells) {
        const world = this.gridToWorld(cell.x, cell.z, state.gridSize);
        const marker = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.02, 0.92),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
        );
        marker.position.set(world.x, 0.085, world.z);
        this.overlayRoot.add(marker);
      }
    }
  }

  private syncStatusMarkers(state: GameState): void {
    void state;
    this.clearGroup(this.statusRoot);
  }

  private addLateTierEnhancements(object: THREE.Object3D, building: Building): void {
    if (building.type === 'road' || building.type === 'railLine' || building.type === 'powerLine' || building.level < 6) return;
    if (building.type === 'powerPlant' || building.type === 'substation') return;
    if (building.type === 'park' || building.type === 'trainStation') return;
    if (building.type === 'house' && this.mergeModeForBuilding(building) === 'apartmentBlock') return;

    object.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(object);
    if (bbox.isEmpty()) return;

    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const width = Math.max(0.22, size.x);
    const depth = Math.max(0.22, size.z);
    const height = Math.max(0.22, size.y);
    const topY = bbox.max.y;
    const merged = this.mergeModeForBuilding(building) !== 'none';

    const selectable = this.selectableMeshes.get(building.id) ?? [];
    const existingAnimation = this.utilityAnimations.get(building.id) ?? {
      smoke: [],
      glow: [] as THREE.Mesh[],
      phase: building.id * 0.13
    };

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      object.add(mesh);
      selectable.push(mesh);
      return mesh;
    };

    const addGlowMesh = (mesh: THREE.Mesh) => {
      const added = addMesh(mesh);
      existingAnimation.glow.push(added);
      return added;
    };

    const family =
      building.type === 'house'
        ? 'residential'
        : building.type === 'workshop'
            ? 'industrial'
            : building.type === 'hospital' || building.type === 'policeStation' || building.type === 'fireStation'
                ? 'civic'
                : 'commercial';

    const palette =
      family === 'residential'
        ? { body: 0xd9d4ca, accent: 0x9cc5d6, glow: 0x8fd8f8, roof: 0x5f6770 }
        : family === 'civic'
            ? { body: 0xe4eaef, accent: 0x8fb4d5, glow: 0x7dd3fc, roof: 0x6f87a2 }
            : family === 'industrial'
              ? { body: 0xa58d74, accent: 0xd8893a, glow: 0xf97316, roof: 0x6a747c }
              : { body: 0xe0d6c8, accent: 0xaed4f6, glow: 0x38bdf8, roof: 0x5c6772 };

    const bodyMat = new THREE.MeshStandardMaterial({ color: palette.body, roughness: 0.74, metalness: 0.04 });
    const accentMat = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.52, metalness: 0.08 });
    const roofMat = new THREE.MeshStandardMaterial({ color: palette.roof, roughness: 0.76, metalness: 0.06 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xeaf7ff,
      roughness: 0.22,
      metalness: 0.08,
      transparent: true,
      opacity: 0.88,
      emissive: palette.glow,
      emissiveIntensity: 0.16
    });

    if (family === 'residential') {
      if (building.level >= 6) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.24, depth * 0.18), bodyMat)).position.set(center.x - width * 0.28, topY + 0.14, center.z + depth * 0.12);
        addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, 0.08, 0.03), glowMat)).position.set(center.x, topY + 0.1, center.z + depth * 0.24);
      }
      if (building.level >= 7) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.16, height * 0.36 + 0.46, depth * 0.14), bodyMat)).position.set(center.x + width * 0.24, topY + height * 0.18 + 0.18, center.z - depth * 0.08);
      }
      if (building.level >= 8) {
        addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.1, depth * 0.1), glowMat)).position.set(center.x, topY + height * 0.24 + 0.12, center.z);
      }
      if (building.level >= 9) {
        const finA = addMesh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, depth * 0.16), roofMat));
        finA.position.set(center.x - width * 0.18, topY + 0.42, center.z);
        const finB = addMesh(finA.clone());
        finB.position.set(center.x + width * 0.18, topY + 0.42, center.z);
        finB.userData.buildingId = building.id;
      }
      if (building.level >= 10) {
        const halo = addGlowMesh(new THREE.Mesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.16, 0.024, 8, 18), glowMat));
        halo.rotation.x = Math.PI / 2;
        halo.position.set(center.x, topY + 0.62, center.z);
      }
    } else if (family === 'commercial') {
      const signColor =
        building.type === 'shop'
          ? 0x7dd3fc
          : building.type === 'restaurant'
            ? 0xf59e0b
            : building.type === 'groceryStore'
              ? 0x4ade80
              : building.type === 'bank'
                ? 0xfacc15
                : 0xc4b5fd;
      const signMat = new THREE.MeshStandardMaterial({
        color: 0xeaf7ff,
        roughness: 0.22,
        metalness: 0.08,
        transparent: true,
        opacity: 0.88,
        emissive: signColor,
        emissiveIntensity: 0.2
      });

      if (building.type === 'shop') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, 0.26, depth * 0.18), bodyMat)).position.set(center.x - width * 0.28, topY + 0.14, center.z - depth * 0.14);
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, 0.12, 0.04), signMat.clone())).position.set(center.x, topY + 0.08, center.z + depth * 0.22);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, 0.92, depth * 0.16), accentMat)).position.set(center.x + width * 0.28, topY + 0.46, center.z + depth * 0.04);
        }
        if (building.level >= 8) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 1.22, depth * 0.22), bodyMat)).position.set(center.x, topY + 0.62, center.z - depth * 0.1);
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.14, 0.7, 0.04), signMat.clone())).position.set(center.x + width * 0.26, topY + 0.46, center.z + depth * 0.16);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.08, depth * 0.2), roofMat)).position.set(center.x, topY + 0.2, center.z - depth * 0.04);
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, 0.12, depth * 0.24), accentMat)).position.set(center.x - width * 0.16, topY + 0.32, center.z + depth * 0.1);
        }
        if (building.level >= 10) {
          const crown = addGlowMesh(new THREE.Mesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.18, 0.03, 8, 20), signMat.clone()));
          crown.rotation.x = Math.PI / 2;
          crown.position.set(center.x, topY + 0.36, center.z);
        }
      } else if (building.type === 'restaurant') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.4, 0.08, depth * 0.26), accentMat)).position.set(center.x, topY + 0.06, center.z + depth * 0.2);
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.18, depth * 0.12), roofMat)).position.set(center.x, topY + 0.16, center.z + depth * 0.2);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.32, 0.54, depth * 0.22), bodyMat)).position.set(center.x - width * 0.24, topY + 0.28, center.z - depth * 0.14);
        }
        if (building.level >= 8) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.24, 0.14, 0.05), signMat.clone())).position.set(center.x + width * 0.24, topY + 0.22, center.z + depth * 0.16);
          addMesh(new THREE.Mesh(new THREE.CylinderGeometry(Math.max(width, depth) * 0.08, Math.max(width, depth) * 0.08, 0.62, 12), roofMat)).position.set(center.x + width * 0.24, topY + 0.42, center.z + depth * 0.14);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.26, 0.12, depth * 0.34), accentMat)).position.set(center.x, topY + 0.32, center.z - depth * 0.06);
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.32, 0.06, depth * 0.06), signMat.clone())).position.set(center.x, topY + 0.4, center.z - depth * 0.06);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.CylinderGeometry(Math.max(width, depth) * 0.08, Math.max(width, depth) * 0.08, 0.4, 14), signMat.clone())).position.set(center.x - width * 0.06, topY + 0.5, center.z);
        }
      } else if (building.type === 'groceryStore') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.36, 0.24, depth * 0.22), bodyMat)).position.set(center.x + width * 0.26, topY + 0.14, center.z - depth * 0.14);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.12, depth * 0.16), roofMat)).position.set(center.x - width * 0.1, topY + 0.12, center.z + depth * 0.18);
        }
        if (building.level >= 8) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.3, 0.78, depth * 0.22), accentMat)).position.set(center.x, topY + 0.42, center.z - depth * 0.08);
        }
        if (building.level >= 9) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.42, 0.04, depth * 0.12), signMat.clone())).position.set(center.x, topY + 0.3, center.z + depth * 0.22);
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.26, 0.06, depth * 0.28), accentMat)).position.set(center.x + width * 0.18, topY + 0.18, center.z - depth * 0.18);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.16, 0.52, depth * 0.1), signMat.clone())).position.set(center.x - width * 0.3, topY + 0.42, center.z);
        }
      } else if (building.type === 'bank') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.CylinderGeometry(Math.max(width, depth) * 0.1, Math.max(width, depth) * 0.12, 0.34, 14), accentMat)).position.set(center.x - width * 0.24, topY + 0.18, center.z - depth * 0.12);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 1.08, depth * 0.18), bodyMat)).position.set(center.x + width * 0.22, topY + 0.56, center.z);
        }
        if (building.level >= 8) {
          const ticker = addGlowMesh(new THREE.Mesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.12, 0.024, 8, 18), signMat.clone()));
          ticker.rotation.x = Math.PI / 2;
          ticker.position.set(center.x, topY + 0.28, center.z + depth * 0.1);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.1, depth * 0.18), roofMat)).position.set(center.x - width * 0.08, topY + 0.36, center.z - depth * 0.1);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.1, 1.02, depth * 0.1), signMat.clone())).position.set(center.x + width * 0.2, topY + 0.6, center.z - depth * 0.04);
        }
      } else {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.12, depth * 0.22), accentMat)).position.set(center.x, topY + 0.08, center.z + depth * 0.18);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, 0.48, depth * 0.16), bodyMat)).position.set(center.x + width * 0.24, topY + 0.24, center.z - depth * 0.08);
        }
        if (building.level >= 8) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 0.88, depth * 0.18), accentMat)).position.set(center.x - width * 0.22, topY + 0.48, center.z + depth * 0.06);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.26, 0.08, depth * 0.18), roofMat)).position.set(center.x, topY + 0.2, center.z - depth * 0.08);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, 0.84, depth * 0.08), signMat.clone())).position.set(center.x, topY + 0.48, center.z);
        }
      }
    } else if (family === 'civic') {
      if (building.type === 'hospital') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.32, 0.26, depth * 0.2), bodyMat)).position.set(center.x + width * 0.26, topY + 0.14, center.z - depth * 0.14);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 1.02, depth * 0.18), accentMat)).position.set(center.x - width * 0.22, topY + 0.56, center.z);
        }
        if (building.level >= 8) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.08, depth * 0.08), glowMat)).position.set(center.x, topY + 0.34, center.z + depth * 0.18);
        }
        if (building.level >= 9) {
          const heliring = addGlowMesh(new THREE.Mesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.12, 0.02, 8, 18), glowMat.clone()));
          heliring.rotation.x = Math.PI / 2;
          heliring.position.set(center.x + width * 0.2, topY + 0.48, center.z - depth * 0.12);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, 0.98, depth * 0.08), glowMat.clone())).position.set(center.x - width * 0.18, topY + 0.62, center.z + depth * 0.04);
        }
      } else if (building.type === 'policeStation') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.24, depth * 0.18), bodyMat)).position.set(center.x - width * 0.24, topY + 0.14, center.z + depth * 0.12);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.06, 0.92, depth * 0.06), roofMat)).position.set(center.x + width * 0.24, topY + 0.5, center.z - depth * 0.12);
        }
        if (building.level >= 8) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.3, 0.08, depth * 0.08), glowMat)).position.set(center.x, topY + 0.26, center.z + depth * 0.18);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 1.04, depth * 0.16), accentMat)).position.set(center.x + width * 0.18, topY + 0.58, center.z);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.06, depth * 0.06), glowMat.clone())).position.set(center.x, topY + 0.58, center.z - depth * 0.18);
        }
      } else if (building.type === 'fireStation') {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.22, depth * 0.18), bodyMat)).position.set(center.x + width * 0.24, topY + 0.12, center.z + depth * 0.12);
        }
        if (building.level >= 7) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.14, 0.98, depth * 0.14), accentMat)).position.set(center.x - width * 0.22, topY + 0.54, center.z - depth * 0.08);
        }
        if (building.level >= 8) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.08, depth * 0.18), roofMat)).position.set(center.x, topY + 0.22, center.z + depth * 0.16);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.22, 0.18, depth * 0.22), bodyMat)).position.set(center.x + width * 0.18, topY + 0.34, center.z - depth * 0.1);
        }
        if (building.level >= 10) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, 1.02, depth * 0.08), glowMat.clone())).position.set(center.x - width * 0.18, topY + 0.62, center.z + depth * 0.02);
        }
      } else {
        if (building.level >= 6) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.22, depth * 0.18), bodyMat)).position.set(center.x - width * 0.24, topY + 0.12, center.z + depth * 0.12);
        }
        if (building.level >= 7) {
          const dome = addMesh(new THREE.Mesh(new THREE.SphereGeometry(Math.max(width, depth) * 0.12, 16, 12), accentMat));
          dome.position.set(center.x, topY + 0.22, center.z - depth * 0.08);
          dome.scale.y = 0.68;
        }
        if (building.level >= 8) {
          addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.36, 0.08, depth * 0.08), glowMat)).position.set(center.x, topY + 0.3, center.z + depth * 0.18);
        }
        if (building.level >= 9) {
          addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.18, 1.06, depth * 0.18), bodyMat)).position.set(center.x + width * 0.18, topY + 0.58, center.z);
        }
        if (building.level >= 10) {
          const civicRing = addGlowMesh(new THREE.Mesh(new THREE.TorusGeometry(Math.max(width, depth) * 0.12, 0.02, 8, 18), glowMat.clone()));
          civicRing.rotation.x = Math.PI / 2;
          civicRing.position.set(center.x, topY + 0.56, center.z);
        }
      }
    } else {
      if (building.level >= 6) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.38, 0.16, depth * 0.22), bodyMat)).position.set(center.x, topY + 0.1, center.z + depth * 0.16);
      }
      if (building.level >= 7) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.08, 1.02, depth * 0.08), roofMat)).position.set(center.x - width * 0.26, topY + 0.56, center.z - depth * 0.08);
      }
      if (building.level >= 8) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.28, 0.52, depth * 0.18), accentMat)).position.set(center.x + width * 0.24, topY + 0.28, center.z - depth * 0.12);
      }
      if (building.level >= 9) {
        addMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.08, depth * 0.1), roofMat)).position.set(center.x, topY + 0.32, center.z - depth * 0.04);
      }
      if (building.level >= 10) {
        addGlowMesh(new THREE.Mesh(new THREE.BoxGeometry(width * 0.1, 0.94, depth * 0.1), glowMat)).position.set(center.x + width * 0.12, topY + 0.56, center.z + depth * 0.02);
      }
    }

    if (merged && building.level >= 8) {
      const districtBridge = addGlowMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.38, 0.12, Math.max(0.08, depth * 0.08)),
          glowMat
        )
      );
      districtBridge.position.set(center.x, topY + 0.28, center.z);
    }

    this.selectableMeshes.set(building.id, selectable);
    if (existingAnimation.glow.length > 0 || existingAnimation.smoke.length > 0) {
      this.utilityAnimations.set(building.id, existingAnimation);
    }
  }

  private syncRoadVisuals(): void {
    for (const [id, roadData] of this.roadVisuals.entries()) {
      const building = this.findBuilding(id);
      if (!building) continue;
      const north = this.cellHasType(building.x, building.z - 1, (type) => type === 'road');
      const east = this.cellHasType(building.x + 1, building.z, (type) => type === 'road');
      const south = this.cellHasType(building.x, building.z + 1, (type) => type === 'road');
      const west = this.cellHasType(building.x - 1, building.z, (type) => type === 'road');
      const horizontalRun = this.straightRoadRunLength(building.x, building.z, 1, 0);
      const verticalRun = this.straightRoadRunLength(building.x, building.z, 0, 1);
      const boulevardX = east && west && horizontalRun >= 5;
      const boulevardZ = north && south && verticalRun >= 5;
      roadData.connectors.n.visible = north;
      roadData.connectors.e.visible = east;
      roadData.connectors.s.visible = south;
      roadData.connectors.w.visible = west;
      const roadCount = Number(north) + Number(east) + Number(south) + Number(west);
      roadData.laneSegments.n.visible = north || roadCount <= 1;
      roadData.laneSegments.e.visible = east || roadCount <= 1;
      roadData.laneSegments.s.visible = south || roadCount <= 1;
      roadData.laneSegments.w.visible = west || roadCount <= 1;
      roadData.edgeCaps.n.visible = !north;
      roadData.edgeCaps.e.visible = !east;
      roadData.edgeCaps.s.visible = !south;
      roadData.edgeCaps.w.visible = !west;
      const cornerTurn =
        roadCount === 2 && ((north && east) || (east && south) || (south && west) || (west && north));
      const majorNode = roadCount >= 3 || cornerTurn;
      roadData.intersection.visible = majorNode;
      roadData.crosswalks.n.visible = roadCount >= 3 && north;
      roadData.crosswalks.e.visible = roadCount >= 3 && east;
      roadData.crosswalks.s.visible = roadCount >= 3 && south;
      roadData.crosswalks.w.visible = roadCount >= 3 && west;
      roadData.stopBars.n.visible = roadCount >= 3 && north;
      roadData.stopBars.e.visible = roadCount >= 3 && east;
      roadData.stopBars.s.visible = roadCount >= 3 && south;
      roadData.stopBars.w.visible = roadCount >= 3 && west;
      roadData.turnArrows.n.visible = roadCount >= 3 && north;
      roadData.turnArrows.e.visible = roadCount >= 3 && east;
      roadData.turnArrows.s.visible = roadCount >= 3 && south;
      roadData.turnArrows.w.visible = roadCount >= 3 && west;
      roadData.cornerSidewalks.ne.visible = majorNode && (north || east);
      roadData.cornerSidewalks.nw.visible = majorNode && (north || west);
      roadData.cornerSidewalks.se.visible = majorNode && (south || east);
      roadData.cornerSidewalks.sw.visible = majorNode && (south || west);
      roadData.curbRamps.ne.visible = roadCount >= 3 && north && east;
      roadData.curbRamps.nw.visible = roadCount >= 3 && north && west;
      roadData.curbRamps.se.visible = roadCount >= 3 && south && east;
      roadData.curbRamps.sw.visible = roadCount >= 3 && south && west;
      roadData.cornerBollards.ne.visible = roadCount >= 3 && north && east;
      roadData.cornerBollards.nw.visible = roadCount >= 3 && north && west;
      roadData.cornerBollards.se.visible = roadCount >= 3 && south && east;
      roadData.cornerBollards.sw.visible = roadCount >= 3 && south && west;
      roadData.cornerLamps.ne.visible = majorNode && (north || east);
      roadData.cornerLamps.nw.visible = majorNode && (north || west);
      roadData.cornerLamps.se.visible = majorNode && (south || east);
      roadData.cornerLamps.sw.visible = majorNode && (south || west);
      roadData.cornerPlanters.ne.visible = !north && !east && roadCount >= 1;
      roadData.cornerPlanters.nw.visible = !north && !west && roadCount >= 1;
      roadData.cornerPlanters.se.visible = !south && !east && roadCount >= 1;
      roadData.cornerPlanters.sw.visible = !south && !west && roadCount >= 1;
      roadData.majorSignals.ne.visible = roadCount >= 3 && north && east;
      roadData.majorSignals.nw.visible = roadCount >= 3 && north && west;
      roadData.majorSignals.se.visible = roadCount >= 3 && south && east;
      roadData.majorSignals.sw.visible = roadCount >= 3 && south && west;
      roadData.centerIsland.visible = roadCount >= 4;
      roadData.centerPlanting.visible = roadCount >= 4;
      roadData.medianX.visible = roadCount >= 4 || (roadCount === 3 && east && west);
      roadData.medianZ.visible = roadCount >= 4 || (roadCount === 3 && north && south);
      roadData.boulevardMedianX.visible = boulevardX;
      roadData.boulevardMedianZ.visible = boulevardZ;
      roadData.boulevardTreesX.visible = boulevardX && building.x % 2 === 0;
      roadData.boulevardTreesZ.visible = boulevardZ && building.z % 2 === 0;
      roadData.boulevardShelterX.visible = boulevardX && building.x % 4 === 1;
      roadData.boulevardShelterZ.visible = boulevardZ && building.z % 4 === 1;
    }

    this.roadRuns = this.buildRoadRuns();
    this.railRuns = this.buildRailRuns();
  }

  private buildRoadRuns(): RoadRun[] {
    const roads = gameStore.getState().buildings.filter((building) => building.type === 'road');
    const roadSet = new Set(roads.map((road) => `${road.x}:${road.z}`));
    const runs: RoadRun[] = [];

    for (const road of roads) {
      const westKey = `${road.x - 1}:${road.z}`;
      if (!roadSet.has(westKey) && roadSet.has(`${road.x + 1}:${road.z}`)) {
        let end = road.x;
        while (roadSet.has(`${end + 1}:${road.z}`)) end += 1;
        if (end > road.x) {
          runs.push({ axis: 'x', fixed: road.z, start: road.x, end });
        }
      }

      const northKey = `${road.x}:${road.z - 1}`;
      if (!roadSet.has(northKey) && roadSet.has(`${road.x}:${road.z + 1}`)) {
        let end = road.z;
        while (roadSet.has(`${road.x}:${end + 1}`)) end += 1;
        if (end > road.z) {
          runs.push({ axis: 'z', fixed: road.x, start: road.z, end });
        }
      }
    }

    return runs;
  }

  private buildRailRuns(): RoadRun[] {
    const rails = gameStore
      .getState()
      .buildings.filter((building) => building.type === 'railLine' || building.type === 'trainStation');
    const railSet = new Set(rails.map((rail) => `${rail.x}:${rail.z}`));
    const runs: RoadRun[] = [];

    for (const rail of rails) {
      const westKey = `${rail.x - 1}:${rail.z}`;
      if (!railSet.has(westKey) && railSet.has(`${rail.x + 1}:${rail.z}`)) {
        let end = rail.x;
        while (railSet.has(`${end + 1}:${rail.z}`)) end += 1;
        if (end > rail.x) runs.push({ axis: 'x', fixed: rail.z, start: rail.x, end });
      }

      const northKey = `${rail.x}:${rail.z - 1}`;
      if (!railSet.has(northKey) && railSet.has(`${rail.x}:${rail.z + 1}`)) {
        let end = rail.z;
        while (railSet.has(`${rail.x}:${end + 1}`)) end += 1;
        if (end > rail.z) runs.push({ axis: 'z', fixed: rail.x, start: rail.z, end });
      }
    }

    return runs;
  }

  private cellHasType(x: number, z: number, predicate: (type: BuildType) => boolean): boolean {
    const stack = this.cellBuildings.get(`${x}:${z}`);
    return stack ? stack.some((building) => predicate(building.type)) : false;
  }

  private adjacentBuildingsAt(x: number, z: number): Building[] {
    return this.cellBuildings.get(`${x}:${z}`) ?? [];
  }

  private straightRoadRunLength(x: number, z: number, stepX: number, stepZ: number): number {
    let count = 1;

    let cx = x + stepX;
    let cz = z + stepZ;
    while (this.cellHasType(cx, cz, (type) => type === 'road')) {
      count += 1;
      cx += stepX;
      cz += stepZ;
    }

    cx = x - stepX;
    cz = z - stepZ;
    while (this.cellHasType(cx, cz, (type) => type === 'road')) {
      count += 1;
      cx -= stepX;
      cz -= stepZ;
    }

    return count;
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
      if (this.cellHasType(cell.x, cell.z - 1, (type) => this.isTransportFrontageType(type))) sides.n += 1;
      if (this.cellHasType(cell.x + 1, cell.z, (type) => this.isTransportFrontageType(type))) sides.e += 1;
      if (this.cellHasType(cell.x, cell.z + 1, (type) => this.isTransportFrontageType(type))) sides.s += 1;
      if (this.cellHasType(cell.x - 1, cell.z, (type) => this.isTransportFrontageType(type))) sides.w += 1;
    }

    return sides;
  }

  private isTransportFrontageType(type?: BuildType): boolean {
    return type === 'road' || type === 'railLine' || type === 'trainStation';
  }

  private connectedSides(
    building: Building,
    predicate: (candidate: Building) => boolean
  ): { n: boolean; e: boolean; s: boolean; w: boolean } {
    const cells = occupiedCellsForBuilding(building);
    const sides = { n: false, e: false, s: false, w: false };

    for (const cell of cells) {
      const north = this.adjacentBuildingsAt(cell.x, cell.z - 1);
      const east = this.adjacentBuildingsAt(cell.x + 1, cell.z);
      const south = this.adjacentBuildingsAt(cell.x, cell.z + 1);
      const west = this.adjacentBuildingsAt(cell.x - 1, cell.z);
      if (north.some((candidate) => candidate.id !== building.id && predicate(candidate))) sides.n = true;
      if (east.some((candidate) => candidate.id !== building.id && predicate(candidate))) sides.e = true;
      if (south.some((candidate) => candidate.id !== building.id && predicate(candidate))) sides.s = true;
      if (west.some((candidate) => candidate.id !== building.id && predicate(candidate))) sides.w = true;
    }

    return sides;
  }

  private connectedCountInDirection(
    building: Building,
    stepX: number,
    stepZ: number,
    predicate: (candidate: Building) => boolean
  ): number {
    const footprint = footprintForType(building.type);
    let count = 0;
    let cursorX = building.x;
    let cursorZ = building.z;

    while (true) {
      cursorX += stepX * footprint.width;
      cursorZ += stepZ * footprint.depth;
      const candidate = this.adjacentBuildingsAt(cursorX, cursorZ).find((entry) => entry.id !== building.id && predicate(entry));
      if (!candidate || candidate.id === building.id || !predicate(candidate)) break;
      count += 1;
    }

    return count;
  }

  private adjacentMatchingBuildings(
    building: Building,
    predicate: (candidate: Building) => boolean
  ): Building[] {
    const matches = new Map<number, Building>();
    for (const cell of occupiedCellsForBuilding(building)) {
      const neighbors = [
        ...this.adjacentBuildingsAt(cell.x, cell.z - 1),
        ...this.adjacentBuildingsAt(cell.x + 1, cell.z),
        ...this.adjacentBuildingsAt(cell.x, cell.z + 1),
        ...this.adjacentBuildingsAt(cell.x - 1, cell.z)
      ];
      for (const candidate of neighbors) {
        if (candidate.id === building.id || !predicate(candidate)) continue;
        matches.set(candidate.id, candidate);
      }
    }
    return [...matches.values()];
  }

  private connectedCluster(
    building: Building,
    predicate: (candidate: Building) => boolean
  ): BuildingClusterData {
    const clusterMembers = new Map<number, Building>();
    const queue: Building[] = [building];
    clusterMembers.set(building.id, building);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      for (const candidate of this.adjacentMatchingBuildings(current, predicate)) {
        if (clusterMembers.has(candidate.id)) continue;
        clusterMembers.set(candidate.id, candidate);
        queue.push(candidate);
      }
    }

    const members = [...clusterMembers.values()];
    const footprint = footprintForType(building.type);
    const originXs = [...new Set(members.map((member) => member.x))].sort((a, b) => a - b);
    const originZs = [...new Set(members.map((member) => member.z))].sort((a, b) => a - b);
    const originSet = new Set(members.map((member) => `${member.x}:${member.z}`));
    const contiguousX = originXs.every((value, index) => index === 0 || value - originXs[index - 1] === footprint.width);
    const contiguousZ = originZs.every((value, index) => index === 0 || value - originZs[index - 1] === footprint.depth);

    let filled = contiguousX && contiguousZ && members.length === originXs.length * originZs.length;
    if (filled) {
      for (const originX of originXs) {
        for (const originZ of originZs) {
          if (!originSet.has(`${originX}:${originZ}`)) {
            filled = false;
            break;
          }
        }
        if (!filled) break;
      }
    }

    const minOriginX = originXs[0] ?? building.x;
    const maxOriginX = originXs[originXs.length - 1] ?? building.x;
    const minOriginZ = originZs[0] ?? building.z;
    const maxOriginZ = originZs[originZs.length - 1] ?? building.z;
    const anchor = [...members].sort((a, b) => a.z - b.z || a.x - b.x || a.id - b.id)[0] ?? building;

    return {
      members,
      size: members.length,
      originWidth: originXs.length,
      originDepth: originZs.length,
      tileWidth: maxOriginX - minOriginX + footprint.width,
      tileDepth: maxOriginZ - minOriginZ + footprint.depth,
      filled,
      minOriginX,
      maxOriginX,
      minOriginZ,
      maxOriginZ,
      anchorId: anchor.id
    };
  }

  private clusterCenterOffset(building: Building, cluster: BuildingClusterData): { x: number; z: number } {
    const footprint = footprintForType(building.type);
    const buildingCenterX = building.x + (footprint.width - 1) * 0.5;
    const buildingCenterZ = building.z + (footprint.depth - 1) * 0.5;
    const clusterCenterX = cluster.minOriginX + (cluster.tileWidth - 1) * 0.5;
    const clusterCenterZ = cluster.minOriginZ + (cluster.tileDepth - 1) * 0.5;
    return {
      x: clusterCenterX - buildingCenterX,
      z: clusterCenterZ - buildingCenterZ
    };
  }

  private mergeModeForBuilding(
    building: Building,
    cluster = this.connectedCluster(building, (candidate) => candidate.type === building.type)
  ): 'none' | 'apartmentBlock' | 'parkSquare' | 'parkGreenway' | 'shopStrip' | 'restaurantHall' | 'superStore' | 'megaHospital' | 'megaPlant' | 'retailBlock' | 'serviceCampus' | 'workshopYard' | 'railHub' {
    if (
      building.type === 'house' &&
      cluster.filled &&
      cluster.size >= 4 &&
      cluster.originWidth >= 2 &&
      cluster.originDepth >= 2
    ) {
      return 'apartmentBlock';
    }
    if (
      building.type === 'park' &&
      cluster.filled &&
      cluster.size >= 4 &&
      cluster.originWidth >= 2 &&
      cluster.originDepth >= 2
    ) {
      return 'parkSquare';
    }
    if (
      building.type === 'park' &&
      cluster.filled &&
      cluster.size >= 2 &&
      ((cluster.originWidth >= 2 && cluster.originDepth === 1) || (cluster.originDepth >= 2 && cluster.originWidth === 1))
    ) {
      return 'parkGreenway';
    }
    if (
      building.type === 'shop' &&
      cluster.filled &&
      cluster.size >= 3 &&
      (cluster.originWidth >= 3 || cluster.originDepth >= 3 || (cluster.originWidth >= 2 && cluster.originDepth >= 2))
    ) {
      return 'shopStrip';
    }
    if (
      building.type === 'restaurant' &&
      cluster.filled &&
      cluster.size >= 2 &&
      (cluster.originWidth >= 2 || cluster.originDepth >= 2)
    ) {
      return 'restaurantHall';
    }
    if (
      (building.type === 'cornerStore' || building.type === 'bank') &&
      cluster.filled &&
      cluster.size >= 2 &&
      (cluster.originWidth >= 2 || cluster.originDepth >= 2)
    ) {
      return 'retailBlock';
    }
    if (
      building.type === 'groceryStore' &&
      cluster.filled &&
      cluster.size >= 4 &&
      cluster.originWidth >= 2 &&
      cluster.originDepth >= 2
    ) {
      return 'superStore';
    }
    if (
      building.type === 'hospital' &&
      cluster.filled &&
      cluster.size >= 4 &&
      cluster.originWidth >= 2 &&
      cluster.originDepth >= 2
    ) {
      return 'megaHospital';
    }
    if (
      (building.type === 'policeStation' || building.type === 'fireStation') &&
      cluster.filled &&
      cluster.size >= 2 &&
      (cluster.originWidth >= 2 || cluster.originDepth >= 2)
    ) {
      return 'serviceCampus';
    }
    if (
      building.type === 'workshop' &&
      cluster.filled &&
      cluster.size >= 2 &&
      (cluster.originWidth >= 2 || cluster.originDepth >= 2)
    ) {
      return 'workshopYard';
    }
    if (
      building.type === 'powerPlant' &&
      cluster.filled &&
      cluster.size >= 4 &&
      cluster.originWidth >= 2 &&
      cluster.originDepth >= 2
    ) {
      return 'megaPlant';
    }
    if (
      building.type === 'trainStation' &&
      cluster.filled &&
      cluster.size >= 2 &&
      (cluster.originWidth >= 2 || cluster.originDepth >= 2)
    ) {
      return 'railHub';
    }
    return 'none';
  }

  private railConnections(building: Building): { n: boolean; e: boolean; s: boolean; w: boolean } {
    const matchesRail = (type?: BuildType) => type === 'railLine' || type === 'trainStation';
    return {
      n: this.cellHasType(building.x, building.z - 1, matchesRail),
      e: this.cellHasType(building.x + 1, building.z, matchesRail),
      s: this.cellHasType(building.x, building.z + 1, matchesRail),
      w: this.cellHasType(building.x - 1, building.z, matchesRail)
    };
  }

  private powerConnections(building: Building): { n: boolean; e: boolean; s: boolean; w: boolean } {
    const matchesPower = (type?: BuildType) =>
      type === 'powerLine' ||
      type === 'powerPlant' ||
      type === 'substation' ||
      (type !== undefined && !['road', 'railLine', 'park'].includes(type));
    return {
      n: this.cellHasType(building.x, building.z - 1, matchesPower),
      e: this.cellHasType(building.x + 1, building.z, matchesPower),
      s: this.cellHasType(building.x, building.z + 1, matchesPower),
      w: this.cellHasType(building.x - 1, building.z, matchesPower)
    };
  }

  private renderSignatureForBuilding(building: Building): string {
    if (building.type === 'railLine' || building.type === 'trainStation') {
      const rail = this.railConnections(building);
      return [
        building.type,
        Number(rail.n),
        Number(rail.e),
        Number(rail.s),
        Number(rail.w),
        Number(this.cellHasType(building.x, building.z, (type) => type === 'road')),
        Number(this.cellHasType(building.x, building.z, (type) => type === 'powerLine')),
        building.level
      ].join(':');
    }
    if (building.type === 'powerLine' || building.type === 'substation') {
      const power = this.powerConnections(building);
      return [
        building.type,
        Number(power.n),
        Number(power.e),
        Number(power.s),
        Number(power.w),
        Number(this.cellHasType(building.x, building.z, (type) => type === 'road')),
        Number(this.cellHasType(building.x, building.z, (type) => type === 'railLine' || type === 'trainStation')),
        building.level
      ].join(':');
    }
    const sameTypeSides = this.connectedSides(building, (candidate) => candidate.type === building.type);
    const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === building.type);
    const commercialSides = this.connectedSides(building, (candidate) =>
      this.isCommercialBuilding(candidate.type) && this.isCommercialBuilding(building.type)
    );
    const civicSides = this.connectedSides(building, (candidate) =>
      this.isCivicBuilding(candidate.type) && this.isCivicBuilding(building.type)
    );
    const commercialRowLength = this.isCommercialBuilding(building.type)
      ? 1 +
        this.connectedCountInDirection(
          building,
          -1,
          0,
          (candidate) => this.isCommercialBuilding(candidate.type) && candidate.type === building.type
        ) +
        this.connectedCountInDirection(
          building,
          1,
          0,
          (candidate) => this.isCommercialBuilding(candidate.type) && candidate.type === building.type
        )
      : 1;
    const houseRowLength =
      building.type === 'house'
        ? 1 +
          this.connectedCountInDirection(building, -1, 0, (candidate) => candidate.type === 'house') +
          this.connectedCountInDirection(building, 1, 0, (candidate) => candidate.type === 'house')
        : 1;
    const frontage = this.roadFrontage(building);
    return [
      building.type,
      building.level,
      houseRowLength,
      commercialRowLength,
      sameTypeCluster.size,
      sameTypeCluster.originWidth,
      sameTypeCluster.originDepth,
      Number(sameTypeCluster.filled),
      sameTypeCluster.anchorId,
      Number(sameTypeSides.n),
      Number(sameTypeSides.e),
      Number(sameTypeSides.s),
      Number(sameTypeSides.w),
      Number(commercialSides.n),
      Number(commercialSides.e),
      Number(commercialSides.s),
      Number(commercialSides.w),
      Number(civicSides.n),
      Number(civicSides.e),
      Number(civicSides.s),
      Number(civicSides.w),
      frontage.n,
      frontage.e,
      frontage.s,
      frontage.w
    ].join(':');
  }

  private computeBuildingPlacement(building: Building): BuildingPlacement {
    if (building.type === 'road' || building.type === 'railLine' || building.type === 'powerLine' || building.type === 'park') {
      return { offsetX: 0, offsetZ: 0, rotationY: 0 };
    }

    const mergeMode = this.mergeModeForBuilding(building);
    if (mergeMode !== 'none') {
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

  private isCommercialBuilding(type: BuildType): boolean {
    return (
      type === 'shop' ||
      type === 'restaurant' ||
      type === 'trainStation' ||
      type === 'groceryStore' ||
      type === 'cornerStore' ||
      type === 'bank'
    );
  }

  private isCivicBuilding(type: BuildType): boolean {
    return type === 'hospital' || type === 'policeStation' || type === 'fireStation' || type === 'cityHall';
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

    if (facing === 'north') return { offsetX: 0, offsetZ: -setback, rotationY: Math.PI };
    if (facing === 'south') return { offsetX: 0, offsetZ: setback, rotationY: 0 };
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
        const applyHighlight = (material: THREE.Material): void => {
          const candidate = material as THREE.Material & {
            emissive?: THREE.Color;
            emissiveIntensity?: number;
          };
          if (candidate.emissive && typeof candidate.emissiveIntensity === 'number') {
            candidate.emissive.setHex(selected ? 0x1e293b : 0x000000);
            candidate.emissiveIntensity = selected ? 0.34 : 0;
          }
        };

        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => applyHighlight(material));
        } else if (mesh.material) {
          applyHighlight(mesh.material);
        }
      }
    }

    const selectedBuilding = state.buildings.find((building) => building.id === state.selectedBuildingId);
    if (!selectedBuilding) return;
  }

  private createBuildingObject(building: Building): THREE.Object3D {
    if (building.type === 'road') {
      const group = new THREE.Group();
      const asphaltMaterial = new THREE.MeshStandardMaterial({ color: 0x404a55, roughness: 0.9, metalness: 0.03 });
      const shoulderMaterial = new THREE.MeshStandardMaterial({ color: 0x697987, roughness: 0.95, metalness: 0.01 });
      const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xcbd3d9, roughness: 0.94, metalness: 0.01 });

      const sidewalkBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.18, 0.03, 1.18),
        new THREE.MeshStandardMaterial({ color: 0xe0e3e4, roughness: 0.96, metalness: 0.01 })
      );
      sidewalkBase.position.y = 0.012;
      sidewalkBase.receiveShadow = true;
      sidewalkBase.castShadow = false;
      sidewalkBase.userData.buildingId = building.id;
      group.add(sidewalkBase);

      const asphaltBase = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.045, 1.06), asphaltMaterial);
      asphaltBase.position.y = 0.028;
      asphaltBase.receiveShadow = true;
      asphaltBase.castShadow = false;
      asphaltBase.userData.buildingId = building.id;
      group.add(asphaltBase);

      const carriageway = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.9), shoulderMaterial);
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
      const stripeN = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.005, 0.26), laneStripeMat);
      const stripeS = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.005, 0.26), laneStripeMat.clone());
      const stripeE = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.038), laneStripeMat.clone());
      const stripeW = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.038), laneStripeMat.clone());
      stripeN.position.set(0, 0.08, -0.2);
      stripeS.position.set(0, 0.08, 0.2);
      stripeE.position.set(0.2, 0.08, 0);
      stripeW.position.set(-0.2, 0.08, 0);
      [stripeN, stripeS, stripeE, stripeW].forEach((stripe) => {
        stripe.userData.buildingId = building.id;
        group.add(stripe);
      });

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

      const connectorGeom = new THREE.BoxGeometry(0.38, 0.044, 0.64);
      const connectorMat = asphaltMaterial;
      const n = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const e = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const s = new THREE.Mesh(connectorGeom, connectorMat.clone());
      const w = new THREE.Mesh(connectorGeom, connectorMat.clone());

      n.position.set(0, 0.028, -0.45);
      s.position.set(0, 0.028, 0.45);
      e.position.set(0.45, 0.028, 0);
      w.position.set(-0.45, 0.028, 0);
      e.rotation.y = Math.PI / 2;
      w.rotation.y = Math.PI / 2;
      [n, e, s, w].forEach((part) => {
        part.receiveShadow = true;
        part.castShadow = false;
        part.userData.buildingId = building.id;
        group.add(part);
      });

      const capGeomH = new THREE.BoxGeometry(1.04, 0.04, 0.12);
      const capGeomV = new THREE.BoxGeometry(0.12, 0.04, 1.04);
      const capN = new THREE.Mesh(capGeomH, curbMaterial.clone());
      const capS = new THREE.Mesh(capGeomH, curbMaterial.clone());
      const capE = new THREE.Mesh(capGeomV, curbMaterial.clone());
      const capW = new THREE.Mesh(capGeomV, curbMaterial.clone());
      capN.position.set(0, 0.034, -0.53);
      capS.position.set(0, 0.034, 0.53);
      capE.position.set(0.53, 0.034, 0);
      capW.position.set(-0.53, 0.034, 0);
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
      const cwN = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.004, 0.08), crosswalkMat);
      const cwS = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.004, 0.08), crosswalkMat.clone());
      const cwE = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.52), crosswalkMat.clone());
      const cwW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.004, 0.52), crosswalkMat.clone());
      cwN.position.set(0, 0.081, -0.31);
      cwS.position.set(0, 0.081, 0.31);
      cwE.position.set(0.31, 0.081, 0);
      cwW.position.set(-0.31, 0.081, 0);
      [cwN, cwS, cwE, cwW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        group.add(part);
      });

      const stopBarMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.58,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.04
      });
      const stopN = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.004, 0.04), stopBarMat);
      const stopS = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.004, 0.04), stopBarMat.clone());
      const stopE = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.004, 0.34), stopBarMat.clone());
      const stopW = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.004, 0.34), stopBarMat.clone());
      stopN.position.set(0, 0.081, -0.21);
      stopS.position.set(0, 0.081, 0.21);
      stopE.position.set(0.21, 0.081, 0);
      stopW.position.set(-0.21, 0.081, 0);
      [stopN, stopS, stopE, stopW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        group.add(part);
      });

      const arrowMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.56,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.04
      });
      const arrowGeom = new THREE.BoxGeometry(0.12, 0.004, 0.18);
      const arrowN = new THREE.Mesh(arrowGeom, arrowMat);
      const arrowS = new THREE.Mesh(arrowGeom, arrowMat.clone());
      const arrowE = new THREE.Mesh(arrowGeom, arrowMat.clone());
      const arrowW = new THREE.Mesh(arrowGeom, arrowMat.clone());
      arrowN.position.set(0, 0.081, -0.07);
      arrowS.position.set(0, 0.081, 0.07);
      arrowE.position.set(0.07, 0.081, 0);
      arrowW.position.set(-0.07, 0.081, 0);
      arrowE.rotation.y = Math.PI / 2;
      arrowW.rotation.y = Math.PI / 2;
      [arrowN, arrowS, arrowE, arrowW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        group.add(part);
      });

      const cornerSidewalkMat = new THREE.MeshStandardMaterial({ color: 0xe3e0d8, roughness: 0.96, metalness: 0.01 });
      const cornerGeom = new THREE.BoxGeometry(0.22, 0.022, 0.22);
      const cornerNE = new THREE.Mesh(cornerGeom, cornerSidewalkMat);
      const cornerNW = new THREE.Mesh(cornerGeom, cornerSidewalkMat.clone());
      const cornerSE = new THREE.Mesh(cornerGeom, cornerSidewalkMat.clone());
      const cornerSW = new THREE.Mesh(cornerGeom, cornerSidewalkMat.clone());
      cornerNE.position.set(0.4, 0.045, -0.4);
      cornerNW.position.set(-0.4, 0.045, -0.4);
      cornerSE.position.set(0.4, 0.045, 0.4);
      cornerSW.position.set(-0.4, 0.045, 0.4);
      [cornerNE, cornerNW, cornerSE, cornerSW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        part.receiveShadow = true;
        group.add(part);
      });

      const curbRampMat = new THREE.MeshStandardMaterial({ color: 0xd2cec3, roughness: 0.92, metalness: 0.01 });
      const rampGeom = new THREE.BoxGeometry(0.11, 0.012, 0.11);
      const rampNE = new THREE.Mesh(rampGeom, curbRampMat);
      const rampNW = new THREE.Mesh(rampGeom, curbRampMat.clone());
      const rampSE = new THREE.Mesh(rampGeom, curbRampMat.clone());
      const rampSW = new THREE.Mesh(rampGeom, curbRampMat.clone());
      rampNE.position.set(0.25, 0.042, -0.25);
      rampNW.position.set(-0.25, 0.042, -0.25);
      rampSE.position.set(0.25, 0.042, 0.25);
      rampSW.position.set(-0.25, 0.042, 0.25);
      [rampNE, rampNW, rampSE, rampSW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        part.receiveShadow = true;
        group.add(part);
      });

      const bollardMat = new THREE.MeshStandardMaterial({ color: 0x717b84, roughness: 0.76, metalness: 0.18 });
      const bollardGeom = new THREE.CylinderGeometry(0.018, 0.022, 0.14, 10);
      const bollardNE = new THREE.Mesh(bollardGeom, bollardMat);
      const bollardNW = new THREE.Mesh(bollardGeom, bollardMat.clone());
      const bollardSE = new THREE.Mesh(bollardGeom, bollardMat.clone());
      const bollardSW = new THREE.Mesh(bollardGeom, bollardMat.clone());
      bollardNE.position.set(0.34, 0.08, -0.34);
      bollardNW.position.set(-0.34, 0.08, -0.34);
      bollardSE.position.set(0.34, 0.08, 0.34);
      bollardSW.position.set(-0.34, 0.08, 0.34);
      [bollardNE, bollardNW, bollardSE, bollardSW].forEach((part) => {
        part.userData.buildingId = building.id;
        part.visible = false;
        part.castShadow = true;
        part.receiveShadow = true;
        group.add(part);
      });

      const lampNE = this.createStreetLamp(0.42, 0.04, -0.42, building.id, 0xffefbf);
      const lampNW = this.createStreetLamp(-0.42, 0.04, -0.42, building.id, 0xffefbf);
      const lampSE = this.createStreetLamp(0.42, 0.04, 0.42, building.id, 0xffefbf);
      const lampSW = this.createStreetLamp(-0.42, 0.04, 0.42, building.id, 0xffefbf);
      const planterNE = this.createPlanterBox(0x8b6b4b, 0x719b66, 0.34, 0.03, -0.34, building.id, 0.12, 0.12);
      const planterNW = this.createPlanterBox(0x8b6b4b, 0x719b66, -0.34, 0.03, -0.34, building.id, 0.12, 0.12);
      const planterSE = this.createPlanterBox(0x8b6b4b, 0x719b66, 0.34, 0.03, 0.34, building.id, 0.12, 0.12);
      const planterSW = this.createPlanterBox(0x8b6b4b, 0x719b66, -0.34, 0.03, 0.34, building.id, 0.12, 0.12);
      [lampNE, lampNW, lampSE, lampSW, planterNE, planterNW, planterSE, planterSW].forEach((part) => {
        part.visible = false;
        group.add(part);
      });

      const createSignal = (x: number, z: number) => {
        const signal = new THREE.Group();
        signal.position.set(x, 0.04, z);
        signal.visible = false;
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.02, 0.34, 8),
          new THREE.MeshStandardMaterial({ color: 0x5b6570, roughness: 0.76, metalness: 0.18 })
        );
        pole.position.y = 0.17;
        pole.userData.buildingId = building.id;
        const arm = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.018, 0.018),
          new THREE.MeshStandardMaterial({ color: 0x5b6570, roughness: 0.76, metalness: 0.18 })
        );
        arm.position.set(0.04, 0.31, 0);
        arm.userData.buildingId = building.id;
        const light = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.08, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xeff8ff, roughness: 0.22, metalness: 0.08, emissive: 0x67e8f9, emissiveIntensity: 0.14 })
        );
        light.position.set(0.09, 0.27, 0);
        light.userData.buildingId = building.id;
        signal.add(pole, arm, light);
        return signal;
      };

      const signalNE = createSignal(0.45, -0.45);
      const signalNW = createSignal(-0.45, -0.45);
      signalNW.rotation.y = Math.PI;
      const signalSE = createSignal(0.45, 0.45);
      signalSE.rotation.y = -Math.PI / 2;
      const signalSW = createSignal(-0.45, 0.45);
      signalSW.rotation.y = Math.PI / 2;
      [signalNE, signalNW, signalSE, signalSW].forEach((signal) => group.add(signal));

      const centerIsland = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.9, metalness: 0.02 })
      );
      centerIsland.position.set(0, 0.07, 0);
      centerIsland.userData.buildingId = building.id;
      centerIsland.visible = false;
      group.add(centerIsland);

      const centerPlanting = new THREE.Group();
      centerPlanting.visible = false;
      const islandShrub = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x6f9b61, roughness: 0.92, metalness: 0.01 })
      );
      islandShrub.position.set(0, 0.13, 0);
      islandShrub.userData.buildingId = building.id;
      const islandBloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xf2d089, roughness: 0.82, metalness: 0.01 })
      );
      islandBloom.position.set(0.06, 0.18, -0.02);
      islandBloom.userData.buildingId = building.id;
      centerPlanting.add(islandShrub, islandBloom);
      group.add(centerPlanting);

      const medianX = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.03, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.9, metalness: 0.02 })
      );
      medianX.position.set(0, 0.068, 0);
      medianX.userData.buildingId = building.id;
      medianX.visible = false;
      group.add(medianX);

      const medianZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.03, 0.44),
        new THREE.MeshStandardMaterial({ color: 0xdad7ce, roughness: 0.9, metalness: 0.02 })
      );
      medianZ.position.set(0, 0.068, 0);
      medianZ.userData.buildingId = building.id;
      medianZ.visible = false;
      group.add(medianZ);

      const boulevardMedianX = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.038, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xd4d1c8, roughness: 0.92, metalness: 0.02 })
      );
      boulevardMedianX.position.set(0, 0.072, 0);
      boulevardMedianX.userData.buildingId = building.id;
      boulevardMedianX.visible = false;
      group.add(boulevardMedianX);

      const boulevardMedianZ = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.038, 0.78),
        new THREE.MeshStandardMaterial({ color: 0xd4d1c8, roughness: 0.92, metalness: 0.02 })
      );
      boulevardMedianZ.position.set(0, 0.072, 0);
      boulevardMedianZ.userData.buildingId = building.id;
      boulevardMedianZ.visible = false;
      group.add(boulevardMedianZ);

      const createBoulevardTrees = (axis: 'x' | 'z') => {
        const cluster = new THREE.Group();
        cluster.visible = false;
        const treeA = this.createTree(0.18, 0.12, 0.24, 0x709863, building.id);
        const treeB = this.createTree(0.16, 0.11, 0.22, 0x7ba06c, building.id);
        if (axis === 'x') {
          treeA.position.set(-0.2, 0.05, 0);
          treeB.position.set(0.2, 0.05, 0);
        } else {
          treeA.position.set(0, 0.05, -0.2);
          treeB.position.set(0, 0.05, 0.2);
        }
        cluster.add(treeA, treeB);
        return cluster;
      };

      const createBoulevardShelter = (axis: 'x' | 'z') => {
        const shelter = new THREE.Group();
        shelter.visible = false;
        const pad = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 'x' ? 0.28 : 0.18, 0.018, axis === 'x' ? 0.18 : 0.28),
          new THREE.MeshStandardMaterial({ color: 0xd8d4cb, roughness: 0.9, metalness: 0.02 })
        );
        pad.position.y = 0.06;
        pad.userData.buildingId = building.id;
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 'x' ? 0.32 : 0.2, 0.04, axis === 'x' ? 0.14 : 0.32),
          new THREE.MeshStandardMaterial({ color: 0x6d7f92, roughness: 0.74, metalness: 0.08 })
        );
        roof.position.y = 0.32;
        roof.userData.buildingId = building.id;
        const glass = new THREE.Mesh(
          new THREE.BoxGeometry(axis === 'x' ? 0.02 : 0.12, 0.2, axis === 'x' ? 0.12 : 0.02),
          new THREE.MeshStandardMaterial({
            color: 0xeaf7ff,
            roughness: 0.18,
            metalness: 0.08,
            transparent: true,
            opacity: 0.84,
            emissive: 0x67e8f9,
            emissiveIntensity: 0.08
          })
        );
        glass.position.y = 0.18;
        glass.userData.buildingId = building.id;
        shelter.add(pad, roof, glass);
        return shelter;
      };

      const boulevardTreesX = createBoulevardTrees('x');
      const boulevardTreesZ = createBoulevardTrees('z');
      const boulevardShelterX = createBoulevardShelter('x');
      const boulevardShelterZ = createBoulevardShelter('z');
      boulevardShelterX.position.set(0, 0, -0.34);
      boulevardShelterZ.position.set(0.34, 0, 0);
      group.add(boulevardTreesX, boulevardTreesZ, boulevardShelterX, boulevardShelterZ);

      this.selectableMeshes.set(building.id, [
        sidewalkBase,
        asphaltBase,
        carriageway,
        n,
        e,
        s,
        w,
        stripeN,
        stripeE,
        stripeS,
        stripeW,
        capN,
        capE,
        capS,
        capW,
        intersectionMark,
        cwN,
        cwE,
        cwS,
        cwW,
        stopN,
        stopE,
        stopS,
        stopW,
        arrowN,
        arrowE,
        arrowS,
        arrowW,
        cornerNE,
        cornerNW,
        cornerSE,
        cornerSW,
        rampNE,
        rampNW,
        rampSE,
        rampSW,
        bollardNE,
        bollardNW,
        bollardSE,
        bollardSW,
        ...this.collectMeshes(lampNE),
        ...this.collectMeshes(lampNW),
        ...this.collectMeshes(lampSE),
        ...this.collectMeshes(lampSW),
        ...this.collectMeshes(planterNE),
        ...this.collectMeshes(planterNW),
        ...this.collectMeshes(planterSE),
        ...this.collectMeshes(planterSW),
        ...this.collectMeshes(signalNE),
        ...this.collectMeshes(signalNW),
        ...this.collectMeshes(signalSE),
        ...this.collectMeshes(signalSW),
        centerIsland,
        ...this.collectMeshes(centerPlanting),
        medianX,
        medianZ,
        boulevardMedianX,
        boulevardMedianZ,
        ...this.collectMeshes(boulevardTreesX),
        ...this.collectMeshes(boulevardTreesZ),
        ...this.collectMeshes(boulevardShelterX),
        ...this.collectMeshes(boulevardShelterZ)
      ]);
      this.roadVisuals.set(building.id, {
        connectors: { n, e, s, w },
        laneSegments: { n: stripeN, e: stripeE, s: stripeS, w: stripeW },
        edgeCaps: { n: capN, e: capE, s: capS, w: capW },
        intersection: intersectionMark,
        crosswalks: { n: cwN, e: cwE, s: cwS, w: cwW },
        stopBars: { n: stopN, e: stopE, s: stopS, w: stopW },
        turnArrows: { n: arrowN, e: arrowE, s: arrowS, w: arrowW },
        cornerSidewalks: { ne: cornerNE, nw: cornerNW, se: cornerSE, sw: cornerSW },
        curbRamps: { ne: rampNE, nw: rampNW, se: rampSE, sw: rampSW },
        cornerBollards: { ne: bollardNE, nw: bollardNW, se: bollardSE, sw: bollardSW },
        cornerLamps: { ne: lampNE, nw: lampNW, se: lampSE, sw: lampSW },
        cornerPlanters: { ne: planterNE, nw: planterNW, se: planterSE, sw: planterSW },
        majorSignals: { ne: signalNE, nw: signalNW, se: signalSE, sw: signalSW },
        centerIsland,
        centerPlanting,
        medianX,
        medianZ,
        boulevardMedianX,
        boulevardMedianZ,
        boulevardTreesX,
        boulevardTreesZ,
        boulevardShelterX,
        boulevardShelterZ
      });
      return group;
    }

    if (building.type === 'railLine') {
      const group = new THREE.Group();
      const rail = this.railConnections(building);
      const hasRoadCrossing = this.cellHasType(building.x, building.z, (type) => type === 'road');
      const hasPowerCrossing = this.cellHasType(building.x, building.z, (type) => type === 'powerLine');
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xd7d2cb, roughness: 0.95, metalness: 0.01 });
      const ballastMat = new THREE.MeshStandardMaterial({ color: 0x878c90, roughness: 0.94, metalness: 0.02 });
      const shoulderMat = new THREE.MeshStandardMaterial({ color: 0xa3a7ab, roughness: 0.9, metalness: 0.02 });
      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x6b5540, roughness: 0.88, metalness: 0.04 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c4cf, roughness: 0.34, metalness: 0.62 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.03, 1.08), baseMat);
      base.position.y = 0.012;
      base.receiveShadow = true;
      base.userData.buildingId = building.id;
      group.add(base);

      const bed = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.94), ballastMat);
      bed.position.y = 0.03;
      bed.receiveShadow = true;
      bed.userData.buildingId = building.id;
      group.add(bed);

      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(1, 0.014, 0.86), shoulderMat);
      shoulder.position.y = 0.052;
      shoulder.userData.buildingId = building.id;
      group.add(shoulder);

      const addRailSegment = (rotationY = 0) => {
        const segment = new THREE.Group();
        const sleeperGeom = new THREE.BoxGeometry(0.74, 0.03, 0.055);
        for (let i = -6; i <= 6; i += 1) {
          const sleeper = new THREE.Mesh(sleeperGeom, sleeperMat);
          sleeper.position.set(0, 0.05, i * 0.075);
          sleeper.castShadow = true;
          sleeper.receiveShadow = true;
          sleeper.userData.buildingId = building.id;
          segment.add(sleeper);
        }
        [-0.18, 0.18].forEach((x) => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.036, 1.02), railMat);
          line.position.set(x, 0.075, 0);
          line.castShadow = true;
          line.receiveShadow = true;
          line.userData.buildingId = building.id;
          segment.add(line);
        });
        const innerFill = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.94), ballastMat.clone());
        innerFill.position.set(0, 0.047, 0);
        innerFill.userData.buildingId = building.id;
        segment.add(innerFill);
        segment.rotation.y = rotationY;
        group.add(segment);
      };

      const crossingDeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.02, 1.02),
        new THREE.MeshStandardMaterial({ color: 0xc5b7a0, roughness: 0.9, metalness: 0.02 })
      );
      crossingDeck.position.y = 0.048;
      crossingDeck.userData.buildingId = building.id;
      crossingDeck.visible = hasRoadCrossing;
      if (rail.e || rail.w) {
        crossingDeck.rotation.y = Math.PI / 2;
      }
      group.add(crossingDeck);

      const cableTray = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.04, 1.02),
        new THREE.MeshStandardMaterial({ color: 0x5a6570, roughness: 0.74, metalness: 0.18 })
      );
      cableTray.position.y = 0.098;
      cableTray.userData.buildingId = building.id;
      cableTray.visible = hasPowerCrossing;
      if (rail.e || rail.w) {
        cableTray.rotation.y = Math.PI / 2;
      }
      group.add(cableTray);

      if (rail.e || rail.w || (!rail.n && !rail.s)) addRailSegment(Math.PI / 2);
      if (rail.n || rail.s) addRailSegment(0);

      if ((rail.e || rail.w) && (rail.n || rail.s)) {
        const switchCore = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.025, 0.32),
          new THREE.MeshStandardMaterial({ color: 0xaab3bc, roughness: 0.48, metalness: 0.34 })
        );
        switchCore.position.y = 0.078;
        switchCore.userData.buildingId = building.id;
        group.add(switchCore);
      }
      return group;
    }

    if (building.type === 'powerLine') {
      const group = new THREE.Group();
      const power = this.powerConnections(building);
      const hasRoadCrossing = this.cellHasType(building.x, building.z, (type) => type === 'road');
      const hasRailCrossing = this.cellHasType(building.x, building.z, (type) => type === 'railLine' || type === 'trainStation');
      const prefersEastWest = power.e || power.w || (!power.n && !power.s);
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.03, 0.44),
        new THREE.MeshStandardMaterial({ color: 0xc2c5c9, roughness: 0.94, metalness: 0.01 })
      );
      base.position.y = 0.015;
      base.userData.buildingId = building.id;
      base.receiveShadow = true;
      group.add(base);

      const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a684a, roughness: 0.88, metalness: 0.03 });
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0xa9cfff,
        roughness: 0.42,
        metalness: 0.26,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.09
      });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.7, 10), poleMat);
      pole.position.y = 0.36;
      pole.castShadow = true;
      pole.receiveShadow = true;
      pole.userData.buildingId = building.id;
      const crossarm = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.03), poleMat);
      crossarm.position.set(0, 0.58, 0);
      crossarm.castShadow = true;
      crossarm.receiveShadow = true;
      crossarm.userData.buildingId = building.id;
      if (!hasRoadCrossing && !hasRailCrossing) {
        group.add(pole);
        group.add(crossarm);
      }

      const addWire = (x: number, z: number, width: number, depth: number) => {
        const wire = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), wireMat);
        wire.position.set(x, 0.58, z);
        wire.userData.buildingId = building.id;
        wire.castShadow = true;
        wire.receiveShadow = true;
        group.add(wire);
      };

      if (hasRoadCrossing || hasRailCrossing) {
        const poleOffsets = prefersEastWest
          ? [
              [0, -0.32],
              [0, 0.32]
            ]
          : [
              [-0.32, 0],
              [0.32, 0]
            ];
        poleOffsets.forEach(([x, z]) => {
          const sidePole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 0.78, 10), poleMat.clone());
          sidePole.position.set(x, 0.4, z);
          sidePole.castShadow = true;
          sidePole.receiveShadow = true;
          sidePole.userData.buildingId = building.id;
          group.add(sidePole);
        });
        const overpass = new THREE.Mesh(
          new THREE.BoxGeometry(prefersEastWest ? 0.72 : 0.06, 0.03, prefersEastWest ? 0.06 : 0.72),
          poleMat.clone()
        );
        overpass.position.set(0, 0.67, 0);
        overpass.castShadow = true;
        overpass.receiveShadow = true;
        overpass.userData.buildingId = building.id;
        group.add(overpass);

        const insulatorBeam = new THREE.Mesh(
          new THREE.BoxGeometry(prefersEastWest ? 0.8 : 0.08, 0.02, prefersEastWest ? 0.08 : 0.8),
          wireMat.clone()
        );
        insulatorBeam.position.set(0, 0.69, 0);
        insulatorBeam.userData.buildingId = building.id;
        group.add(insulatorBeam);
      }
      if (power.n) addWire(0, -0.28, 0.03, 0.56);
      if (power.s) addWire(0, 0.28, 0.03, 0.56);
      if (power.e) addWire(0.28, 0, 0.56, 0.03);
      if (power.w) addWire(-0.28, 0, 0.56, 0.03);
      if ((power.n || power.s) && (power.e || power.w)) {
        const node = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), wireMat.clone());
        node.position.set(0, 0.58, 0);
        node.userData.buildingId = building.id;
        node.castShadow = true;
        node.receiveShadow = true;
        group.add(node);
      }
      return group;
    }

    if (building.type === 'park') {
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'park');
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'parkSquare') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedParkSquare(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0x89b876, 0xe5e1db);
      }
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'parkGreenway') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedParkGreenway(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0x89b876, 0xe5e1db);
      }
    }

    if (building.type === 'substation') {
      const group = new THREE.Group();
      const level = building.level;
      const padMat = new THREE.MeshStandardMaterial({ color: 0xc9cbce, roughness: 0.94, metalness: 0.01 });
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa8b4, roughness: 0.56, metalness: 0.3 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0xe7f7ff,
        roughness: 0.26,
        metalness: 0.12,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.16
      });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), padMat);
      pad.position.y = 0.02;
      pad.receiveShadow = true;
      pad.userData.buildingId = building.id;
      group.add(pad);
      const yard = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.02, 0.74), new THREE.MeshStandardMaterial({ color: 0xb4b7bb, roughness: 0.96, metalness: 0.02 }));
      yard.position.y = 0.04;
      yard.userData.buildingId = building.id;
      group.add(yard);
      [-0.2, 0.2].forEach((x) => {
        [-0.2, 0.2].forEach((z) => {
          const tower = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), steelMat);
          tower.position.set(x, 0.25, z);
          tower.userData.buildingId = building.id;
          tower.castShadow = true;
          tower.receiveShadow = true;
          group.add(tower);
        });
      });
      const transformer = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.22), glowMat);
      transformer.position.set(0, 0.16, 0);
      transformer.userData.buildingId = building.id;
      transformer.castShadow = true;
      transformer.receiveShadow = true;
      group.add(transformer);

      const relayHall = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.22), steelMat.clone());
      relayHall.position.set(0.22, 0.12, 0.22);
      relayHall.userData.buildingId = building.id;
      relayHall.castShadow = true;
      relayHall.receiveShadow = true;
      relayHall.visible = level >= 2;

      const busRack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.08), steelMat.clone());
      busRack.position.set(0, 0.42, -0.06);
      busRack.userData.buildingId = building.id;
      busRack.visible = level >= 3;

      const batteryCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.14), glowMat.clone());
      batteryCabinet.position.set(-0.26, 0.18, 0.2);
      batteryCabinet.userData.buildingId = building.id;
      batteryCabinet.visible = level >= 4;

      const latticeTower = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.08), steelMat.clone());
      latticeTower.position.set(0.3, 0.48, -0.26);
      latticeTower.userData.buildingId = building.id;
      latticeTower.visible = level >= 5;

      const switchDeck = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.22), padMat.clone());
      switchDeck.position.set(0, 0.08, -0.28);
      switchDeck.userData.buildingId = building.id;
      switchDeck.visible = level >= 6;

      const capacitorBank = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.16), steelMat.clone());
      capacitorBank.position.set(-0.02, 0.18, -0.3);
      capacitorBank.userData.buildingId = building.id;
      capacitorBank.visible = level >= 7;

      const ringGlow = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.025, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xe7f7ff, roughness: 0.18, metalness: 0.08, emissive: 0x67e8f9, emissiveIntensity: 0.18 })
      );
      ringGlow.rotation.x = Math.PI / 2;
      ringGlow.position.set(0, 0.46, 0);
      ringGlow.userData.buildingId = building.id;
      ringGlow.visible = level >= 8;

      const gridSpine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.04, 0.08), glowMat.clone());
      gridSpine.position.set(-0.3, 0.58, -0.22);
      gridSpine.userData.buildingId = building.id;
      gridSpine.visible = level >= 9;

      const crownBus = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.05), glowMat.clone());
      crownBus.position.set(0, 0.92, -0.12);
      crownBus.userData.buildingId = building.id;
      crownBus.visible = level >= 10;

      group.add(relayHall, busRack, batteryCabinet, latticeTower, switchDeck, capacitorBank, ringGlow, gridSpine, crownBus);
      this.utilityAnimations.set(building.id, {
        smoke: [],
        glow: [transformer, ringGlow, gridSpine, crownBus],
        phase: building.id * 0.09
      });
      this.selectableMeshes.set(building.id, [
        pad,
        yard,
        transformer,
        relayHall,
        busRack,
        batteryCabinet,
        latticeTower,
        switchDeck,
        capacitorBank,
        ringGlow,
        gridSpine,
        crownBus,
        ...this.collectMeshes(group).filter((mesh) => mesh.userData.buildingId === building.id)
      ]);
      return group;
    }

    if (building.type === 'trainStation') {
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'trainStation');
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'railHub') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedRailHub(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0xd7d1c5, 0xe4ddd3);
      }
      const group = new THREE.Group();
      const level = building.level;
      const baseMat = new THREE.MeshStandardMaterial({ color: 0xd7d1c5, roughness: 0.9, metalness: 0.02 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x5f7386, roughness: 0.76, metalness: 0.08 });
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xb4d8ec, roughness: 0.34, metalness: 0.06 });
      const glowMat = new THREE.MeshStandardMaterial({ color: 0xe6fbff, roughness: 0.2, metalness: 0.12, emissive: 0x67e8f9, emissiveIntensity: 0.12 });
      const walkway = new THREE.Mesh(
        new THREE.BoxGeometry(1.08, 0.025, 1.06),
        new THREE.MeshStandardMaterial({ color: 0xe3ddd4, roughness: 0.96, metalness: 0.01 })
      );
      walkway.position.y = 0.03;
      walkway.receiveShadow = true;
      walkway.userData.buildingId = building.id;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.82), baseMat);
      base.position.y = 0.06;
      base.castShadow = true;
      base.receiveShadow = true;
      base.userData.buildingId = building.id;
      const hall = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.36, 0.48), glassMat);
      hall.position.set(0, 0.24, 0);
      hall.castShadow = true;
      hall.receiveShadow = true;
      hall.userData.buildingId = building.id;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.08, 0.56), roofMat);
      roof.position.set(0, 0.46, 0);
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.04, 0.18), roofMat.clone());
      canopy.position.set(0, 0.22, 0.28);
      canopy.userData.buildingId = building.id;
      canopy.castShadow = true;
      canopy.receiveShadow = true;
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.04), glowMat);
      sign.position.set(0, 0.48, 0.3);
      sign.userData.buildingId = building.id;
      sign.castShadow = true;
      sign.receiveShadow = true;
      const platform = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 1.04), new THREE.MeshStandardMaterial({ color: 0xc8c6c2, roughness: 0.92, metalness: 0.02 }));
      platform.position.set(-0.36, 0.08, 0);
      platform.userData.buildingId = building.id;
      platform.castShadow = true;
      platform.receiveShadow = true;
      const platformB = platform.clone();
      platformB.position.x = 0.36;
      platformB.userData.buildingId = building.id;
      const trackGap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.015, 0.82), new THREE.MeshStandardMaterial({ color: 0x8b8e92, roughness: 0.92, metalness: 0.02 }));
      trackGap.position.set(0, 0.05, 0);
      trackGap.userData.buildingId = building.id;

      const secondCanopy = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 1.02), roofMat.clone());
      secondCanopy.position.set(-0.36, 0.34, 0);
      secondCanopy.userData.buildingId = building.id;
      secondCanopy.castShadow = true;
      secondCanopy.receiveShadow = true;
      secondCanopy.visible = level >= 2;
      const secondCanopyB = secondCanopy.clone();
      secondCanopyB.position.x = 0.36;
      secondCanopyB.userData.buildingId = building.id;

      const clockTower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.18), baseMat.clone());
      clockTower.position.set(0.28, 0.5, -0.16);
      clockTower.userData.buildingId = building.id;
      clockTower.castShadow = true;
      clockTower.receiveShadow = true;
      clockTower.visible = level >= 3;
      const towerCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.24), roofMat.clone());
      towerCap.position.set(0.28, 0.8, -0.16);
      towerCap.userData.buildingId = building.id;
      towerCap.castShadow = true;
      towerCap.receiveShadow = true;
      towerCap.visible = level >= 3;

      const concourse = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.22), glassMat.clone());
      concourse.position.set(0, 0.24, -0.28);
      concourse.userData.buildingId = building.id;
      concourse.castShadow = true;
      concourse.receiveShadow = true;
      concourse.visible = level >= 4;

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.16), roofMat.clone());
      bridge.position.set(0, 0.52, 0);
      bridge.userData.buildingId = building.id;
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      bridge.visible = level >= 5;

      const annex = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.28), baseMat.clone());
      annex.position.set(-0.28, 0.19, -0.24);
      annex.userData.buildingId = building.id;
      annex.castShadow = true;
      annex.receiveShadow = true;
      annex.visible = level >= 6;

      const glassHall = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.28, 0.34),
        new THREE.MeshStandardMaterial({ color: 0xdaf2ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0x67e8f9, emissiveIntensity: 0.12 })
      );
      glassHall.position.set(0, 0.38, 0.18);
      glassHall.userData.buildingId = building.id;
      glassHall.castShadow = true;
      glassHall.receiveShadow = true;
      glassHall.visible = level >= 7;

      const signalMast = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.05), roofMat.clone());
      signalMast.position.set(-0.42, 0.48, -0.28);
      signalMast.userData.buildingId = building.id;
      signalMast.castShadow = true;
      signalMast.receiveShadow = true;
      signalMast.visible = level >= 8;

      const entryArch = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.08), glowMat.clone());
      entryArch.position.set(0, 0.62, 0.34);
      entryArch.userData.buildingId = building.id;
      entryArch.visible = level >= 9;

      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 12), glowMat.clone());
      beacon.position.set(0.28, 0.95, -0.16);
      beacon.userData.buildingId = building.id;
      beacon.castShadow = true;
      beacon.receiveShadow = true;
      beacon.visible = level >= 10;

      group.add(
        walkway,
        base,
        hall,
        roof,
        canopy,
        sign,
        platform,
        platformB,
        trackGap,
        secondCanopy,
        secondCanopyB,
        clockTower,
        towerCap,
        concourse,
        bridge,
        annex,
        glassHall,
        signalMast,
        entryArch,
        beacon
      );
      this.utilityAnimations.set(building.id, {
        smoke: [],
        glow: [sign, glassHall, entryArch, beacon].filter((mesh) => mesh.visible),
        phase: building.id * 0.07
      });
      this.selectableMeshes.set(building.id, [
        walkway,
        base,
        hall,
        roof,
        canopy,
        sign,
        platform,
        platformB,
        trackGap,
        secondCanopy,
        secondCanopyB,
        clockTower,
        towerCap,
        concourse,
        bridge,
        annex,
        glassHall,
        signalMast,
        entryArch,
        beacon
      ]);
      return group;
    }

    if (building.type === 'cityHall') {
      const group = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9c4a5, roughness: 0.84, metalness: 0.03 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x5d6f86, roughness: 0.74, metalness: 0.08 });
      const accentMat = new THREE.MeshStandardMaterial({ color: 0xf1e7d3, roughness: 0.58, metalness: 0.05 });
      const glowMat = new THREE.MeshStandardMaterial({ color: 0xfef7d7, roughness: 0.22, metalness: 0.08, emissive: 0xfacc15, emissiveIntensity: 0.12 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.14, 0.9), wallMat);
      base.position.y = 0.07;
      base.userData.buildingId = building.id;
      base.castShadow = true;
      base.receiveShadow = true;
      const main = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.58), wallMat.clone());
      main.position.set(0, 0.35, 0);
      main.userData.buildingId = building.id;
      main.castShadow = true;
      main.receiveShadow = true;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), accentMat);
      tower.position.set(0, 0.56, -0.04);
      tower.userData.buildingId = building.id;
      tower.castShadow = true;
      tower.receiveShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.68), roofMat);
      roof.position.set(0, 0.6, 0);
      roof.userData.buildingId = building.id;
      roof.castShadow = true;
      roof.receiveShadow = true;
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.08, 12), glowMat);
      beacon.position.set(0, 0.94, -0.04);
      beacon.userData.buildingId = building.id;
      beacon.castShadow = true;
      beacon.receiveShadow = true;
      group.add(base, main, tower, roof, beacon);
      return group;
    }

    if (this.shouldUseIllustratedAsset(building.type)) {
      return this.createIllustratedBuilding(building);
    }

    if (building.type === 'house') {
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'house');
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'apartmentBlock') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedApartmentBlock(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0x8bb07f, 0xe4ddd2);
      }

      const group = new THREE.Group();
      const variant = building.id % 6;
      const level = building.level;
      const houseCluster = this.connectedSides(building, (candidate) => candidate.type === 'house');
      const townhouseMode = houseCluster.n || houseCluster.e || houseCluster.s || houseCluster.w;
      const houseRowLeft = this.connectedCountInDirection(building, -1, 0, (candidate) => candidate.type === 'house');
      const houseRowRight = this.connectedCountInDirection(building, 1, 0, (candidate) => candidate.type === 'house');
      const houseRowLength = 1 + houseRowLeft + houseRowRight;
      const rowhouseMode = houseRowLength >= 3;
      const wallPalette = [0xcaa17b, 0xe1c9a9, 0xb78f63, 0xd7b58c, 0xcfa7a1, 0xc9d7cc];
      const roofPalette = [0x6d5140, 0x9b5b3e, 0x6f6f72, 0x845742, 0x4d5b71, 0x46645f];
      const trimPalette = [0xaf7d52, 0xd9bc93, 0x9b7a57, 0xc69f74, 0xb48c84, 0x8fa49e];
      const tier4Widths = [0.64, 0.42, 0.76, 0.5, 0.58, 0.38];
      const tier4Heights = [0.72, 1.04, 0.66, 0.94, 0.82, 1.08];
      const tier4Depths = [0.46, 0.28, 0.52, 0.34, 0.3, 0.26];
      const tier5Widths = [0.54, 0.28, 0.72, 0.34, 0.48, 0.24];
      const tier5Heights = [1.46, 2.36, 1.18, 1.92, 1.72, 2.54];
      const tier5Depths = [0.42, 0.22, 0.5, 0.28, 0.34, 0.22];
      const tier5Offsets = [0.02, -0.18, 0.02, -0.24, 0.2, -0.06];
      const chimneyVariants = new Set([0, 2, 3]);
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

      const frontWalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.018, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xdad6cd, roughness: 0.94, metalness: 0.01 })
      );
      frontWalk.position.set(0, 0.055, 0.41);
      frontWalk.userData.buildingId = building.id;

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

      const foundation = new THREE.Mesh(
        new THREE.BoxGeometry(0.72 + (variant === 4 ? 0.08 : 0), 0.1, 0.68 + (variant === 0 ? 0.08 : 0)),
        new THREE.MeshStandardMaterial({ color: 0x8d7158, roughness: 0.88, metalness: 0.01 })
      );
      foundation.position.y = 0.08;
      foundation.castShadow = true;
      foundation.receiveShadow = true;
      foundation.userData.buildingId = building.id;

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

      const porchRoof = new THREE.Mesh(
        new THREE.BoxGeometry(variant === 3 ? 0.42 : 0.34, 0.04, 0.24),
        roofMat.clone()
      );
      porchRoof.position.set(0, 0.3, 0.35 + (variant === 0 ? 0.02 : 0));
      porchRoof.castShadow = true;
      porchRoof.receiveShadow = true;
      porchRoof.userData.buildingId = building.id;
      porchRoof.visible = variant === 0 || variant === 3 || variant === 4;

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

      const dormerBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.14, 0.14),
        wallMat.clone()
      );
      dormerBase.position.set(-0.1, variant === 3 ? 0.52 : 0.44, 0.16);
      dormerBase.castShadow = true;
      dormerBase.receiveShadow = true;
      dormerBase.userData.buildingId = building.id;
      dormerBase.visible = variant === 0 || variant === 3;

      const dormerRoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.04, 0.18),
        roofMat.clone()
      );
      dormerRoof.position.set(-0.1, variant === 3 ? 0.62 : 0.54, 0.16);
      dormerRoof.rotation.x = -0.22;
      dormerRoof.castShadow = true;
      dormerRoof.receiveShadow = true;
      dormerRoof.userData.buildingId = building.id;
      dormerRoof.visible = variant === 0 || variant === 3;

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.2, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x7b5636, roughness: 0.82, metalness: 0.01 })
      );
      door.position.set(0, 0.15, 0.355);
      door.userData.buildingId = building.id;
      const rearDoor = door.clone();
      rearDoor.position.set(0, 0.15, -0.355);
      rearDoor.userData.buildingId = building.id;

      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, variant === 2 ? 0.14 : 0.22, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x7f6659, roughness: 0.88, metalness: 0.01 })
      );
      chimney.position.set(0.19, variant === 2 ? 0.66 : 0.78, -0.14);
      chimney.castShadow = true;
      chimney.receiveShadow = true;
      chimney.userData.buildingId = building.id;
      chimney.visible = chimneyVariants.has(variant) && level < 4;

      const roofStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.86),
        new THREE.MeshStandardMaterial({ color: 0xb0825a, roughness: 0.9, metalness: 0.01 })
      );
      roofStrip.position.set(0, 0.63, 0);
      roofStrip.rotation.y = variant === 1 ? Math.PI / 4 : 0;
      roofStrip.castShadow = true;
      roofStrip.receiveShadow = true;
      roofStrip.userData.buildingId = building.id;
      roofStrip.visible = variant !== 4 && variant !== 5 && level < 4;

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

      const rearWindowLeft = windowLeft.clone();
      rearWindowLeft.position.set(-0.18, 0.28, -0.35);
      rearWindowLeft.userData.buildingId = building.id;
      const rearWindowRight = windowRight.clone();
      rearWindowRight.position.set(0.18, 0.28, -0.35);
      rearWindowRight.userData.buildingId = building.id;
      const rearPorch = porch.clone();
      rearPorch.position.set(0, 0.05, -0.36 - (variant === 0 ? 0.02 : 0));
      rearPorch.userData.buildingId = building.id;
      const rearPorchRoof = porchRoof.clone();
      rearPorchRoof.position.set(0, 0.3, -0.35 - (variant === 0 ? 0.02 : 0));
      rearPorchRoof.userData.buildingId = building.id;
      const rearAwning = awning.clone();
      rearAwning.position.set(0, 0.29, -0.39);
      rearAwning.userData.buildingId = building.id;
      const rearStep = step.clone();
      rearStep.position.set(0, 0.025, -0.43);
      rearStep.userData.buildingId = building.id;

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
      const rearPorchPostLeft = porchPostLeft.clone();
      rearPorchPostLeft.position.set(-0.11, 0.14, -0.4);
      rearPorchPostLeft.userData.buildingId = building.id;
      rearPorchPostLeft.visible = porchPostLeft.visible;
      const rearPorchPostRight = porchPostRight.clone();
      rearPorchPostRight.position.set(0.11, 0.14, -0.4);
      rearPorchPostRight.userData.buildingId = building.id;
      rearPorchPostRight.visible = porchPostRight.visible;

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

      const mailbox = this.createMailbox(variant === 1 ? 0.24 : -0.24, 0.055, 0.38, building.id, variant === 3 ? 0x8b3d33 : 0x51667f);
      mailbox.visible = variant !== 4;

      const yardBench = this.createBench(0.22, 0.04, -0.26, -0.6, building.id);
      yardBench.visible = variant === 0 || variant === 3;

      const porchBike = this.createBike(-0.24, 0.03, 0.28, 0.45, building.id, variant === 2 ? 0xc85f4d : 0x587094);
      porchBike.visible = variant === 2 || variant === 4;

      const upperAddition = new THREE.Mesh(
        new THREE.BoxGeometry(rowhouseMode ? 0.68 : townhouseMode ? 0.54 : 0.36, 0.18, 0.26),
        wallMat.clone()
      );
      upperAddition.position.set(0, 0.46, -0.08);
      upperAddition.castShadow = true;
      upperAddition.receiveShadow = true;
      upperAddition.userData.buildingId = building.id;
      upperAddition.visible = level >= 2;

      const cornice = new THREE.Mesh(
        new THREE.BoxGeometry(rowhouseMode ? 0.9 : townhouseMode ? 0.82 : 0.74, 0.04, rowhouseMode ? 0.78 : townhouseMode ? 0.72 : 0.66),
        trimMat.clone()
      );
      cornice.position.set(0, 0.44, 0);
      cornice.castShadow = true;
      cornice.receiveShadow = true;
      cornice.userData.buildingId = building.id;
      cornice.visible = townhouseMode || level >= 2;

      const sunroom = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.18, 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xd8ecf3,
          roughness: 0.24,
          metalness: 0.08,
          transparent: true,
          opacity: 0.82,
          emissive: 0x0f172a,
          emissiveIntensity: 0.06
        })
      );
      sunroom.position.set(0.26, 0.18, -0.18);
      sunroom.castShadow = true;
      sunroom.receiveShadow = true;
      sunroom.userData.buildingId = building.id;
      sunroom.visible = level >= 3 && !townhouseMode;

      const tier2ResidenceMass = new THREE.Mesh(
        new THREE.BoxGeometry(0.52 + (variant === 4 ? 0.08 : 0), 0.34, 0.34),
        wallMat.clone()
      );
      tier2ResidenceMass.position.set(0, 0.74, -0.04);
      tier2ResidenceMass.castShadow = true;
      tier2ResidenceMass.receiveShadow = true;
      tier2ResidenceMass.userData.buildingId = building.id;
      tier2ResidenceMass.visible = level >= 2 && !townhouseMode;

      const tier2ResidenceRoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.58 + (variant === 4 ? 0.08 : 0), 0.08, 0.4),
        roofMat.clone()
      );
      tier2ResidenceRoof.position.set(0, 0.96, -0.04);
      tier2ResidenceRoof.castShadow = true;
      tier2ResidenceRoof.receiveShadow = true;
      tier2ResidenceRoof.userData.buildingId = building.id;
      tier2ResidenceRoof.visible = tier2ResidenceMass.visible;

      const tier2WindowBandFront = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.1, 0.02),
        windowMat.clone()
      );
      tier2WindowBandFront.position.set(0, 0.76, 0.13);
      tier2WindowBandFront.userData.buildingId = building.id;
      tier2WindowBandFront.visible = tier2ResidenceMass.visible;
      const tier2WindowBandRear = tier2WindowBandFront.clone();
      tier2WindowBandRear.position.set(0, 0.76, -0.21);
      tier2WindowBandRear.userData.buildingId = building.id;

      const tier3ResidenceTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.92, 0.24),
        wallMat.clone()
      );
      tier3ResidenceTower.position.set(variant % 2 === 0 ? 0.18 : -0.18, 1.3, -0.02);
      tier3ResidenceTower.castShadow = true;
      tier3ResidenceTower.receiveShadow = true;
      tier3ResidenceTower.userData.buildingId = building.id;
      tier3ResidenceTower.visible = level >= 3 && !townhouseMode;

      const tier3ResidenceCrown = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.08, 0.3),
        trimMat.clone()
      );
      tier3ResidenceCrown.position.set(tier3ResidenceTower.position.x, 1.8, -0.02);
      tier3ResidenceCrown.castShadow = true;
      tier3ResidenceCrown.receiveShadow = true;
      tier3ResidenceCrown.userData.buildingId = building.id;
      tier3ResidenceCrown.visible = tier3ResidenceTower.visible;

      const tier4ResidenceSlab = new THREE.Mesh(
        new THREE.BoxGeometry(tier4Widths[variant], tier4Heights[variant], tier4Depths[variant]),
        wallMat.clone()
      );
      tier4ResidenceSlab.position.set(
        variant === 1 ? -0.06 : variant === 4 ? 0.08 : variant === 5 ? -0.02 : 0,
        0.92 + tier4Heights[variant] * 0.5,
        variant === 2 ? -0.08 : variant === 5 ? 0.02 : -0.02
      );
      tier4ResidenceSlab.castShadow = true;
      tier4ResidenceSlab.receiveShadow = true;
      tier4ResidenceSlab.userData.buildingId = building.id;
      tier4ResidenceSlab.visible = level >= 4 && !townhouseMode;

      const tier4WindowBandFront = new THREE.Mesh(
        new THREE.BoxGeometry(tier4Widths[variant] * 0.68, Math.max(0.32, tier4Heights[variant] * 0.54), 0.02),
        windowMat.clone()
      );
      tier4WindowBandFront.position.set(
        tier4ResidenceSlab.position.x,
        tier4ResidenceSlab.position.y,
        tier4ResidenceSlab.position.z + tier4Depths[variant] * 0.5 + 0.02
      );
      tier4WindowBandFront.userData.buildingId = building.id;
      tier4WindowBandFront.visible = tier4ResidenceSlab.visible;
      const tier4WindowBandRear = tier4WindowBandFront.clone();
      tier4WindowBandRear.position.set(
        tier4ResidenceSlab.position.x,
        tier4ResidenceSlab.position.y,
        tier4ResidenceSlab.position.z - tier4Depths[variant] * 0.5 - 0.02
      );
      tier4WindowBandRear.userData.buildingId = building.id;

      const tier5ResidenceTower = new THREE.Mesh(
        new THREE.BoxGeometry(tier5Widths[variant], tier5Heights[variant], tier5Depths[variant]),
        wallMat.clone()
      );
      tier5ResidenceTower.position.set(
        tier5Offsets[variant],
        1.15 + tier5Heights[variant] * 0.5,
        variant === 2 ? -0.1 : variant === 5 ? 0.04 : -0.04
      );
      tier5ResidenceTower.castShadow = true;
      tier5ResidenceTower.receiveShadow = true;
      tier5ResidenceTower.userData.buildingId = building.id;
      tier5ResidenceTower.visible = level >= 5 && !townhouseMode;

      const tier5ResidenceCrown = new THREE.Mesh(
        new THREE.BoxGeometry(tier5Widths[variant] + 0.12, 0.1, tier5Depths[variant] + 0.08),
        trimMat.clone()
      );
      tier5ResidenceCrown.position.set(
        tier5ResidenceTower.position.x,
        tier5ResidenceTower.position.y + tier5Heights[variant] * 0.5 + 0.11,
        tier5ResidenceTower.position.z
      );
      tier5ResidenceCrown.castShadow = true;
      tier5ResidenceCrown.receiveShadow = true;
      tier5ResidenceCrown.userData.buildingId = building.id;
      tier5ResidenceCrown.visible = tier5ResidenceTower.visible;

      const tier4SidePod = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 2 ? 0.2 : variant === 4 ? 0.24 : variant === 5 ? 0.16 : 0.18,
          variant === 1 ? 0.54 : variant === 4 ? 0.46 : 0.4,
          0.16
        ),
        wallMat.clone()
      );
      tier4SidePod.position.set(
        variant === 1 || variant === 3 ? -0.24 : 0.24,
        variant === 1 ? 1.16 : variant === 4 ? 1.12 : 1.02,
        variant === 2 ? -0.12 : 0.02
      );
      tier4SidePod.castShadow = true;
      tier4SidePod.receiveShadow = true;
      tier4SidePod.userData.buildingId = building.id;
      tier4SidePod.visible = level >= 4 && !townhouseMode && variant !== 0;

      const tier5SkyFrame = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 5 ? tier5Widths[variant] + 0.14 : variant === 1 ? 0.18 : 0.12,
          variant === 1 ? 0.34 : 0.22,
          0.08
        ),
        trimMat.clone()
      );
      tier5SkyFrame.position.set(
        tier5ResidenceTower.position.x,
        tier5ResidenceTower.position.y + tier5Heights[variant] * 0.5 + (variant === 1 ? 0.28 : 0.22),
        tier5ResidenceTower.position.z
      );
      tier5SkyFrame.castShadow = true;
      tier5SkyFrame.receiveShadow = true;
      tier5SkyFrame.userData.buildingId = building.id;
      tier5SkyFrame.visible = level >= 5 && !townhouseMode && (variant === 1 || variant === 5);

      const tier5BalconyBand = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 2 ? tier5Widths[variant] + 0.12 : tier5Widths[variant] + 0.06,
          0.06,
          variant === 2 ? 0.12 : 0.08
        ),
        trimMat.clone()
      );
      tier5BalconyBand.position.set(
        tier5ResidenceTower.position.x,
        tier5ResidenceTower.position.y - tier5Heights[variant] * 0.12,
        tier5ResidenceTower.position.z + tier5Depths[variant] * 0.5 + 0.05
      );
      tier5BalconyBand.castShadow = true;
      tier5BalconyBand.receiveShadow = true;
      tier5BalconyBand.userData.buildingId = building.id;
      tier5BalconyBand.visible = level >= 5 && !townhouseMode && (variant === 0 || variant === 2 || variant === 4);

      const tier5CapTower = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 3 ? 0.18 : 0.14,
          variant === 3 ? 0.74 : 0.52,
          0.14
        ),
        wallMat.clone()
      );
      tier5CapTower.position.set(
        tier5ResidenceTower.position.x + (variant === 3 ? 0.18 : variant === 4 ? -0.18 : 0),
        tier5ResidenceTower.position.y + tier5Heights[variant] * 0.32,
        tier5ResidenceTower.position.z - 0.02
      );
      tier5CapTower.castShadow = true;
      tier5CapTower.receiveShadow = true;
      tier5CapTower.userData.buildingId = building.id;
      tier5CapTower.visible = level >= 5 && !townhouseMode && (variant === 3 || variant === 4);

      const tier5SecondaryTower = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 2 ? 0.24 : variant === 5 ? 0.12 : 0.18,
          variant === 2 ? 1.38 : variant === 5 ? 1.04 : 0.92,
          variant === 2 ? 0.18 : 0.14
        ),
        wallMat.clone()
      );
      tier5SecondaryTower.position.set(
        variant === 0 ? -0.26 : variant === 2 ? 0.24 : variant === 3 ? 0.18 : -0.18,
        variant === 2 ? 1.92 : variant === 5 ? 2.08 : 1.72,
        variant === 2 ? 0.06 : -0.02
      );
      tier5SecondaryTower.castShadow = true;
      tier5SecondaryTower.receiveShadow = true;
      tier5SecondaryTower.userData.buildingId = building.id;
      tier5SecondaryTower.visible = level >= 5 && !townhouseMode && (variant === 0 || variant === 2 || variant === 3 || variant === 5);

      const tier5RoofBlade = new THREE.Mesh(
        new THREE.BoxGeometry(
          variant === 1 ? 0.08 : 0.18,
          variant === 1 ? 0.62 : 0.12,
          0.08
        ),
        trimMat.clone()
      );
      tier5RoofBlade.position.set(
        tier5ResidenceTower.position.x,
        tier5ResidenceTower.position.y + tier5Heights[variant] * 0.5 + (variant === 1 ? 0.38 : 0.22),
        tier5ResidenceTower.position.z
      );
      tier5RoofBlade.castShadow = true;
      tier5RoofBlade.receiveShadow = true;
      tier5RoofBlade.userData.buildingId = building.id;
      tier5RoofBlade.visible = level >= 5 && !townhouseMode && (variant === 1 || variant === 5);

      const rowParapet = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.06, 0.12),
        trimMat.clone()
      );
      rowParapet.position.set(0, 0.64, 0.32);
      rowParapet.castShadow = true;
      rowParapet.receiveShadow = true;
      rowParapet.userData.buildingId = building.id;
      rowParapet.visible = rowhouseMode;

      const sharedFrontWalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.02, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xdfd7ca, roughness: 0.94, metalness: 0.01 })
      );
      sharedFrontWalk.position.set(0, 0.055, 0.41);
      sharedFrontWalk.userData.buildingId = building.id;
      sharedFrontWalk.visible = rowhouseMode;

      const rowWindowBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.12, 0.02),
        windowMat.clone()
      );
      rowWindowBand.position.set(0, 0.32, 0.35);
      rowWindowBand.userData.buildingId = building.id;
      rowWindowBand.visible = rowhouseMode;

      const trellis = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.24, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x9b7656, roughness: 0.86, metalness: 0.01 })
      );
      trellis.position.set(-0.3, 0.18, -0.24);
      trellis.userData.buildingId = building.id;
      trellis.visible = level >= 3;

      const partyWallEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.48, 0.58),
        wallMat.clone()
      );
      partyWallEast.position.set(0.34, 0.26, 0);
      partyWallEast.castShadow = true;
      partyWallEast.receiveShadow = true;
      partyWallEast.userData.buildingId = building.id;
      partyWallEast.visible = townhouseMode && houseCluster.e;

      const partyWallWest = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.48, 0.58),
        wallMat.clone()
      );
      partyWallWest.position.set(-0.34, 0.26, 0);
      partyWallWest.castShadow = true;
      partyWallWest.receiveShadow = true;
      partyWallWest.userData.buildingId = building.id;
      partyWallWest.visible = townhouseMode && houseCluster.w;

      const rowStoop = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.025, 0.11),
        trimMat.clone()
      );
      rowStoop.position.set(0, 0.03, 0.44);
      rowStoop.castShadow = true;
      rowStoop.receiveShadow = true;
      rowStoop.userData.buildingId = building.id;
      rowStoop.visible = townhouseMode;

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
        puff.visible = chimney.visible && level < 4;
        return puff;
      });

      group.add(lot);
      group.add(path);
      group.add(frontWalk);
      group.add(hedgeLeft);
      group.add(planterRight);
      group.add(foundation);
      group.add(base);
      group.add(upperAddition);
      group.add(cornice);
      group.add(sunroom);
      group.add(tier2ResidenceMass);
      group.add(tier2ResidenceRoof);
      group.add(tier2WindowBandFront);
      group.add(tier2WindowBandRear);
      group.add(tier3ResidenceTower);
      group.add(tier3ResidenceCrown);
      group.add(tier4ResidenceSlab);
      group.add(tier4WindowBandFront);
      group.add(tier4WindowBandRear);
      group.add(tier4SidePod);
      group.add(tier5ResidenceTower);
      group.add(tier5ResidenceCrown);
      group.add(tier5SkyFrame);
      group.add(tier5BalconyBand);
      group.add(tier5CapTower);
      group.add(tier5SecondaryTower);
      group.add(tier5RoofBlade);
      group.add(rowParapet);
      group.add(sharedFrontWalk);
      group.add(rowWindowBand);
      group.add(trellis);
      group.add(partyWallEast);
      group.add(partyWallWest);
      group.add(rowStoop);
      group.add(roof);
      group.add(roofStrip);
      group.add(sideWing);
      group.add(fence);
      group.add(porch);
      group.add(porchRoof);
      group.add(windowLeft);
      group.add(windowRight);
      group.add(rearWindowLeft);
      group.add(rearWindowRight);
      group.add(sideWindow);
      group.add(atticWindow);
      group.add(dormerBase);
      group.add(dormerRoof);
      group.add(flowerBox);
      group.add(door);
      group.add(rearDoor);
      group.add(chimney);
      group.add(barrel);
      group.add(crate);
      group.add(awning);
      group.add(rearAwning);
      group.add(step);
      group.add(rearStep);
      group.add(porchPostLeft);
      group.add(porchPostRight);
      group.add(rearPorch);
      group.add(rearPorchRoof);
      group.add(rearPorchPostLeft);
      group.add(rearPorchPostRight);
      group.add(yardTreeTrunk);
      group.add(yardTreeTop);
      group.add(bikeShed);
      group.add(mailbox);
      group.add(yardBench);
      group.add(porchBike);
      smokePuffs.forEach((puff) => group.add(puff));

      this.selectableMeshes.set(building.id, [
        lot,
        path,
        frontWalk,
        foundation,
        base,
        upperAddition,
        cornice,
        sunroom,
        tier2ResidenceMass,
        tier2ResidenceRoof,
        tier2WindowBandFront,
        tier2WindowBandRear,
        tier3ResidenceTower,
        tier3ResidenceCrown,
        tier4ResidenceSlab,
        tier4WindowBandFront,
        tier4WindowBandRear,
        tier4SidePod,
        tier5ResidenceTower,
        tier5ResidenceCrown,
        tier5SkyFrame,
        tier5BalconyBand,
        tier5CapTower,
        tier5SecondaryTower,
        tier5RoofBlade,
        rowParapet,
        sharedFrontWalk,
        rowWindowBand,
        trellis,
        partyWallEast,
        partyWallWest,
        rowStoop,
        roof,
        roofStrip,
        sideWing,
        porch,
        porchRoof,
        windowLeft,
        windowRight,
        rearWindowLeft,
        rearWindowRight,
        sideWindow,
        atticWindow,
        dormerBase,
        dormerRoof,
        door,
        rearDoor,
        chimney,
        barrel,
        crate,
        awning,
        rearAwning,
        step,
        rearStep,
        fence,
        flowerBox,
        porchPostLeft,
        porchPostRight,
        rearPorch,
        rearPorchRoof,
        rearPorchPostLeft,
        rearPorchPostRight,
        yardTreeTrunk,
        yardTreeTop,
        bikeShed,
        ...this.collectMeshes(mailbox),
        ...this.collectMeshes(yardBench),
        ...this.collectMeshes(porchBike),
        ...smokePuffs
      ]);
      this.houseAnimations.set(building.id, {
        windows: [windowLeft, windowRight, sideWindow, atticWindow, tier2WindowBandFront, tier4WindowBandFront].filter((mesh) => mesh.visible),
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
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === building.type);
      const mergeMode = this.mergeModeForBuilding(building, sameTypeCluster);
      if (
        mergeMode === 'shopStrip' ||
        mergeMode === 'restaurantHall' ||
        mergeMode === 'superStore' ||
        mergeMode === 'retailBlock'
      ) {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedCommercialCluster(
            building,
            sameTypeCluster,
            mergeMode === 'retailBlock' ? 'shopStrip' : mergeMode
          );
        }
        return this.createClusterSupportLot(building, 0xd8d6cb, 0xe6e0d7);
      }

      const group = new THREE.Group();
      const variant = building.id % 5;
      const level = building.level;
      const commercialCluster = this.connectedSides(building, (candidate) => this.isCommercialBuilding(candidate.type));
      const stripMode = commercialCluster.n || commercialCluster.e || commercialCluster.s || commercialCluster.w;
      const stripRowMode = commercialCluster.e || commercialCluster.w;
      const isShop = building.type === 'shop';
      const isRestaurant = building.type === 'restaurant';
      const isGrocery = building.type === 'groceryStore';
      const isCornerStore = building.type === 'cornerStore';
      const isBank = building.type === 'bank';
      const sameTypeRowLeft = this.connectedCountInDirection(building, -1, 0, (candidate) => candidate.type === building.type);
      const sameTypeRowRight = this.connectedCountInDirection(building, 1, 0, (candidate) => candidate.type === building.type);
      const sameTypeRowLength = 1 + sameTypeRowLeft + sameTypeRowRight;
      const stripMallMode = isShop && sameTypeRowLength >= 3;
      const foodCourtMode = isRestaurant && sameTypeRowLength >= 2;
      const mainStreetMode = stripRowMode && !stripMallMode && !foodCourtMode;
      const leftEdgeUnit = sameTypeRowLeft === 0;
      const rightEdgeUnit = sameTypeRowRight === 0;
      const paintMat = new THREE.MeshStandardMaterial({
        color: 0xf4f7fa,
        roughness: 0.55,
        metalness: 0.01,
        emissive: 0x111111,
        emissiveIntensity: 0.04
      });
      const wallVariants = isRestaurant
        ? [0xe6ccb0, 0xd9b89c, 0xe8d3b5, 0xd9c0a7, 0xe0c4b2]
        : isGrocery
          ? [0xdbe4cc, 0xcdddbc, 0xe6ebd9, 0xd4ddc7, 0xd7e4d5]
          : isCornerStore
            ? [0xe1d5be, 0xd9c7a8, 0xe8dcc7, 0xd8ccb7, 0xe4d4c2]
            : isBank
              ? [0xd8dbe2, 0xd6dde8, 0xe1e5ea, 0xd2d6dc, 0xdfe4ea]
              : [0xd6d5c8, 0xc6d2bc, 0xe0cfbf, 0xc9d7d8, 0xdcc8b8];
      const roofVariants = isRestaurant
        ? [0x93453b, 0x8a5443, 0x7e4a39, 0x9a5e4f, 0x775347]
        : isGrocery
          ? [0x55754f, 0x4c6856, 0x5e7c63, 0x49634c, 0x637a55]
          : isCornerStore
            ? [0x7e5f43, 0x91684a, 0x6f5e48, 0x8d6f52, 0x63514a]
            : isBank
              ? [0x546377, 0x465b75, 0x5d697d, 0x4f5d68, 0x3d5368]
              : [0x5b636b, 0x6d5a43, 0x556a48, 0x4d6572, 0x7f5d4a];
      const accentVariants = isRestaurant
        ? [0xf4b05f, 0xf6c16a, 0xe99a54, 0xf0b677, 0xe28b54]
        : isGrocery
          ? [0x8fd18a, 0x74c285, 0x9ad39f, 0x7fbe72, 0x62b880]
          : isCornerStore
            ? [0xf1b476, 0xe89b5f, 0xf5c18a, 0xecae63, 0xf0c06d]
            : isBank
              ? [0xbfd6f7, 0xd3e2fb, 0xaec9ef, 0xc7daf0, 0x95c0ec]
              : [0x76a6cf, 0xd58b58, 0x83b879, 0x9c88cf, 0xe1a35b];
      const wallMat = new THREE.MeshStandardMaterial({
        color: wallVariants[variant],
        roughness: 0.78,
        metalness: 0.02
      });
      const roofMat = new THREE.MeshStandardMaterial({
        color: roofVariants[variant],
        roughness: 0.8,
        metalness: 0.02
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: accentVariants[variant],
        roughness: 0.72,
        metalness: 0.03
      });

      const perimeterWalk = new THREE.Mesh(
        new THREE.BoxGeometry(1.02, 0.022, 1),
        new THREE.MeshStandardMaterial({ color: 0xe7e4dd, roughness: 0.96, metalness: 0.01 })
      );
      perimeterWalk.position.y = 0.038;
      perimeterWalk.receiveShadow = true;
      perimeterWalk.userData.buildingId = building.id;

      const lot = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.05, 0.92),
        new THREE.MeshStandardMaterial({ color: 0xd9d1bc, roughness: 0.94, metalness: 0.01 })
      );
      lot.position.y = 0.025;
      lot.receiveShadow = true;
      lot.userData.buildingId = building.id;

      const sidewalkApron = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.02, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xded8cf, roughness: 0.95, metalness: 0.01 })
      );
      sidewalkApron.position.set(0, 0.055, 0.34);
      sidewalkApron.userData.buildingId = building.id;

      const curbLip = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.03, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xc7cfd5, roughness: 0.92, metalness: 0.01 })
      );
      curbLip.position.set(0, 0.065, 0.45);
      curbLip.userData.buildingId = building.id;

      const sideApronLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.015, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe2ddd4, roughness: 0.95, metalness: 0.01 })
      );
      sideApronLeft.position.set(-0.39, 0.055, 0.02);
      sideApronLeft.userData.buildingId = building.id;

      const sideApronRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.015, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe2ddd4, roughness: 0.95, metalness: 0.01 })
      );
      sideApronRight.position.set(0.39, 0.055, 0.02);
      sideApronRight.userData.buildingId = building.id;

      const rearApron = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.015, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xd9d3ca, roughness: 0.95, metalness: 0.01 })
      );
      rearApron.position.set(0, 0.055, -0.34);
      rearApron.userData.buildingId = building.id;

      const frontage = new THREE.Mesh(
        new THREE.BoxGeometry(0.78, 0.015, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xc8b694, roughness: 0.9, metalness: 0.01 })
      );
      frontage.position.set(0, 0.055, 0.36);
      frontage.userData.buildingId = building.id;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(
          stripMallMode || foodCourtMode ? 0.96 : isBank ? 0.88 : isCornerStore ? 0.72 : stripMode ? 0.94 : 0.9,
          stripMallMode ? 0.46 : foodCourtMode ? 0.4 : isShop ? 0.62 : isRestaurant ? 0.46 : isCornerStore ? 0.42 : isBank ? 0.5 : 0.48,
          stripMallMode ? 0.74 : foodCourtMode ? 0.82 : isCornerStore ? 0.68 : 0.78
        ),
        wallMat
      );
      body.position.y = stripMallMode ? 0.23 : foodCourtMode ? 0.2 : isShop ? 0.31 : isCornerStore ? 0.21 : 0.24;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.buildingId = building.id;

      const roof =
        stripMallMode
          ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.78), roofMat)
          : foodCourtMode
            ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roofMat)
          : isRestaurant
          ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roofMat)
          : isBank
            ? new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.84), roofMat)
            : isCornerStore
              ? new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.74), roofMat)
              : isShop
                ? new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.86), roofMat)
                : new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.84), roofMat);
      roof.position.y = stripMallMode ? 0.51 : foodCourtMode ? 0.47 : isShop ? 0.67 : isCornerStore ? 0.47 : 0.56;
      roof.castShadow = true;
      roof.receiveShadow = true;
      roof.userData.buildingId = building.id;

      const upperFloor = new THREE.Mesh(
        new THREE.BoxGeometry(isCornerStore ? 0.58 : isBank ? 0.68 : 0.74, 0.22, 0.46),
        wallMat.clone()
      );
      upperFloor.position.set(0, isShop ? 0.58 : 0.46, -0.06);
      upperFloor.castShadow = true;
      upperFloor.receiveShadow = true;
      upperFloor.userData.buildingId = building.id;
      upperFloor.visible = level >= 2 && !isCornerStore && !stripMallMode;

      const parapet = new THREE.Mesh(
        new THREE.BoxGeometry(isCornerStore ? 0.74 : isBank ? 0.84 : 0.9, 0.12, 0.08),
        wallMat.clone()
      );
      parapet.position.set(0, isShop ? 0.74 : isBank ? 0.64 : 0.61, 0.32);
      parapet.castShadow = true;
      parapet.receiveShadow = true;
      parapet.userData.buildingId = building.id;
      parapet.visible = isShop || isBank || (isCornerStore && variant >= 2);

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
      if (stripMallMode) {
        sign.scale.set(1.08, 1.1, 1);
        sign.position.y = 0.39;
      }
      if (foodCourtMode) {
        sign.scale.set(1.12, 1.08, 1);
        sign.position.y = 0.34;
      }

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

      const storefrontGlass = new THREE.Mesh(
        new THREE.BoxGeometry(isCornerStore ? 0.38 : 0.54, 0.22, 0.03),
        new THREE.MeshStandardMaterial({
          color: isBank ? 0xc9e8ff : 0xffe7b8,
          roughness: 0.18,
          metalness: 0.12,
          transparent: true,
          opacity: 0.84,
          emissive: isBank ? 0x1d4ed8 : 0xf59e0b,
          emissiveIntensity: 0.08
        })
      );
      storefrontGlass.position.set(0, isCornerStore ? 0.18 : 0.19, 0.41);
      storefrontGlass.userData.buildingId = building.id;
      storefrontGlass.visible = !isBank;
      if (stripMallMode) {
        storefrontGlass.scale.set(1.12, 0.95, 1);
        storefrontGlass.position.set(0, 0.16, 0.39);
      }
      if (foodCourtMode) {
        storefrontGlass.scale.set(1.16, 0.9, 1);
        storefrontGlass.position.set(0, 0.14, 0.39);
      }

      const rearStorefrontGlass = storefrontGlass.clone();
      rearStorefrontGlass.position.set(0, stripMallMode ? 0.16 : foodCourtMode ? 0.14 : isCornerStore ? 0.18 : 0.19, -0.41);
      rearStorefrontGlass.userData.buildingId = building.id;

      const rearAwning = awning.clone();
      rearAwning.position.set(0, stripMallMode ? 0.24 : foodCourtMode ? 0.22 : isShop ? 0.3 : isCornerStore ? 0.28 : 0.38, -0.44);
      rearAwning.userData.buildingId = building.id;
      rearAwning.visible = awning.visible;

      const rearSign = sign.clone();
      rearSign.position.set(0, stripMallMode ? 0.39 : foodCourtMode ? 0.34 : isShop ? 0.6 : isCornerStore ? 0.42 : 0.54, -0.42);
      rearSign.userData.buildingId = building.id;

      const sideGlassEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, isCornerStore ? 0.18 : 0.2, 0.34),
        new THREE.MeshStandardMaterial({
          color: isBank ? 0xc9e8ff : 0xffe7b8,
          roughness: 0.18,
          metalness: 0.12,
          transparent: true,
          opacity: 0.84,
          emissive: isBank ? 0x1d4ed8 : 0xf59e0b,
          emissiveIntensity: 0.06
        })
      );
      sideGlassEast.position.set(0.41, isCornerStore ? 0.18 : 0.2, 0.12);
      sideGlassEast.userData.buildingId = building.id;
      sideGlassEast.visible = !isBank;

      const sideGlassWest = sideGlassEast.clone();
      sideGlassWest.position.set(-0.41, isCornerStore ? 0.18 : 0.2, 0.12);
      sideGlassWest.userData.buildingId = building.id;

      const sideAwningEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.03, 0.16),
        accentMat.clone()
      );
      sideAwningEast.position.set(0.42, isShop ? 0.3 : isCornerStore ? 0.28 : 0.38, 0.12);
      sideAwningEast.rotation.y = Math.PI / 2;
      sideAwningEast.castShadow = true;
      sideAwningEast.receiveShadow = true;
      sideAwningEast.userData.buildingId = building.id;
      sideAwningEast.visible = !isBank;

      const sideAwningWest = sideAwningEast.clone();
      sideAwningWest.position.set(-0.42, isShop ? 0.3 : isCornerStore ? 0.28 : 0.38, 0.12);
      sideAwningWest.userData.buildingId = building.id;

      const stripConnector = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.05, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xe8dfd0, roughness: 0.9, metalness: 0.01 })
      );
      stripConnector.position.set(0, 0.12, 0.34);
      stripConnector.userData.buildingId = building.id;
      stripConnector.visible = stripMode;

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

      const cornerTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.34, 0.18),
        wallMat.clone()
      );
      cornerTower.position.set(-0.24, 0.24, 0.12);
      cornerTower.castShadow = true;
      cornerTower.receiveShadow = true;
      cornerTower.userData.buildingId = building.id;
      cornerTower.visible = isCornerStore;

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

      const vaultAnnex = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.2, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x93a3b5, roughness: 0.72, metalness: 0.18 })
      );
      vaultAnnex.position.set(0.3, 0.11, -0.12);
      vaultAnnex.castShadow = true;
      vaultAnnex.receiveShadow = true;
      vaultAnnex.userData.buildingId = building.id;
      vaultAnnex.visible = isBank;

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

      const umbrellaPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.74, metalness: 0.22 })
      );
      umbrellaPole.position.set(-0.24, 0.16, 0.16);
      umbrellaPole.userData.buildingId = building.id;
      umbrellaPole.visible = isRestaurant && variant >= 2;

      const umbrellaTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0xf3b562, roughness: 0.8, metalness: 0.01 })
      );
      umbrellaTop.position.set(-0.24, 0.27, 0.16);
      umbrellaTop.userData.buildingId = building.id;
      umbrellaTop.visible = isRestaurant && variant >= 2;

      const roofSignTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.34, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.74, metalness: 0.18 })
      );
      roofSignTower.position.set(0.28, isShop ? 0.9 : 0.76, -0.14);
      roofSignTower.castShadow = true;
      roofSignTower.receiveShadow = true;
      roofSignTower.userData.buildingId = building.id;
      roofSignTower.visible = level >= 3 && (isShop || isRestaurant || isGrocery);

      const tier2Mass = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.7 : isRestaurant ? 0.62 : isGrocery ? 0.74 : isBank ? 0.56 : 0.48,
          isShop ? 0.42 : isRestaurant ? 0.34 : isGrocery ? 0.4 : isBank ? 0.38 : 0.32,
          isBank ? 0.38 : isRestaurant ? 0.42 : 0.34
        ),
        wallMat.clone()
      );
      tier2Mass.position.set(
        isCornerStore ? 0.06 : 0,
        isShop ? 0.88 : isRestaurant ? 0.72 : isGrocery ? 0.78 : isBank ? 0.74 : 0.62,
        isRestaurant ? -0.06 : -0.04
      );
      tier2Mass.castShadow = true;
      tier2Mass.receiveShadow = true;
      tier2Mass.userData.buildingId = building.id;
      tier2Mass.visible = level >= 2;

      const tier2Roof = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.76 : isRestaurant ? 0.68 : isGrocery ? 0.8 : isBank ? 0.62 : 0.54,
          0.08,
          isBank ? 0.42 : isRestaurant ? 0.48 : 0.38
        ),
        roofMat.clone()
      );
      tier2Roof.position.set(tier2Mass.position.x, tier2Mass.position.y + (isShop ? 0.25 : 0.21), tier2Mass.position.z);
      tier2Roof.castShadow = true;
      tier2Roof.receiveShadow = true;
      tier2Roof.userData.buildingId = building.id;
      tier2Roof.visible = level >= 2;

      const tier2WindowBandFront = new THREE.Mesh(
        new THREE.BoxGeometry(isCornerStore ? 0.34 : isBank ? 0.44 : 0.54, 0.12, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.22,
          metalness: 0.1,
          transparent: true,
          opacity: 0.84,
          emissive: isBank ? 0x1d4ed8 : 0xf59e0b,
          emissiveIntensity: 0.09
        })
      );
      tier2WindowBandFront.position.set(tier2Mass.position.x, tier2Mass.position.y, tier2Mass.position.z + (isBank ? 0.22 : 0.2));
      tier2WindowBandFront.userData.buildingId = building.id;
      tier2WindowBandFront.visible = level >= 2;
      const tier2WindowBandRear = tier2WindowBandFront.clone();
      tier2WindowBandRear.position.set(tier2Mass.position.x, tier2Mass.position.y, tier2Mass.position.z - (isBank ? 0.22 : 0.2));
      tier2WindowBandRear.userData.buildingId = building.id;

      const tier3Tower = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.34 : isRestaurant ? 0.28 : isGrocery ? 0.32 : isBank ? 0.3 : 0.24,
          isShop ? 1.1 : isRestaurant ? 0.84 : isGrocery ? 0.96 : isBank ? 1.02 : 0.76,
          isBank ? 0.22 : 0.26
        ),
        wallMat.clone()
      );
      tier3Tower.position.set(
        isShop ? 0.24 : isRestaurant ? -0.22 : isGrocery ? 0.22 : isBank ? 0.18 : -0.18,
        isShop ? 1.22 : isRestaurant ? 1.02 : isGrocery ? 1.1 : isBank ? 1.16 : 0.92,
        -0.08
      );
      tier3Tower.castShadow = true;
      tier3Tower.receiveShadow = true;
      tier3Tower.userData.buildingId = building.id;
      tier3Tower.visible = level >= 3;

      const tier3Crown = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.4 : isRestaurant ? 0.34 : isGrocery ? 0.38 : isBank ? 0.36 : 0.28,
          0.08,
          isBank ? 0.26 : 0.3
        ),
        accentMat.clone()
      );
      tier3Crown.position.set(tier3Tower.position.x, tier3Tower.position.y + (isShop ? 0.58 : isRestaurant ? 0.45 : isGrocery ? 0.5 : isBank ? 0.53 : 0.4), tier3Tower.position.z);
      tier3Crown.castShadow = true;
      tier3Crown.receiveShadow = true;
      tier3Crown.userData.buildingId = building.id;
      tier3Crown.visible = level >= 3;

      const tier3Neon = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.18 : 0.22, 0.22, 0.03),
        new THREE.MeshStandardMaterial({
          color: isRestaurant ? 0xfec76e : isGrocery ? 0x99e2a0 : isBank ? 0xd8ecff : accentVariants[variant],
          roughness: 0.35,
          metalness: 0.08,
          emissive: isBank ? 0x1d4ed8 : 0xf59e0b,
          emissiveIntensity: 0.2
        })
      );
      tier3Neon.position.set(tier3Tower.position.x, tier3Tower.position.y + (isShop ? 0.1 : 0.06), tier3Tower.position.z + 0.15);
      tier3Neon.userData.buildingId = building.id;
      tier3Neon.visible = level >= 3;

      const tier4Podium = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.78 : isRestaurant ? 0.7 : isGrocery ? 0.82 : isBank ? 0.66 : 0.58,
          isShop ? 0.54 : isRestaurant ? 0.48 : isGrocery ? 0.52 : isBank ? 0.5 : 0.42,
          isBank ? 0.46 : isRestaurant ? 0.54 : 0.42
        ),
        wallMat.clone()
      );
      tier4Podium.position.set(
        isCornerStore ? 0.08 : 0,
        isShop ? 1.22 : isRestaurant ? 1.02 : isGrocery ? 1.1 : isBank ? 1.08 : 0.92,
        isRestaurant ? -0.06 : -0.02
      );
      tier4Podium.castShadow = true;
      tier4Podium.receiveShadow = true;
      tier4Podium.userData.buildingId = building.id;
      tier4Podium.visible = level >= 4;

      const tier4GlassBand = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.44 : 0.56, 0.12, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xf8f4d7,
          roughness: 0.18,
          metalness: 0.12,
          transparent: true,
          opacity: 0.86,
          emissive: isBank ? 0x1d4ed8 : isRestaurant ? 0xf97316 : 0xf59e0b,
          emissiveIntensity: 0.12
        })
      );
      tier4GlassBand.position.set(tier4Podium.position.x, tier4Podium.position.y, tier4Podium.position.z + 0.24);
      tier4GlassBand.userData.buildingId = building.id;
      tier4GlassBand.visible = level >= 4;
      const tier4GlassRear = tier4GlassBand.clone();
      tier4GlassRear.position.set(tier4Podium.position.x, tier4Podium.position.y, tier4Podium.position.z - 0.24);
      tier4GlassRear.userData.buildingId = building.id;

      const tier5GrandTower = new THREE.Mesh(
        new THREE.BoxGeometry(
          isShop ? 0.42 : isRestaurant ? 0.38 : isGrocery ? 0.44 : isBank ? 0.4 : 0.34,
          isShop ? 1.72 : isRestaurant ? 1.44 : isGrocery ? 1.58 : isBank ? 1.68 : 1.28,
          isBank ? 0.28 : 0.32
        ),
        wallMat.clone()
      );
      tier5GrandTower.position.set(
        isShop ? 0.18 : isRestaurant ? -0.2 : isGrocery ? 0.2 : isBank ? 0.16 : -0.16,
        isShop ? 2.0 : isRestaurant ? 1.72 : isGrocery ? 1.86 : isBank ? 1.96 : 1.52,
        -0.08
      );
      tier5GrandTower.castShadow = true;
      tier5GrandTower.receiveShadow = true;
      tier5GrandTower.userData.buildingId = building.id;
      tier5GrandTower.visible = level >= 5;

      const tier5Crown = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.46 : 0.52, 0.1, isBank ? 0.34 : 0.38),
        accentMat.clone()
      );
      tier5Crown.position.set(tier5GrandTower.position.x, tier5GrandTower.position.y + (isShop ? 0.9 : isRestaurant ? 0.76 : isGrocery ? 0.82 : isBank ? 0.86 : 0.68), tier5GrandTower.position.z);
      tier5Crown.castShadow = true;
      tier5Crown.receiveShadow = true;
      tier5Crown.userData.buildingId = building.id;
      tier5Crown.visible = level >= 5;

      const tier5Billboard = new THREE.Mesh(
        new THREE.BoxGeometry(isBank ? 0.26 : 0.3, 0.3, 0.04),
        new THREE.MeshStandardMaterial({
          color: isRestaurant ? 0xfec76e : isGrocery ? 0x99e2a0 : isBank ? 0xd8ecff : accentVariants[variant],
          roughness: 0.3,
          metalness: 0.08,
          emissive: isBank ? 0x1d4ed8 : isRestaurant ? 0xf97316 : 0xf59e0b,
          emissiveIntensity: 0.24
        })
      );
      tier5Billboard.position.set(tier5GrandTower.position.x, tier5GrandTower.position.y + 0.12, tier5GrandTower.position.z + 0.19);
      tier5Billboard.userData.buildingId = building.id;
      tier5Billboard.visible = level >= 5;

      const tier4SideBandEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.44, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xffefc9, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: isBank ? 0x1d4ed8 : 0xf59e0b, emissiveIntensity: 0.08 })
      );
      tier4SideBandEast.position.set(tier4Podium.position.x + (isBank ? 0.34 : 0.38), tier4Podium.position.y, tier4Podium.position.z);
      tier4SideBandEast.userData.buildingId = building.id;
      tier4SideBandEast.visible = level >= 4;
      const tier4SideBandWest = tier4SideBandEast.clone();
      tier4SideBandWest.position.set(tier4Podium.position.x - (isBank ? 0.34 : 0.38), tier4Podium.position.y, tier4Podium.position.z);
      tier4SideBandWest.userData.buildingId = building.id;

      const bankVaultTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.96, 0.26),
        wallMat.clone()
      );
      bankVaultTower.position.set(-0.18, 1.46, -0.04);
      bankVaultTower.castShadow = true;
      bankVaultTower.receiveShadow = true;
      bankVaultTower.userData.buildingId = building.id;
      bankVaultTower.visible = level >= 4 && isBank;

      const bankVaultDoor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.04, 18),
        new THREE.MeshStandardMaterial({ color: 0xd7dee6, roughness: 0.52, metalness: 0.22 })
      );
      bankVaultDoor.position.set(bankVaultTower.position.x, 1.28, 0.11);
      bankVaultDoor.rotation.x = Math.PI / 2;
      bankVaultDoor.userData.buildingId = building.id;
      bankVaultDoor.visible = bankVaultTower.visible;

      const financeSpire = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 1.88, 0.24),
        wallMat.clone()
      );
      financeSpire.position.set(0.18, 2.06, -0.06);
      financeSpire.castShadow = true;
      financeSpire.receiveShadow = true;
      financeSpire.userData.buildingId = building.id;
      financeSpire.visible = level >= 5 && isBank;

      const financeSpireCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.08, 0.3),
        accentMat.clone()
      );
      financeSpireCap.position.set(financeSpire.position.x, 3.02, -0.06);
      financeSpireCap.userData.buildingId = building.id;
      financeSpireCap.visible = financeSpire.visible;

      const rooftopTerrace = new THREE.Mesh(
        new THREE.BoxGeometry(isRestaurant ? 0.46 : 0.36, 0.02, isRestaurant ? 0.28 : 0.22),
        new THREE.MeshStandardMaterial({ color: 0xd9cfbc, roughness: 0.9, metalness: 0.01 })
      );
      rooftopTerrace.position.set(-0.12, isRestaurant ? 0.92 : 1.02, 0.02);
      rooftopTerrace.userData.buildingId = building.id;
      rooftopTerrace.visible = level >= 3 && (isRestaurant || isShop);

      const terraceUmbrellaPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.74, metalness: 0.22 })
      );
      terraceUmbrellaPole.position.set(-0.2, isRestaurant ? 1.02 : 1.12, 0.02);
      terraceUmbrellaPole.userData.buildingId = building.id;
      terraceUmbrellaPole.visible = rooftopTerrace.visible;

      const terraceUmbrellaTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.11, 0.1, 10),
        new THREE.MeshStandardMaterial({ color: isRestaurant ? 0xf3b562 : accentVariants[variant], roughness: 0.8, metalness: 0.01 })
      );
      terraceUmbrellaTop.position.set(-0.2, isRestaurant ? 1.14 : 1.24, 0.02);
      terraceUmbrellaTop.userData.buildingId = building.id;
      terraceUmbrellaTop.visible = rooftopTerrace.visible;

      const lampPost = this.createStreetLamp(
        isBank ? 0.33 : -0.34,
        0.055,
        isShop ? 0.24 : 0.28,
        building.id,
        isRestaurant ? 0xffd18c : isBank ? 0xcfe8ff : 0xffe6a1
      );
      lampPost.visible = !isCornerStore;

      const parcelBench = this.createBench(
        isBank ? -0.2 : 0.22,
        0.05,
        isRestaurant ? 0.24 : 0.26,
        isBank ? 0.12 : -0.15,
        building.id
      );
      parcelBench.visible = isBank || isRestaurant || (isShop && variant === 1);

      const planterAccentA = this.createPlanterBox(
        0x8d6846,
        isBank ? 0x7caac2 : isGrocery ? 0x6ba067 : 0x6a975f,
        -0.32,
        0.05,
        0.25,
        building.id,
        0.12,
        0.12
      );
      const planterAccentB = this.createPlanterBox(
        0x8d6846,
        isRestaurant ? 0x8fb566 : isCornerStore ? 0x7a9f63 : 0x6c9d68,
        0.32,
        0.05,
        0.25,
        building.id,
        0.12,
        0.12
      );
      planterAccentB.visible = !isShop || variant !== 0;

      const dumpster = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.12, 0.1),
        new THREE.MeshStandardMaterial({ color: isRestaurant ? 0x6e7b4c : 0x677481, roughness: 0.82, metalness: 0.14 })
      );
      dumpster.position.set(0.32, 0.07, -0.28);
      dumpster.castShadow = true;
      dumpster.receiveShadow = true;
      dumpster.userData.buildingId = building.id;
      dumpster.visible = isRestaurant || isGrocery || (isShop && variant === 2);

      const parkedCarB =
        isShop && variant === 2
          ? this.createParkedCar(0x546c88, 0.18, 0.07, -0.29, 0, building.id, 0.92)
          : null;

      const bikeRack = this.createBike(
        isBank ? -0.26 : 0.24,
        0.03,
        0.27,
        isBank ? -0.15 : 0.2,
        building.id,
        isRestaurant ? 0xc76b42 : isGrocery ? 0x5d7d52 : 0x587094
      );
      bikeRack.visible = isCornerStore || isGrocery || (isShop && variant === 1);

      const stripCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.035, 0.18),
        accentMat.clone()
      );
      stripCanopy.position.set(0, 0.24, 0.47);
      stripCanopy.castShadow = true;
      stripCanopy.receiveShadow = true;
      stripCanopy.userData.buildingId = building.id;
      stripCanopy.visible = stripMode && !isBank && !isCornerStore;

      const sideConnectorEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.52),
        wallMat.clone()
      );
      sideConnectorEast.position.set(0.45, 0.24, 0.02);
      sideConnectorEast.castShadow = true;
      sideConnectorEast.receiveShadow = true;
      sideConnectorEast.userData.buildingId = building.id;
      sideConnectorEast.visible = commercialCluster.e && stripMode;

      const sideConnectorWest = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.3, 0.52),
        wallMat.clone()
      );
      sideConnectorWest.position.set(-0.45, 0.24, 0.02);
      sideConnectorWest.castShadow = true;
      sideConnectorWest.receiveShadow = true;
      sideConnectorWest.userData.buildingId = building.id;
      sideConnectorWest.visible = commercialCluster.w && stripMode;

      const stripParapet = new THREE.Mesh(
        new THREE.BoxGeometry(stripRowMode ? 0.96 : 0.86, 0.06, 0.1),
        wallMat.clone()
      );
      stripParapet.position.set(0, isShop ? 0.73 : isCornerStore ? 0.56 : 0.62, 0.3);
      stripParapet.castShadow = true;
      stripParapet.receiveShadow = true;
      stripParapet.userData.buildingId = building.id;
      stripParapet.visible = stripRowMode;

      const stripPartyEast = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, isShop ? 0.5 : 0.38, 0.7),
        wallMat.clone()
      );
      stripPartyEast.position.set(0.43, isShop ? 0.25 : 0.2, 0.02);
      stripPartyEast.castShadow = true;
      stripPartyEast.receiveShadow = true;
      stripPartyEast.userData.buildingId = building.id;
      stripPartyEast.visible = commercialCluster.e && stripRowMode;

      const stripPartyWest = stripPartyEast.clone();
      stripPartyWest.position.set(-0.43, isShop ? 0.25 : 0.2, 0.02);
      stripPartyWest.userData.buildingId = building.id;
      stripPartyWest.visible = commercialCluster.w && stripRowMode;

      const stripEndCapLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.3, 0.12),
        accentMat.clone()
      );
      stripEndCapLeft.position.set(-0.4, 0.36, 0.36);
      stripEndCapLeft.castShadow = true;
      stripEndCapLeft.receiveShadow = true;
      stripEndCapLeft.userData.buildingId = building.id;
      stripEndCapLeft.visible = stripMallMode && leftEdgeUnit;

      const stripEndCapRight = stripEndCapLeft.clone();
      stripEndCapRight.position.set(0.4, 0.36, 0.36);
      stripEndCapRight.userData.buildingId = building.id;
      stripEndCapRight.visible = stripMallMode && rightEdgeUnit;

      const mainStreetBand = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.05, 0.06),
        accentMat.clone()
      );
      mainStreetBand.position.set(0, 0.46, 0.41);
      mainStreetBand.userData.buildingId = building.id;
      mainStreetBand.visible = mainStreetMode;

      const mainStreetBandRear = mainStreetBand.clone();
      mainStreetBandRear.position.set(0, 0.46, -0.41);
      mainStreetBandRear.userData.buildingId = building.id;

      const endPilasterLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.32, 0.08),
        wallMat.clone()
      );
      endPilasterLeft.position.set(-0.4, 0.22, 0.38);
      endPilasterLeft.userData.buildingId = building.id;
      endPilasterLeft.visible = mainStreetMode && leftEdgeUnit;

      const endPilasterRight = endPilasterLeft.clone();
      endPilasterRight.position.set(0.4, 0.22, 0.38);
      endPilasterRight.userData.buildingId = building.id;
      endPilasterRight.visible = mainStreetMode && rightEdgeUnit;

      const patioDeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.88, 0.02, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xd9cfbc, roughness: 0.9, metalness: 0.01 })
      );
      patioDeck.position.set(0, 0.055, 0.28);
      patioDeck.userData.buildingId = building.id;
      patioDeck.visible = foodCourtMode;

      const patioCanopy = new THREE.Mesh(
        new THREE.BoxGeometry(0.94, 0.04, 0.2),
        accentMat.clone()
      );
      patioCanopy.position.set(0, 0.22, 0.32);
      patioCanopy.castShadow = true;
      patioCanopy.receiveShadow = true;
      patioCanopy.userData.buildingId = building.id;
      patioCanopy.visible = foodCourtMode;

      const menuMonolithLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.22, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf2d5a4, roughness: 0.74, metalness: 0.02 })
      );
      menuMonolithLeft.position.set(-0.34, 0.16, 0.28);
      menuMonolithLeft.userData.buildingId = building.id;
      menuMonolithLeft.visible = foodCourtMode && leftEdgeUnit;

      const menuMonolithRight = menuMonolithLeft.clone();
      menuMonolithRight.position.set(0.34, 0.16, 0.28);
      menuMonolithRight.userData.buildingId = building.id;
      menuMonolithRight.visible = foodCourtMode && rightEdgeUnit;

      const rearEntry = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x7b6248, roughness: 0.78, metalness: 0.04 })
      );
      rearEntry.position.set(0, 0.13, -0.39);
      rearEntry.userData.buildingId = building.id;
      rearEntry.visible = stripMallMode;

      group.add(perimeterWalk);
      group.add(lot);
      group.add(sidewalkApron);
      group.add(curbLip);
      group.add(sideApronLeft);
      group.add(sideApronRight);
      group.add(rearApron);
      group.add(frontage);
      group.add(body);
      group.add(upperFloor);
      group.add(roof);
      group.add(parapet);
      group.add(awning);
      group.add(rearAwning);
      group.add(sign);
      group.add(rearSign);
      group.add(windowL);
      group.add(windowR);
      group.add(storefrontGlass);
      group.add(rearStorefrontGlass);
      group.add(sideGlassEast);
      group.add(sideGlassWest);
      group.add(stripConnector);
      group.add(cafeTable);
      group.add(cafeStool);
      group.add(displayRack);
      group.add(crateStack);
      group.add(atm);
      group.add(vaultAnnex);
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
      group.add(cornerTower);
      group.add(burgerIcon);
      group.add(burgerPatty);
      group.add(parkingPad);
      group.add(parkingStripeA);
      group.add(parkingStripeB);
      group.add(patioDeck);
      group.add(patioCanopy);
      group.add(menuMonolithLeft);
      group.add(menuMonolithRight);
      if (parkedCar) group.add(parkedCar);
      if (parkedCarB) group.add(parkedCarB);
      group.add(marketCanopy);
      group.add(sandwichBoard);
      group.add(umbrellaPole);
      group.add(umbrellaTop);
      group.add(roofSignTower);
      group.add(tier2Mass);
      group.add(tier2Roof);
      group.add(tier2WindowBandFront);
      group.add(tier2WindowBandRear);
      group.add(tier3Tower);
      group.add(tier3Crown);
      group.add(tier3Neon);
      group.add(tier4Podium);
      group.add(tier4GlassBand);
      group.add(tier4GlassRear);
      group.add(tier4SideBandEast);
      group.add(tier4SideBandWest);
      group.add(tier5GrandTower);
      group.add(tier5Crown);
      group.add(tier5Billboard);
      group.add(bankVaultTower);
      group.add(bankVaultDoor);
      group.add(financeSpire);
      group.add(financeSpireCap);
      group.add(rooftopTerrace);
      group.add(terraceUmbrellaPole);
      group.add(terraceUmbrellaTop);
      group.add(lampPost);
      group.add(parcelBench);
      group.add(planterAccentA);
      group.add(planterAccentB);
      group.add(dumpster);
      group.add(bikeRack);
      group.add(sideAwningEast);
      group.add(sideAwningWest);
      group.add(stripCanopy);
      group.add(sideConnectorEast);
      group.add(sideConnectorWest);
      group.add(stripParapet);
      group.add(stripPartyEast);
      group.add(stripPartyWest);
      group.add(stripEndCapLeft);
      group.add(stripEndCapRight);
      group.add(mainStreetBand);
      group.add(mainStreetBandRear);
      group.add(endPilasterLeft);
      group.add(endPilasterRight);
      group.add(rearEntry);
      this.selectableMeshes.set(building.id, [
        perimeterWalk,
        lot,
        sidewalkApron,
        curbLip,
        sideApronLeft,
        sideApronRight,
        rearApron,
        frontage,
        body,
        upperFloor,
        roof,
        parapet,
        awning,
        rearAwning,
        sign,
        rearSign,
        windowL,
        windowR,
        storefrontGlass,
        rearStorefrontGlass,
        sideGlassEast,
        sideGlassWest,
        stripConnector,
        cafeTable,
        cafeStool,
        displayRack,
        crateStack,
        atm,
        vaultAnnex,
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
        cornerTower,
        burgerIcon,
        burgerPatty,
        parkingPad,
        parkingStripeA,
        parkingStripeB,
        patioDeck,
        patioCanopy,
        menuMonolithLeft,
        menuMonolithRight,
        ...(parkedCar ? this.collectMeshes(parkedCar) : []),
        ...(parkedCarB ? this.collectMeshes(parkedCarB) : []),
        ...this.collectMeshes(marketCanopy),
        umbrellaPole,
        umbrellaTop,
        roofSignTower,
        tier2Mass,
        tier2Roof,
        tier2WindowBandFront,
        tier2WindowBandRear,
        tier3Tower,
        tier3Crown,
        tier3Neon,
        tier4Podium,
        tier4GlassBand,
        tier4GlassRear,
        tier4SideBandEast,
        tier4SideBandWest,
        tier5GrandTower,
        tier5Crown,
        tier5Billboard,
        bankVaultTower,
        bankVaultDoor,
        financeSpire,
        financeSpireCap,
        rooftopTerrace,
        terraceUmbrellaPole,
        terraceUmbrellaTop,
        ...this.collectMeshes(lampPost),
        ...this.collectMeshes(parcelBench),
        ...this.collectMeshes(planterAccentA),
        ...this.collectMeshes(planterAccentB),
        dumpster,
        ...this.collectMeshes(bikeRack),
        sandwichBoard,
        sideAwningEast,
        sideAwningWest,
        stripCanopy,
        sideConnectorEast,
        sideConnectorWest,
        stripParapet,
        stripPartyEast,
        stripPartyWest,
        stripEndCapLeft,
        stripEndCapRight,
        mainStreetBand,
        mainStreetBandRear,
        endPilasterLeft,
        endPilasterRight,
        rearEntry
      ]);
      return group;
    }

    if (building.type === 'park') {
      const group = new THREE.Group();
      const level = building.level;
      const variant = building.id % 5;
      const parkCluster = this.connectedSides(building, (candidate) => candidate.type === 'park');
      const lawnPalette = [0x6ba367, 0x73ab71, 0x7cab65, 0x76a970, 0x82ae74];
      const pathPalette = [0xcfbc99, 0xd9c7a7, 0xc9b48b, 0xd4c3a0, 0xe0cead];
      const treePalette = [0x4f8758, 0x567e4b, 0x648f55, 0x4a7a62, 0x6d9858];
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.06, 0.92),
        new THREE.MeshStandardMaterial({ color: lawnPalette[variant], roughness: 0.95, metalness: 0.01 })
      );
      lawn.position.y = 0.03;
      lawn.castShadow = false;
      lawn.receiveShadow = true;
      lawn.userData.buildingId = building.id;

      const path = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.02, 0.72),
        new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.9, metalness: 0.01 })
      );
      path.position.y = 0.055;
      path.userData.buildingId = building.id;

      const crossPath = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.02, 0.2),
        new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.9, metalness: 0.01 })
      );
      crossPath.position.y = 0.055;
      crossPath.userData.buildingId = building.id;
      crossPath.visible = level >= 2 || parkCluster.e || parkCluster.w;

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
        new THREE.MeshStandardMaterial({ color: treePalette[variant], roughness: 0.86, metalness: 0.01 })
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

      const fountainBase = new THREE.Mesh(
        new THREE.CylinderGeometry(level >= 3 ? 0.24 : level >= 2 ? 0.18 : 0.16, level >= 3 ? 0.26 : level >= 2 ? 0.2 : 0.18, 0.05, 18),
        new THREE.MeshStandardMaterial({ color: 0xd9d8d2, roughness: 0.92, metalness: 0.02 })
      );
      fountainBase.position.set(0, 0.08, 0);
      fountainBase.castShadow = true;
      fountainBase.receiveShadow = true;
      fountainBase.userData.buildingId = building.id;
      fountainBase.visible = level >= 2;

      const fountainWater = new THREE.Mesh(
        new THREE.CylinderGeometry(level >= 3 ? 0.2 : level >= 2 ? 0.14 : 0.12, level >= 3 ? 0.22 : level >= 2 ? 0.15 : 0.13, 0.02, 18),
        new THREE.MeshStandardMaterial({
          color: 0x9fd7f2,
          roughness: 0.24,
          metalness: 0.06,
          emissive: 0x0f172a,
          emissiveIntensity: 0.04
        })
      );
      fountainWater.position.set(0, 0.11, 0);
      fountainWater.userData.buildingId = building.id;
      fountainWater.visible = level >= 2;

      const gazeboRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.2, 0.16, 6),
        new THREE.MeshStandardMaterial({ color: 0x8c6344, roughness: 0.84, metalness: 0.02 })
      );
      gazeboRoof.position.set(0.2, 0.29, -0.18);
      gazeboRoof.castShadow = true;
      gazeboRoof.receiveShadow = true;
      gazeboRoof.userData.buildingId = building.id;
      gazeboRoof.visible = level >= 3;

      const gazeboDeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.03, 6),
        new THREE.MeshStandardMaterial({ color: 0xd7c6ad, roughness: 0.9, metalness: 0.01 })
      );
      gazeboDeck.position.set(0.2, 0.075, -0.18);
      gazeboDeck.userData.buildingId = building.id;
      gazeboDeck.visible = level >= 3;

      const civicPlaza = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.02, 0.62),
        new THREE.MeshStandardMaterial({ color: 0xe4d8c5, roughness: 0.92, metalness: 0.01 })
      );
      civicPlaza.position.set(0, 0.058, 0);
      civicPlaza.userData.buildingId = building.id;
      civicPlaza.visible = level >= 2;

      const pavilionBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.03, 0.26),
        new THREE.MeshStandardMaterial({ color: 0xdbccb7, roughness: 0.9, metalness: 0.01 })
      );
      pavilionBase.position.set(-0.2, 0.07, -0.18);
      pavilionBase.userData.buildingId = building.id;
      pavilionBase.visible = level >= 3;

      const monument = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.34, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xe7e2d8, roughness: 0.84, metalness: 0.03 })
      );
      monument.position.set(0, 0.25, 0);
      monument.userData.buildingId = building.id;
      monument.visible = level >= 3;

      const formalHedge = this.createPlanterBox(0x8f7457, treePalette[variant], 0.26, 0.04, -0.22, building.id, 0.22, 0.12);
      formalHedge.visible = level >= 2;

      const parkLampB = this.createStreetLamp(0.26, 0.05, -0.24, building.id, 0xffe3a8);
      parkLampB.visible = level >= 3;

      const amphitheater = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.38, 0.08, 18),
        new THREE.MeshStandardMaterial({ color: 0xd8ccb8, roughness: 0.9, metalness: 0.01 })
      );
      amphitheater.position.set(-0.12, 0.09, 0.04);
      amphitheater.userData.buildingId = building.id;
      amphitheater.visible = level >= 4;

      const amphitheaterLawn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.03, 18),
        new THREE.MeshStandardMaterial({ color: lawnPalette[(variant + 2) % 5], roughness: 0.96, metalness: 0.01 })
      );
      amphitheaterLawn.position.set(-0.12, 0.12, 0.04);
      amphitheaterLawn.userData.buildingId = building.id;
      amphitheaterLawn.visible = level >= 4;

      const conservatory = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.24, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xd9f4ef, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.82, emissive: 0x34d399, emissiveIntensity: 0.08 })
      );
      conservatory.position.set(0.22, 0.2, -0.18);
      conservatory.userData.buildingId = building.id;
      conservatory.visible = level >= 5;

      const conservatoryRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.16, 8),
        new THREE.MeshStandardMaterial({ color: 0x89b89f, roughness: 0.7, metalness: 0.04 })
      );
      conservatoryRoof.position.set(0.22, 0.4, -0.18);
      conservatoryRoof.userData.buildingId = building.id;
      conservatoryRoof.visible = level >= 5;

      const flowerBedA = this.createPlanterBox(0x9b7a58, 0x83ad6d, -0.28, 0.04, 0.28, building.id, 0.18, 0.12);
      flowerBedA.visible = true;
      const flowerBedB = this.createPlanterBox(0x9b7a58, 0x8db96f, 0.3, 0.04, 0.24, building.id, 0.16, 0.12);
      flowerBedB.visible = level >= 2;
      const parkLamp = this.createStreetLamp(-0.28, 0.05, -0.24, building.id, 0xffe3a8);
      parkLamp.visible = level >= 2;
      const pergola = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.04, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x9f7a56, roughness: 0.84, metalness: 0.02 })
      );
      pergola.position.set(-0.22, 0.22, -0.22);
      pergola.userData.buildingId = building.id;
      pergola.visible = level >= 3;

      const merryBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.04, 18),
        new THREE.MeshStandardMaterial({ color: 0xe9d6a8, roughness: 0.86, metalness: 0.02 })
      );
      merryBase.position.set(0.22, 0.08, 0.18);
      merryBase.userData.buildingId = building.id;
      merryBase.visible = level >= 6;

      const merryTop = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf0b55c, roughness: 0.72, metalness: 0.03 })
      );
      merryTop.position.set(0.22, 0.24, 0.18);
      merryTop.userData.buildingId = building.id;
      merryTop.visible = level >= 6;

      const swingFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.04, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.7, metalness: 0.14 })
      );
      swingFrame.position.set(-0.24, 0.34, 0.18);
      swingFrame.userData.buildingId = building.id;
      swingFrame.visible = level >= 7;

      const swingLegA = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.28, 0.03), new THREE.MeshStandardMaterial({ color: 0x8fa3b5, roughness: 0.7, metalness: 0.14 }));
      swingLegA.position.set(-0.34, 0.18, 0.18);
      swingLegA.rotation.z = 0.18;
      swingLegA.userData.buildingId = building.id;
      swingLegA.visible = level >= 7;
      const swingLegB = swingLegA.clone();
      swingLegB.position.x = -0.14;
      swingLegB.rotation.z = -0.18;
      swingLegB.userData.buildingId = building.id;

      const slideTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.24, 0.14),
        new THREE.MeshStandardMaterial({ color: 0xd4c2a8, roughness: 0.82, metalness: 0.02 })
      );
      slideTower.position.set(0.28, 0.18, -0.1);
      slideTower.userData.buildingId = building.id;
      slideTower.visible = level >= 8;

      const slideRamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.04, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xdf6d4d, roughness: 0.8, metalness: 0.02 })
      );
      slideRamp.position.set(0.16, 0.12, -0.02);
      slideRamp.rotation.z = -0.48;
      slideRamp.userData.buildingId = building.id;
      slideRamp.visible = level >= 8;

      const picnicPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.025, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xe5d9c8, roughness: 0.9, metalness: 0.01 })
      );
      picnicPad.position.set(-0.02, 0.07, -0.28);
      picnicPad.userData.buildingId = building.id;
      picnicPad.visible = level >= 9;

      const picnicRoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.05, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x8f6a4d, roughness: 0.8, metalness: 0.03 })
      );
      picnicRoof.position.set(-0.02, 0.28, -0.28);
      picnicRoof.userData.buildingId = building.id;
      picnicRoof.visible = level >= 9;

      const splashPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.025, 18),
        new THREE.MeshStandardMaterial({ color: 0x9fdaf1, roughness: 0.18, metalness: 0.06, emissive: 0x38bdf8, emissiveIntensity: 0.1 })
      );
      splashPad.position.set(-0.22, 0.08, -0.02);
      splashPad.userData.buildingId = building.id;
      splashPad.visible = level >= 10;

      group.add(lawn);
      group.add(path);
      group.add(crossPath);
      group.add(treeTrunk);
      group.add(treeTop);
      group.add(bench);
      group.add(civicPlaza);
      group.add(fountainBase);
      group.add(fountainWater);
      group.add(gazeboRoof);
      group.add(gazeboDeck);
      group.add(pavilionBase);
      group.add(monument);
      group.add(flowerBedA);
      group.add(flowerBedB);
      group.add(parkLamp);
      group.add(formalHedge);
      group.add(parkLampB);
      group.add(amphitheater);
      group.add(amphitheaterLawn);
      group.add(conservatory);
      group.add(conservatoryRoof);
      group.add(pergola);
      group.add(merryBase);
      group.add(merryTop);
      group.add(swingFrame);
      group.add(swingLegA);
      group.add(swingLegB);
      group.add(slideTower);
      group.add(slideRamp);
      group.add(picnicPad);
      group.add(picnicRoof);
      group.add(splashPad);
      this.utilityAnimations.set(building.id, {
        smoke: [],
        glow: [fountainWater, conservatory, splashPad].filter((mesh) => mesh.visible),
        phase: building.id * 0.09
      });
      this.selectableMeshes.set(building.id, [
        lawn,
        path,
        crossPath,
        treeTrunk,
        treeTop,
        bench,
        civicPlaza,
        fountainBase,
        fountainWater,
        gazeboRoof,
        gazeboDeck,
        pavilionBase,
        monument,
        ...this.collectMeshes(flowerBedA),
        ...this.collectMeshes(flowerBedB),
        ...this.collectMeshes(parkLamp),
        ...this.collectMeshes(formalHedge),
        ...this.collectMeshes(parkLampB),
        amphitheater,
        amphitheaterLawn,
        conservatory,
        conservatoryRoof,
        pergola,
        merryBase,
        merryTop,
        swingFrame,
        swingLegA,
        swingLegB,
        slideTower,
        slideRamp,
        picnicPad,
        picnicRoof,
        splashPad
      ]);
      return group;
    }

    if (building.type === 'workshop') {
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'workshop');
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'workshopYard') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedWorkshopYard(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0xc7b8a3, 0xd9d4ca);
      }

      const group = new THREE.Group();
      const variant = building.id % 5;
      const level = building.level;
      const wallPalette = [0x9d947f, 0xa58a70, 0x8f9887, 0xa49683, 0x90827a];
      const roofPalette = [0x6a727e, 0x7a6458, 0x5e6f68, 0x6c6d79, 0x5d6368];
      const pipePalette = [0x6c7782, 0x7d6f68, 0x687a74, 0x707884, 0x626d78];
      const wallMat = new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.82, metalness: 0.04 });
      const roofMat = new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.76, metalness: 0.12 });
      const pipeMat = new THREE.MeshStandardMaterial({ color: pipePalette[variant], roughness: 0.72, metalness: 0.16 });

      const perimeterWalk = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.025, 0.98),
        new THREE.MeshStandardMaterial({ color: 0xdfddd8, roughness: 0.95, metalness: 0.01 })
      );
      perimeterWalk.position.y = 0.032;
      perimeterWalk.receiveShadow = true;
      perimeterWalk.userData.buildingId = building.id;

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

      const apron = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.02, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xd1cbc3, roughness: 0.94, metalness: 0.01 })
      );
      apron.position.set(0, 0.055, 0.42);
      apron.userData.buildingId = building.id;
      const rearApron = apron.clone();
      rearApron.position.set(0, 0.055, -0.42);
      rearApron.userData.buildingId = building.id;

      const workLamp = this.createStreetLamp(0.3, 0.055, 0.26, building.id, 0xffd18c);
      const rearWorkLamp = this.createStreetLamp(-0.3, 0.055, -0.26, building.id, 0xffd18c);

      const rollupDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.24, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xcdd4da, roughness: 0.62, metalness: 0.16 })
      );
      rollupDoor.position.set(-0.24, 0.16, 0.44);
      rollupDoor.userData.buildingId = building.id;
      const rearRollupDoor = rollupDoor.clone();
      rearRollupDoor.position.set(0.24, 0.16, -0.44);
      rearRollupDoor.userData.buildingId = building.id;

      const loadingBay = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.04, 0.16),
        new THREE.MeshStandardMaterial({ color: 0xbda37e, roughness: 0.86, metalness: 0.01 })
      );
      loadingBay.position.set(-0.24, 0.05, 0.42);
      loadingBay.userData.buildingId = building.id;
      const rearLoadingBay = loadingBay.clone();
      rearLoadingBay.position.set(0.24, 0.05, -0.42);
      rearLoadingBay.userData.buildingId = building.id;

      const sideTank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.34, 12),
        pipeMat.clone()
      );
      sideTank.position.set(0.34, 0.19, -0.16);
      sideTank.castShadow = true;
      sideTank.receiveShadow = true;
      sideTank.userData.buildingId = building.id;

      const skylightA = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.06, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x9fb4c4, roughness: 0.32, metalness: 0.1, emissive: 0x0f172a, emissiveIntensity: 0.08 })
      );
      skylightA.position.set(-0.16, 0.7, -0.08);
      skylightA.rotation.x = -0.28;
      skylightA.userData.buildingId = building.id;

      const skylightB = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.06, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x9fb4c4, roughness: 0.32, metalness: 0.1, emissive: 0x0f172a, emissiveIntensity: 0.08 })
      );
      skylightB.position.set(0.14, 0.7, variant === 2 ? 0.06 : -0.08);
      skylightB.rotation.x = -0.28;
      skylightB.userData.buildingId = building.id;

      const annex = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.24, 0.24),
        wallMat.clone()
      );
      annex.position.set(0.32, 0.13, 0.26);
      annex.castShadow = true;
      annex.receiveShadow = true;
      annex.userData.buildingId = building.id;
      annex.visible = level >= 2;

      const gantry = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.04, 0.18),
        pipeMat.clone()
      );
      gantry.position.set(0.2, 0.84, 0.14);
      gantry.userData.buildingId = building.id;
      gantry.visible = level >= 3;

      const officeBlock = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.34, 0.28),
        wallMat.clone()
      );
      officeBlock.position.set(variant % 2 === 0 ? -0.18 : 0.18, 0.82, 0.04);
      officeBlock.castShadow = true;
      officeBlock.receiveShadow = true;
      officeBlock.userData.buildingId = building.id;
      officeBlock.visible = level >= 2;

      const stackTower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.1, 0.78, 12),
        pipeMat.clone()
      );
      stackTower.position.set(variant % 2 === 0 ? 0.34 : -0.34, 1.02, -0.06);
      stackTower.castShadow = true;
      stackTower.receiveShadow = true;
      stackTower.userData.buildingId = building.id;
      stackTower.visible = level >= 3;

      const craneArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.05, 0.08),
        pipeMat.clone()
      );
      craneArm.position.set(0.04, 1.06, 0.18);
      craneArm.userData.buildingId = building.id;
      craneArm.visible = level >= 3;

      const fabricationTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.88, 0.26),
        wallMat.clone()
      );
      fabricationTower.position.set(variant % 2 === 0 ? -0.26 : 0.26, 1.18, -0.04);
      fabricationTower.castShadow = true;
      fabricationTower.receiveShadow = true;
      fabricationTower.userData.buildingId = building.id;
      fabricationTower.visible = level >= 4;

      const fabricationGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.18, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xd8efff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0x38bdf8, emissiveIntensity: 0.12 })
      );
      fabricationGlass.position.set(fabricationTower.position.x, 1.18, 0.11);
      fabricationGlass.userData.buildingId = building.id;
      fabricationGlass.visible = level >= 4;

      const megaCraneMast = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.18, 0.06),
        pipeMat.clone()
      );
      megaCraneMast.position.set(0.38, 0.82, 0.06);
      megaCraneMast.userData.buildingId = building.id;
      megaCraneMast.visible = level >= 5;

      const megaCraneBoom = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.72, metalness: 0.12 })
      );
      megaCraneBoom.position.set(0.56, 1.38, 0.08);
      megaCraneBoom.userData.buildingId = building.id;
      megaCraneBoom.visible = level >= 5;

      group.add(perimeterWalk);
      group.add(body);
      group.add(roof);
      group.add(vent);
      group.add(crate);
      group.add(apron);
      group.add(rearApron);
      group.add(rollupDoor);
      group.add(rearRollupDoor);
      group.add(loadingBay);
      group.add(rearLoadingBay);
      group.add(sideTank);
      group.add(skylightA);
      group.add(skylightB);
      group.add(annex);
      group.add(gantry);
      group.add(officeBlock);
      group.add(stackTower);
      group.add(craneArm);
      group.add(fabricationTower);
      group.add(fabricationGlass);
      group.add(megaCraneMast);
      group.add(megaCraneBoom);
      group.add(workLamp);
      group.add(rearWorkLamp);
      this.selectableMeshes.set(building.id, [
        perimeterWalk,
        body,
        roof,
        vent,
        crate,
        apron,
        rearApron,
        rollupDoor,
        rearRollupDoor,
        loadingBay,
        rearLoadingBay,
        sideTank,
        skylightA,
        skylightB,
        annex,
        gantry,
        officeBlock,
        stackTower,
        craneArm,
        fabricationTower,
        fabricationGlass,
        megaCraneMast,
        megaCraneBoom,
        ...this.collectMeshes(workLamp),
        ...this.collectMeshes(rearWorkLamp)
      ]);
      return group;
    }

    if (
      building.type === 'hospital' ||
      building.type === 'policeStation' ||
      building.type === 'fireStation'
    ) {
      if (building.type === 'hospital') {
        const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'hospital');
        if (this.mergeModeForBuilding(building, sameTypeCluster) === 'megaHospital') {
          if (sameTypeCluster.anchorId === building.id) {
            return this.createMergedHospitalCampus(building, sameTypeCluster);
          }
          return this.createClusterSupportLot(building, 0xd8ddd8, 0xe7e3dc);
        }
      }
      if (building.type === 'policeStation' || building.type === 'fireStation') {
        const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === building.type);
        if (this.mergeModeForBuilding(building, sameTypeCluster) === 'serviceCampus') {
          if (sameTypeCluster.anchorId === building.id) {
            return this.createMergedServiceCampus(building, sameTypeCluster);
          }
          return this.createClusterSupportLot(
            building,
            building.type === 'policeStation' ? 0xd7dee6 : 0xded2cb,
            0xe7e3dc
          );
        }
      }

      const group = new THREE.Group();
      const isHospital = building.type === 'hospital';
      const isPolice = building.type === 'policeStation';
      const civicCluster = this.connectedSides(building, (candidate) => this.isCivicBuilding(candidate.type));
      const civicCampusMode = civicCluster.n || civicCluster.e || civicCluster.s || civicCluster.w;
      const perimeterWalk = new THREE.Mesh(
        new THREE.BoxGeometry(isHospital ? 2.04 : 1.08, 0.025, isHospital ? 2.04 : 1.08),
        new THREE.MeshStandardMaterial({ color: isHospital ? 0xe6e2db : isPolice ? 0xe1e6ec : 0xe7ddd6, roughness: 0.95, metalness: 0.01 })
      );
      perimeterWalk.position.y = 0.032;
      perimeterWalk.receiveShadow = true;
      perimeterWalk.userData.buildingId = building.id;

      const lot = new THREE.Mesh(
        new THREE.BoxGeometry(isHospital ? 1.92 : 0.98, 0.05, isHospital ? 1.92 : 0.98),
        new THREE.MeshStandardMaterial({ color: isHospital ? 0xd8ddd8 : isPolice ? 0xd3d9e2 : 0xdbcfca, roughness: 0.95, metalness: 0.01 })
      );
      lot.position.y = 0.025;
      lot.receiveShadow = true;
      lot.userData.buildingId = building.id;

      const plazaEast = new THREE.Mesh(
        new THREE.BoxGeometry(isHospital ? 0.26 : 0.18, 0.018, isHospital ? 0.94 : 0.7),
        new THREE.MeshStandardMaterial({ color: 0xe6e2db, roughness: 0.95, metalness: 0.01 })
      );
      plazaEast.position.set(isHospital ? 0.98 : 0.58, 0.05, 0);
      plazaEast.userData.buildingId = building.id;
      plazaEast.visible = civicCluster.e;

      const plazaWest = plazaEast.clone();
      plazaWest.position.set(isHospital ? -0.98 : -0.58, 0.05, 0);
      plazaWest.userData.buildingId = building.id;
      plazaWest.visible = civicCluster.w;

      const plazaNorth = new THREE.Mesh(
        new THREE.BoxGeometry(isHospital ? 1.2 : 0.74, 0.018, isHospital ? 0.24 : 0.18),
        new THREE.MeshStandardMaterial({ color: 0xe6e2db, roughness: 0.95, metalness: 0.01 })
      );
      plazaNorth.position.set(0, 0.05, isHospital ? -0.98 : -0.58);
      plazaNorth.userData.buildingId = building.id;
      plazaNorth.visible = civicCluster.n;

      const plazaSouth = plazaNorth.clone();
      plazaSouth.position.set(0, 0.05, isHospital ? 0.98 : 0.58);
      plazaSouth.userData.buildingId = building.id;
      plazaSouth.visible = civicCluster.s;

      if (isHospital) {
        const level = building.level;
        const variant = building.id % 5;
        const wallPalette = [0xecf1f5, 0xe6edf3, 0xf1f3f7, 0xe7eef0, 0xeceff2];
        const wingPalette = [0xd9e3ec, 0xd7dde9, 0xe1e8ee, 0xd6e1e6, 0xdfe5eb];
        const roofPalette = [0x9ab0c4, 0x90a3b6, 0x8ea8bc, 0x839eb3, 0x98a8b7];
        const wallMat = new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.72, metalness: 0.03 });
        const wingMat = new THREE.MeshStandardMaterial({ color: wingPalette[variant], roughness: 0.74, metalness: 0.03 });
        const roofMat = new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.8, metalness: 0.04 });
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

        const entryWalk = new THREE.Mesh(
          new THREE.BoxGeometry(1.56, 0.02, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xe0dfdb, roughness: 0.95, metalness: 0.01 })
        );
        entryWalk.position.set(0, 0.06, 0.88);
        entryWalk.userData.buildingId = building.id;
        const rearEntryWalk = entryWalk.clone();
        rearEntryWalk.position.set(0, 0.06, -0.88);
        rearEntryWalk.userData.buildingId = building.id;

        const mainWing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.68, 0.9), wallMat);
        mainWing.position.set(0, 0.34, -0.1);
        mainWing.castShadow = true;
        mainWing.receiveShadow = true;
        mainWing.userData.buildingId = building.id;

        const eastWing = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.58, 0.78), wingMat);
        eastWing.position.set(0.62, 0.3, 0.42);
        eastWing.castShadow = true;
        eastWing.receiveShadow = true;
        eastWing.userData.buildingId = building.id;

        const westWing = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.52, 0.74), wingMat.clone());
        westWing.position.set(-0.62, 0.26, 0.4);
        westWing.castShadow = true;
        westWing.receiveShadow = true;
        westWing.userData.buildingId = building.id;

        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1), roofMat);
        roof.position.set(0, 0.72, -0.1);
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
        const rearRedCross = redCross.clone();
        rearRedCross.position.set(0, 0.42, -0.83);
        rearRedCross.userData.buildingId = building.id;

        const ambulanceCanopy = new THREE.Mesh(
          new THREE.BoxGeometry(0.52, 0.05, 0.26),
          new THREE.MeshStandardMaterial({ color: 0xc94949, roughness: 0.72, metalness: 0.05 })
        );
        ambulanceCanopy.position.set(-0.48, 0.34, 0.76);
        ambulanceCanopy.castShadow = true;
        ambulanceCanopy.receiveShadow = true;
        ambulanceCanopy.userData.buildingId = building.id;
        const rearAmbulanceCanopy = ambulanceCanopy.clone();
        rearAmbulanceCanopy.position.set(0.48, 0.34, -0.76);
        rearAmbulanceCanopy.userData.buildingId = building.id;

        const ambulance = this.createParkedCar(0xf3f4f6, -0.52, 0.08, 0.84, Math.PI / 2, building.id, 1.08);
        const medStripe = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.02, 0.06),
          new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.66, metalness: 0.02 })
        );
        medStripe.position.set(0, 0.14, 0.06);
        medStripe.userData.buildingId = building.id;
        ambulance.add(medStripe);

        const campusLampLeft = this.createStreetLamp(-0.76, 0.055, 0.82, building.id, 0xcfe8ff);
        const campusLampRight = this.createStreetLamp(0.76, 0.055, 0.82, building.id, 0xcfe8ff);
        const rearCampusLampLeft = this.createStreetLamp(-0.76, 0.055, -0.82, building.id, 0xcfe8ff);
        const rearCampusLampRight = this.createStreetLamp(0.76, 0.055, -0.82, building.id, 0xcfe8ff);
        const campusPlanterLeft = this.createPlanterBox(0x9b7b58, 0x6e9f68, -0.76, 0.05, 0.58, building.id, 0.18, 0.18);
        const campusPlanterRight = this.createPlanterBox(0x9b7b58, 0x6e9f68, 0.76, 0.05, 0.58, building.id, 0.18, 0.18);

        group.add(perimeterWalk);
        group.add(plazaEast);
        group.add(plazaWest);
        group.add(plazaNorth);
        group.add(plazaSouth);
        group.add(lot);
        group.add(driveway);
        group.add(entryWalk);
        group.add(rearEntryWalk);
        group.add(mainWing);
        group.add(eastWing);
        group.add(westWing);
        group.add(roof);
        group.add(atrium);
        group.add(helipad);
        group.add(helipadMarkA);
        group.add(helipadMarkB);
        group.add(redCross);
        group.add(rearRedCross);
        group.add(ambulanceCanopy);
        group.add(rearAmbulanceCanopy);
        group.add(ambulance);
        group.add(campusLampLeft);
        group.add(campusLampRight);
        group.add(rearCampusLampLeft);
        group.add(rearCampusLampRight);
        group.add(campusPlanterLeft);
        group.add(campusPlanterRight);
        const clinicTower = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.18, 0.32), wallMat.clone());
        clinicTower.position.set(-0.76, 0.6, -0.22);
        clinicTower.castShadow = true;
        clinicTower.receiveShadow = true;
        clinicTower.userData.buildingId = building.id;

        const emergencySign = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.12, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.06, emissive: 0xdc2626, emissiveIntensity: 0.24 })
        );
        emergencySign.position.set(-0.72, 0.55, 0.11);
        emergencySign.userData.buildingId = building.id;

        const rehabWing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.54), wingMat.clone());
        rehabWing.position.set(0.74, 0.15, -0.46);
        rehabWing.castShadow = true;
        rehabWing.receiveShadow = true;
        rehabWing.userData.buildingId = building.id;
        rehabWing.visible = level >= 2;

        const skyBridge = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.18), glassMat.clone());
        skyBridge.position.set(0.42, 0.44, 0.12);
        skyBridge.userData.buildingId = building.id;
        skyBridge.visible = level >= 3;

        const clinicPod = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.3, 0.34), wingMat.clone());
        clinicPod.position.set(-0.68, 0.16, -0.52);
        clinicPod.castShadow = true;
        clinicPod.receiveShadow = true;
        clinicPod.userData.buildingId = building.id;
        clinicPod.visible = level >= 2;

        const researchTower = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.42, 0.28), wallMat.clone());
        researchTower.position.set(variant % 2 === 0 ? 0.76 : -0.76, 1.08, -0.18);
        researchTower.castShadow = true;
        researchTower.receiveShadow = true;
        researchTower.userData.buildingId = building.id;
        researchTower.visible = level >= 3;

        const patientTower = new THREE.Mesh(new THREE.BoxGeometry(0.46, 2.28, 0.38), wallMat.clone());
        patientTower.position.set(variant % 2 === 0 ? 0.76 : -0.76, 1.58, 0.02);
        patientTower.castShadow = true;
        patientTower.receiveShadow = true;
        patientTower.userData.buildingId = building.id;
        patientTower.visible = level >= 4;

        const patientGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 1.56, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xdaf4ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.86, emissive: 0x7dd3fc, emissiveIntensity: 0.12 })
        );
        patientGlass.position.set(patientTower.position.x, 1.58, 0.22);
        patientGlass.userData.buildingId = building.id;
        patientGlass.visible = level >= 4;

        const medSpire = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.1, 0.28), wallMat.clone());
        medSpire.position.set(variant % 2 === 0 ? -0.74 : 0.74, 2.2, -0.12);
        medSpire.castShadow = true;
        medSpire.receiveShadow = true;
        medSpire.userData.buildingId = building.id;
        medSpire.visible = level >= 5;

        const spireCap = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.08, 0.28),
          roofMat.clone()
        );
        spireCap.position.set(medSpire.position.x, 3.8, medSpire.position.z);
        spireCap.userData.buildingId = building.id;
        spireCap.visible = level >= 5;

        const diagnosticsWing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.54, 0.42), wingMat.clone());
        diagnosticsWing.position.set(0.1, 0.36, -0.56);
        diagnosticsWing.castShadow = true;
        diagnosticsWing.receiveShadow = true;
        diagnosticsWing.userData.buildingId = building.id;
        diagnosticsWing.visible = level >= 2;

        const labTower = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.86, 0.28), wallMat.clone());
        labTower.position.set(variant % 2 === 0 ? 0.18 : -0.18, 1.44, -0.46);
        labTower.castShadow = true;
        labTower.receiveShadow = true;
        labTower.userData.buildingId = building.id;
        labTower.visible = level >= 4;

        const labGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 1.02, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xdaf4ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.86, emissive: 0x7dd3fc, emissiveIntensity: 0.14 })
        );
        labGlass.position.set(labTower.position.x, 1.44, -0.3);
        labGlass.userData.buildingId = building.id;
        labGlass.visible = level >= 4;

        const centralAtriumSpine = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 1.24, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xd8f2ff, roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.88, emissive: 0x7dd3fc, emissiveIntensity: 0.14 })
        );
        centralAtriumSpine.position.set(0, 1.08, 0.1);
        centralAtriumSpine.userData.buildingId = building.id;
        centralAtriumSpine.visible = level >= 3;

        const towerSkyBridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.64, 0.12, 0.18),
          glassMat.clone()
        );
        towerSkyBridge.position.set(0, 1.82, 0.04);
        towerSkyBridge.userData.buildingId = building.id;
        towerSkyBridge.visible = level >= 5;

        const helipadRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.38, 0.024, 8, 28),
          new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 0.24, metalness: 0.08, emissive: 0xdc2626, emissiveIntensity: 0.18 })
        );
        helipadRing.rotation.x = Math.PI / 2;
        helipadRing.position.set(0.5, 0.75, -0.18);
        helipadRing.userData.buildingId = building.id;
        helipadRing.visible = level >= 4;

        const emergencyPod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.3), wingMat.clone());
        emergencyPod.position.set(-0.76, 0.22, 0.62);
        emergencyPod.castShadow = true;
        emergencyPod.receiveShadow = true;
        emergencyPod.userData.buildingId = building.id;
        emergencyPod.visible = level >= 3;

        const campusArch = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.12, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xd7dee6, roughness: 0.8, metalness: 0.04 })
        );
        campusArch.position.set(civicCluster.e ? 0.94 : -0.94, 0.26, 0);
        campusArch.userData.buildingId = building.id;
        campusArch.visible = civicCampusMode && (civicCluster.e || civicCluster.w);

        this.selectableMeshes.set(building.id, [
          perimeterWalk,
          plazaEast,
          plazaWest,
          plazaNorth,
          plazaSouth,
          lot,
          driveway,
          entryWalk,
          rearEntryWalk,
          mainWing,
          eastWing,
          westWing,
          roof,
          atrium,
          helipad,
          helipadMarkA,
          helipadMarkB,
          redCross,
          rearRedCross,
          ambulanceCanopy,
          rearAmbulanceCanopy,
          ...this.collectMeshes(ambulance),
          ...this.collectMeshes(campusLampLeft),
          ...this.collectMeshes(campusLampRight),
          ...this.collectMeshes(rearCampusLampLeft),
          ...this.collectMeshes(rearCampusLampRight),
          ...this.collectMeshes(campusPlanterLeft),
          ...this.collectMeshes(campusPlanterRight),
          clinicTower,
          emergencySign,
          clinicPod,
          diagnosticsWing,
          researchTower,
          patientTower,
          patientGlass,
          labTower,
          labGlass,
          centralAtriumSpine,
          towerSkyBridge,
          helipadRing,
          emergencyPod,
          medSpire,
          spireCap,
          campusArch
        ]);
        group.add(clinicTower);
        group.add(emergencySign);
        group.add(rehabWing);
        group.add(skyBridge);
        group.add(clinicPod);
        group.add(diagnosticsWing);
        group.add(researchTower);
        group.add(patientTower);
        group.add(patientGlass);
        group.add(labTower);
        group.add(labGlass);
        group.add(centralAtriumSpine);
        group.add(towerSkyBridge);
        group.add(helipadRing);
        group.add(emergencyPod);
        group.add(medSpire);
        group.add(spireCap);
        group.add(campusArch);
        this.utilityAnimations.set(building.id, {
          smoke: [],
          glow: [
            atrium,
            redCross,
            rearRedCross,
            patientGlass,
            labGlass,
            centralAtriumSpine,
            towerSkyBridge,
            helipadRing,
            emergencySign
          ].filter((mesh) => mesh.visible),
          phase: building.id * 0.14
        });
        return group;
      }

      if (isPolice) {
        const level = building.level;
        const variant = building.id % 5;
        const wallPalette = [0xdfe7f0, 0xd7e2ed, 0xe5ebf2, 0xd9e5e8, 0xdfe3ea];
        const roofPalette = [0x4b5f79, 0x3f556f, 0x54677d, 0x455d72, 0x5b6078];
        const trimPalette = [0xa8b9cb, 0xb4c4d5, 0x9cb2c5, 0xb7c8cf, 0xafbcc7];
        const wallMat = new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.74, metalness: 0.03 });
        const roofMat = new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.8, metalness: 0.05 });
        const trimMat = new THREE.MeshStandardMaterial({ color: trimPalette[variant], roughness: 0.82, metalness: 0.02 });

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
        const rearSteps = steps.clone();
        rearSteps.position.set(0, 0.03, -0.45);
        rearSteps.userData.buildingId = building.id;

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
        const rearBadge = badge.clone();
        rearBadge.position.set(0, 0.38, -0.37);
        rearBadge.userData.buildingId = building.id;

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
        const rearLightBar = lightBar.clone();
        rearLightBar.position.set(-0.24, 0.1, -0.26);
        rearLightBar.userData.buildingId = building.id;

        const policeWalk = new THREE.Mesh(
          new THREE.BoxGeometry(0.84, 0.02, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xe0dfdb, roughness: 0.95, metalness: 0.01 })
        );
        policeWalk.position.set(0, 0.055, 0.42);
        policeWalk.userData.buildingId = building.id;
        const rearPoliceWalk = policeWalk.clone();
        rearPoliceWalk.position.set(0, 0.055, -0.42);
        rearPoliceWalk.userData.buildingId = building.id;

        const precinctBench = this.createBench(-0.22, 0.05, 0.26, 0, building.id);
        const precinctLamp = this.createStreetLamp(0.28, 0.055, 0.26, building.id, 0xb8d8ff);
        const rearPrecinctLamp = this.createStreetLamp(-0.28, 0.055, -0.26, building.id, 0xb8d8ff);

        group.add(perimeterWalk);
        group.add(plazaEast);
        group.add(plazaWest);
        group.add(plazaNorth);
        group.add(plazaSouth);
        group.add(lot);
        group.add(body);
        group.add(roof);
        group.add(portico);
        group.add(steps);
        group.add(rearSteps);
        group.add(badge);
        group.add(rearBadge);
        group.add(lightBar);
        group.add(rearLightBar);
        group.add(policeWalk);
        group.add(rearPoliceWalk);
        group.add(precinctBench);
        group.add(precinctLamp);
        group.add(rearPrecinctLamp);
        const cruiser = this.createParkedCar(0x1f4c8f, -0.26, 0.08, -0.18, 0, building.id, 0.92);
        const flagPole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, 0.54, 8),
          new THREE.MeshStandardMaterial({ color: 0xb8c2cc, roughness: 0.68, metalness: 0.22 })
        );
        flagPole.position.set(0.32, 0.31, 0.12);
        flagPole.userData.buildingId = building.id;

        const flag = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.08, 0.01),
          new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.76, metalness: 0.01 })
        );
        flag.position.set(0.39, 0.46, 0.12);
        flag.userData.buildingId = building.id;

        const commandWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.26), trimMat.clone());
        commandWing.position.set(-0.28, 0.12, -0.16);
        commandWing.castShadow = true;
        commandWing.receiveShadow = true;
        commandWing.userData.buildingId = building.id;
        commandWing.visible = level >= 2;

        const radarDish = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16),
          new THREE.MeshStandardMaterial({ color: 0xd6dee6, roughness: 0.62, metalness: 0.16 })
        );
        radarDish.position.set(-0.24, 0.64, -0.1);
        radarDish.rotation.z = -0.35;
        radarDish.userData.buildingId = building.id;
        radarDish.visible = level >= 3;

        const campusKiosk = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 0.22, 0.08),
          new THREE.MeshStandardMaterial({ color: 0xa2b6c9, roughness: 0.72, metalness: 0.08 })
        );
        campusKiosk.position.set(civicCluster.e ? 0.46 : -0.46, 0.12, -0.2);
        campusKiosk.userData.buildingId = building.id;
        campusKiosk.visible = civicCampusMode;

        const operationsTower = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.92, 0.22),
          trimMat.clone()
        );
        operationsTower.position.set(variant % 2 === 0 ? -0.34 : 0.34, 0.98, -0.08);
        operationsTower.castShadow = true;
        operationsTower.receiveShadow = true;
        operationsTower.userData.buildingId = building.id;
        operationsTower.visible = level >= 3;

        const hqWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.44, 0.42, 0.32),
          trimMat.clone()
        );
        hqWing.position.set(-0.02, 0.72, -0.08);
        hqWing.castShadow = true;
        hqWing.receiveShadow = true;
        hqWing.userData.buildingId = building.id;
        hqWing.visible = level >= 4;

        const hqGlass = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.22, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xe7f6ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0x60a5fa, emissiveIntensity: 0.1 })
        );
        hqGlass.position.set(0, 0.74, 0.15);
        hqGlass.userData.buildingId = building.id;
        hqGlass.visible = level >= 4;

        const justiceSpire = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 1.68, 0.24),
          trimMat.clone()
        );
        justiceSpire.position.set(variant % 2 === 0 ? 0.28 : -0.28, 1.74, -0.08);
        justiceSpire.castShadow = true;
        justiceSpire.receiveShadow = true;
        justiceSpire.userData.buildingId = building.id;
        justiceSpire.visible = level >= 5;

        const justiceCap = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.08, 0.3),
          roofMat.clone()
        );
        justiceCap.position.set(justiceSpire.position.x, 2.62, -0.08);
        justiceCap.userData.buildingId = building.id;
        justiceCap.visible = level >= 5;

        const recordsWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.24, 0.28),
          trimMat.clone()
        );
        recordsWing.position.set(0.28, 0.14, -0.2);
        recordsWing.castShadow = true;
        recordsWing.receiveShadow = true;
        recordsWing.userData.buildingId = building.id;
        recordsWing.visible = level >= 2;

        group.add(cruiser);
        group.add(flagPole);
        group.add(flag);
        group.add(commandWing);
        group.add(radarDish);
        group.add(campusKiosk);
        group.add(operationsTower);
        group.add(recordsWing);
        group.add(hqWing);
        group.add(hqGlass);
        group.add(justiceSpire);
        group.add(justiceCap);
        this.selectableMeshes.set(building.id, [
          perimeterWalk,
          plazaEast,
          plazaWest,
          plazaNorth,
          plazaSouth,
          lot,
          body,
          roof,
          portico,
          steps,
          rearSteps,
          badge,
          rearBadge,
          lightBar,
          rearLightBar,
          policeWalk,
          rearPoliceWalk,
          ...this.collectMeshes(cruiser),
          flagPole,
          flag,
          commandWing,
          radarDish,
          campusKiosk,
          operationsTower,
          recordsWing,
          hqWing,
          hqGlass,
          justiceSpire,
          justiceCap,
          ...this.collectMeshes(precinctBench),
          ...this.collectMeshes(precinctLamp),
          ...this.collectMeshes(rearPrecinctLamp)
        ]);
        return group;
      }

      const level = building.level;
      const variant = building.id % 5;
      const wallPalette = [0xe4c5bb, 0xe0beb2, 0xe8cdc3, 0xdcbdb4, 0xe5c8b6];
      const roofPalette = [0xaf473f, 0x9c3d36, 0xba584b, 0xa74f45, 0x8d4037];
      const wallMat = new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.75, metalness: 0.03 });
      const roofMat = new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.78, metalness: 0.04 });
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
      const rearBayLeft = bayLeft.clone();
      rearBayLeft.position.set(-0.16, 0.15, -0.35);
      rearBayLeft.userData.buildingId = building.id;
      const rearBayRight = bayRight.clone();
      rearBayRight.position.set(0.16, 0.15, -0.35);
      rearBayRight.userData.buildingId = building.id;

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

      const fireWalk = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.02, 0.18),
        new THREE.MeshStandardMaterial({ color: 0xe1dbd4, roughness: 0.95, metalness: 0.01 })
      );
      fireWalk.position.set(0, 0.055, 0.44);
      fireWalk.userData.buildingId = building.id;
      const rearFireWalk = fireWalk.clone();
      rearFireWalk.position.set(0, 0.055, -0.44);
      rearFireWalk.userData.buildingId = building.id;

      const hydrant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10),
        new THREE.MeshStandardMaterial({ color: 0xdd3d38, roughness: 0.7, metalness: 0.08 })
      );
      hydrant.position.set(-0.3, 0.08, 0.24);
      hydrant.castShadow = true;
      hydrant.receiveShadow = true;
      hydrant.userData.buildingId = building.id;

      const fireLamp = this.createStreetLamp(0.3, 0.055, 0.28, building.id, 0xffd7a8);
      const rearFireLamp = this.createStreetLamp(-0.3, 0.055, -0.28, building.id, 0xffd7a8);
      const fireTruck = this.createParkedCar(0xc3312f, 0.02, 0.08, -0.18, 0, building.id, 1.04);
      const ladderRack = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.03, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xd9dee3, roughness: 0.62, metalness: 0.24 })
      );
      ladderRack.position.set(0, 0.18, 0);
      ladderRack.userData.buildingId = building.id;
      fireTruck.add(ladderRack);

      const annexBay = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.22), wallMat.clone());
      annexBay.position.set(-0.3, 0.12, -0.1);
      annexBay.castShadow = true;
      annexBay.receiveShadow = true;
      annexBay.userData.buildingId = building.id;
      annexBay.visible = level >= 2;

      const hoseRack = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.14, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xf9d2b2, roughness: 0.66, metalness: 0.06 })
      );
      hoseRack.position.set(0.34, 0.18, -0.22);
      hoseRack.userData.buildingId = building.id;
      hoseRack.visible = level >= 3;

      const campusBay = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.14, 0.18),
        wallMat.clone()
      );
      campusBay.position.set(civicCluster.e ? 0.46 : -0.46, 0.12, -0.16);
      campusBay.castShadow = true;
      campusBay.receiveShadow = true;
      campusBay.userData.buildingId = building.id;
      campusBay.visible = civicCampusMode;

      const dormerWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.26, 0.26),
        wallMat.clone()
      );
      dormerWing.position.set(-0.28, 0.14, -0.18);
      dormerWing.castShadow = true;
      dormerWing.receiveShadow = true;
      dormerWing.userData.buildingId = building.id;
      dormerWing.visible = level >= 2;

      const watchTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.94, 0.2),
        wallMat.clone()
      );
      watchTower.position.set(variant % 2 === 0 ? 0.38 : -0.38, 0.96, -0.06);
      watchTower.castShadow = true;
      watchTower.receiveShadow = true;
      watchTower.userData.buildingId = building.id;
      watchTower.visible = level >= 3;

      const engineHall = new THREE.Mesh(
        new THREE.BoxGeometry(0.44, 0.42, 0.34),
        wallMat.clone()
      );
      engineHall.position.set(-0.04, 0.72, -0.1);
      engineHall.castShadow = true;
      engineHall.receiveShadow = true;
      engineHall.userData.buildingId = building.id;
      engineHall.visible = level >= 4;

      const engineGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.2, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xffefe5, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0xf97316, emissiveIntensity: 0.12 })
      );
      engineGlass.position.set(-0.04, 0.72, 0.15);
      engineGlass.userData.buildingId = building.id;
      engineGlass.visible = level >= 4;

      const ladderTower = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 1.7, 0.24),
        wallMat.clone()
      );
      ladderTower.position.set(variant % 2 === 0 ? 0.26 : -0.26, 1.74, -0.08);
      ladderTower.castShadow = true;
      ladderTower.receiveShadow = true;
      ladderTower.userData.buildingId = building.id;
      ladderTower.visible = level >= 5;

      const ladderCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 0.3),
        roofMat.clone()
      );
      ladderCap.position.set(ladderTower.position.x, 2.62, -0.08);
      ladderCap.userData.buildingId = building.id;
      ladderCap.visible = level >= 5;

      group.add(perimeterWalk);
      group.add(plazaEast);
      group.add(plazaWest);
      group.add(plazaNorth);
      group.add(plazaSouth);
      group.add(lot);
      group.add(body);
      group.add(roof);
      group.add(bayLeft);
      group.add(bayRight);
      group.add(rearBayLeft);
      group.add(rearBayRight);
      group.add(tower);
      group.add(siren);
      group.add(fireWalk);
      group.add(rearFireWalk);
      group.add(hydrant);
      group.add(fireTruck);
      group.add(annexBay);
      group.add(hoseRack);
      group.add(campusBay);
      group.add(dormerWing);
      group.add(watchTower);
      group.add(engineHall);
      group.add(engineGlass);
      group.add(ladderTower);
      group.add(ladderCap);
      group.add(fireLamp);
      group.add(rearFireLamp);
      this.selectableMeshes.set(building.id, [
        perimeterWalk,
        plazaEast,
        plazaWest,
        plazaNorth,
        plazaSouth,
        lot,
        body,
        roof,
        bayLeft,
        bayRight,
        rearBayLeft,
        rearBayRight,
        tower,
        siren,
        fireWalk,
        rearFireWalk,
        hydrant,
        ...this.collectMeshes(fireTruck),
        annexBay,
        hoseRack,
        campusBay,
        dormerWing,
        watchTower,
        engineHall,
        engineGlass,
        ladderTower,
        ladderCap,
        ...this.collectMeshes(fireLamp),
        ...this.collectMeshes(rearFireLamp)
      ]);
      return group;
    }

    const group = new THREE.Group();
    if (building.type === 'powerPlant') {
      const sameTypeCluster = this.connectedCluster(building, (candidate) => candidate.type === 'powerPlant');
      if (this.mergeModeForBuilding(building, sameTypeCluster) === 'megaPlant') {
        if (sameTypeCluster.anchorId === building.id) {
          return this.createMergedPowerComplex(building, sameTypeCluster);
        }
        return this.createClusterSupportLot(building, 0xb8c1cb, 0xd7dade);
      }
    }

    const level = building.level;
    const variant = building.id % 5;
    const bodyPalette = [0x95a7b8, 0x8ba0ad, 0x9ea7b4, 0x8799a8, 0x97a2af];
    const pipePalette = [0x7f8a93, 0x768089, 0x838b95, 0x6f7882, 0x80858e];
    const accentPalette = [0xd8e0e6, 0xcfd8de, 0xdfe6ea, 0xd3dde2, 0xd6dde6];
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyPalette[variant], roughness: 0.72, metalness: 0.08 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: pipePalette[variant], roughness: 0.74, metalness: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: accentPalette[variant], roughness: 0.62, metalness: 0.18 });

    const perimeterWalk = new THREE.Mesh(
      new THREE.BoxGeometry(2.04, 0.025, 2.04),
      new THREE.MeshStandardMaterial({ color: 0xd6d9dd, roughness: 0.94, metalness: 0.02 })
    );
    perimeterWalk.position.y = 0.032;
    perimeterWalk.receiveShadow = true;
    perimeterWalk.userData.buildingId = building.id;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(1.95, 0.06, 1.95),
      new THREE.MeshStandardMaterial({ color: 0xb8c1cb, roughness: 0.92, metalness: 0.03 })
    );
    pad.position.y = 0.03;
    pad.receiveShadow = true;
    pad.userData.buildingId = building.id;

    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.72, 0.96), bodyMat);
    hall.position.set(-0.34, 0.36, 0.12);
    hall.castShadow = true;
    hall.receiveShadow = true;
    hall.userData.buildingId = building.id;

    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.08, 1.04), accentMat);
    hallRoof.position.set(-0.34, 0.78, 0.12);
    hallRoof.castShadow = true;
    hallRoof.receiveShadow = true;
    hallRoof.userData.buildingId = building.id;

    const transformer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.34), accentMat.clone());
    transformer.position.set(-0.72, 0.14, -0.48);
    transformer.castShadow = true;
    transformer.receiveShadow = true;
    transformer.userData.buildingId = building.id;

    const coolingTowerA = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.42, 18), pipeMat);
    coolingTowerA.position.set(0.54, 0.74, -0.22);
    coolingTowerA.castShadow = true;
    coolingTowerA.receiveShadow = true;
    coolingTowerA.userData.buildingId = building.id;

    const coolingTowerB = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.56, 18), pipeMat.clone());
    coolingTowerB.position.set(0.9, 0.82, 0.22);
    coolingTowerB.castShadow = true;
    coolingTowerB.receiveShadow = true;
    coolingTowerB.userData.buildingId = building.id;

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.64, 16), pipeMat.clone());
    stack.position.set(0.08, 0.94, -0.58);
    stack.castShadow = true;
    stack.receiveShadow = true;
    stack.userData.buildingId = building.id;

    const stackSmoke = this.createSmokePuffs(building.id, { x: stack.position.x, y: 1.88, z: stack.position.z }, 5, 1.05);

    const substation = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.2, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xa9b3bc, roughness: 0.8, metalness: 0.14 })
    );
    substation.position.set(0.16, 0.12, 0.62);
    substation.castShadow = true;
    substation.receiveShadow = true;
    substation.userData.buildingId = building.id;

    const powerCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.3, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0xfff1b3,
        roughness: 0.35,
        metalness: 0.08,
        emissive: 0xffb300,
        emissiveIntensity: 0.4
      })
    );
    powerCore.position.set(-0.08, 0.38, 0.58);
    powerCore.castShadow = true;
    powerCore.receiveShadow = true;
    powerCore.userData.buildingId = building.id;

    const fence = new THREE.Mesh(
      new THREE.BoxGeometry(1.64, 0.14, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x69727d, roughness: 0.76, metalness: 0.16 })
    );
    fence.position.set(0, 0.1, 0.94);
    fence.userData.buildingId = building.id;
    const rearFence = fence.clone();
    rearFence.position.set(0, 0.1, -0.94);
    rearFence.userData.buildingId = building.id;

    const utilityTruck = this.createParkedCar(0xd99b43, -0.66, 0.08, 0.72, Math.PI / 2, building.id, 1.1);
    const yardContainer = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x7b8792, roughness: 0.8, metalness: 0.14 })
    );
    yardContainer.position.set(-0.7, 0.12, -0.68);
    yardContainer.castShadow = true;
    yardContainer.receiveShadow = true;
    yardContainer.userData.buildingId = building.id;

    const serviceWalk = new THREE.Mesh(
      new THREE.BoxGeometry(1.32, 0.02, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xd5d7d8, roughness: 0.95, metalness: 0.01 })
    );
    serviceWalk.position.set(-0.18, 0.055, 0.88);
    serviceWalk.userData.buildingId = building.id;
    const rearServiceWalk = serviceWalk.clone();
    rearServiceWalk.position.set(0.18, 0.055, -0.88);
    rearServiceWalk.userData.buildingId = building.id;

    const yardLamp = this.createStreetLamp(-0.9, 0.055, 0.76, building.id, 0xffd45f);
    const rearYardLamp = this.createStreetLamp(0.9, 0.055, -0.76, building.id, 0xffd45f);
    const shrubBed = this.createPlanterBox(0x8b6e4f, 0x739f64, 0.78, 0.05, 0.74, building.id, 0.24, 0.16);
    const rearPowerCore = powerCore.clone();
    rearPowerCore.position.set(0.1, 0.32, -0.58);
    rearPowerCore.userData.buildingId = building.id;

    group.add(perimeterWalk);
    group.add(pad);
    group.add(hall);
    group.add(hallRoof);
    group.add(transformer);
    group.add(coolingTowerA);
    group.add(coolingTowerB);
    group.add(stack);
    group.add(substation);
    group.add(powerCore);
    group.add(rearPowerCore);
    group.add(fence);
    group.add(rearFence);
    group.add(utilityTruck);
    group.add(yardContainer);
    group.add(serviceWalk);
    group.add(rearServiceWalk);
    group.add(yardLamp);
    group.add(rearYardLamp);
    group.add(shrubBed);
    stackSmoke.forEach((puff) => group.add(puff.mesh));
    const turbineHall = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.4, 0.38),
      new THREE.MeshStandardMaterial({ color: 0xa8b3bc, roughness: 0.72, metalness: 0.12 })
    );
    turbineHall.position.set(0.44, 0.22, 0.64);
    turbineHall.castShadow = true;
    turbineHall.receiveShadow = true;
    turbineHall.userData.buildingId = building.id;

    const pipeRack = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.08, 0.08),
      pipeMat.clone()
    );
    pipeRack.position.set(0.24, 0.34, 0.28);
    pipeRack.userData.buildingId = building.id;

    const coolingTowerC = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.06, 16), pipeMat.clone());
    coolingTowerC.position.set(0.42, 0.58, 0.5);
    coolingTowerC.castShadow = true;
    coolingTowerC.receiveShadow = true;
    coolingTowerC.userData.buildingId = building.id;
    coolingTowerC.visible = level >= 2;

    const cableBridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.06, 0.12),
      pipeMat.clone()
    );
    cableBridge.position.set(-0.12, 0.46, 0.36);
    cableBridge.userData.buildingId = building.id;
    cableBridge.visible = level >= 3;

    const reactorBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.56, 0.42),
      bodyMat.clone()
    );
    reactorBlock.position.set(0.48, level >= 3 ? 0.62 : 0.36, 0.52);
    reactorBlock.castShadow = true;
    reactorBlock.receiveShadow = true;
    reactorBlock.userData.buildingId = building.id;
    reactorBlock.visible = level >= 2;

    const stackTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.4, 14),
      pipeMat.clone()
    );
    stackTower.position.set(-0.48, 1.28, 0.42);
    stackTower.castShadow = true;
    stackTower.receiveShadow = true;
    stackTower.userData.buildingId = building.id;
    stackTower.visible = level >= 3;

    const reactorHallTier4 = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.78, 0.56),
      bodyMat.clone()
    );
    reactorHallTier4.position.set(0.42, 0.82, 0.42);
    reactorHallTier4.castShadow = true;
    reactorHallTier4.receiveShadow = true;
    reactorHallTier4.userData.buildingId = building.id;
    reactorHallTier4.visible = level >= 4;

    const coolingTowerD = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.48, 16), pipeMat.clone());
    coolingTowerD.position.set(0.78, 0.78, 0.18);
    coolingTowerD.castShadow = true;
    coolingTowerD.receiveShadow = true;
    coolingTowerD.userData.buildingId = building.id;
    coolingTowerD.visible = level >= 4;

    const megaStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 2.46, 16),
      pipeMat.clone()
    );
    megaStack.position.set(-0.1, 2.04, 0.08);
    megaStack.castShadow = true;
    megaStack.receiveShadow = true;
    megaStack.userData.buildingId = building.id;
    megaStack.visible = level >= 5;

    const megaSmoke = this.createSmokePuffs(building.id, { x: megaStack.position.x, y: 3.14, z: megaStack.position.z }, 6, 1.22);

    const towerSmoke = this.createSmokePuffs(building.id, { x: stackTower.position.x, y: 2.06, z: stackTower.position.z }, 4, 0.96);

    const reactorDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 18, 14),
      new THREE.MeshStandardMaterial({ color: bodyPalette[(variant + 2) % 5], roughness: 0.66, metalness: 0.1 })
    );
    reactorDome.position.set(0.36, 0.82, 0.24);
    reactorDome.scale.y = 0.72;
    reactorDome.castShadow = true;
    reactorDome.receiveShadow = true;
    reactorDome.userData.buildingId = building.id;
    reactorDome.visible = level >= 3;

    const switchyard = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.22, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x9ea9b2, roughness: 0.74, metalness: 0.14 })
    );
    switchyard.position.set(-0.64, 0.16, 0.54);
    switchyard.castShadow = true;
    switchyard.receiveShadow = true;
    switchyard.userData.buildingId = building.id;
    switchyard.visible = level >= 2;

    const condenserHall = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.42, 0.34),
      bodyMat.clone()
    );
    condenserHall.position.set(-0.04, 0.26, -0.08);
    condenserHall.castShadow = true;
    condenserHall.receiveShadow = true;
    condenserHall.userData.buildingId = building.id;
    condenserHall.visible = level >= 3;

    const hyperReactor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.52, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff3c2, roughness: 0.22, metalness: 0.1, emissive: 0xffb300, emissiveIntensity: 0.3 })
    );
    hyperReactor.position.set(0.62, 0.52, 0.5);
    hyperReactor.userData.buildingId = building.id;
    hyperReactor.visible = level >= 4;

    const reactorTower2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.94, 0.22),
      bodyMat.clone()
    );
    reactorTower2.position.set(0.76, 1.52, -0.36);
    reactorTower2.castShadow = true;
    reactorTower2.receiveShadow = true;
    reactorTower2.userData.buildingId = building.id;
    reactorTower2.visible = level >= 5;

    const beaconSpire = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.56, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.2, metalness: 0.08, emissive: 0x38bdf8, emissiveIntensity: 0.24 })
    );
    beaconSpire.position.set(0.76, 2.86, -0.36);
    beaconSpire.userData.buildingId = building.id;
    beaconSpire.visible = level >= 5;

    const containmentDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 22, 16),
      new THREE.MeshStandardMaterial({ color: 0xe4e8eb, roughness: 0.46, metalness: 0.08 })
    );
    containmentDome.position.set(0.24, 0.52, -0.18);
    containmentDome.scale.y = 0.62;
    containmentDome.castShadow = true;
    containmentDome.receiveShadow = true;
    containmentDome.userData.buildingId = building.id;
    containmentDome.visible = level >= 6;

    const reactorAnnex = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 0.46, 0.48),
      bodyMat.clone()
    );
    reactorAnnex.position.set(-0.58, 0.24, -0.22);
    reactorAnnex.castShadow = true;
    reactorAnnex.receiveShadow = true;
    reactorAnnex.userData.buildingId = building.id;
    reactorAnnex.visible = level >= 6;

    const condenserBay = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.28, 0.42),
      accentMat.clone()
    );
    condenserBay.position.set(0.62, 0.18, 0.68);
    condenserBay.castShadow = true;
    condenserBay.receiveShadow = true;
    condenserBay.userData.buildingId = building.id;
    condenserBay.visible = level >= 7;

    const coolingBasin = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.05, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x93c5db, roughness: 0.24, metalness: 0.04, emissive: 0x67e8f9, emissiveIntensity: 0.08 })
    );
    coolingBasin.position.set(-0.56, 0.055, 0.44);
    coolingBasin.userData.buildingId = building.id;
    coolingBasin.visible = level >= 7;

    const reactorStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.92, 16),
      pipeMat.clone()
    );
    reactorStack.position.set(0.96, 0.52, -0.42);
    reactorStack.castShadow = true;
    reactorStack.receiveShadow = true;
    reactorStack.userData.buildingId = building.id;
    reactorStack.visible = level >= 8;

    const reactorStackSmoke = this.createSmokePuffs(building.id, { x: reactorStack.position.x, y: 1.06, z: reactorStack.position.z }, 4, 0.84);

    const turbineBlock = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 0.54, 0.48),
      bodyMat.clone()
    );
    turbineBlock.position.set(-0.22, 0.28, -0.56);
    turbineBlock.castShadow = true;
    turbineBlock.receiveShadow = true;
    turbineBlock.userData.buildingId = building.id;
    turbineBlock.visible = level >= 8;

    const controlSpine = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.88, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.28, metalness: 0.08, emissive: 0x67e8f9, emissiveIntensity: 0.14 })
    );
    controlSpine.position.set(-0.18, 0.56, 0.92);
    controlSpine.userData.buildingId = building.id;
    controlSpine.visible = level >= 9;

    const secondaryContainment = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xdfe6eb, roughness: 0.42, metalness: 0.08 })
    );
    secondaryContainment.position.set(0.82, 0.34, 0.16);
    secondaryContainment.scale.y = 0.66;
    secondaryContainment.castShadow = true;
    secondaryContainment.receiveShadow = true;
    secondaryContainment.userData.buildingId = building.id;
    secondaryContainment.visible = level >= 9;

    const reactorRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.04, 10, 22),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.2, metalness: 0.08, emissive: 0x38bdf8, emissiveIntensity: 0.24 })
    );
    reactorRing.rotation.x = Math.PI / 2;
    reactorRing.position.set(0.24, 0.88, -0.18);
    reactorRing.userData.buildingId = building.id;
    reactorRing.visible = level >= 10;

    const spentFuelHall = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.36, 0.34),
      bodyMat.clone()
    );
    spentFuelHall.position.set(-0.72, 0.18, 0.72);
    spentFuelHall.castShadow = true;
    spentFuelHall.receiveShadow = true;
    spentFuelHall.userData.buildingId = building.id;
    spentFuelHall.visible = level >= 10;

    group.add(turbineHall);
    group.add(pipeRack);
    group.add(coolingTowerC);
    group.add(cableBridge);
    group.add(reactorBlock);
    group.add(stackTower);
    group.add(reactorHallTier4);
    group.add(coolingTowerD);
    group.add(megaStack);
    group.add(reactorDome);
    group.add(switchyard);
    group.add(condenserHall);
    group.add(hyperReactor);
    group.add(reactorTower2);
    group.add(beaconSpire);
    group.add(containmentDome);
    group.add(reactorAnnex);
    group.add(condenserBay);
    group.add(coolingBasin);
    group.add(reactorStack);
    group.add(turbineBlock);
    group.add(controlSpine);
    group.add(secondaryContainment);
    group.add(reactorRing);
    group.add(spentFuelHall);
    towerSmoke.forEach((puff) => group.add(puff.mesh));
    megaSmoke.forEach((puff) => group.add(puff.mesh));
    reactorStackSmoke.forEach((puff) => group.add(puff.mesh));

    this.utilityAnimations.set(building.id, {
      smoke: [...stackSmoke, ...towerSmoke, ...megaSmoke, ...reactorStackSmoke],
      glow: [powerCore, rearPowerCore, hyperReactor, beaconSpire, coolingBasin, controlSpine, reactorRing],
      phase: building.id * 0.11
    });
    this.selectableMeshes.set(building.id, [
      perimeterWalk,
      pad,
      hall,
      hallRoof,
      transformer,
      coolingTowerA,
      coolingTowerB,
      stack,
      substation,
      powerCore,
      rearPowerCore,
      fence,
      rearFence,
      ...this.collectMeshes(utilityTruck),
      yardContainer,
      serviceWalk,
      rearServiceWalk,
      ...this.collectMeshes(yardLamp),
      ...this.collectMeshes(rearYardLamp),
      ...this.collectMeshes(shrubBed),
      turbineHall,
      pipeRack,
      coolingTowerC,
      cableBridge,
      reactorBlock,
      stackTower,
      reactorHallTier4,
      coolingTowerD,
      megaStack,
      reactorDome,
      switchyard,
      condenserHall,
      hyperReactor,
      reactorTower2,
      beaconSpire,
      containmentDome,
      reactorAnnex,
      condenserBay,
      coolingBasin,
      reactorStack,
      turbineBlock,
      controlSpine,
      secondaryContainment,
      reactorRing,
      spentFuelHall,
      ...stackSmoke.map((entry) => entry.mesh)
        .concat(towerSmoke.map((entry) => entry.mesh))
        .concat(megaSmoke.map((entry) => entry.mesh))
        .concat(reactorStackSmoke.map((entry) => entry.mesh))
    ]);
    return group;
  }

  private geometryForType(type: BuildType): THREE.BufferGeometry {
    if (type === 'road') return new THREE.BoxGeometry(0.92, 0.06, 0.92);
    if (type === 'railLine') return new THREE.BoxGeometry(0.96, 0.08, 0.96);
    if (type === 'powerLine') return new THREE.BoxGeometry(0.42, 0.78, 0.42);
    if (type === 'house') return new THREE.BoxGeometry(0.72, 0.88, 0.72);
    if (
      type === 'shop' ||
      type === 'restaurant' ||
      type === 'trainStation' ||
      type === 'groceryStore' ||
      type === 'cornerStore' ||
      type === 'bank'
    ) {
      return new THREE.BoxGeometry(0.95, 0.75, 0.8);
    }
    if (type === 'park') return new THREE.BoxGeometry(0.92, 0.36, 0.92);
    if (type === 'workshop') return new THREE.BoxGeometry(1.05, 0.95, 0.86);
    if (type === 'hospital') return new THREE.BoxGeometry(1.92, 0.95, 1.92);
    if (type === 'policeStation' || type === 'fireStation' || type === 'cityHall' || type === 'substation') {
      return new THREE.BoxGeometry(0.98, 0.9, 0.98);
    }
    return new THREE.BoxGeometry(1.92, 1.5, 1.92);
  }

  private baseHeightForType(type: BuildType): number {
    if (type === 'road') return 0.03;
    if (type === 'railLine') return 0.04;
    if (type === 'powerLine') return 0.39;
    if (type === 'house') return 0.44;
    if (
      type === 'shop' ||
      type === 'restaurant' ||
      type === 'trainStation' ||
      type === 'groceryStore' ||
      type === 'cornerStore' ||
      type === 'bank'
    ) {
      return 0.38;
    }
    if (type === 'park') return 0.18;
    if (type === 'workshop') return 0.48;
    if (type === 'hospital') return 0.48;
    if (type === 'policeStation' || type === 'fireStation' || type === 'substation' || type === 'cityHall') return 0.44;
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

  private createHybridAsset(
    type: BuildType,
    buildingId: number,
    variant = 0,
    scale = 1
  ): THREE.Group {
    const options = getAssetCardOptions(type, variant);
    const group = new THREE.Group();

    const front = this.createFacadeCard(type, buildingId, variant);
    front.scale.setScalar(scale);
    front.renderOrder = 2;
    group.add(front);

    if (!options) return group;

    const sideCanvas = document.createElement('canvas');
    if (paintAssetSideCard(sideCanvas, options)) {
      const texture = new THREE.CanvasTexture(sideCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      texture.needsUpdate = true;

      const side = new THREE.Mesh(
        new THREE.PlaneGeometry(options.width * 0.38 * scale, options.height * 0.96 * scale),
        new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          alphaTest: 0.08,
          roughness: 0.78,
          metalness: 0.02,
          side: THREE.DoubleSide
        })
      );
      side.position.set(options.width * 0.26 * scale, 0, -0.12 * scale);
      side.rotation.y = -Math.PI / 2;
      side.renderOrder = 1;
      side.userData.buildingId = buildingId;
      group.add(side);
    }

    const roofLip = new THREE.Mesh(
      new THREE.BoxGeometry(options.width * 0.78 * scale, 0.03 * scale, 0.18 * scale),
      new THREE.MeshStandardMaterial({
        color: options.palette.roof,
        roughness: 0.78,
        metalness: 0.03
      })
    );
    roofLip.position.set(0.02 * scale, options.height * 0.5 * scale, 0.02 * scale);
    roofLip.castShadow = true;
    roofLip.receiveShadow = true;
    roofLip.userData.buildingId = buildingId;
    group.add(roofLip);

    const cardShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(options.width * 0.92 * scale, options.height * 0.24 * scale),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08, depthWrite: false })
    );
    cardShadow.rotation.x = -Math.PI / 2;
    cardShadow.position.set(0.04 * scale, -options.height * 0.44 * scale, 0.02 * scale);
    cardShadow.userData.buildingId = buildingId;
    group.add(cardShadow);

    return group;
  }

  private shouldUseIllustratedAsset(type: BuildType): boolean {
    void type;
    return false;
  }

  private createHeroAsset(
    type: BuildType,
    buildingId: number,
    variant = 0,
    scale = 1
  ): THREE.Group {
    const options = getAssetCardOptions(type, variant);
    const group = new THREE.Group();
    if (!options) return group;

    const canvas = document.createElement('canvas');
    if (!paintHeroAsset(canvas, options)) {
      return this.createHybridAsset(type, buildingId, variant, scale);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    texture.needsUpdate = true;

    const width =
      type === 'hospital' || type === 'powerPlant'
        ? 3.35 * scale
        : type === 'house'
          ? 1.72 * scale
          : 1.98 * scale;
    const height =
      type === 'hospital' || type === 'powerPlant'
        ? 2.78 * scale
        : type === 'house'
          ? 1.9 * scale
          : 2.15 * scale;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.06,
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.DoubleSide
      })
    );
    plane.rotation.y = Math.PI / 4;
    plane.castShadow = true;
    plane.receiveShadow = true;
    plane.userData.buildingId = buildingId;
    group.add(plane);

    const softShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.72, height * 0.18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12, depthWrite: false })
    );
    softShadow.rotation.x = -Math.PI / 2;
    softShadow.position.set(0, -height * 0.49, 0.02);
    softShadow.userData.buildingId = buildingId;
    group.add(softShadow);

    return group;
  }

  private createIllustratedBuilding(building: Building): THREE.Object3D {
    const group = new THREE.Group();
    const footprint = footprintForType(building.type);
    const usesCustomImage = false;
    const frontage = this.roadFrontage(building);
    const frontageEntries = Object.entries(frontage) as Array<[keyof typeof frontage, number]>;
    frontageEntries.sort((a, b) => b[1] - a[1]);
    const frontageSide: 'n' | 'e' | 's' | 'w' = frontageEntries[0] && frontageEntries[0][1] > 0 ? frontageEntries[0][0] : 's';
    const orientPoint = (forward: number, lateral: number): { x: number; z: number } => {
      if (frontageSide === 'n') return { x: -lateral, z: -forward };
      if (frontageSide === 'e') return { x: forward, z: -lateral };
      if (frontageSide === 'w') return { x: -forward, z: lateral };
      return { x: lateral, z: forward };
    };
    const frontEdge = footprint.depth > 1 ? 0.42 : 0.3;
    const yardDepth = footprint.depth > 1 ? 0.12 : 0.06;
    const isHouse = building.type === 'house';
    const isUtility = building.type === 'powerPlant';
    const isCivic =
      building.type === 'hospital' || building.type === 'policeStation' || building.type === 'fireStation';
    const isCommercial =
      building.type === 'shop' ||
      building.type === 'restaurant' ||
      building.type === 'groceryStore' ||
      building.type === 'cornerStore' ||
      building.type === 'bank';

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * 0.98, 0.04, footprint.depth * 0.98),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0x93be83 : isUtility ? 0xcad1d6 : isCivic ? 0xded9d1 : 0xe5ddcf,
        roughness: 0.95,
        metalness: 0.01
      })
    );
    lot.position.y = 0.02;
    lot.receiveShadow = true;
    lot.userData.buildingId = building.id;
    lot.visible = !usesCustomImage;

    const customParcelBase = new THREE.Mesh(
      new THREE.BoxGeometry(
        footprint.width * (isHouse ? 1.14 : footprint.width > 1 ? 1.04 : 1.06),
        0.028,
        footprint.depth * (isHouse ? 1.12 : footprint.depth > 1 ? 1.04 : 1.06)
      ),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0x8caf7e : isUtility ? 0xcfd4d8 : isCivic ? 0xe2ddd5 : 0xe6dfd1,
        roughness: 0.96,
        metalness: 0.01
      })
    );
    customParcelBase.position.y = 0.014;
    customParcelBase.receiveShadow = true;
    customParcelBase.userData.buildingId = building.id;
    customParcelBase.visible = usesCustomImage;

    const customParcelInset = new THREE.Mesh(
      new THREE.BoxGeometry(
        footprint.width * (isHouse ? 0.98 : footprint.width > 1 ? 0.94 : 0.96),
        0.012,
        footprint.depth * (isHouse ? 0.98 : footprint.depth > 1 ? 0.94 : 0.96)
      ),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0x86b27a : isCommercial ? 0xd8d1c5 : isCivic ? 0xded9d2 : 0xb9b4ab,
        roughness: isHouse ? 0.98 : 0.92,
        metalness: 0.01
      })
    );
    customParcelInset.position.y = 0.028;
    customParcelInset.receiveShadow = true;
    customParcelInset.userData.buildingId = building.id;
    customParcelInset.visible = usesCustomImage;

    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * (isHouse ? 0.64 : 0.82), 0.016, footprint.depth > 1 ? 0.26 : 0.18),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0xd8cab0 : 0xe4e6e7,
        roughness: 0.95,
        metalness: 0.01
      })
    );
    apron.position.set(0, 0.046, footprint.depth * 0.34);
    apron.userData.buildingId = building.id;
    apron.visible = !usesCustomImage;

    const customFrontPath = new THREE.Mesh(
      new THREE.BoxGeometry(
        footprint.width * (isHouse ? 0.22 : footprint.width > 1 ? 0.58 : 0.62),
        0.012,
        footprint.depth > 1 ? 0.26 : 0.22
      ),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0xd8cab0 : 0xe3e5e7,
        roughness: 0.95,
        metalness: 0.01
      })
    );
    {
      const pos = orientPoint(frontEdge, 0);
      customFrontPath.position.set(pos.x, 0.038, pos.z);
    }
    customFrontPath.userData.buildingId = building.id;
    customFrontPath.visible = usesCustomImage && (isHouse || isCommercial || isCivic);

    const customFrontWalk = new THREE.Mesh(
      new THREE.BoxGeometry(
        footprint.width * (isHouse ? 0.58 : footprint.width > 1 ? 1.02 : 0.94),
        0.012,
        footprint.depth > 1 ? 0.12 : 0.1
      ),
      new THREE.MeshStandardMaterial({
        color: isHouse ? 0xe0d1b6 : 0xe7e8ea,
        roughness: 0.95,
        metalness: 0.01
      })
    );
    {
      const pos = orientPoint(frontEdge + (isHouse ? 0.06 : 0.02), 0);
      customFrontWalk.position.set(pos.x, 0.04, pos.z);
    }
    customFrontWalk.userData.buildingId = building.id;
    customFrontWalk.visible = usesCustomImage && (isHouse || isCommercial || isCivic);

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * 0.96, 0.025, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xc7cfd5, roughness: 0.92, metalness: 0.01 })
    );
    curb.position.set(0, 0.055, footprint.depth * 0.46);
    curb.userData.buildingId = building.id;
    curb.visible = !isHouse && !usesCustomImage;

    const customCurb = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * 0.96, 0.02, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xc7cfd5, roughness: 0.92, metalness: 0.01 })
    );
    {
      const pos = orientPoint(footprint.depth > 1 ? 0.56 : 0.45, 0);
      customCurb.position.set(pos.x, 0.046, pos.z);
    }
    customCurb.userData.buildingId = building.id;
    customCurb.visible = usesCustomImage && !isHouse;

    const hero = this.createHeroAsset(
      building.type,
      building.id,
      building.id,
      footprint.width > 1 || footprint.depth > 1 ? 1.04 : 1
    );
    hero.position.set(
      0,
      usesCustomImage ? (footprint.width > 1 ? 0.76 : 0.5) : footprint.width > 1 ? 1.0 : 0.74,
      usesCustomImage ? -0.02 : footprint.depth > 1 ? 0.08 : 0.06
    );
    if (usesCustomImage) {
      const shift = orientPoint(-yardDepth, 0);
      hero.position.x += shift.x;
      hero.position.z += shift.z;
    }

    const planterA = this.createPlanterBox(
      0x977352,
      isUtility ? 0x86a56a : isCivic ? 0x76a27a : 0x7cab72,
      -footprint.width * 0.3,
      0.05,
      footprint.depth * 0.28,
      building.id,
      footprint.width > 1 ? 0.18 : 0.12,
      footprint.width > 1 ? 0.14 : 0.12
    );
    planterA.visible = !isUtility && !usesCustomImage;

    const customPlanterA = this.createPlanterBox(
      isHouse ? 0x9a7a58 : 0x977352,
      isHouse ? 0x769f66 : isUtility ? 0x86a56a : isCivic ? 0x76a27a : 0x7cab72,
      0,
      0.038,
      0,
      building.id,
      footprint.width > 1 ? 0.16 : 0.1,
      footprint.width > 1 ? 0.13 : 0.1
    );
    {
      const pos = orientPoint(frontEdge - 0.08, -footprint.width * 0.28);
      customPlanterA.position.set(pos.x, 0.038, pos.z);
    }
    customPlanterA.visible = usesCustomImage && !isUtility;

    const planterB = this.createPlanterBox(
      0x977352,
      isCommercial ? 0x8eb664 : 0x7ca07a,
      footprint.width * 0.3,
      0.05,
      footprint.depth * 0.24,
      building.id,
      footprint.width > 1 ? 0.18 : 0.12,
      footprint.width > 1 ? 0.14 : 0.12
    );
    planterB.visible = (isCommercial || isCivic) && !usesCustomImage;

    const customPlanterB = this.createPlanterBox(
      0x977352,
      isCommercial ? 0x8eb664 : 0x7ca07a,
      0,
      0.038,
      0,
      building.id,
      footprint.width > 1 ? 0.16 : 0.1,
      footprint.width > 1 ? 0.13 : 0.1
    );
    {
      const pos = orientPoint(frontEdge - 0.1, footprint.width * 0.28);
      customPlanterB.position.set(pos.x, 0.038, pos.z);
    }
    customPlanterB.visible = usesCustomImage && (isCommercial || isCivic);

    const lamp = this.createStreetLamp(
      footprint.width * 0.34,
      0.055,
      footprint.depth * 0.16,
      building.id,
      isUtility ? 0xffd45f : isCivic ? 0xd9ecff : 0xffe3a8
    );
    lamp.visible = !isHouse && !usesCustomImage;

    const customLamp = this.createStreetLamp(
      0,
      0.04,
      0,
      building.id,
      isUtility ? 0xffd45f : isCivic ? 0xd9ecff : 0xffe3a8
    );
    {
      const pos = orientPoint(frontEdge - 0.12, footprint.width * 0.34);
      customLamp.position.set(pos.x, 0.04, pos.z);
    }
    customLamp.visible = usesCustomImage && !isHouse && !isUtility;

    const bench = this.createBench(-footprint.width * 0.22, 0.05, footprint.depth * 0.18, 0, building.id);
    bench.visible = (isCommercial || isCivic) && !usesCustomImage;

    const customBench = this.createBench(0, 0.04, 0, 0, building.id);
    {
      const pos = orientPoint(frontEdge - 0.12, -footprint.width * 0.2);
      customBench.position.set(pos.x, 0.04, pos.z);
    }
    customBench.visible = usesCustomImage && (isCommercial || isCivic);

    const bike = this.createBike(
      isHouse ? -0.22 : 0.22,
      0.03,
      footprint.depth * 0.18,
      isHouse ? 0.45 : -0.1,
      building.id,
      isHouse ? 0xc76b42 : 0x597596
    );
    bike.visible = (isHouse || building.type === 'cornerStore' || building.type === 'groceryStore') && !usesCustomImage;

    const customBike = this.createBike(
      0,
      0.028,
      0,
      isHouse ? 0.45 : -0.1,
      building.id,
      isHouse ? 0xc76b42 : 0x597596
    );
    {
      const pos = orientPoint(frontEdge - 0.14, isHouse ? -0.18 : 0.18);
      customBike.position.set(pos.x, 0.028, pos.z);
    }
    customBike.visible = usesCustomImage && (building.type === 'cornerStore' || building.type === 'groceryStore');

    const customMailbox = this.createMailbox(
      0,
      0.03,
      0,
      building.id,
      0xc85d4a
    );
    {
      const pos = orientPoint(frontEdge - 0.04, -footprint.width * 0.24);
      customMailbox.position.set(pos.x, 0.03, pos.z);
    }
    customMailbox.visible = usesCustomImage && isHouse;

    const customHouseFenceBack = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * 0.72, 0.09, 0.028),
      new THREE.MeshStandardMaterial({ color: 0xa37a56, roughness: 0.9, metalness: 0.01 })
    );
    {
      const pos = orientPoint(-frontEdge - 0.13, 0);
      customHouseFenceBack.position.set(pos.x, 0.06, pos.z);
      customHouseFenceBack.rotation.y = frontageSide === 'e' || frontageSide === 'w' ? Math.PI / 2 : 0;
    }
    customHouseFenceBack.userData.buildingId = building.id;
    customHouseFenceBack.visible = false;

    const customHouseFenceSide = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.09, footprint.depth * 0.52),
      new THREE.MeshStandardMaterial({ color: 0xa37a56, roughness: 0.9, metalness: 0.01 })
    );
    {
      const pos = orientPoint(-0.04, footprint.width * 0.38);
      customHouseFenceSide.position.set(pos.x, 0.06, pos.z);
      customHouseFenceSide.rotation.y = frontageSide === 'n' || frontageSide === 's' ? 0 : Math.PI / 2;
    }
    customHouseFenceSide.userData.buildingId = building.id;
    customHouseFenceSide.visible = false;

    const customParkingPad = new THREE.Mesh(
      new THREE.BoxGeometry(
        footprint.width > 1 ? 0.58 : 0.42,
        0.014,
        footprint.depth > 1 ? 0.42 : 0.3
      ),
      new THREE.MeshStandardMaterial({ color: 0xc9ccd0, roughness: 0.9, metalness: 0.02 })
    );
    {
      const pos = orientPoint(-0.06, footprint.width * 0.34);
      customParkingPad.position.set(pos.x, 0.034, pos.z);
    }
    customParkingPad.userData.buildingId = building.id;
    customParkingPad.visible = usesCustomImage && (isCommercial || isCivic || isUtility);

    const customParkingStripeA = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.003, footprint.depth > 1 ? 0.2 : 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf5f3ed, roughness: 0.88, metalness: 0.01 })
    );
    {
      const pos = orientPoint(-0.08, footprint.width * 0.26);
      customParkingStripeA.position.set(pos.x, 0.043, pos.z);
      customParkingStripeA.rotation.y = frontageSide === 'n' || frontageSide === 's' ? 0 : Math.PI / 2;
    }
    customParkingStripeA.userData.buildingId = building.id;
    customParkingStripeA.visible = usesCustomImage && (isCommercial || isCivic);

    const customParkingStripeB = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.003, footprint.depth > 1 ? 0.2 : 0.14),
      new THREE.MeshStandardMaterial({ color: 0xf5f3ed, roughness: 0.88, metalness: 0.01 })
    );
    {
      const pos = orientPoint(-0.08, footprint.width * 0.42);
      customParkingStripeB.position.set(pos.x, 0.043, pos.z);
      customParkingStripeB.rotation.y = frontageSide === 'n' || frontageSide === 's' ? 0 : Math.PI / 2;
    }
    customParkingStripeB.userData.buildingId = building.id;
    customParkingStripeB.visible = usesCustomImage && (isCommercial || isCivic);

    const customBackGreenery = this.createPlanterBox(
      0x8c6e50,
      isHouse ? 0x709861 : 0x7aa36d,
      0,
      0.035,
      0,
      building.id,
      footprint.width > 1 ? 0.18 : 0.12,
      footprint.width > 1 ? 0.14 : 0.12
    );
    {
      const pos = orientPoint(-frontEdge - 0.08, -footprint.width * 0.22);
      customBackGreenery.position.set(pos.x, 0.035, pos.z);
    }
    customBackGreenery.visible = usesCustomImage && (isHouse || isCommercial || isCivic);

    const customSideGreenery = this.createPlanterBox(
      0x8c6e50,
      isCommercial ? 0x85ad72 : 0x739d66,
      0,
      0.035,
      0,
      building.id,
      footprint.width > 1 ? 0.18 : 0.12,
      footprint.width > 1 ? 0.14 : 0.12
    );
    {
      const pos = orientPoint(-0.02, -footprint.width * 0.36);
      customSideGreenery.position.set(pos.x, 0.035, pos.z);
    }
    customSideGreenery.visible = usesCustomImage && (isHouse || isCommercial || isCivic);

    group.add(customParcelBase);
    group.add(customParcelInset);
    group.add(lot);
    group.add(customFrontPath);
    group.add(customFrontWalk);
    group.add(apron);
    group.add(customCurb);
    group.add(curb);
    group.add(hero);
    group.add(customPlanterA);
    group.add(planterA);
    group.add(customPlanterB);
    group.add(planterB);
    group.add(customLamp);
    group.add(lamp);
    group.add(customBench);
    group.add(bench);
    group.add(customBike);
    group.add(bike);
    group.add(customMailbox);
    group.add(customHouseFenceBack);
    group.add(customHouseFenceSide);
    group.add(customParkingPad);
    group.add(customParkingStripeA);
    group.add(customParkingStripeB);
    group.add(customBackGreenery);
    group.add(customSideGreenery);

    this.selectableMeshes.set(building.id, [
      customParcelBase,
      customParcelInset,
      lot,
      customFrontPath,
      customFrontWalk,
      apron,
      customCurb,
      curb,
      ...this.collectMeshes(hero),
      ...this.collectMeshes(customPlanterA),
      ...this.collectMeshes(planterA),
      ...this.collectMeshes(customPlanterB),
      ...this.collectMeshes(planterB),
      ...this.collectMeshes(customLamp),
      ...this.collectMeshes(lamp),
      ...this.collectMeshes(customBench),
      ...this.collectMeshes(bench),
      ...this.collectMeshes(customBike),
      ...this.collectMeshes(bike)
      ,
      ...this.collectMeshes(customMailbox),
      ...this.collectMeshes(customHouseFenceBack),
      ...this.collectMeshes(customHouseFenceSide),
      ...this.collectMeshes(customParkingPad),
      ...this.collectMeshes(customParkingStripeA),
      ...this.collectMeshes(customParkingStripeB),
      ...this.collectMeshes(customBackGreenery),
      ...this.collectMeshes(customSideGreenery)
    ]);

    return group;
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
      metalness: 0.02,
      side: THREE.DoubleSide
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

  private createPlanterBox(
    boxColor: number,
    leafColor: number,
    x: number,
    y: number,
    z: number,
    buildingId: number,
    width = 0.14,
    depth = 0.14
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, depth),
      new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.84, metalness: 0.02 })
    );
    box.position.y = 0.04;
    box.castShadow = true;
    box.receiveShadow = true;
    box.userData.buildingId = buildingId;

    const shrub = new THREE.Mesh(
      new THREE.SphereGeometry(Math.min(width, depth) * 0.42, 10, 10),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9, metalness: 0.01 })
    );
    shrub.position.y = 0.12;
    shrub.scale.set(1.1, 0.85, 1);
    shrub.castShadow = true;
    shrub.receiveShadow = true;
    shrub.userData.buildingId = buildingId;

    group.add(box);
    group.add(shrub);
    return group;
  }

  private createTree(
    canopyRadius: number,
    trunkRadius: number,
    trunkHeight: number,
    leafColor: number,
    buildingId: number
  ): THREE.Group {
    const group = new THREE.Group();

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(trunkRadius, trunkRadius * 1.15, trunkHeight, 10),
      new THREE.MeshStandardMaterial({ color: 0x7a5b3e, roughness: 0.86, metalness: 0.02 })
    );
    trunk.position.y = trunkHeight * 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    trunk.userData.buildingId = buildingId;

    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(canopyRadius, 12, 12),
      new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.9, metalness: 0.01 })
    );
    canopy.position.y = trunkHeight + canopyRadius * 0.8;
    canopy.scale.set(1.1, 0.88, 1);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    canopy.userData.buildingId = buildingId;

    group.add(trunk);
    group.add(canopy);
    return group;
  }

  private createBench(
    x: number,
    y: number,
    z: number,
    rotationY: number,
    buildingId: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8c623d, roughness: 0.84, metalness: 0.02 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x69727d, roughness: 0.72, metalness: 0.12 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.07), woodMat);
    seat.position.y = 0.1;
    seat.castShadow = true;
    seat.receiveShadow = true;
    seat.userData.buildingId = buildingId;

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.07), woodMat.clone());
    back.position.set(0, 0.17, -0.03);
    back.rotation.x = -0.45;
    back.castShadow = true;
    back.receiveShadow = true;
    back.userData.buildingId = buildingId;

    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.02), metalMat);
    legLeft.position.set(-0.07, 0.05, 0);
    legLeft.castShadow = true;
    legLeft.receiveShadow = true;
    legLeft.userData.buildingId = buildingId;

    const legRight = legLeft.clone();
    legRight.position.x = 0.07;
    legRight.userData.buildingId = buildingId;

    group.add(seat);
    group.add(back);
    group.add(legLeft);
    group.add(legRight);
    return group;
  }

  private createStreetLamp(
    x: number,
    y: number,
    z: number,
    buildingId: number,
    glowColor = 0xffe8b3
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x53606f, roughness: 0.78, metalness: 0.18 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xf8f2de,
      roughness: 0.28,
      metalness: 0.06,
      emissive: glowColor,
      emissiveIntensity: 0.35
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.46, 10), poleMat);
    pole.position.y = 0.23;
    pole.castShadow = true;
    pole.receiveShadow = true;
    pole.userData.buildingId = buildingId;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.018), poleMat.clone());
    arm.position.set(0.04, 0.43, 0);
    arm.castShadow = true;
    arm.receiveShadow = true;
    arm.userData.buildingId = buildingId;

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.045), glowMat);
    lantern.position.set(0.08, 0.39, 0);
    lantern.castShadow = true;
    lantern.receiveShadow = true;
    lantern.userData.buildingId = buildingId;

    group.add(pole);
    group.add(arm);
    group.add(lantern);
    return group;
  }

  private createMailbox(
    x: number,
    y: number,
    z: number,
    buildingId: number,
    color: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.13, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x8b6d4d, roughness: 0.86, metalness: 0.02 })
    );
    post.position.y = 0.065;
    post.castShadow = true;
    post.receiveShadow = true;
    post.userData.buildingId = buildingId;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.05),
      new THREE.MeshStandardMaterial({ color, roughness: 0.68, metalness: 0.16 })
    );
    box.position.set(0.03, 0.12, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    box.userData.buildingId = buildingId;

    group.add(post);
    group.add(box);
    return group;
  }

  private createBike(
    x: number,
    y: number,
    z: number,
    rotationY: number,
    buildingId: number,
    color: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = rotationY;

    const frameMat = new THREE.MeshStandardMaterial({ color, roughness: 0.74, metalness: 0.16 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2d3642, roughness: 0.86, metalness: 0.08 });

    const wheelFront = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 18), wheelMat);
    wheelFront.position.set(0.08, 0.06, 0);
    wheelFront.rotation.y = Math.PI / 2;
    wheelFront.castShadow = true;
    wheelFront.receiveShadow = true;
    wheelFront.userData.buildingId = buildingId;

    const wheelBack = wheelFront.clone();
    wheelBack.position.x = -0.08;
    wheelBack.userData.buildingId = buildingId;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.015), frameMat);
    frame.position.set(0, 0.08, 0);
    frame.rotation.z = 0.45;
    frame.castShadow = true;
    frame.receiveShadow = true;
    frame.userData.buildingId = buildingId;

    const frameBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.015), frameMat.clone());
    frameBack.position.set(-0.02, 0.075, 0);
    frameBack.rotation.z = -0.55;
    frameBack.castShadow = true;
    frameBack.receiveShadow = true;
    frameBack.userData.buildingId = buildingId;

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.015), frameMat.clone());
    handle.position.set(0.09, 0.12, 0);
    handle.rotation.z = -0.4;
    handle.castShadow = true;
    handle.receiveShadow = true;
    handle.userData.buildingId = buildingId;

    group.add(wheelFront);
    group.add(wheelBack);
    group.add(frame);
    group.add(frameBack);
    group.add(handle);
    return group;
  }

  private createSmokePuffs(
    buildingId: number,
    origin: { x: number; y: number; z: number },
    count: number,
    scale = 1
  ): SmokeAnimation[] {
    return Array.from({ length: count }, (_, index) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08 * scale, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0xcfd5db,
          roughness: 1,
          metalness: 0,
          transparent: true,
          opacity: 0.18
        })
      );
      mesh.position.set(origin.x, origin.y + index * 0.05, origin.z);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.userData.buildingId = buildingId;
      return {
        mesh,
        baseX: origin.x,
        baseY: origin.y,
        baseZ: origin.z,
        phase: index * 0.31 + buildingId * 0.07,
        drift: 1 + index * 0.18
      };
    });
  }

  private createClusterSupportLot(building: Building, baseColor: number, walkColor: number): THREE.Group {
    const footprint = footprintForType(building.type);
    const group = new THREE.Group();
    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width + 0.08, 0.025, footprint.depth + 0.08),
      new THREE.MeshStandardMaterial({ color: walkColor, roughness: 0.96, metalness: 0.01 })
    );
    walk.position.y = 0.03;
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(footprint.width * 0.96, 0.04, footprint.depth * 0.96),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.94, metalness: 0.02 })
    );
    pad.position.y = 0.045;
    pad.receiveShadow = true;
    pad.userData.buildingId = building.id;

    group.add(walk);
    group.add(pad);
    this.selectableMeshes.set(building.id, [walk, pad]);
    return group;
  }

  private createMergedApartmentBlock(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.94;
    const depth = cluster.tileDepth * 0.94;
    const level = building.level;
    const variant = building.id % 5;
    const superblockMode = cluster.size >= 9 || (cluster.originWidth >= 3 && cluster.originDepth >= 3);
    const wallPalette = [0xd8c0a6, 0xd2c8bb, 0xcbb8a9, 0xd6c8bc, 0xc7cfc9, 0xc8d4c8];
    const trimPalette = [0xb8875f, 0xcab79a, 0xa47a5d, 0xd0ad95, 0x8ba19a, 0x7f9891];
    const roofPalette = [0x7c5843, 0x6f7883, 0x8e6547, 0x5b5f68, 0x4d6667, 0x556e63];
    const windowGlowPalette = [0xf59e0b, 0xf0b95a, 0xf6c36b, 0xf7b267, 0xb9d9ff, 0xf4d0a8];
    const towerBaseY = 0.26;
    const meshes: THREE.Mesh[] = [];
    const glowMeshes: THREE.Mesh[] = [];
    const meshMat = (color: number, roughness = 0.78, metalness = 0.02, emissive?: number, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(emissive !== undefined ? { emissive, emissiveIntensity } : {}) });

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const addGlowMesh = (mesh: THREE.Mesh) => {
      addMesh(mesh);
      glowMeshes.push(mesh);
      return mesh;
    };

    type TowerSpec = {
      x: number;
      z: number;
      width: number;
      depth: number;
      floors: number;
      wallColor: number;
      roofColor: number;
      glowColor: number;
      crown?: "flat" | "ring" | "frame" | "spire";
      sideWindows?: boolean;
      fins?: boolean;
      terrace?: boolean;
      offsetCap?: boolean;
    };

    const addResidentialTower = (spec: TowerSpec) => {
      const floorHeight = level >= 5 ? 0.18 : level >= 3 ? 0.17 : 0.16;
      const towerHeight = spec.floors * floorHeight;
      const tower = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(spec.width, towerHeight, spec.depth),
          meshMat(spec.wallColor, 0.74, 0.03)
        )
      );
      tower.position.set(offset.x + spec.x, towerBaseY + towerHeight * 0.5, offset.z + spec.z);

      const cap = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(spec.width + 0.08, 0.08, spec.depth + 0.08),
          meshMat(spec.roofColor, 0.78, 0.03)
        )
      );
      cap.position.set(
        tower.position.x + (spec.offsetCap ? spec.width * 0.08 : 0),
        tower.position.y + towerHeight * 0.5 + 0.05,
        tower.position.z
      );

      for (let floor = 0; floor < spec.floors; floor += 1) {
        const bandY = towerBaseY + floor * floorHeight + 0.06;
        const frontBand = addGlowMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(spec.width * 0.72, 0.08, 0.025),
            meshMat(0xffefc8, 0.34, 0.08, spec.glowColor, 0.24)
          )
        );
        frontBand.position.set(tower.position.x, bandY, tower.position.z + spec.depth * 0.5 + 0.014);

        const rearBand = addGlowMesh(frontBand.clone());
        rearBand.position.set(tower.position.x, bandY, tower.position.z - spec.depth * 0.5 - 0.014);
        rearBand.userData.buildingId = building.id;

        if (spec.sideWindows) {
          const eastBand = addGlowMesh(
            new THREE.Mesh(
              new THREE.BoxGeometry(0.024, 0.08, spec.depth * 0.52),
              meshMat(0xffefc8, 0.34, 0.08, spec.glowColor, 0.16)
            )
          );
          eastBand.position.set(tower.position.x + spec.width * 0.5 + 0.014, bandY, tower.position.z);

          const westBand = addGlowMesh(eastBand.clone());
          westBand.position.set(tower.position.x - spec.width * 0.5 - 0.014, bandY, tower.position.z);
          westBand.userData.buildingId = building.id;
        }
      }

      if (spec.fins) {
        const finHeight = towerHeight * 0.84;
        const leftFin = addMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(0.04, finHeight, spec.depth * 0.78),
            meshMat(spec.roofColor, 0.76, 0.04)
          )
        );
        leftFin.position.set(tower.position.x - spec.width * 0.44, tower.position.y, tower.position.z);

        const rightFin = addMesh(leftFin.clone());
        rightFin.position.set(tower.position.x + spec.width * 0.44, tower.position.y, tower.position.z);
        rightFin.userData.buildingId = building.id;
      }

      if (spec.terrace) {
        const terrace = addGlowMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(spec.width * 0.56, 0.06, spec.depth * 0.24),
            meshMat(0x8fd8f8, 0.18, 0.08, 0x38bdf8, 0.1)
          )
        );
        terrace.position.set(tower.position.x, cap.position.y + 0.05, tower.position.z - spec.depth * 0.06);
      }

      if (spec.crown === "ring") {
        const halo = addGlowMesh(
          new THREE.Mesh(
            new THREE.TorusGeometry(Math.max(spec.width, spec.depth) * 0.42, 0.024, 8, 18),
            meshMat(trimPalette[(variant + 2) % 5], 0.3, 0.08, spec.glowColor, 0.16)
          )
        );
        halo.rotation.x = Math.PI / 2;
        halo.position.set(tower.position.x, cap.position.y + 0.16, tower.position.z);
      }

      if (spec.crown === "frame") {
        const frameA = addMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(0.045, towerHeight * 0.18, spec.depth * 0.2),
            meshMat(trimPalette[(variant + 1) % 5], 0.74, 0.05)
          )
        );
        frameA.position.set(tower.position.x - spec.width * 0.22, tower.position.y + towerHeight * 0.34, tower.position.z);
        const frameB = addMesh(frameA.clone());
        frameB.position.set(tower.position.x + spec.width * 0.22, tower.position.y + towerHeight * 0.34, tower.position.z);
        frameB.userData.buildingId = building.id;
      }

      if (spec.crown === "spire") {
        const spire = addGlowMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(spec.width * 0.16, 0.36, spec.depth * 0.16),
            meshMat(trimPalette[(variant + 3) % 5], 0.62, 0.08, spec.glowColor, 0.12)
          )
        );
        spire.position.set(tower.position.x, cap.position.y + 0.2, tower.position.z);
      }

      if (spec.crown === "flat") {
        const crownBand = addMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(spec.width * 0.86, 0.08, spec.depth + 0.04),
            meshMat(trimPalette[(variant + 4) % 5], 0.76, 0.04)
          )
        );
        crownBand.position.set(tower.position.x, cap.position.y - 0.03, tower.position.z);
      }

      return { tower, cap, towerHeight };
    };

    const baseFloorCount = [2, 3, 4, 6, 8, 10, 12, 15, 18, 22][Math.max(0, Math.min(9, level - 1))];
    const podiumProfiles = [
      { width: width * 0.98, depth: depth * 0.62, lawn: 0x88ab7d },
      { width: width * 0.66, depth: depth * 0.4, lawn: 0x86aa7b },
      { width: width * 0.9, depth: depth * 0.54, lawn: 0x8eaf87 },
      { width: width * 0.82, depth: depth * 0.48, lawn: 0x8aac7d },
      { width: width * 0.94, depth: depth * 0.58, lawn: 0x90b587 }
    ] as const;
    const podiumProfile = podiumProfiles[variant];
    const podiumWidth = level === 1 ? width * 0.84 : podiumProfile.width;
    const podiumDepth = level >= 4 ? podiumProfile.depth : level === 3 ? Math.max(0.5, podiumProfile.depth + 0.04) : 0.62;

    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.22, 0.025, depth + 0.22),
      new THREE.MeshStandardMaterial({ color: 0xe7dfd4, roughness: 0.97, metalness: 0.01 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;
    group.add(walk);
    meshes.push(walk);

    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({ color: level >= 2 ? podiumProfile.lawn : 0x8db482, roughness: 0.97, metalness: 0.01 })
    );
    lawn.position.set(offset.x, 0.025, offset.z);
    lawn.receiveShadow = true;
    lawn.userData.buildingId = building.id;
    group.add(lawn);
    meshes.push(lawn);

    const frontPlaza = new THREE.Mesh(
      new THREE.BoxGeometry(podiumWidth * 0.78, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xe1d8cb, roughness: 0.94, metalness: 0.01 })
    );
    frontPlaza.position.set(offset.x, 0.055, offset.z + depth * 0.36);
    frontPlaza.userData.buildingId = building.id;
    group.add(frontPlaza);
    meshes.push(frontPlaza);

    const rearPlaza = frontPlaza.clone();
    rearPlaza.position.set(offset.x, 0.055, offset.z - depth * 0.36);
    rearPlaza.userData.buildingId = building.id;
    group.add(rearPlaza);
    meshes.push(rearPlaza);

    const centralCourtyard = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.018, depth * 0.24),
      new THREE.MeshStandardMaterial({ color: 0x7faa72, roughness: 0.96, metalness: 0.01 })
    );
    centralCourtyard.position.set(offset.x, 0.058, offset.z);
    centralCourtyard.userData.buildingId = building.id;
    centralCourtyard.visible = level >= 2;
    group.add(centralCourtyard);
    meshes.push(centralCourtyard);

    const sharedWalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.02, depth * 0.66),
      new THREE.MeshStandardMaterial({ color: 0xe2d8ca, roughness: 0.94, metalness: 0.01 })
    );
    sharedWalk.position.set(offset.x, 0.056, offset.z);
    sharedWalk.userData.buildingId = building.id;
    sharedWalk.visible = level >= 2;
    group.add(sharedWalk);
    meshes.push(sharedWalk);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth, 0.18, podiumDepth + 0.06),
        meshMat(0x8f755d, 0.86, 0.01)
      )
    ).position.set(offset.x, 0.09, offset.z);

    const podium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth, 0.42, podiumDepth),
        meshMat(wallPalette[variant], 0.78, 0.02)
      )
    );
    podium.position.set(offset.x, 0.3, offset.z);

    const podiumRoof = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth + 0.08, 0.08, podiumDepth + 0.08),
        meshMat(trimPalette[variant], 0.8, 0.02)
      )
    );
    podiumRoof.position.set(offset.x, 0.55, offset.z);

    const frontCanopy = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.58, 0.05, 0.16),
        meshMat(trimPalette[variant], 0.76, 0.02)
      )
    );
    frontCanopy.position.set(offset.x, 0.22, offset.z + podiumDepth * 0.54);

    const rearCanopy = frontCanopy.clone();
    rearCanopy.position.set(offset.x, 0.22, offset.z - podiumDepth * 0.54);
    rearCanopy.userData.buildingId = building.id;
    group.add(rearCanopy);
    meshes.push(rearCanopy);
    let primaryTowerHeight = 0;
    const lowRiseMode = level <= 3;
    let skyBridge: THREE.Mesh | null = null;
    let rooftopPool: THREE.Mesh | null = null;
    let solarCanopy: THREE.Mesh | null = null;
    let loungeCanopy: THREE.Mesh | null = null;
    let crownHalo: THREE.Mesh | null = null;

    switch (variant) {
      case 0: {
        const main = addResidentialTower({
          x: 0,
          z: 0,
          width: width * (lowRiseMode ? 0.72 : 0.54),
          depth: depth * (lowRiseMode ? 0.5 : 0.4),
          floors: Math.round(baseFloorCount * (lowRiseMode ? 1 : level >= 5 ? 0.84 : 0.76)),
          wallColor: wallPalette[0],
          roofColor: roofPalette[0],
          glowColor: windowGlowPalette[0],
          crown: level >= 8 ? "frame" : "flat",
          sideWindows: true,
          fins: level >= 6,
          terrace: level >= 5
        });
        primaryTowerHeight = main.towerHeight;
        if (level >= 6) {
          addResidentialTower({
            x: -width * 0.22,
            z: depth * 0.16,
            width: width * 0.22,
            depth: depth * 0.2,
            floors: Math.round(baseFloorCount * 0.44),
            wallColor: wallPalette[2],
            roofColor: roofPalette[2],
            glowColor: windowGlowPalette[2],
            crown: "flat",
            sideWindows: true
          });
        }
        break;
      }
      case 1: {
        const main = addResidentialTower({
          x: -width * 0.16,
          z: -depth * 0.05,
          width: width * 0.18,
          depth: depth * 0.14,
          floors: Math.round(baseFloorCount * (lowRiseMode ? 0.94 : level >= 8 ? 1.42 : level >= 5 ? 1.2 : 1.02)),
          wallColor: wallPalette[1],
          roofColor: roofPalette[1],
          glowColor: windowGlowPalette[1],
          crown: level >= 8 ? "ring" : "flat",
          sideWindows: true,
          offsetCap: true
        });
        primaryTowerHeight = main.towerHeight;
        crownHalo = glowMeshes[glowMeshes.length - 1] ?? null;
        if (level >= 5) {
          addResidentialTower({
            x: width * 0.18,
            z: depth * 0.1,
            width: width * 0.16,
            depth: depth * 0.14,
            floors: Math.round(baseFloorCount * 0.34),
            wallColor: wallPalette[4],
            roofColor: roofPalette[4],
            glowColor: windowGlowPalette[4],
            crown: "flat",
            sideWindows: false
          });
        }
        break;
      }
      case 2: {
        const leftTower = addResidentialTower({
          x: -width * 0.16,
          z: 0,
          width: width * (lowRiseMode ? 0.32 : 0.24),
          depth: depth * (lowRiseMode ? 0.24 : 0.2),
          floors: Math.round(baseFloorCount * (lowRiseMode ? 0.92 : level >= 5 ? 0.96 : 0.82)),
          wallColor: wallPalette[2],
          roofColor: roofPalette[2],
          glowColor: windowGlowPalette[2],
          crown: "flat",
          sideWindows: true
        });
        const rightTower = addResidentialTower({
          x: width * 0.16,
          z: 0,
          width: width * (lowRiseMode ? 0.32 : 0.24),
          depth: depth * (lowRiseMode ? 0.24 : 0.2),
          floors: Math.round(baseFloorCount * (lowRiseMode ? 0.88 : level >= 5 ? 0.9 : 0.78)),
          wallColor: wallPalette[3],
          roofColor: roofPalette[3],
          glowColor: windowGlowPalette[3],
          crown: level >= 8 ? "frame" : "flat",
          sideWindows: true
        });
        primaryTowerHeight = Math.max(leftTower.towerHeight, rightTower.towerHeight);
        if (level >= 6) {
          skyBridge = addGlowMesh(
            new THREE.Mesh(
              new THREE.BoxGeometry(width * 0.28, 0.18, depth * 0.12),
              meshMat(0xe6f4ff, 0.24, 0.08, windowGlowPalette[2], 0.18)
            )
          );
          skyBridge.position.set(offset.x, towerBaseY + primaryTowerHeight * 0.62, offset.z);
        }
        break;
      }
      case 3: {
        const main = addResidentialTower({
          x: width * 0.18,
          z: -depth * 0.04,
          width: width * (lowRiseMode ? 0.44 : 0.28),
          depth: depth * (lowRiseMode ? 0.24 : 0.18),
          floors: Math.round(baseFloorCount * (lowRiseMode ? 0.98 : level >= 5 ? 1.04 : 0.88)),
          wallColor: wallPalette[3],
          roofColor: roofPalette[3],
          glowColor: windowGlowPalette[3],
          crown: level >= 9 ? "spire" : "flat",
          sideWindows: true,
          fins: level >= 7
        });
        primaryTowerHeight = main.towerHeight;
        const annex = addMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.36, level >= 7 ? 1.5 : 0.82, depth * 0.22),
            meshMat(wallPalette[0], 0.74, 0.03)
          )
        );
        annex.position.set(offset.x - width * 0.22, level >= 7 ? 0.8 : 0.46, offset.z + depth * 0.16);
        if (level >= 7) {
          const bridge = addGlowMesh(
            new THREE.Mesh(
              new THREE.BoxGeometry(width * 0.18, 0.14, depth * 0.1),
              meshMat(0xe6f4ff, 0.24, 0.08, windowGlowPalette[0], 0.16)
            )
          );
          bridge.position.set(offset.x - width * 0.02, towerBaseY + main.towerHeight * 0.44, offset.z + depth * 0.08);
        }
        break;
      }
      case 4:
      default: {
        const main = addResidentialTower({
          x: 0.02,
          z: -depth * 0.02,
          width: width * (lowRiseMode ? 0.52 : 0.34),
          depth: depth * (lowRiseMode ? 0.34 : 0.28),
          floors: Math.round(baseFloorCount * (lowRiseMode ? 1 : level >= 5 ? 1.02 : 0.86)),
          wallColor: wallPalette[4],
          roofColor: roofPalette[4],
          glowColor: windowGlowPalette[4],
          crown: level >= 8 ? "frame" : "flat",
          sideWindows: true,
          terrace: level >= 5
        });
        primaryTowerHeight = main.towerHeight;
        if (level >= 6) {
          addResidentialTower({
            x: -width * 0.2,
            z: depth * 0.18,
            width: width * 0.14,
            depth: depth * 0.14,
            floors: Math.round(baseFloorCount * (level >= 5 ? 0.52 : 0.34)),
            wallColor: wallPalette[1],
            roofColor: roofPalette[1],
            glowColor: windowGlowPalette[1],
            crown: "flat",
            sideWindows: false
          });
        }
        break;
      }
    }

    const podiumWindowRows = level >= 4 ? 3 : level >= 2 ? 2 : 1;
    for (let row = 0; row < podiumWindowRows; row += 1) {
      const rowY = 0.24 + row * 0.14;
      const frontBand = new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.74, 0.08, 0.024),
        meshMat(0xffefc8, 0.34, 0.08, windowGlowPalette[variant], 0.2)
      );
      frontBand.position.set(offset.x, rowY, offset.z + podiumDepth * 0.5 + 0.015);
      frontBand.userData.buildingId = building.id;
      group.add(frontBand);
      meshes.push(frontBand);

      const rearBand = frontBand.clone();
      rearBand.position.set(offset.x, rowY, offset.z - podiumDepth * 0.5 - 0.015);
      rearBand.userData.buildingId = building.id;
      group.add(rearBand);
      meshes.push(rearBand);
    }

    const lobby = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.22, 0.22, 0.04),
        meshMat(0x7f5b3b, 0.8, 0.02)
      )
    );
    lobby.position.set(offset.x, 0.13, offset.z + podiumDepth * 0.52);
    const lobbyRear = lobby.clone();
    lobbyRear.position.set(offset.x, 0.13, offset.z - podiumDepth * 0.52);
    lobbyRear.userData.buildingId = building.id;
    group.add(lobbyRear);
    meshes.push(lobbyRear);

    const corniceBand = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.56, 0.06, 0.03),
        meshMat(trimPalette[variant], 0.72, 0.04)
      )
    );
    corniceBand.position.set(offset.x, 0.47, offset.z + podiumDepth * 0.48);
    const corniceBandRear = corniceBand.clone();
    corniceBandRear.position.set(offset.x, 0.47, offset.z - podiumDepth * 0.48);
    corniceBandRear.userData.buildingId = building.id;
    group.add(corniceBandRear);
    meshes.push(corniceBandRear);
    const signBand = corniceBand;
    const signBandRear = corniceBandRear;

    const roofGardenA = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.66, 0.05, podiumDepth * 0.72),
        meshMat(0x6d8c63, 0.96, 0.01)
      )
    );
    roofGardenA.position.set(offset.x, podiumRoof.position.y + 0.08, offset.z);
    roofGardenA.visible = level >= 4;

    const roofGardenB = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.3, 0.05, podiumDepth * 0.36),
        meshMat(0x73916f, 0.96, 0.01)
      )
    );
    roofGardenB.position.set(offset.x, podiumRoof.position.y + 0.09, offset.z - depth * 0.18);
    roofGardenB.visible = level >= 4;

    const loungeDeck = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.46, 0.04, podiumDepth * 0.2),
        meshMat(0x9d7d59, 0.88, 0.02)
      )
    );
    loungeDeck.position.set(offset.x, podiumRoof.position.y + 0.11, offset.z + depth * 0.14);
    loungeDeck.visible = level >= 4;

    const pergola = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.3, 0.12, podiumDepth * 0.12),
        meshMat(trimPalette[(variant + 1) % 5], 0.8, 0.03)
      )
    );
    pergola.position.set(offset.x, podiumRoof.position.y + 0.19, offset.z + depth * 0.14);
    pergola.visible = level >= 4;
    if (!skyBridge) {
      skyBridge = addGlowMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.28, 0.18, depth * 0.12),
          meshMat(0xe6f4ff, 0.24, 0.08, windowGlowPalette[(variant + 1) % 5], 0.18)
        )
      );
      skyBridge.position.set(offset.x, towerBaseY + primaryTowerHeight * 0.54, offset.z);
      skyBridge.visible = false;
    }

    rooftopPool = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.26, 0.06, podiumDepth * 0.18),
        meshMat(0x8fd8f8, 0.18, 0.08, 0x38bdf8, 0.1)
      )
    );
    rooftopPool.position.set(offset.x, podiumRoof.position.y + 0.11, offset.z - depth * 0.02);
    rooftopPool.visible = level >= 4 && (variant === 0 || variant === 4);

    solarCanopy = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.22, 0.04, podiumDepth * 0.14),
        meshMat(0x4c6c85, 0.34, 0.18, 0x0f172a, 0.08)
      )
    );
    solarCanopy.position.set(offset.x + width * 0.16, podiumRoof.position.y + 0.18, offset.z - depth * 0.18);
    solarCanopy.visible = level >= 5;

    loungeCanopy = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.18, 0.16, podiumDepth * 0.12),
        meshMat(trimPalette[(variant + 4) % 5], 0.76, 0.03)
      )
    );
    loungeCanopy.position.set(offset.x - width * 0.14, podiumRoof.position.y + 0.18, offset.z + depth * 0.18);
    loungeCanopy.visible = level >= 4;

    const courtyardDeck = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.04, depth * 0.24),
        meshMat(0xe1d8cb, 0.92, 0.01)
      )
    );
    courtyardDeck.position.set(offset.x, 0.1, offset.z);
    courtyardDeck.visible = superblockMode;

    const courtyardPool = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.06, depth * 0.12),
        meshMat(0x8fd8f8, 0.18, 0.08, 0x38bdf8, 0.1)
      )
    );
    courtyardPool.position.set(offset.x, 0.13, offset.z);
    courtyardPool.visible = superblockMode && level >= 4;

    const garagePodium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, level >= 5 ? 0.72 : 0.46, depth * 0.22),
        meshMat(wallPalette[(variant + 2) % 6], 0.76, 0.03)
      )
    );
    garagePodium.position.set(offset.x - width * 0.28, level >= 5 ? 0.4 : 0.26, offset.z - depth * 0.18);
    garagePodium.visible = superblockMode && level >= 4;

    const garageGlow = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.12, 0.03),
        meshMat(0xffefc8, 0.24, 0.08, windowGlowPalette[(variant + 3) % 6], 0.12)
      )
    );
    garageGlow.position.set(offset.x - width * 0.28, level >= 5 ? 0.44 : 0.28, offset.z - depth * 0.06);
    garageGlow.visible = superblockMode && level >= 4;

    const skyBridgeMega = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.18, depth * 0.12),
        meshMat(0xe6f4ff, 0.24, 0.08, windowGlowPalette[(variant + 4) % 6], 0.18)
      )
    );
    skyBridgeMega.position.set(offset.x, towerBaseY + primaryTowerHeight * 0.68, offset.z + depth * 0.04);
    skyBridgeMega.visible = superblockMode && level >= 5;

    const skylineWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.2, 2.22, depth * 0.18),
        meshMat(wallPalette[(variant + 5) % 6], 0.72, 0.04)
      )
    );
    skylineWing.position.set(offset.x + width * 0.28, 1.72, offset.z - depth * 0.1);
    skylineWing.visible = superblockMode && level >= 5;

    const greenhouseDeck = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.24, 0.18, depth * 0.16),
        meshMat(0xdff7ef, 0.18, 0.08, 0x34d399, 0.1)
      )
    );
    greenhouseDeck.position.set(offset.x + width * 0.18, podiumRoof.position.y + 0.18, offset.z - depth * 0.18);
    greenhouseDeck.visible = superblockMode && level >= 4;

    const observationDeck = addGlowMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.1, width * 0.12, 0.08, 14),
        meshMat(trimPalette[(variant + 2) % 6], 0.44, 0.08, windowGlowPalette[(variant + 5) % 6], 0.12)
      )
    );
    observationDeck.position.set(offset.x - width * 0.06, towerBaseY + primaryTowerHeight + 0.22, offset.z + depth * 0.02);
    observationDeck.visible = superblockMode && level >= 5;

    const verticalGarden = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.08, 1.24, 0.03),
        meshMat(0xbce5c4, 0.28, 0.04, 0x22c55e, 0.14)
      )
    );
    verticalGarden.position.set(offset.x + width * 0.26, 0.92, offset.z + depth * 0.08);
    verticalGarden.visible = superblockMode && level >= 5;

    const amenityWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.24, 0.54, depth * 0.18),
        meshMat(wallPalette[(variant + 3) % 6], 0.74, 0.04)
      )
    );
    amenityWing.position.set(offset.x - width * 0.34, 0.34, offset.z + depth * 0.18);
    amenityWing.visible = superblockMode && level >= 4;

    const amenityGlow = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.14, 0.14, 0.03),
        meshMat(0xffefc8, 0.24, 0.08, windowGlowPalette[(variant + 1) % 6], 0.1)
      )
    );
    amenityGlow.position.set(offset.x - width * 0.34, 0.34, offset.z + depth * 0.28);
    amenityGlow.visible = superblockMode && level >= 4;

    const civicLobby = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.32, 0.2, podiumDepth * 0.12),
        meshMat(0xe7f3fb, 0.28, 0.06, 0x7dd3fc, 0.08)
      )
    );
    civicLobby.position.set(offset.x, 0.2, offset.z + podiumDepth * 0.44);
    civicLobby.visible = level >= 6;

    const upperSetback = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(podiumWidth * 0.48, 0.42, podiumDepth * 0.24),
        meshMat(wallPalette[(variant + 1) % 6], 0.72, 0.03)
      )
    );
    upperSetback.position.set(offset.x, podiumRoof.position.y + 0.24, offset.z - depth * 0.04);
    upperSetback.visible = level >= 6;

    const skyLounge = addGlowMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.2, 0.16, depth * 0.12),
        meshMat(0xe8f8ff, 0.2, 0.08, windowGlowPalette[(variant + 2) % 6], 0.16)
      )
    );
    skyLounge.position.set(offset.x + width * 0.02, towerBaseY + primaryTowerHeight * 0.78, offset.z + depth * 0.08);
    skyLounge.visible = level >= 7;

    const sideWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 1.26, depth * 0.16),
        meshMat(wallPalette[(variant + 4) % 6], 0.72, 0.04)
      )
    );
    sideWing.position.set(offset.x + width * 0.26, 0.92, offset.z + depth * 0.12);
    sideWing.visible = level >= 8;

    const crownFrame = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, 0.1, depth * 0.22),
        meshMat(trimPalette[(variant + 2) % 6], 0.62, 0.04)
      )
    );
    crownFrame.position.set(offset.x, towerBaseY + primaryTowerHeight + 0.18, offset.z);
    crownFrame.visible = level >= 9;

    const lanternSpire = addGlowMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.035, width * 0.05, 0.44, 12),
        meshMat(0xf6fbff, 0.2, 0.08, windowGlowPalette[(variant + 3) % 6], 0.2)
      )
    );
    lanternSpire.position.set(offset.x, towerBaseY + primaryTowerHeight + 0.38, offset.z);
    lanternSpire.visible = level >= 10;

    const frontTreeLeft = this.createTree(0.12, 0.03, 0.18, level >= 6 ? 0x5e8c58 : 0x6d9858, building.id);
    frontTreeLeft.position.set(offset.x - width * 0.28, 0.04, offset.z + depth * 0.26);
    const frontTreeRight = this.createTree(0.12, 0.03, 0.18, level >= 6 ? 0x5e8c58 : 0x6d9858, building.id);
    frontTreeRight.position.set(offset.x + width * 0.28, 0.04, offset.z + depth * 0.26);
    const rearTreeLeft = this.createTree(0.11, 0.028, 0.17, 0x6d9858, building.id);
    rearTreeLeft.position.set(offset.x - width * 0.24, 0.04, offset.z - depth * 0.26);
    const rearTreeRight = this.createTree(0.11, 0.028, 0.17, 0x6d9858, building.id);
    rearTreeRight.position.set(offset.x + width * 0.24, 0.04, offset.z - depth * 0.26);
    const sharedBenchA = this.createBench(offset.x - width * 0.12, 0.03, offset.z, 0, building.id);
    const sharedBenchB = this.createBench(offset.x + width * 0.12, 0.03, offset.z, Math.PI, building.id);
    const entryTreeA = this.createPlanterBox(0x8d6846, 0x78a06c, offset.x - width * 0.12, 0.05, offset.z + depth * 0.18, building.id, 0.16, 0.14);
    const entryTreeB = this.createPlanterBox(0x8d6846, 0x78a06c, offset.x + width * 0.12, 0.05, offset.z + depth * 0.18, building.id, 0.16, 0.14);

    const smokePuffs: SmokeAnimation[] = [];
    smokePuffs.forEach((puff) => {
      group.add(puff.mesh);
      meshes.push(puff.mesh);
    });
    if (level >= 4) {
      this.utilityAnimations.set(building.id, {
        smoke: smokePuffs,
        glow: [
          signBand,
          signBandRear,
          roofGardenA,
          roofGardenB,
          loungeDeck,
          pergola,
          skyBridge,
          rooftopPool,
          solarCanopy,
          loungeCanopy,
          courtyardDeck,
          courtyardPool,
          garageGlow,
          skyBridgeMega,
          greenhouseDeck,
          observationDeck,
          verticalGarden,
          amenityGlow,
          civicLobby,
          upperSetback,
          skyLounge,
          crownFrame,
          lanternSpire,
          crownHalo,
          ...glowMeshes
        ].filter((mesh): mesh is THREE.Mesh => Boolean(mesh && mesh.visible)),
        phase: building.id * 0.17
      });
    }

    group.add(frontTreeLeft);
    group.add(frontTreeRight);
    group.add(rearTreeLeft);
    group.add(rearTreeRight);
    group.add(sharedBenchA);
    group.add(sharedBenchB);
    group.add(entryTreeA);
    group.add(entryTreeB);

    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(frontTreeLeft),
      ...this.collectMeshes(frontTreeRight),
      ...this.collectMeshes(rearTreeLeft),
      ...this.collectMeshes(rearTreeRight),
      ...this.collectMeshes(sharedBenchA),
      ...this.collectMeshes(sharedBenchB),
      ...this.collectMeshes(entryTreeA),
      ...this.collectMeshes(entryTreeB)
    ]);

    return group;
  }

  private createMergedParkSquare(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.94;
    const depth = cluster.tileDepth * 0.94;
    const level = building.level;
    const variant = building.id % 5;
    const districtPark = cluster.originWidth >= 4 && cluster.originDepth >= 4;
    const grandPark = cluster.originWidth >= 8 && cluster.originDepth >= 8;
    const lawnPalette = [0x8bb876, 0x82b36f, 0x7ea872, 0x95bb7c, 0x7fbf8d];
    const pathPalette = [0xd9cfbc, 0xe0d6c2, 0xd1c2a7, 0xe2d3b4, 0xd8d8cf];
    const roofPalette = [0x8a5d47, 0x6f7c58, 0x547a84, 0x7f5b89, 0x9b6b43];
    const meshes: THREE.Mesh[] = [];

    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({ color: level >= 2 ? lawnPalette[(variant + 1) % 5] : lawnPalette[variant], roughness: 0.98, metalness: 0.01 })
    );
    lawn.position.set(offset.x, 0.025, offset.z);
    lawn.receiveShadow = true;
    lawn.userData.buildingId = building.id;
    group.add(lawn);
    meshes.push(lawn);

    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(width * (level >= 5 ? 0.64 : level >= 3 ? 0.54 : 0.42), 0.02, depth * (level >= 5 ? 0.64 : level >= 3 ? 0.54 : 0.42)),
      new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.92, metalness: 0.01 })
    );
    plaza.position.set(offset.x, 0.055, offset.z);
    plaza.userData.buildingId = building.id;
    group.add(plaza);
    meshes.push(plaza);

    const crossPathA = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.14, 0.02, depth * 0.82),
      new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.92, metalness: 0.01 })
    );
    crossPathA.position.set(offset.x, 0.055, offset.z);
    crossPathA.userData.buildingId = building.id;
    const crossPathB = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, 0.02, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.92, metalness: 0.01 })
    );
    crossPathB.position.set(offset.x, 0.055, offset.z);
    crossPathB.userData.buildingId = building.id;
    group.add(crossPathA);
    group.add(crossPathB);
    meshes.push(crossPathA, crossPathB);

    const fountainBase = new THREE.Mesh(
      new THREE.CylinderGeometry(level >= 5 ? 0.42 : level >= 3 ? 0.32 : 0.24, level >= 5 ? 0.46 : level >= 3 ? 0.34 : 0.24, 0.08, 22),
      new THREE.MeshStandardMaterial({ color: 0xcfd6dc, roughness: 0.86, metalness: 0.05 })
    );
    fountainBase.position.set(offset.x, 0.08, offset.z);
    fountainBase.userData.buildingId = building.id;
    group.add(fountainBase);
    meshes.push(fountainBase);

    const fountainWater = new THREE.Mesh(
      new THREE.CylinderGeometry(level >= 5 ? 0.34 : level >= 3 ? 0.24 : 0.18, level >= 5 ? 0.36 : level >= 3 ? 0.25 : 0.18, 0.04, 22),
      new THREE.MeshStandardMaterial({ color: 0x8bd1ef, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.86, emissive: 0x38bdf8, emissiveIntensity: 0.08 })
    );
    fountainWater.position.set(offset.x, 0.12, offset.z);
    fountainWater.userData.buildingId = building.id;
    fountainWater.visible = level >= 2;
    group.add(fountainWater);
    meshes.push(fountainWater);

    const monument = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, level >= 5 ? 0.82 : level >= 3 ? 0.5 : 0.34, 12),
      new THREE.MeshStandardMaterial({ color: 0xe6e0d5, roughness: 0.84, metalness: 0.03 })
    );
    monument.position.set(offset.x, level >= 5 ? 0.5 : level >= 3 ? 0.34 : 0.24, offset.z);
    monument.userData.buildingId = building.id;
    monument.visible = level >= 3;
    group.add(monument);
    meshes.push(monument);

    const pavilionDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10),
      new THREE.MeshStandardMaterial({ color: 0xc9a87e, roughness: 0.82, metalness: 0.02 })
    );
    pavilionDeck.position.set(offset.x + width * 0.26, 0.08, offset.z - depth * 0.24);
    pavilionDeck.userData.buildingId = building.id;
    pavilionDeck.visible = level >= 3;
    group.add(pavilionDeck);
    meshes.push(pavilionDeck);

    const pavilionRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.22, 8),
      new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.82, metalness: 0.02 })
    );
    pavilionRoof.position.set(offset.x + width * 0.26, 0.32, offset.z - depth * 0.24);
    pavilionRoof.userData.buildingId = building.id;
    pavilionRoof.visible = level >= 3;
    group.add(pavilionRoof);
    meshes.push(pavilionRoof);

    const treeA = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.36, 10),
      new THREE.MeshStandardMaterial({ color: 0x4f8758, roughness: 0.86, metalness: 0.01 })
    );
    treeA.position.set(offset.x - width * 0.28, 0.28, offset.z - depth * 0.24);
    treeA.userData.buildingId = building.id;
    treeA.visible = level >= 2;
    group.add(treeA);
    meshes.push(treeA);
    const treeB = treeA.clone();
    treeB.position.set(offset.x - width * 0.26, 0.28, offset.z + depth * 0.24);
    treeB.userData.buildingId = building.id;
    group.add(treeB);
    meshes.push(treeB);

    const flowerBedA = this.createPlanterBox(0x9b7a58, 0x88b56a, offset.x - width * 0.22, 0.04, offset.z + depth * 0.26, building.id, 0.24, 0.16);
    const flowerBedB = this.createPlanterBox(0x9b7a58, 0x88b56a, offset.x + width * 0.18, 0.04, offset.z + depth * 0.26, building.id, 0.24, 0.16);
    const lampA = this.createStreetLamp(offset.x - width * 0.32, 0.055, offset.z + depth * 0.28, building.id, 0xffefbf);
    const lampB = this.createStreetLamp(offset.x + width * 0.32, 0.055, offset.z + depth * 0.28, building.id, 0xffefbf);
    const lampC = this.createStreetLamp(offset.x - width * 0.32, 0.055, offset.z - depth * 0.28, building.id, 0xffefbf);
    const lampD = this.createStreetLamp(offset.x + width * 0.32, 0.055, offset.z - depth * 0.28, building.id, 0xffefbf);

    const amphitheater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.42, 0.08, 18),
      new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 2) % 5], roughness: 0.9, metalness: 0.01 })
    );
    amphitheater.position.set(offset.x - width * 0.28, 0.09, offset.z + depth * 0.02);
    amphitheater.userData.buildingId = building.id;
    amphitheater.visible = level >= 4;
    group.add(amphitheater);
    meshes.push(amphitheater);

    const amphitheaterLawn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.03, 18),
      new THREE.MeshStandardMaterial({ color: lawnPalette[(variant + 3) % 5], roughness: 0.96, metalness: 0.01 })
    );
    amphitheaterLawn.position.set(offset.x - width * 0.28, 0.12, offset.z + depth * 0.02);
    amphitheaterLawn.userData.buildingId = building.id;
    amphitheaterLawn.visible = level >= 4;
    group.add(amphitheaterLawn);
    meshes.push(amphitheaterLawn);

    const conservatory = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.28, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xd9f4ef, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0x34d399, emissiveIntensity: 0.08 })
    );
    conservatory.position.set(offset.x + width * 0.3, 0.22, offset.z - depth * 0.24);
    conservatory.userData.buildingId = building.id;
    conservatory.visible = level >= 5;
    group.add(conservatory);
    meshes.push(conservatory);

    const conservatoryRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.04 })
    );
    conservatoryRoof.position.set(offset.x + width * 0.3, 0.46, offset.z - depth * 0.24);
    conservatoryRoof.userData.buildingId = building.id;
    conservatoryRoof.visible = level >= 5;
    group.add(conservatoryRoof);
    meshes.push(conservatoryRoof);

    const fountainJet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, level >= 5 ? 0.82 : 0.56, 10),
      new THREE.MeshStandardMaterial({ color: 0xc7f2ff, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.58, emissive: 0x67e8f9, emissiveIntensity: 0.1 })
    );
    fountainJet.position.set(offset.x, level >= 5 ? 0.48 : 0.34, offset.z);
    fountainJet.userData.buildingId = building.id;
    fountainJet.visible = level >= 4;
    group.add(fountainJet);
    meshes.push(fountainJet);

    const promenade = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.18, depth * 0.58),
      new THREE.MeshStandardMaterial({ color: 0xc9a87e, roughness: 0.82, metalness: 0.03 })
    );
    promenade.position.set(offset.x + width * 0.34, 0.16, offset.z + depth * 0.04);
    promenade.userData.buildingId = building.id;
    promenade.visible = level >= 4;
    group.add(promenade);
    meshes.push(promenade);

    const promenadeRoof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.06, depth * 0.62),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 3) % 5], roughness: 0.78, metalness: 0.04 })
    );
    promenadeRoof.position.set(offset.x + width * 0.34, 0.28, offset.z + depth * 0.04);
    promenadeRoof.userData.buildingId = building.id;
    promenadeRoof.visible = level >= 4;
    group.add(promenadeRoof);
    meshes.push(promenadeRoof);

    const reflectingBasin = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.04, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: 0xa9dff4, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: 0x67e8f9, emissiveIntensity: 0.08 })
    );
    reflectingBasin.position.set(offset.x - width * 0.02, 0.08, offset.z + depth * 0.26);
    reflectingBasin.userData.buildingId = building.id;
    reflectingBasin.visible = level >= 4;
    group.add(reflectingBasin);
    meshes.push(reflectingBasin);

    const sculptureWalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.14, 0.24, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe4dccf, roughness: 0.8, metalness: 0.04, emissive: 0xfff2c2, emissiveIntensity: 0.06 })
    );
    sculptureWalk.position.set(offset.x - width * 0.34, 0.18, offset.z - depth * 0.02);
    sculptureWalk.userData.buildingId = building.id;
    sculptureWalk.visible = level >= 5;
    group.add(sculptureWalk);
    meshes.push(sculptureWalk);

    const centralLake = new THREE.Mesh(
      new THREE.CylinderGeometry(
        districtPark ? Math.min(width, depth) * (grandPark ? 0.15 : 0.1) : 0.12,
        districtPark ? Math.min(width, depth) * (grandPark ? 0.17 : 0.12) : 0.14,
        0.05,
        24
      ),
      new THREE.MeshStandardMaterial({
        color: 0x9cd9ef,
        roughness: 0.18,
        metalness: 0.06,
        transparent: true,
        opacity: 0.84,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.08
      })
    );
    centralLake.position.set(offset.x, 0.09, offset.z - depth * 0.18);
    centralLake.userData.buildingId = building.id;
    centralLake.visible = districtPark;
    group.add(centralLake);
    meshes.push(centralLake);

    const grandPromenade = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.74, 0.02, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 2) % 5], roughness: 0.92, metalness: 0.01 })
    );
    grandPromenade.position.set(offset.x, 0.058, offset.z + depth * 0.34);
    grandPromenade.userData.buildingId = building.id;
    grandPromenade.visible = districtPark;
    group.add(grandPromenade);
    meshes.push(grandPromenade);

    const loopWalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, 0.018, depth * 0.82),
      new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 3) % 5], roughness: 0.92, metalness: 0.01 })
    );
    loopWalk.position.set(offset.x, 0.053, offset.z);
    loopWalk.userData.buildingId = building.id;
    loopWalk.visible = grandPark;
    group.add(loopWalk);
    meshes.push(loopWalk);

    const loopLawnInset = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.66, 0.014, depth * 0.66),
      new THREE.MeshStandardMaterial({ color: lawnPalette[(variant + 2) % 5], roughness: 0.97, metalness: 0.01 })
    );
    loopLawnInset.position.set(offset.x, 0.056, offset.z);
    loopLawnInset.userData.buildingId = building.id;
    loopLawnInset.visible = grandPark;
    group.add(loopLawnInset);
    meshes.push(loopLawnInset);

    const grandGlasshouse = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.42, depth * 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xe3f7f4,
        roughness: 0.2,
        metalness: 0.08,
        transparent: true,
        opacity: 0.84,
        emissive: 0x34d399,
        emissiveIntensity: 0.12
      })
    );
    grandGlasshouse.position.set(offset.x + width * 0.28, 0.28, offset.z - depth * 0.24);
    grandGlasshouse.userData.buildingId = building.id;
    grandGlasshouse.visible = districtPark && level >= 4;
    group.add(grandGlasshouse);
    meshes.push(grandGlasshouse);

    const grandGlasshouseRoof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.min(width, depth) * 0.09, 0.2, 8),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.74, metalness: 0.04 })
    );
    grandGlasshouseRoof.position.set(offset.x + width * 0.28, 0.56, offset.z - depth * 0.24);
    grandGlasshouseRoof.userData.buildingId = building.id;
    grandGlasshouseRoof.visible = districtPark && level >= 4;
    group.add(grandGlasshouseRoof);
    meshes.push(grandGlasshouseRoof);

    const amphitheaterTerrace = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(width, depth) * 0.08, Math.min(width, depth) * 0.1, 0.08, 20),
      new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 4) % 5], roughness: 0.9, metalness: 0.01 })
    );
    amphitheaterTerrace.position.set(offset.x - width * 0.3, 0.09, offset.z + depth * 0.06);
    amphitheaterTerrace.userData.buildingId = building.id;
    amphitheaterTerrace.visible = districtPark && level >= 4;
    group.add(amphitheaterTerrace);
    meshes.push(amphitheaterTerrace);

    const grandMonument = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.08, 0.74, depth * 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe8e1d4, roughness: 0.8, metalness: 0.04, emissive: 0xfff2c2, emissiveIntensity: 0.08 })
    );
    grandMonument.position.set(offset.x, 0.42, offset.z + depth * 0.02);
    grandMonument.userData.buildingId = building.id;
    grandMonument.visible = grandPark && level >= 5;
    group.add(grandMonument);
    meshes.push(grandMonument);

    const grandArbor = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.18, depth * 0.46),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 1) % 5], roughness: 0.76, metalness: 0.04 })
    );
    grandArbor.position.set(offset.x - width * 0.38, 0.2, offset.z);
    grandArbor.userData.buildingId = building.id;
    grandArbor.visible = grandPark && level >= 5;
    group.add(grandArbor);
    meshes.push(grandArbor);

    const concertStage = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.18, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: 0xa68462, roughness: 0.82, metalness: 0.03 })
    );
    concertStage.position.set(offset.x + width * 0.02, 0.16, offset.z - depth * 0.3);
    concertStage.userData.buildingId = building.id;
    concertStage.visible = level >= 4;
    group.add(concertStage);
    meshes.push(concertStage);

    const stageCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.3, 0.08, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.04, emissive: 0xfff2c2, emissiveIntensity: 0.08 })
    );
    stageCanopy.position.set(offset.x + width * 0.02, 0.34, offset.z - depth * 0.3);
    stageCanopy.userData.buildingId = building.id;
    stageCanopy.visible = level >= 4;
    group.add(stageCanopy);
    meshes.push(stageCanopy);

    const kiosk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.18, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: 0xe6dcc8, roughness: 0.78, metalness: 0.02 })
    );
    kiosk.position.set(offset.x - width * 0.34, 0.16, offset.z + depth * 0.3);
    kiosk.userData.buildingId = building.id;
    kiosk.visible = level >= 4;
    group.add(kiosk);
    meshes.push(kiosk);

    const kioskRoof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.2, 0.06, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 4) % 5], roughness: 0.76, metalness: 0.04 })
    );
    kioskRoof.position.set(offset.x - width * 0.34, 0.3, offset.z + depth * 0.3);
    kioskRoof.userData.buildingId = building.id;
    kioskRoof.visible = level >= 4;
    group.add(kioskRoof);
    meshes.push(kioskRoof);

    const terraceGarden = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.08, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0x7faa72, roughness: 0.94, metalness: 0.01 })
    );
    terraceGarden.position.set(offset.x + width * 0.34, 0.12, offset.z + depth * 0.24);
    terraceGarden.userData.buildingId = building.id;
    terraceGarden.visible = level >= 5;
    group.add(terraceGarden);
    meshes.push(terraceGarden);

    const terraceGardenUpper = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.08, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: 0x8ab67b, roughness: 0.94, metalness: 0.01 })
    );
    terraceGardenUpper.position.set(offset.x + width * 0.34, 0.2, offset.z + depth * 0.24);
    terraceGardenUpper.userData.buildingId = building.id;
    terraceGardenUpper.visible = level >= 5;
    group.add(terraceGardenUpper);
    meshes.push(terraceGardenUpper);

    const pergolaWalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.16, depth * 0.44),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.74, metalness: 0.04 })
    );
    pergolaWalk.position.set(offset.x - width * 0.38, 0.2, offset.z);
    pergolaWalk.userData.buildingId = building.id;
    pergolaWalk.visible = level >= 5;
    group.add(pergolaWalk);
    meshes.push(pergolaWalk);

    const carouselBase = new THREE.Mesh(
      new THREE.CylinderGeometry(Math.min(width, depth) * 0.08, Math.min(width, depth) * 0.09, 0.05, 18),
      new THREE.MeshStandardMaterial({ color: 0xe8d6af, roughness: 0.86, metalness: 0.02 })
    );
    carouselBase.position.set(offset.x + width * 0.18, 0.09, offset.z + depth * 0.04);
    carouselBase.userData.buildingId = building.id;
    carouselBase.visible = level >= 6;
    group.add(carouselBase);
    meshes.push(carouselBase);

    const carouselRoof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.min(width, depth) * 0.1, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 3) % 5], roughness: 0.76, metalness: 0.03 })
    );
    carouselRoof.position.set(offset.x + width * 0.18, 0.28, offset.z + depth * 0.04);
    carouselRoof.userData.buildingId = building.id;
    carouselRoof.visible = level >= 6;
    group.add(carouselRoof);
    meshes.push(carouselRoof);

    const swingGarden = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.03, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: 0xdabf97, roughness: 0.9, metalness: 0.01 })
    );
    swingGarden.position.set(offset.x - width * 0.24, 0.07, offset.z - depth * 0.18);
    swingGarden.userData.buildingId = building.id;
    swingGarden.visible = level >= 7;
    group.add(swingGarden);
    meshes.push(swingGarden);

    const slidePark = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.14, 0.22, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.82, metalness: 0.02 })
    );
    slidePark.position.set(offset.x + width * 0.3, 0.18, offset.z - depth * 0.04);
    slidePark.userData.buildingId = building.id;
    slidePark.visible = level >= 8;
    group.add(slidePark);
    meshes.push(slidePark);

    const playgroundSlide = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.14, 0.04, depth * 0.06),
      new THREE.MeshStandardMaterial({ color: 0xe56f4e, roughness: 0.78, metalness: 0.02 })
    );
    playgroundSlide.position.set(offset.x + width * 0.22, 0.12, offset.z + depth * 0.02);
    playgroundSlide.rotation.z = -0.5;
    playgroundSlide.userData.buildingId = building.id;
    playgroundSlide.visible = level >= 8;
    group.add(playgroundSlide);
    meshes.push(playgroundSlide);

    const picnicPavilion = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.2, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 1) % 5], roughness: 0.78, metalness: 0.03 })
    );
    picnicPavilion.position.set(offset.x - width * 0.26, 0.18, offset.z + depth * 0.24);
    picnicPavilion.userData.buildingId = building.id;
    picnicPavilion.visible = level >= 9;
    group.add(picnicPavilion);
    meshes.push(picnicPavilion);

    const splashCourt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.03, depth * 0.16),
      new THREE.MeshStandardMaterial({ color: 0x9fdcf1, roughness: 0.18, metalness: 0.06, emissive: 0x38bdf8, emissiveIntensity: 0.1 })
    );
    splashCourt.position.set(offset.x, 0.07, offset.z - depth * 0.24);
    splashCourt.userData.buildingId = building.id;
    splashCourt.visible = level >= 10;
    group.add(splashCourt);
    meshes.push(splashCourt);

    group.add(flowerBedA);
    group.add(flowerBedB);
    group.add(lampA);
    group.add(lampB);
    group.add(lampC);
    group.add(lampD);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [
        fountainWater,
        conservatory,
        fountainJet,
        reflectingBasin,
        sculptureWalk,
        stageCanopy,
        centralLake,
        grandGlasshouse,
        grandMonument,
        splashCourt
      ].filter((mesh) => mesh.visible),
      phase: building.id * 0.09
    });

    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(flowerBedA),
      ...this.collectMeshes(flowerBedB),
      ...this.collectMeshes(lampA),
      ...this.collectMeshes(lampB),
      ...this.collectMeshes(lampC),
      ...this.collectMeshes(lampD)
    ]);

    return group;
  }

  private createMergedParkGreenway(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.94;
    const depth = cluster.tileDepth * 0.94;
    const longAxisX = cluster.originWidth >= cluster.originDepth;
    const level = building.level;
    const variant = building.id % 5;
    const pairedPocket = cluster.size === 2;
    const extendedGreenway = cluster.size >= 5;
    const lawnPalette = [0x86b676, 0x7fae70, 0x79a96d, 0x8ebc7c, 0x78b98a];
    const pathPalette = [0xd8cfbf, 0xe0d5c5, 0xd1c4ad, 0xe2d6ba, 0xd7ddd2];
    const roofPalette = [0x8a5d47, 0x6f7c58, 0x547a84, 0x7f5b89, 0x9b6b43];
    const meshes: THREE.Mesh[] = [];

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const lawn = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.05, depth),
        new THREE.MeshStandardMaterial({ color: lawnPalette[variant], roughness: 0.98, metalness: 0.01 })
      )
    );
    lawn.position.set(offset.x, 0.025, offset.z);

    const spine = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.86 : width * 0.2, 0.02, longAxisX ? depth * 0.22 : depth * 0.86),
        new THREE.MeshStandardMaterial({ color: pathPalette[variant], roughness: 0.92, metalness: 0.01 })
      )
    );
    spine.position.set(offset.x, 0.055, offset.z);

    const sideWalkA = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.8 : width * 0.12, 0.018, longAxisX ? depth * 0.08 : depth * 0.8),
        new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 1) % 5], roughness: 0.92, metalness: 0.01 })
      )
    );
    sideWalkA.position.set(offset.x, 0.054, offset.z + (longAxisX ? depth * 0.22 : 0));

    const sideWalkB = sideWalkA.clone();
    sideWalkB.position.set(offset.x, 0.054, offset.z - (longAxisX ? depth * 0.22 : 0));
    if (!longAxisX) {
      sideWalkA.position.set(offset.x + width * 0.22, 0.054, offset.z);
      sideWalkB.position.set(offset.x - width * 0.22, 0.054, offset.z);
    }
    sideWalkB.userData.buildingId = building.id;
    group.add(sideWalkB);
    meshes.push(sideWalkB);

    const pergola = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.16 : width * 0.22, 0.14, longAxisX ? depth * 0.28 : depth * 0.16),
        new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.78, metalness: 0.03 })
      )
    );
    pergola.position.set(offset.x, 0.22, offset.z);
    pergola.visible = level >= 2;

    const waterRun = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.26 : width * 0.12, 0.05, longAxisX ? depth * 0.08 : depth * 0.26),
        new THREE.MeshStandardMaterial({
          color: 0x8fd8f8,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: 0x38bdf8,
          emissiveIntensity: 0.09
        })
      )
    );
    waterRun.position.set(offset.x + (longAxisX ? 0 : width * 0.18), 0.08, offset.z + (longAxisX ? depth * 0.16 : 0));
    waterRun.visible = level >= 3;

    const pavilion = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.14 : width * 0.18, 0.22, longAxisX ? depth * 0.2 : depth * 0.14),
        new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.76, metalness: 0.04 })
      )
    );
    pavilion.position.set(
      offset.x + (longAxisX ? width * 0.24 : 0),
      0.18,
      offset.z + (longAxisX ? 0 : depth * 0.24)
    );
    pavilion.visible = level >= 4;

    const conservatory = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.18 : width * 0.22, 0.28, longAxisX ? depth * 0.16 : depth * 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xe7f6ff,
          roughness: 0.2,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: 0x67e8f9,
          emissiveIntensity: 0.12
        })
      )
    );
    conservatory.position.set(
      offset.x + (longAxisX ? -width * 0.26 : 0),
      0.2,
      offset.z + (longAxisX ? 0 : -depth * 0.26)
    );
    conservatory.visible = level >= 5;

    const lampA = this.createStreetLamp(
      offset.x + (longAxisX ? -width * 0.32 : width * 0.26),
      0.055,
      offset.z + (longAxisX ? depth * 0.18 : -depth * 0.32),
      building.id,
      0xffefbf
    );
    const lampB = this.createStreetLamp(
      offset.x + (longAxisX ? width * 0.32 : -width * 0.26),
      0.055,
      offset.z + (longAxisX ? -depth * 0.18 : depth * 0.32),
      building.id,
      0xffefbf
    );
    const planterA = this.createPlanterBox(0x9b7a58, 0x87b56d, offset.x - width * 0.18, 0.04, offset.z + depth * 0.18, building.id, 0.18, 0.12);
    const planterB = this.createPlanterBox(0x9b7a58, 0x87b56d, offset.x + width * 0.18, 0.04, offset.z - depth * 0.18, building.id, 0.18, 0.12);
    const benchA = this.createBench(offset.x - width * 0.12, 0.03, offset.z + (longAxisX ? 0.18 : -0.18), longAxisX ? 0 : Math.PI / 2, building.id);
    const benchB = this.createBench(offset.x + width * 0.12, 0.03, offset.z + (longAxisX ? -0.18 : 0.18), longAxisX ? Math.PI : -Math.PI / 2, building.id);

    const bikeRibbon = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.84 : width * 0.08, 0.01, longAxisX ? depth * 0.08 : depth * 0.84),
        new THREE.MeshStandardMaterial({ color: 0x6ec1d4, roughness: 0.62, metalness: 0.03 })
      )
    );
    bikeRibbon.position.set(offset.x + (longAxisX ? 0 : -width * 0.28), 0.058, offset.z + (longAxisX ? -depth * 0.28 : 0));
    bikeRibbon.visible = level >= 3;

    const playCourt = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.18 : width * 0.28, 0.018, longAxisX ? depth * 0.28 : depth * 0.18),
        new THREE.MeshStandardMaterial({ color: 0xc98d65, roughness: 0.88, metalness: 0.02 })
      )
    );
    playCourt.position.set(offset.x + (longAxisX ? width * 0.34 : 0), 0.06, offset.z + (longAxisX ? 0 : depth * 0.34));
    playCourt.visible = level >= 4;

    const footbridge = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.18 : width * 0.12, 0.08, longAxisX ? depth * 0.14 : depth * 0.18),
        new THREE.MeshStandardMaterial({ color: 0x9d7c58, roughness: 0.8, metalness: 0.03 })
      )
    );
    footbridge.position.set(offset.x + (longAxisX ? -width * 0.18 : width * 0.18), 0.12, offset.z + (longAxisX ? -depth * 0.02 : depth * 0.02));
    footbridge.visible = level >= 4;

    const lanternRun = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.52 : width * 0.04, 0.04, longAxisX ? depth * 0.04 : depth * 0.52),
        new THREE.MeshStandardMaterial({ color: 0xe6f7ff, roughness: 0.24, metalness: 0.08, emissive: 0x67e8f9, emissiveIntensity: 0.12 })
      )
    );
    lanternRun.position.set(offset.x, 0.14, offset.z + (longAxisX ? depth * 0.28 : 0));
    if (!longAxisX) {
      lanternRun.position.set(offset.x + width * 0.28, 0.14, offset.z);
    }
    lanternRun.visible = level >= 5;

    const orchardRow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.42 : width * 0.18, 0.08, longAxisX ? depth * 0.12 : depth * 0.42),
        new THREE.MeshStandardMaterial({ color: 0x84b66d, roughness: 0.94, metalness: 0.01 })
      )
    );
    orchardRow.position.set(offset.x + (longAxisX ? 0 : -width * 0.22), 0.08, offset.z + (longAxisX ? depth * 0.34 : 0));
    orchardRow.visible = level >= 5;

    const pocketPlaza = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.22 : width * 0.3, 0.02, longAxisX ? depth * 0.3 : depth * 0.22),
        new THREE.MeshStandardMaterial({ color: pathPalette[(variant + 2) % 5], roughness: 0.92, metalness: 0.01 })
      )
    );
    pocketPlaza.position.set(offset.x, 0.058, offset.z);
    pocketPlaza.visible = pairedPocket;

    const pocketFountain = addMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.05, 18),
        new THREE.MeshStandardMaterial({ color: 0xa9dff4, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.84, emissive: 0x38bdf8, emissiveIntensity: 0.08 })
      )
    );
    pocketFountain.position.set(offset.x, 0.09, offset.z);
    pocketFountain.visible = pairedPocket && level >= 2;

    const greenwayPavilion = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.16 : width * 0.2, 0.24, longAxisX ? depth * 0.22 : depth * 0.16),
        new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 1) % 5], roughness: 0.76, metalness: 0.04 })
      )
    );
    greenwayPavilion.position.set(offset.x + (longAxisX ? width * 0.34 : 0), 0.18, offset.z + (longAxisX ? 0 : depth * 0.34));
    greenwayPavilion.visible = extendedGreenway && level >= 4;

    const rill = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(longAxisX ? width * 0.56 : width * 0.08, 0.04, longAxisX ? depth * 0.08 : depth * 0.56),
        new THREE.MeshStandardMaterial({ color: 0x9adcf2, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: 0x38bdf8, emissiveIntensity: 0.09 })
      )
    );
    rill.position.set(offset.x, 0.08, offset.z + (longAxisX ? depth * 0.12 : 0));
    if (!longAxisX) {
      rill.position.set(offset.x + width * 0.12, 0.08, offset.z);
    }
    rill.visible = extendedGreenway && level >= 4;

    group.add(lampA, lampB, planterA, planterB, benchA, benchB);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [waterRun, conservatory, lanternRun, pocketFountain, rill].filter((mesh) => mesh.visible),
      phase: building.id * 0.09
    });

    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(lampA),
      ...this.collectMeshes(lampB),
      ...this.collectMeshes(planterA),
      ...this.collectMeshes(planterB),
      ...this.collectMeshes(benchA),
      ...this.collectMeshes(benchB)
    ]);

    return group;
  }

  private createMergedRailHub(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.94;
    const depth = cluster.tileDepth * 0.94;
    const level = building.level;
    const longAxisX = cluster.originWidth >= cluster.originDepth;
    const theme = building.id % 5;
    const wallPalette = [0xd8d1c5, 0xd5d7d9, 0xdacfc1, 0xcfd7cf, 0xd7d3c8];
    const roofPalette = [0x5f7386, 0x6c7a88, 0x6b625b, 0x54777d, 0x706a82];
    const accentPalette = [0xb4d8ec, 0xc8e2f1, 0xaed0df, 0xbbe2e5, 0xc2d8ef];
    const glowPalette = [0x67e8f9, 0x93c5fd, 0xfacc15, 0x5eead4, 0xfda4af];
    const wallMat = new THREE.MeshStandardMaterial({ color: wallPalette[theme], roughness: 0.82, metalness: 0.03 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofPalette[theme], roughness: 0.74, metalness: 0.08 });
    const glassMat = new THREE.MeshStandardMaterial({ color: accentPalette[theme], roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.84 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xe9fbff, roughness: 0.18, metalness: 0.08, emissive: glowPalette[theme], emissiveIntensity: 0.18 });
    const meshes: THREE.Mesh[] = [];
    const glowMeshes: THREE.Mesh[] = [];

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };
    const addGlowMesh = (mesh: THREE.Mesh) => {
      addMesh(mesh);
      glowMeshes.push(mesh);
      return mesh;
    };

    const plaza = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.14, 0.03, depth + 0.14),
      new THREE.MeshStandardMaterial({ color: 0xe5dfd7, roughness: 0.96, metalness: 0.01 })
    ));
    plaza.position.set(offset.x, 0.03, offset.z);

    const concourse = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.48 : width * 0.72, 0.34, longAxisX ? depth * 0.72 : depth * 0.48),
      wallMat
    ));
    concourse.position.set(offset.x, 0.2, offset.z);

    const concourseRoof = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.54 : width * 0.78, 0.08, longAxisX ? depth * 0.78 : depth * 0.54),
      roofMat
    ));
    concourseRoof.position.set(offset.x, 0.42, offset.z);

    const hallGlass = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.4 : width * 0.64, 0.22, longAxisX ? depth * 0.3 : depth * 0.4),
      glassMat
    ));
    hallGlass.position.set(offset.x, 0.28, offset.z + (longAxisX ? depth * 0.12 : 0));

    const signBand = addGlowMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.42 : width * 0.56, 0.1, 0.05),
      glowMat
    ));
    signBand.position.set(offset.x, 0.38, offset.z + (longAxisX ? depth * 0.33 : depth * 0.24));

    const platformRunA = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.9 : width * 0.22, 0.06, longAxisX ? depth * 0.18 : depth * 0.9),
      new THREE.MeshStandardMaterial({ color: 0xc8c6c2, roughness: 0.92, metalness: 0.02 })
    ));
    platformRunA.position.set(offset.x, 0.08, offset.z + (longAxisX ? -depth * 0.28 : 0));
    const platformRunB = platformRunA.clone();
    if (longAxisX) {
      platformRunB.position.set(offset.x, 0.08, offset.z + depth * 0.28);
    } else {
      platformRunA.position.set(offset.x - width * 0.28, 0.08, offset.z);
      platformRunB.position.set(offset.x + width * 0.28, 0.08, offset.z);
    }
    platformRunB.userData.buildingId = building.id;
    group.add(platformRunA, platformRunB);
    meshes.push(platformRunA, platformRunB);

    const canopyA = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.86 : width * 0.16, 0.04, longAxisX ? depth * 0.08 : depth * 0.86),
      roofMat.clone()
    ));
    canopyA.position.copy(platformRunA.position).add(new THREE.Vector3(0, 0.22, 0));
    const canopyB = canopyA.clone();
    canopyB.position.copy(platformRunB.position).add(new THREE.Vector3(0, 0.22, 0));
    canopyB.userData.buildingId = building.id;
    group.add(canopyA, canopyB);
    meshes.push(canopyB);

    const footBridge = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.18 : width * 0.7, 0.08, longAxisX ? depth * 0.7 : depth * 0.18),
      roofMat.clone()
    ));
    footBridge.position.set(offset.x, 0.56, offset.z);
    footBridge.visible = level >= 2;

    const clockTower = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.72, 0.24),
      wallMat.clone()
    ));
    clockTower.position.set(offset.x + (longAxisX ? width * 0.24 : width * 0.32), 0.5, offset.z - (longAxisX ? depth * 0.12 : depth * 0.22));
    clockTower.visible = level >= 3;

    const towerCap = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.08, 0.32),
      roofMat.clone()
    ));
    towerCap.position.copy(clockTower.position).add(new THREE.Vector3(0, 0.42, 0));
    towerCap.visible = level >= 3;

    const secondHall = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.32 : width * 0.52, 0.24, longAxisX ? depth * 0.52 : depth * 0.32),
      wallMat.clone()
    ));
    secondHall.position.set(offset.x - (longAxisX ? width * 0.2 : 0), 0.22, offset.z - (longAxisX ? 0 : depth * 0.2));
    secondHall.visible = level >= 4;

    const roofArch = addGlowMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.28 : width * 0.42, 0.08, 0.06),
      glowMat.clone()
    ));
    roofArch.position.set(offset.x, 0.74, offset.z + (longAxisX ? depth * 0.04 : depth * 0.12));
    roofArch.visible = level >= 5;

    const stationTower = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.04, 0.28),
      new THREE.MeshStandardMaterial({ color: wallPalette[(theme + 1) % 5], roughness: 0.74, metalness: 0.04 })
    ));
    stationTower.position.set(offset.x - (longAxisX ? width * 0.3 : width * 0.18), 0.72, offset.z + (longAxisX ? depth * 0.16 : depth * 0.3));
    stationTower.visible = level >= 6;

    const overpassHall = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.16 : width * 0.64, 0.16, longAxisX ? depth * 0.64 : depth * 0.16),
      glassMat.clone()
    ));
    overpassHall.position.set(offset.x, 0.72, offset.z);
    overpassHall.visible = level >= 7;

    const transitWing = addMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.28 : width * 0.42, 0.28, longAxisX ? depth * 0.2 : depth * 0.28),
      wallMat.clone()
    ));
    transitWing.position.set(offset.x + (longAxisX ? 0 : width * 0.26), 0.22, offset.z + (longAxisX ? depth * 0.26 : 0));
    transitWing.visible = level >= 8;

    const beaconMast = addGlowMesh(new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.18, 0.08),
      glowMat.clone()
    ));
    beaconMast.position.set(offset.x, 1.02, offset.z - (longAxisX ? depth * 0.22 : depth * 0.18));
    beaconMast.visible = level >= 9;

    const grandArch = addGlowMesh(new THREE.Mesh(
      new THREE.BoxGeometry(longAxisX ? width * 0.5 : width * 0.68, 0.1, 0.08),
      glowMat.clone()
    ));
    grandArch.position.set(offset.x, 0.94, offset.z + (longAxisX ? depth * 0.36 : depth * 0.28));
    grandArch.visible = level >= 10;

    const lampA = this.createStreetLamp(offset.x - width * 0.34, 0.04, offset.z + depth * 0.38, building.id, 0xffefbf);
    const lampB = this.createStreetLamp(offset.x + width * 0.34, 0.04, offset.z + depth * 0.38, building.id, 0xffefbf);
    const benchA = this.createBench(offset.x - width * 0.18, 0.04, offset.z + depth * 0.3, 0, building.id);
    const benchB = this.createBench(offset.x + width * 0.18, 0.04, offset.z + depth * 0.3, Math.PI, building.id);
    const planterA = this.createPlanterBox(0x9b7a58, 0x7faa72, offset.x - width * 0.28, 0.04, offset.z + depth * 0.18, building.id, 0.2, 0.12);
    const planterB = this.createPlanterBox(0x9b7a58, 0x86b67a, offset.x + width * 0.28, 0.04, offset.z + depth * 0.18, building.id, 0.2, 0.12);
    group.add(lampA, lampB, benchA, benchB, planterA, planterB);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [signBand, roofArch, beaconMast, grandArch].filter((mesh) => mesh.visible),
      phase: building.id * 0.08
    });
    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(lampA),
      ...this.collectMeshes(lampB),
      ...this.collectMeshes(benchA),
      ...this.collectMeshes(benchB),
      ...this.collectMeshes(planterA),
      ...this.collectMeshes(planterB)
    ]);
    return group;
  }

  private createMergedCommercialCluster(
    building: Building,
    cluster: BuildingClusterData,
    mode: 'shopStrip' | 'restaurantHall' | 'superStore'
  ): THREE.Group {
    const group = new THREE.Group();
    const level = building.level;
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.94;
    const depth = cluster.tileDepth * 0.94;
    const longAxisX = cluster.originWidth >= cluster.originDepth;
    const theme = building.id % 5;
    const themes = [
      { body: 0xd8d7ca, roof: 0x59636f, accent: 0xaed4f6, sign: 0x164e63 },
      { body: 0xd7cfbf, roof: 0x77543f, accent: 0xecb07a, sign: 0x7c2d12 },
      { body: 0xd4dccd, roof: 0x52694b, accent: 0x98d19a, sign: 0x14532d },
      { body: 0xdad2e2, roof: 0x5c5878, accent: 0xd5b7ef, sign: 0x4c1d95 },
      { body: 0xe2d0c0, roof: 0x6f5f48, accent: 0xf0c173, sign: 0x7c2d12 }
    ][theme];
    const archetype = [
      {
        podiumW: 0.92, podiumD: 0.62, upperW: 0.72, upperD: 0.24, upperX: 0, upperZ: -0.02,
        featureX: 0.34, featureZ: 0, featureH: 1, hotelW: 0.42, hotelH: 1, hotelX: -0.24,
        skylineW: 0.4, skylineD: 0.28, skylineH: 1.02, skylineX: 0.12, skylineZ: -0.08,
        anchorX: -0.34, terraceX: 0.18, terraceZ: 0.18, arcadeZ: -0.08
      },
      {
        podiumW: 0.68, podiumD: 0.46, upperW: 0.42, upperD: 0.18, upperX: 0.1, upperZ: -0.1,
        featureX: 0.08, featureZ: 0.26, featureH: 1.22, hotelW: 0.26, hotelH: 1.18, hotelX: -0.08,
        skylineW: 0.22, skylineD: 0.18, skylineH: 1.46, skylineX: 0.02, skylineZ: 0.08,
        anchorX: -0.26, terraceX: 0.02, terraceZ: 0.24, arcadeZ: 0.02
      },
      {
        podiumW: 0.9, podiumD: 0.56, upperW: 0.6, upperD: 0.22, upperX: -0.14, upperZ: -0.04,
        featureX: 0.24, featureZ: 0.12, featureH: 0.84, hotelW: 0.34, hotelH: 0.88, hotelX: -0.28,
        skylineW: 0.3, skylineD: 0.26, skylineH: 1.18, skylineX: 0.24, skylineZ: -0.02,
        anchorX: -0.38, terraceX: 0.24, terraceZ: 0.12, arcadeZ: 0.08
      },
      {
        podiumW: 0.82, podiumD: 0.48, upperW: 0.52, upperD: 0.18, upperX: 0.18, upperZ: 0.06,
        featureX: -0.24, featureZ: -0.02, featureH: 1.28, hotelW: 0.28, hotelH: 1.26, hotelX: 0.22,
        skylineW: 0.24, skylineD: 0.22, skylineH: 1.54, skylineX: -0.2, skylineZ: -0.06,
        anchorX: 0.34, terraceX: -0.18, terraceZ: 0.18, arcadeZ: -0.12
      },
      {
        podiumW: 0.96, podiumD: 0.64, upperW: 0.76, upperD: 0.28, upperX: 0, upperZ: 0.02,
        featureX: 0.3, featureZ: -0.22, featureH: 0.9, hotelW: 0.46, hotelH: 1.06, hotelX: -0.2,
        skylineW: 0.42, skylineD: 0.34, skylineH: 1.12, skylineX: 0.18, skylineZ: 0.12,
        anchorX: -0.3, terraceX: 0.14, terraceZ: 0.24, arcadeZ: -0.02
      }
    ][theme];
    const meshes: THREE.Mesh[] = [];
    const heightScale = level === 1 ? 0.56 : level === 2 ? 0.94 : level === 3 ? 1.36 : level === 4 ? 1.92 : 2.42;
    const bodyDepthScale = mode === 'superStore' ? 0.72 : mode === 'restaurantHall' ? 0.68 : 0.62;
    const downtownMode = cluster.size >= 4 && level >= 4;
    const skylineDistrict = cluster.size >= 6 && level >= 5;
    const mixedUseMode = cluster.members.some(
      (member) => this.adjacentMatchingBuildings(member, (candidate) => candidate.type === 'house').length > 0
    );
    const megaDowntown = cluster.size >= 8 || (cluster.originWidth >= 3 && cluster.originDepth >= 3);

    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.16, 0.025, depth + 0.16),
      new THREE.MeshStandardMaterial({ color: 0xe6e0d7, roughness: 0.96, metalness: 0.01 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;
    group.add(walk);
    meshes.push(walk);

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({
        color: mode === 'superStore' ? 0xd8d4c8 : mode === 'restaurantHall' ? 0xdccab8 : themes.body,
        roughness: 0.94,
        metalness: 0.01
      })
    );
    lot.position.set(offset.x, 0.025, offset.z);
    lot.receiveShadow = true;
    lot.userData.buildingId = building.id;
    group.add(lot);
    meshes.push(lot);

    const podium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * archetype.podiumW, 0.46, depth * Math.max(bodyDepthScale, archetype.podiumD)),
        new THREE.MeshStandardMaterial({
          color: mode === 'superStore' ? 0xdce2c3 : mode === 'restaurantHall' ? 0xe2ccb2 : themes.body,
          roughness: 0.76,
          metalness: 0.02
        })
      )
    );
    podium.position.set(offset.x, 0.28, offset.z);

    const roof = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * (archetype.podiumW + 0.04), 0.08, depth * (Math.max(bodyDepthScale, archetype.podiumD) + 0.05)),
        new THREE.MeshStandardMaterial({
          color: mode === 'superStore' ? 0x557258 : mode === 'restaurantHall' ? 0xb35f45 : themes.roof,
          roughness: 0.8,
          metalness: 0.03
        })
      )
    );
    roof.position.set(offset.x, 0.56, offset.z);

    const canopy = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, 0.05, 0.18),
        new THREE.MeshStandardMaterial({
          color: mode === 'superStore' ? 0x78be7d : mode === 'restaurantHall' ? 0xf0ab65 : themes.accent,
          roughness: 0.74,
          metalness: 0.04
        })
      )
    );
    canopy.position.set(offset.x, 0.24, offset.z + depth * 0.36);
    const canopyRear = canopy.clone();
    canopyRear.position.set(offset.x, 0.24, offset.z - depth * 0.36);
    canopyRear.userData.buildingId = building.id;
    group.add(canopyRear);
    meshes.push(canopyRear);

    const signBand = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, 0.12, 0.04),
        new THREE.MeshStandardMaterial({
          color: mode === 'superStore' ? 0xa4dfb0 : mode === 'restaurantHall' ? 0xf6c878 : themes.accent,
          roughness: 0.46,
          metalness: 0.08,
          emissive: mode === 'restaurantHall' ? 0x7c2d12 : themes.sign,
          emissiveIntensity: 0.18
        })
      )
    );
    signBand.position.set(offset.x, 0.5, offset.z + depth * 0.39);
    const signBandRear = signBand.clone();
    signBandRear.position.set(offset.x, 0.5, offset.z - depth * 0.39);
    signBandRear.userData.buildingId = building.id;
    group.add(signBandRear);
    meshes.push(signBandRear);

    const storefrontFront = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.76, 0.24, 0.03),
        new THREE.MeshStandardMaterial({
          color: mode === 'superStore' ? 0xd9f7d3 : 0xffefc9,
          roughness: 0.18,
          metalness: 0.12,
          transparent: true,
          opacity: 0.84,
          emissive: mode === 'superStore' ? 0x166534 : 0xf59e0b,
          emissiveIntensity: 0.08
        })
      )
    );
    storefrontFront.position.set(offset.x, 0.23, offset.z + depth * 0.4);
    const storefrontRear = storefrontFront.clone();
    storefrontRear.position.set(offset.x, 0.23, offset.z - depth * 0.4);
    storefrontRear.userData.buildingId = building.id;
    group.add(storefrontRear);
    meshes.push(storefrontRear);

    const sideGlassEast = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.22, depth * 0.48),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.22,
          metalness: 0.1,
          transparent: true,
          opacity: 0.82,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.06
        })
      )
    );
    sideGlassEast.position.set(offset.x + width * 0.44, 0.25, offset.z);
    const sideGlassWest = sideGlassEast.clone();
    sideGlassWest.position.set(offset.x - width * 0.44, 0.25, offset.z);
    sideGlassWest.userData.buildingId = building.id;
    group.add(sideGlassWest);
    meshes.push(sideGlassWest);

    if (level >= 2) {
      const upperFloor = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * archetype.upperW, heightScale * 0.42, depth * archetype.upperD),
          new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.76, metalness: 0.02 })
        )
      );
      upperFloor.position.set(offset.x + width * archetype.upperX, 0.78, offset.z + depth * archetype.upperZ);

      for (let i = 0; i < Math.max(2, Math.min(5, cluster.size)); i += 1) {
        const roofUnit = addMesh(
          new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.08, 0.14),
            new THREE.MeshStandardMaterial({ color: 0x8a97a4, roughness: 0.68, metalness: 0.12 })
          )
        );
        const t = Math.max(2, Math.min(5, cluster.size)) === 1 ? 0.5 : i / (Math.max(2, Math.min(5, cluster.size)) - 1);
        roofUnit.position.set(offset.x - width * 0.28 + t * width * 0.56, 0.68, offset.z - depth * 0.08);
      }

      const mezzanine = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * Math.max(0.34, archetype.upperW - 0.16), 0.22, depth * 0.16),
          new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.76, metalness: 0.02 })
        )
      );
      mezzanine.position.set(offset.x + width * archetype.upperX * 0.5, 0.98, offset.z + (mode === 'restaurantHall' ? 0.04 : -0.06));
    }

    if (level >= 3) {
      const featureTower = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(longAxisX ? 0.34 : 0.26, mode === 'superStore' ? 0.92 : 0.78, longAxisX ? 0.24 : 0.34),
          new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.66, metalness: 0.05 })
        )
      );
      featureTower.position.set(
        offset.x + width * archetype.featureX,
        (mode === 'superStore' ? 1.02 : 0.92) * archetype.featureH,
        offset.z + depth * archetype.featureZ
      );

      const towerCap = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(longAxisX ? 0.38 : 0.3, 0.08, longAxisX ? 0.28 : 0.38),
          new THREE.MeshStandardMaterial({ color: themes.roof, roughness: 0.72, metalness: 0.05 })
        )
      );
      towerCap.position.set(featureTower.position.x, featureTower.position.y + (mode === 'superStore' ? 0.48 : 0.4), featureTower.position.z);

      const towerWindow = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(longAxisX ? 0.2 : 0.16, 0.14, 0.03),
          new THREE.MeshStandardMaterial({
            color: 0xffefc9,
            roughness: 0.2,
            metalness: 0.08,
            transparent: true,
            opacity: 0.82,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.08
          })
        )
      );
      towerWindow.position.set(featureTower.position.x, featureTower.position.y + 0.08, featureTower.position.z + (longAxisX ? 0.13 : 0.18));
    }

    if (level >= 4) {
      const hotelMass = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * archetype.hotelW, (mode === 'restaurantHall' ? 1.38 : 1.64) * archetype.hotelH, depth * 0.28),
          new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.72, metalness: 0.03 })
        )
      );
      hotelMass.position.set(offset.x + width * archetype.hotelX, (mode === 'restaurantHall' ? 1.56 : 1.82) * archetype.hotelH, offset.z + depth * 0.02);

      const hotelGlass = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.22, mode === 'restaurantHall' ? 0.94 : 1.18, 0.03),
          new THREE.MeshStandardMaterial({ color: 0xffefc9, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0xf59e0b, emissiveIntensity: 0.1 })
        )
      );
      hotelGlass.position.set(hotelMass.position.x, hotelMass.position.y, hotelMass.position.z + 0.14);

      const skyLobby = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.26, 0.22, depth * 0.16),
          new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.4, metalness: 0.08, transparent: true, opacity: 0.88, emissive: themes.sign, emissiveIntensity: 0.12 })
        )
      );
      skyLobby.position.set(offset.x + width * 0.12, mode === 'restaurantHall' ? 1.72 : 1.94, offset.z - depth * 0.08);
    }

    if (level >= 5) {
      const skylineTower = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * archetype.skylineW, (mode === 'superStore' ? 2.42 : 2.08) * archetype.skylineH, depth * archetype.skylineD),
          new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.62, metalness: 0.06 })
        )
      );
      skylineTower.position.set(offset.x + width * archetype.skylineX, (mode === 'superStore' ? 2.42 : 2.14) * archetype.skylineH, offset.z + depth * archetype.skylineZ);

      const skylineCrown = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(longAxisX ? 0.5 : 0.42, 0.12, longAxisX ? 0.38 : 0.48),
          new THREE.MeshStandardMaterial({ color: themes.roof, roughness: 0.72, metalness: 0.06 })
        )
      );
      skylineCrown.position.set(skylineTower.position.x, skylineTower.position.y + (mode === 'superStore' ? 1.24 : 1.08), skylineTower.position.z);

      const marqueeTower = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 0.44, 0.05),
          new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.3, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.24 })
        )
      );
      marqueeTower.position.set(skylineTower.position.x, skylineTower.position.y + 0.22, skylineTower.position.z + Math.max(0.18, depth * archetype.skylineD * 0.7));

      const rooftopBridge = addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.32, 0.08, 0.12),
          new THREE.MeshStandardMaterial({ color: themes.roof, roughness: 0.72, metalness: 0.08 })
        )
      );
      rooftopBridge.position.set(offset.x - width * 0.06, mode === 'superStore' ? 1.92 : 1.7, offset.z + depth * archetype.skylineZ * 0.4);
    }

    const anchorWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * (mode === 'superStore' ? 0.3 : 0.24), level >= 5 ? 0.92 : 0.68, depth * 0.2),
        new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.72, metalness: 0.03 })
      )
    );
    anchorWing.position.set(offset.x + width * archetype.anchorX, level >= 5 ? 0.54 : 0.4, offset.z + depth * 0.08);
    anchorWing.visible = level >= 4;

    const anchorPylon = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.16, level >= 5 ? 1.12 : 0.74, 0.08),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.34, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.22 })
      )
    );
    anchorPylon.position.set(offset.x + width * archetype.anchorX * 1.05, level >= 5 ? 0.7 : 0.48, offset.z + depth * 0.32);
    anchorPylon.visible = level >= 4;

    const terraceDeck = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.04, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: 0x9f7d57, roughness: 0.82, metalness: 0.02 })
      )
    );
    terraceDeck.position.set(offset.x + width * archetype.terraceX, mode === 'restaurantHall' ? 1.18 : 1.34, offset.z + depth * archetype.terraceZ);
    terraceDeck.visible = level >= 4;

    const skylightArcade = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.16, 0.12),
        new THREE.MeshStandardMaterial({ color: 0xe2f5ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: themes.sign, emissiveIntensity: 0.12 })
      )
    );
    skylightArcade.position.set(offset.x, mode === 'restaurantHall' ? 1.04 : 1.18, offset.z + depth * archetype.arcadeZ);
    skylightArcade.visible = level >= 4;

    const rooftopGarden = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.04, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: 0x7ba66d, roughness: 0.96, metalness: 0.01 })
      )
    );
    rooftopGarden.position.set(offset.x + width * 0.08, mode === 'restaurantHall' ? 1.22 : 1.4, offset.z + depth * 0.02);
    rooftopGarden.visible = level >= 5;

    const eventCanopy = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, 0.16, depth * 0.12),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.42, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.14 })
      )
    );
    eventCanopy.position.set(offset.x - width * 0.18, mode === 'restaurantHall' ? 1.22 : 1.44, offset.z + depth * 0.18);
    eventCanopy.visible = level >= 5;

    const downtownPlaza = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, 0.022, depth * 0.22),
        new THREE.MeshStandardMaterial({ color: 0xe3ddd2, roughness: 0.94, metalness: 0.01 })
      )
    );
    downtownPlaza.position.set(offset.x, 0.058, offset.z + depth * 0.24);
    downtownPlaza.visible = downtownMode;

    const anchorTowerA = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * (mode === 'superStore' ? 0.22 : 0.18), skylineDistrict ? 3.1 : 2.2, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.7, metalness: 0.05 })
      )
    );
    anchorTowerA.position.set(offset.x - width * 0.28, skylineDistrict ? 2.08 : 1.62, offset.z - depth * 0.04);
    anchorTowerA.visible = downtownMode;

    const anchorTowerB = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.16, skylineDistrict ? 2.72 : 1.88, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.62, metalness: 0.08 })
      )
    );
    anchorTowerB.position.set(offset.x + width * 0.22, skylineDistrict ? 1.9 : 1.36, offset.z + depth * 0.02);
    anchorTowerB.visible = downtownMode;

    const towerBridge = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.4, 0.1, depth * 0.1),
        new THREE.MeshStandardMaterial({ color: themes.roof, roughness: 0.72, metalness: 0.08 })
      )
    );
    towerBridge.position.set(offset.x - width * 0.02, skylineDistrict ? 1.96 : 1.42, offset.z - depth * 0.01);
    towerBridge.visible = skylineDistrict;

    const transitHall = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.42, 0.22, depth * 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xe3f5ff,
          roughness: 0.2,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: themes.sign,
          emissiveIntensity: 0.14
        })
      )
    );
    transitHall.position.set(offset.x + width * 0.04, 0.24, offset.z + depth * 0.34);
    transitHall.visible = downtownMode;

    const marqueePylon = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.12, skylineDistrict ? 1.42 : 1.02, 0.08),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.34, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.24 })
      )
    );
    marqueePylon.position.set(offset.x + width * 0.36, skylineDistrict ? 0.82 : 0.62, offset.z + depth * 0.28);
    marqueePylon.visible = downtownMode;

    const loftPodium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.72, mixedUseMode ? 0.5 : 0.2, depth * 0.24),
        new THREE.MeshStandardMaterial({ color: 0xd9d7cf, roughness: 0.74, metalness: 0.04 })
      )
    );
    loftPodium.position.set(offset.x, mixedUseMode ? 0.86 : 0.18, offset.z - depth * 0.18);
    loftPodium.visible = mixedUseMode && level >= 3;

    const loftWindowBand = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.62, 0.12, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.08
        })
      )
    );
    loftWindowBand.position.set(offset.x, 0.88, offset.z - depth * 0.05);
    loftWindowBand.visible = mixedUseMode && level >= 3;

    const residentialTower = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.2, skylineDistrict ? 2.64 : 1.74, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: 0xe3ded3, roughness: 0.72, metalness: 0.04 })
      )
    );
    residentialTower.position.set(offset.x - width * 0.08, skylineDistrict ? 1.92 : 1.28, offset.z - depth * 0.08);
    residentialTower.visible = mixedUseMode && level >= 5;

    const residentialGlow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.12, skylineDistrict ? 1.44 : 0.94, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.1
        })
      )
    );
    residentialGlow.position.set(residentialTower.position.x, residentialTower.position.y, residentialTower.position.z + depth * 0.1);
    residentialGlow.visible = mixedUseMode && level >= 5;

    const arcadeHall = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.56, 0.28, depth * 0.16),
        new THREE.MeshStandardMaterial({
          color: 0xe7f6ff,
          roughness: 0.2,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: themes.sign,
          emissiveIntensity: 0.14
        })
      )
    );
    arcadeHall.position.set(offset.x, 0.26, offset.z - depth * 0.04);
    arcadeHall.visible = megaDowntown && level >= 4;

    const hotelWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, 2.24, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.7, metalness: 0.05 })
      )
    );
    hotelWing.position.set(offset.x + width * 0.34, 1.6, offset.z - depth * 0.1);
    hotelWing.visible = megaDowntown && level >= 5;

    const hotelGlow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.14, 1.26, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.12
        })
      )
    );
    hotelGlow.position.set(hotelWing.position.x, hotelWing.position.y, hotelWing.position.z + depth * 0.1);
    hotelGlow.visible = megaDowntown && level >= 5;

    const roofMarket = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.14, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.42, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.14 })
      )
    );
    roofMarket.position.set(offset.x - width * 0.24, 1.36, offset.z + depth * 0.14);
    roofMarket.visible = megaDowntown && level >= 5;

    const grandAtrium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.38, depth * 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xe9f7ff,
          roughness: 0.2,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: themes.sign,
          emissiveIntensity: 0.14
        })
      )
    );
    grandAtrium.position.set(offset.x + width * 0.08, 0.32, offset.z - depth * 0.26);
    grandAtrium.visible = megaDowntown && level >= 4;

    const skyHotel = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.2, 2.56, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: themes.body, roughness: 0.7, metalness: 0.05 })
      )
    );
    skyHotel.position.set(offset.x - width * 0.36, 1.82, offset.z + depth * 0.06);
    skyHotel.visible = megaDowntown && level >= 5;

    const skyHotelGlow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.12, 1.48, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xffefc9,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.84,
          emissive: themes.sign,
          emissiveIntensity: 0.14
        })
      )
    );
    skyHotelGlow.position.set(skyHotel.position.x, skyHotel.position.y, skyHotel.position.z + depth * 0.1);
    skyHotelGlow.visible = megaDowntown && level >= 5;

    const districtBillboard = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.36, 0.05),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.34, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.24 })
      )
    );
    districtBillboard.position.set(offset.x + width * 0.36, 1.18, offset.z - depth * 0.12);
    districtBillboard.visible = megaDowntown && level >= 5;

    const marketCanopy = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.32, 0.12, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: themes.accent, roughness: 0.46, metalness: 0.08, emissive: themes.sign, emissiveIntensity: 0.12 })
      )
    );
    marketCanopy.position.set(offset.x + width * 0.22, 0.26, offset.z + depth * 0.3);
    marketCanopy.visible = megaDowntown && level >= 4;

    const parkingPad = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.86, 0.012, depth * 0.24),
        new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 0.92, metalness: 0.01 })
      )
    );
    parkingPad.position.set(offset.x, 0.055, offset.z - depth * 0.3);
    parkingPad.visible = mode === 'superStore' || mode === 'shopStrip';

    const stripeA = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.01, 0.004, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.52, metalness: 0.02 })
      )
    );
    stripeA.position.set(offset.x - width * 0.16, 0.062, offset.z - depth * 0.3);
    stripeA.visible = parkingPad.visible;
    const stripeB = stripeA.clone();
    stripeB.position.set(offset.x + width * 0.16, 0.062, offset.z - depth * 0.3);
    stripeB.userData.buildingId = building.id;
    group.add(stripeB);
    meshes.push(stripeB);

    const lampLeft = this.createStreetLamp(offset.x - width * 0.34, 0.055, offset.z + depth * 0.24, building.id, 0xffe7b0);
    const lampRight = this.createStreetLamp(offset.x + width * 0.34, 0.055, offset.z + depth * 0.24, building.id, 0xffe7b0);
    const planterLeft = this.createPlanterBox(0x8d6846, 0x6ea066, offset.x - width * 0.26, 0.05, offset.z + depth * 0.22, building.id, 0.14, 0.14);
    const planterRight = this.createPlanterBox(0x8d6846, 0x6ea066, offset.x + width * 0.26, 0.05, offset.z + depth * 0.22, building.id, 0.14, 0.14);
    const parkedCar = this.createParkedCar(theme % 2 === 0 ? 0x5d88b7 : 0xf3b34c, offset.x - width * 0.22, 0.08, offset.z - depth * 0.28, 0, building.id, 1.08);

    group.add(lampLeft);
    group.add(lampRight);
    group.add(planterLeft);
    group.add(planterRight);
    group.add(parkedCar);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [
        signBand,
        signBandRear,
        storefrontFront,
        storefrontRear,
        anchorPylon,
        skylightArcade,
        eventCanopy,
        transitHall,
        marqueePylon,
        loftWindowBand,
        residentialGlow,
        arcadeHall,
        hotelGlow,
        roofMarket,
        grandAtrium,
        skyHotelGlow,
        districtBillboard,
        marketCanopy
      ].filter((mesh) => mesh.visible),
      phase: building.id * 0.12
    });

    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(lampLeft),
      ...this.collectMeshes(lampRight),
      ...this.collectMeshes(planterLeft),
      ...this.collectMeshes(planterRight),
      ...this.collectMeshes(parkedCar)
    ]);

    return group;
  }

  private createMergedHospitalCampus(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const level = building.level;
    const variant = building.id % 5;
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.96;
    const depth = cluster.tileDepth * 0.96;
    const medicalCity = cluster.size >= 6 || (cluster.originWidth >= 3 && cluster.originDepth >= 2);
    const wallPalette = [0xebf1f5, 0xe6eef2, 0xf1ece5, 0xe4f0ea, 0xe9e6f2];
    const wingPalette = [0xd8e3ec, 0xd2dee8, 0xe1dbd0, 0xd6e6de, 0xd8d5ea];
    const roofPalette = [0x9ab0c4, 0x8ca3bb, 0xa9a2b3, 0x8ba8a0, 0x8898b5];
    const accentPalette = [0xc94949, 0x3b82f6, 0x0ea5a4, 0xf59e0b, 0x8b5cf6];
    const archetype = [
      { bodyW: 0.88, bodyD: 0.4, towerAX: 0.3, towerBX: -0.3, towerScale: 0.9, entryZ: 0.24, patientX: -0.08, patientZ: 0.02 },
      { bodyW: 0.62, bodyD: 0.36, towerAX: 0, towerBX: 0.24, towerScale: 1.26, entryZ: 0.28, patientX: 0.16, patientZ: -0.08 },
      { bodyW: 0.84, bodyD: 0.48, towerAX: -0.24, towerBX: 0.28, towerScale: 0.78, entryZ: 0.18, patientX: 0.24, patientZ: 0.16 },
      { bodyW: 0.72, bodyD: 0.34, towerAX: 0.24, towerBX: -0.12, towerScale: 1.08, entryZ: 0.14, patientX: -0.22, patientZ: 0.04 },
      { bodyW: 0.94, bodyD: 0.52, towerAX: 0.12, towerBX: -0.34, towerScale: 0.92, entryZ: 0.22, patientX: 0.1, patientZ: -0.14 }
    ][variant];
    const meshes: THREE.Mesh[] = [];
    const addMesh = (mesh: THREE.Mesh) => {
      mesh.userData.buildingId = building.id;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.22, 0.025, depth + 0.22),
      new THREE.MeshStandardMaterial({ color: 0xe7e3dc, roughness: 0.96, metalness: 0.01 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;
    group.add(walk);
    meshes.push(walk);

    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({ color: 0xd7ddd8, roughness: 0.95, metalness: 0.01 })
    );
    lawn.position.set(offset.x, 0.025, offset.z);
    lawn.receiveShadow = true;
    lawn.userData.buildingId = building.id;
    group.add(lawn);
    meshes.push(lawn);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * archetype.bodyW, level >= 5 ? 1.18 : level >= 4 ? 1.02 : level >= 3 ? 0.86 : 0.74, depth * archetype.bodyD),
        new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.74, metalness: 0.03 })
      )
    ).position.set(offset.x, level >= 5 ? 0.62 : level >= 4 ? 0.54 : level >= 3 ? 0.46 : 0.4, offset.z - depth * 0.04);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.66, 0.5, depth * 0.28),
        new THREE.MeshStandardMaterial({ color: wingPalette[variant], roughness: 0.76, metalness: 0.03 })
      )
    ).position.set(offset.x, 0.26, offset.z + depth * 0.26);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, level >= 5 ? 1.82 : level >= 4 ? 1.42 : level >= 2 ? 1.06 : 0.72, depth * 0.24),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.72, metalness: 0.04 })
      )
    ).position.set(offset.x + width * archetype.towerAX, (level >= 5 ? 1.06 : level >= 4 ? 0.86 : level >= 2 ? 0.68 : 0.54) * archetype.towerScale, offset.z - depth * 0.06);

    if (level >= 3) {
      addMesh(
        new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.16, level >= 5 ? 2.1 : level >= 4 ? 1.62 : 1.28, depth * 0.22),
          new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.04 })
        )
      ).position.set(offset.x + width * archetype.towerBX, (level >= 5 ? 1.22 : level >= 4 ? 0.98 : 0.8) * archetype.towerScale, offset.z - depth * 0.02);
    }

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.88, 0.08, depth * 0.5),
        new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.8, metalness: 0.04 })
      )
    ).position.set(offset.x, level >= 5 ? 1.26 : level >= 4 ? 1.08 : level >= 3 ? 0.92 : 0.8, offset.z - depth * 0.04);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.36, depth * 0.18),
        new THREE.MeshStandardMaterial({
          color: 0xcbe8f8,
          roughness: 0.25,
          metalness: 0.08,
          transparent: true,
          opacity: 0.9,
          emissive: accentPalette[(variant + 1) % 5],
          emissiveIntensity: 0.12
        })
      )
    ).position.set(offset.x, 0.22, offset.z + depth * archetype.entryZ);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.74, 0.015, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: 0xc8bba8, roughness: 0.9, metalness: 0.01 })
      )
    ).position.set(offset.x, 0.055, offset.z + depth * (archetype.entryZ + 0.12));

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.05, depth * 0.12),
        new THREE.MeshStandardMaterial({ color: accentPalette[variant], roughness: 0.72, metalness: 0.05 })
      )
    ).position.set(offset.x - width * 0.24, 0.36, offset.z + depth * (archetype.entryZ + 0.02));

    const frontWindowBand = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.56, 0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xdff7ff, roughness: 0.22, metalness: 0.06, transparent: true, opacity: 0.86, emissive: 0x7dd3fc, emissiveIntensity: 0.08 })
      )
    );
    frontWindowBand.position.set(offset.x, 0.42, offset.z - depth * 0.24);
    const rearWindowBand = frontWindowBand.clone();
    rearWindowBand.position.set(offset.x, 0.42, offset.z + depth * 0.16);
    rearWindowBand.userData.buildingId = building.id;
    group.add(rearWindowBand);
    meshes.push(rearWindowBand);

    const towerWindowBand = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.03, level >= 3 ? 0.82 : 0.54, depth * 0.14),
        new THREE.MeshStandardMaterial({ color: 0xdff7ff, roughness: 0.22, metalness: 0.06, transparent: true, opacity: 0.86, emissive: 0x38bdf8, emissiveIntensity: 0.1 })
      )
    );
    towerWindowBand.position.set(offset.x + width * (archetype.towerAX + 0.09), (level >= 2 ? 0.62 : 0.48) * archetype.towerScale, offset.z - depth * 0.06);
    const towerCap = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, 0.07, depth * 0.28),
        new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.8, metalness: 0.04 })
      )
    );
    towerCap.position.set(offset.x + width * archetype.towerAX, (level >= 5 ? 1.96 : level >= 4 ? 1.56 : level >= 2 ? 1.24 : 0.9) * archetype.towerScale, offset.z - depth * 0.06);
    towerCap.visible = level >= 2;

    const megaResearchSpire = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.12, 2.34, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.7, metalness: 0.05 })
      )
    );
    megaResearchSpire.position.set(offset.x + width * archetype.patientX * 0.4, 1.54 * archetype.towerScale, offset.z - depth * 0.18);
    megaResearchSpire.visible = level >= 5;

    addMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(level >= 3 ? 0.36 : 0.28, level >= 3 ? 0.36 : 0.28, 0.03, 24),
        new THREE.MeshStandardMaterial({ color: 0xa3b4c3, roughness: 0.88, metalness: 0.04 })
      )
    ).position.set(offset.x + width * archetype.towerAX, (level >= 3 ? 1.38 : 0.85) * archetype.towerScale, offset.z - depth * 0.12);

    addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.28, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.08, emissive: 0xdc2626, emissiveIntensity: 0.22 })
      )
    ).position.set(offset.x, 0.5, offset.z + depth * 0.22);

    const rehabWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, level >= 3 ? 0.44 : 0.28, depth * 0.2),
        new THREE.MeshStandardMaterial({ color: 0xd8e3ec, roughness: 0.76, metalness: 0.03 })
      )
    );
    rehabWing.position.set(offset.x + width * archetype.towerBX, level >= 3 ? 0.24 : 0.16, offset.z - depth * 0.24);
    rehabWing.visible = level >= 2;

    const skyBridge = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.24, 0.08, depth * 0.1),
        new THREE.MeshStandardMaterial({ color: 0xcbe8f8, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.82 })
      )
    );
    skyBridge.position.set(offset.x + width * archetype.patientX * 0.2, 0.7 * archetype.towerScale, offset.z - depth * 0.14);
    skyBridge.visible = level >= 3;

    const patientWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.32, 0.54, depth * 0.22),
        new THREE.MeshStandardMaterial({ color: wingPalette[(variant + 3) % 5], roughness: 0.74, metalness: 0.03 })
      )
    );
    patientWing.position.set(offset.x + width * archetype.patientX, 0.32, offset.z + depth * archetype.patientZ);
    patientWing.visible = level >= 4;

    const patientTower = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, 1.84, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.04 })
      )
    );
    patientTower.position.set(offset.x + width * archetype.patientX, 1.56 * archetype.towerScale, offset.z + depth * archetype.patientZ);
    patientTower.visible = level >= 4;

    const patientTowerGlass = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.14, 1.02, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xdff7ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.86, emissive: accentPalette[(variant + 1) % 5], emissiveIntensity: 0.12 })
      )
    );
    patientTowerGlass.position.set(patientTower.position.x, 1.56 * archetype.towerScale, patientTower.position.z + depth * 0.1);
    patientTowerGlass.visible = level >= 4;

    const healingGarden = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.03, depth * 0.2),
        new THREE.MeshStandardMaterial({ color: 0x7fad73, roughness: 0.96, metalness: 0.01 })
      )
    );
    healingGarden.position.set(offset.x + width * archetype.towerBX, 0.07, offset.z + depth * 0.28);
    healingGarden.visible = level >= 4;

    const ambulanceCanopy = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.24, 0.08, depth * 0.14),
        new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 2) % 5], roughness: 0.7, metalness: 0.05 })
      )
    );
    ambulanceCanopy.position.set(offset.x + width * archetype.towerAX, 0.28, offset.z + depth * 0.28);
    ambulanceCanopy.visible = level >= 4;

    const helipadLightRing = addMesh(
      new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.025, 8, 28),
        new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 0.24, metalness: 0.08, emissive: accentPalette[(variant + 3) % 5], emissiveIntensity: 0.18 })
      )
    );
    helipadLightRing.rotation.x = Math.PI / 2;
    helipadLightRing.position.set(offset.x + width * archetype.towerAX, (level >= 5 ? 1.42 : 0.9) * archetype.towerScale, offset.z - depth * 0.12);
    helipadLightRing.visible = level >= 4;

    const surgeryTower = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.22, level >= 5 ? 2.48 : 1.66, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.04 })
      )
    );
    surgeryTower.position.set(offset.x - width * 0.18, level >= 5 ? 2.02 : 1.38, offset.z - depth * 0.3);
    surgeryTower.visible = level >= 4;

    const surgeryGlass = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.14, level >= 5 ? 1.48 : 1.02, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xdff7ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.86, emissive: accentPalette[(variant + 4) % 5], emissiveIntensity: 0.14 })
      )
    );
    surgeryGlass.position.set(surgeryTower.position.x, surgeryTower.position.y, surgeryTower.position.z + depth * 0.1);
    surgeryGlass.visible = level >= 4;

    const triageHall = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.42, depth * 0.22),
        new THREE.MeshStandardMaterial({ color: wingPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.03 })
      )
    );
    triageHall.position.set(offset.x + width * 0.26, 0.24, offset.z + depth * 0.04);
    triageHall.visible = level >= 3;

    const medSkywalk = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.12, depth * 0.12),
        new THREE.MeshStandardMaterial({ color: 0xcbe8f8, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.84, emissive: accentPalette[(variant + 1) % 5], emissiveIntensity: 0.12 })
      )
    );
    medSkywalk.position.set(offset.x + width * 0.08, 1.22, offset.z - depth * 0.12);
    medSkywalk.visible = level >= 5;

    const emergencyBay = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.26, 0.26, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: wingPalette[(variant + 4) % 5], roughness: 0.74, metalness: 0.04 })
      )
    );
    emergencyBay.position.set(offset.x + width * 0.3, 0.18, offset.z + depth * 0.16);
    emergencyBay.visible = level >= 5;

    const triageLight = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.08, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xe3f6ff, roughness: 0.2, metalness: 0.08, emissive: accentPalette[(variant + 2) % 5], emissiveIntensity: 0.18 })
      )
    );
    triageLight.position.set(offset.x + width * 0.3, 0.26, offset.z + depth * 0.26);
    triageLight.visible = level >= 5;

    const campusLoop = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.9, 0.02, depth * 0.66),
        new THREE.MeshStandardMaterial({ color: 0xe4e0d9, roughness: 0.95, metalness: 0.01 })
      )
    );
    campusLoop.position.set(offset.x, 0.06, offset.z + depth * 0.08);
    campusLoop.visible = level >= 4;

    const parkingDeck = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, level >= 5 ? 0.54 : 0.34, depth * 0.24),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.06 })
      )
    );
    parkingDeck.position.set(offset.x - width * 0.34, level >= 5 ? 0.32 : 0.2, offset.z + depth * 0.18);
    parkingDeck.visible = level >= 4;

    const researchAtrium = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.24, 0.34, depth * 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xdff7ff,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.88,
          emissive: accentPalette[(variant + 4) % 5],
          emissiveIntensity: 0.14
        })
      )
    );
    researchAtrium.position.set(offset.x + width * 0.18, 0.22, offset.z - depth * 0.34);
    researchAtrium.visible = level >= 4;

    const patientTowerB = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.16, 2.58, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.72, metalness: 0.05 })
      )
    );
    patientTowerB.position.set(offset.x - width * 0.32, 1.9, offset.z - depth * 0.12);
    patientTowerB.visible = level >= 5;

    const patientTowerBGlass = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.1, 1.46, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xdff7ff,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: accentPalette[(variant + 3) % 5],
          emissiveIntensity: 0.14
        })
      )
    );
    patientTowerBGlass.position.set(patientTowerB.position.x, patientTowerB.position.y, patientTowerB.position.z + depth * 0.08);
    patientTowerBGlass.visible = level >= 5;

    const diagnosticsWing = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.52, depth * 0.18),
        new THREE.MeshStandardMaterial({ color: wingPalette[(variant + 2) % 5], roughness: 0.74, metalness: 0.04 })
      )
    );
    diagnosticsWing.position.set(offset.x - width * 0.34, 0.3, offset.z + depth * 0.08);
    diagnosticsWing.visible = medicalCity && level >= 4;

    const diagnosticsGlass = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.2, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xdff7ff,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: accentPalette[(variant + 2) % 5],
          emissiveIntensity: 0.12
        })
      )
    );
    diagnosticsGlass.position.set(offset.x - width * 0.34, 0.34, offset.z + depth * 0.16);
    diagnosticsGlass.visible = medicalCity && level >= 4;

    const medCoreTower = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 2.84, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.05 })
      )
    );
    medCoreTower.position.set(offset.x + width * 0.02, 2.02, offset.z + depth * 0.28);
    medCoreTower.visible = medicalCity && level >= 5;

    const medCoreGlow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.1, 1.58, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xdff7ff,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: accentPalette[(variant + 4) % 5],
          emissiveIntensity: 0.14
        })
      )
    );
    medCoreGlow.position.set(medCoreTower.position.x, medCoreTower.position.y, medCoreTower.position.z + depth * 0.08);
    medCoreGlow.visible = medicalCity && level >= 5;

    const traumaCenter = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.28, 0.62, depth * 0.2),
        new THREE.MeshStandardMaterial({ color: wingPalette[(variant + 4) % 5], roughness: 0.74, metalness: 0.04 })
      )
    );
    traumaCenter.position.set(offset.x + width * 0.34, 0.38, offset.z - depth * 0.26);
    traumaCenter.visible = medicalCity && level >= 4;

    const traumaGlow = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 0.18, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xe3f6ff,
          roughness: 0.2,
          metalness: 0.08,
          transparent: true,
          opacity: 0.88,
          emissive: accentPalette[(variant + 2) % 5],
          emissiveIntensity: 0.16
        })
      )
    );
    traumaGlow.position.set(offset.x + width * 0.34, 0.42, offset.z - depth * 0.16);
    traumaGlow.visible = medicalCity && level >= 4;

    const emergencyTower = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.18, 3.1, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.72, metalness: 0.05 })
      )
    );
    emergencyTower.position.set(offset.x - width * 0.08, 2.18, offset.z + depth * 0.32);
    emergencyTower.visible = medicalCity && level >= 5;

    const emergencyTowerGlass = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.1, 1.74, 0.03),
        new THREE.MeshStandardMaterial({
          color: 0xdff7ff,
          roughness: 0.18,
          metalness: 0.08,
          transparent: true,
          opacity: 0.86,
          emissive: accentPalette[(variant + 3) % 5],
          emissiveIntensity: 0.16
        })
      )
    );
    emergencyTowerGlass.position.set(emergencyTower.position.x, emergencyTower.position.y, emergencyTower.position.z + depth * 0.08);
    emergencyTowerGlass.visible = medicalCity && level >= 5;

    const ambulanceLoop = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.64, 0.02, depth * 0.16),
        new THREE.MeshStandardMaterial({ color: 0xd6d2cb, roughness: 0.94, metalness: 0.01 })
      )
    );
    ambulanceLoop.position.set(offset.x, 0.06, offset.z + depth * 0.4);
    ambulanceLoop.visible = medicalCity && level >= 4;

    const triagePylon = addMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.64, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xe3f6ff, roughness: 0.2, metalness: 0.08, emissive: accentPalette[(variant + 4) % 5], emissiveIntensity: 0.22 })
      )
    );
    triagePylon.position.set(offset.x + width * 0.4, 0.38, offset.z + depth * 0.34);
    triagePylon.visible = medicalCity && level >= 5;

    const ambulanceA = this.createParkedCar(0xf3f4f6, offset.x - width * 0.22, 0.08, offset.z + depth * 0.4, Math.PI / 2, building.id, 1.06);
    const ambulanceB = this.createParkedCar(0xf3f4f6, offset.x - width * 0.06, 0.08, offset.z + depth * 0.4, Math.PI / 2, building.id, 1.06);
    const lampLeft = this.createStreetLamp(offset.x - width * 0.34, 0.055, offset.z + depth * 0.32, building.id, 0xcfe8ff);
    const lampRight = this.createStreetLamp(offset.x + width * 0.34, 0.055, offset.z + depth * 0.32, building.id, 0xcfe8ff);
    const planterA = this.createPlanterBox(0x9b7a58, 0x86ab78, offset.x + width * 0.24, 0.05, offset.z + depth * 0.28, building.id, 0.18, 0.14);
    const planterB = this.createPlanterBox(0x9b7a58, 0x86ab78, offset.x - width * 0.2, 0.05, offset.z + depth * 0.28, building.id, 0.18, 0.14);

    group.add(ambulanceA);
    group.add(ambulanceB);
    group.add(lampLeft);
    group.add(lampRight);
    group.add(planterA);
    group.add(planterB);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [
        frontWindowBand,
        rearWindowBand,
        towerWindowBand,
        patientTowerGlass,
        helipadLightRing,
        triageLight,
        surgeryGlass,
        medSkywalk,
        researchAtrium,
        patientTowerBGlass,
        diagnosticsGlass,
        medCoreGlow,
        traumaGlow,
        emergencyTowerGlass,
        triagePylon
      ].filter((mesh) => mesh.visible),
      phase: building.id * 0.14
    });

    this.selectableMeshes.set(building.id, [
      ...meshes,
      ...this.collectMeshes(ambulanceA),
      ...this.collectMeshes(ambulanceB),
      ...this.collectMeshes(lampLeft),
      ...this.collectMeshes(lampRight),
      ...this.collectMeshes(planterA),
      ...this.collectMeshes(planterB)
    ]);

    return group;
  }

  private createMergedPowerComplex(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const level = building.level;
    const variant = building.id % 5;
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.97;
    const depth = cluster.tileDepth * 0.97;
    const supergridMode = cluster.size >= 6 || (cluster.originWidth >= 3 && cluster.originDepth >= 2);
    const archetype = [
      { hallX: -0.18, hallZ: 0.04, hallW: 0.44, hallD: 0.3, stackBaseX: -0.36, stackSpacing: 0.22, towerX: 0.18, pondX: 0.34 },
      { hallX: -0.02, hallZ: -0.06, hallW: 0.28, hallD: 0.22, stackBaseX: -0.18, stackSpacing: 0.14, towerX: 0.28, pondX: 0.22 },
      { hallX: -0.24, hallZ: 0.14, hallW: 0.52, hallD: 0.34, stackBaseX: -0.4, stackSpacing: 0.26, towerX: 0.08, pondX: 0.38 },
      { hallX: 0.08, hallZ: 0.02, hallW: 0.32, hallD: 0.24, stackBaseX: -0.3, stackSpacing: 0.18, towerX: -0.18, pondX: 0.3 },
      { hallX: -0.12, hallZ: -0.14, hallW: 0.4, hallD: 0.28, stackBaseX: -0.12, stackSpacing: 0.12, towerX: 0.32, pondX: 0.16 }
    ][variant];
    const hallPalette = [0x95a7b8, 0x9da0a7, 0x8fa0a0, 0xa6a3b4, 0x8f9eb0];
    const metalPalette = [0x7f8a93, 0x81868d, 0x6b8b86, 0x7c7fa0, 0x60798b];
    const accentPalette = [0xffb300, 0x38bdf8, 0xf97316, 0xa855f7, 0x22c55e];
    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.18, 0.025, depth + 0.18),
      new THREE.MeshStandardMaterial({ color: 0xd7dade, roughness: 0.95, metalness: 0.02 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.06, depth),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 1) % 5], roughness: 0.92, metalness: 0.03 })
    );
    pad.position.set(offset.x, 0.03, offset.z);
    pad.receiveShadow = true;
    pad.userData.buildingId = building.id;

    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(width * archetype.hallW, 0.64, depth * archetype.hallD),
      new THREE.MeshStandardMaterial({ color: hallPalette[variant], roughness: 0.72, metalness: 0.08 })
    );
    hall.position.set(offset.x + width * archetype.hallX, level >= 5 ? 0.48 : level >= 4 ? 0.4 : 0.32, offset.z + depth * archetype.hallZ);
    hall.castShadow = true;
    hall.receiveShadow = true;
    hall.userData.buildingId = building.id;

    const hallRoof = new THREE.Mesh(
      new THREE.BoxGeometry(width * (archetype.hallW + 0.04), 0.08, depth * (archetype.hallD + 0.04)),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.62, metalness: 0.18 })
    );
    hallRoof.position.set(offset.x + width * archetype.hallX, 0.68, offset.z + depth * archetype.hallZ);
    hallRoof.castShadow = true;
    hallRoof.receiveShadow = true;
    hallRoof.userData.buildingId = building.id;

    const towerCount = Math.max(4, Math.min(7, cluster.size + level + 1));
    const towers: THREE.Mesh[] = [];
    for (let index = 0; index < towerCount; index += 1) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, (level >= 5 ? 1.5 : level >= 4 ? 1.22 : 1) + (index % 2) * 0.14, 18),
        new THREE.MeshStandardMaterial({ color: metalPalette[variant], roughness: 0.74, metalness: 0.18 })
      );
      const column = towerCount === 1 ? 0.5 : index / (towerCount - 1);
      tower.position.set(offset.x + width * 0.06 + column * width * 0.36, (level >= 5 ? 0.78 : level >= 4 ? 0.64 : 0.55) + (index % 2) * 0.04, offset.z - depth * 0.1 + ((index % 3) - 1) * (variant === 1 ? 0.12 : 0.18));
      tower.castShadow = true;
      tower.receiveShadow = true;
      tower.userData.buildingId = building.id;
      towers.push(tower);
      group.add(tower);
    }

    const stacks: THREE.Mesh[] = [];
    for (let index = 0; index < 2; index += 1) {
      const stack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 1.24, 16),
        new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.18 })
      );
      stack.position.set(offset.x + width * archetype.stackBaseX + index * width * archetype.stackSpacing, 0.72, offset.z - depth * 0.3);
      stack.castShadow = true;
      stack.receiveShadow = true;
      stack.userData.buildingId = building.id;
      stacks.push(stack);
      group.add(stack);
    }

    const substation = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.22, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 3) % 5], roughness: 0.8, metalness: 0.14 })
    );
    substation.position.set(offset.x + width * 0.12, 0.13, offset.z + depth * 0.3);
    substation.castShadow = true;
    substation.receiveShadow = true;
    substation.userData.buildingId = building.id;

    const pipeRack = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 2) % 5], roughness: 0.74, metalness: 0.18 })
    );
    pipeRack.position.set(offset.x, 0.36, offset.z + depth * 0.1);
    pipeRack.userData.buildingId = building.id;

    const fence = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.92, 0.14, 0.03),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 3) % 5], roughness: 0.76, metalness: 0.16 })
    );
    fence.position.set(offset.x, 0.1, offset.z + depth * 0.44);
    fence.userData.buildingId = building.id;

    const yardWalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.68, 0.02, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xd5d7d8, roughness: 0.95, metalness: 0.01 })
    );
    yardWalk.position.set(offset.x - width * 0.1, 0.055, offset.z + depth * 0.4);
    yardWalk.userData.buildingId = building.id;

    const truck = this.createParkedCar(0xd99b43, offset.x - width * 0.34, 0.08, offset.z + depth * 0.32, Math.PI / 2, building.id, 1.08);
    const lamp = this.createStreetLamp(offset.x - width * 0.42, 0.055, offset.z + depth * 0.34, building.id, 0xffd45f);
    const powerCore = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.24, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xfff1b3, roughness: 0.35, metalness: 0.08, emissive: accentPalette[variant], emissiveIntensity: 0.4 })
    );
    powerCore.position.set(offset.x + width * 0.02, 0.34, offset.z + depth * 0.28);
    powerCore.castShadow = true;
    powerCore.receiveShadow = true;
    powerCore.userData.buildingId = building.id;

    const turbineWing = new THREE.Mesh(
      new THREE.BoxGeometry(width * (level >= 3 ? 0.5 : 0.38), level >= 2 ? 0.38 : 0.26, depth * 0.22),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.12 })
    );
    turbineWing.position.set(offset.x + width * 0.12, level >= 2 ? 0.22 : 0.16, offset.z + depth * 0.3);
    turbineWing.castShadow = true;
    turbineWing.receiveShadow = true;
    turbineWing.userData.buildingId = building.id;
    turbineWing.visible = level >= 2;

    const reactorTower = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 1.18, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.7, metalness: 0.14 })
    );
    reactorTower.position.set(offset.x + width * archetype.towerX, level >= 5 ? 1.22 : level >= 4 ? 0.94 : 0.66, offset.z + depth * 0.02);
    reactorTower.castShadow = true;
    reactorTower.receiveShadow = true;
    reactorTower.userData.buildingId = building.id;
    reactorTower.visible = level >= 3;

    const hyperStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 2.1, 16),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.18 })
    );
    hyperStack.position.set(offset.x - width * 0.08, 1.58, offset.z - depth * 0.04);
    hyperStack.userData.buildingId = building.id;
    hyperStack.visible = level >= 5;

    const gantry = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.16 })
    );
    gantry.position.set(offset.x - width * 0.04, 0.52, offset.z + depth * 0.18);
    gantry.userData.buildingId = building.id;
    gantry.visible = level >= 2;

    const reactorBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.12, 0.64, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.84, emissive: accentPalette[(variant + 1) % 5], emissiveIntensity: 0.1 })
    );
    reactorBand.position.set(offset.x + width * archetype.towerX, 0.72, offset.z + depth * 0.1);
    reactorBand.userData.buildingId = building.id;
    reactorBand.visible = level >= 3;

    const coolingBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.36, 0.05, depth * 0.2),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 2) % 5], roughness: 0.68, metalness: 0.08 })
    );
    coolingBand.position.set(offset.x - width * 0.16, 0.48, offset.z + depth * 0.22);
    coolingBand.userData.buildingId = building.id;
    coolingBand.visible = level >= 2;

    const reactorCourt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.08, depth * 0.22),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.1 })
    );
    reactorCourt.position.set(offset.x + width * 0.2, level >= 5 ? 0.16 : 0.12, offset.z - depth * 0.18);
    reactorCourt.castShadow = true;
    reactorCourt.receiveShadow = true;
    reactorCourt.userData.buildingId = building.id;
    reactorCourt.visible = level >= 4;

    const condenser = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.42, depth * 0.16),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.7, metalness: 0.14 })
    );
    condenser.position.set(offset.x + width * 0.24, 0.28, offset.z - depth * 0.18);
    condenser.castShadow = true;
    condenser.receiveShadow = true;
    condenser.userData.buildingId = building.id;
    condenser.visible = level >= 4;

    const hyperCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.44, 12),
      new THREE.MeshStandardMaterial({ color: 0xfff3c2, roughness: 0.22, metalness: 0.1, emissive: accentPalette[(variant + 3) % 5], emissiveIntensity: 0.28 })
    );
    hyperCore.position.set(offset.x + width * 0.22, 0.52, offset.z - depth * 0.18);
    hyperCore.userData.buildingId = building.id;
    hyperCore.visible = level >= 5;

    const hyperBeacon = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.34, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.2, metalness: 0.08, emissive: accentPalette[(variant + 4) % 5], emissiveIntensity: 0.24 })
    );
    hyperBeacon.position.set(offset.x - width * 0.08, 2.44, offset.z - depth * 0.04);
    hyperBeacon.userData.buildingId = building.id;
    hyperBeacon.visible = level >= 5;

    const reactorHallB = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, level >= 5 ? 0.92 : 0.56, depth * 0.2),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.7, metalness: 0.12 })
    );
    reactorHallB.position.set(offset.x + width * 0.28, level >= 5 ? 0.56 : 0.32, offset.z - depth * 0.26);
    reactorHallB.castShadow = true;
    reactorHallB.receiveShadow = true;
    reactorHallB.userData.buildingId = building.id;
    reactorHallB.visible = level >= 4;

    const reactorGlowSpine = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.12, level >= 5 ? 1.18 : 0.74, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xfff3c2, roughness: 0.22, metalness: 0.1, emissive: accentPalette[(variant + 3) % 5], emissiveIntensity: 0.24 })
    );
    reactorGlowSpine.position.set(offset.x + width * 0.28, level >= 5 ? 0.92 : 0.58, offset.z - depth * 0.14);
    reactorGlowSpine.userData.buildingId = building.id;
    reactorGlowSpine.visible = level >= 4;

    const megaCoolingTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 1.92, 18),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 3) % 5], roughness: 0.74, metalness: 0.18 })
    );
    megaCoolingTower.position.set(offset.x + width * 0.44, 1.08, offset.z + depth * 0.04);
    megaCoolingTower.castShadow = true;
    megaCoolingTower.receiveShadow = true;
    megaCoolingTower.userData.buildingId = building.id;
    megaCoolingTower.visible = level >= 5;

    const coolingPond = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.24, 0.05, depth * 0.16),
      new THREE.MeshStandardMaterial({ color: 0x8ed3f4, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: 0x38bdf8, emissiveIntensity: 0.08 })
    );
    coolingPond.position.set(offset.x + width * archetype.pondX, 0.08, offset.z + depth * 0.24);
    coolingPond.userData.buildingId = building.id;
    coolingPond.visible = level >= 4;

    const transformerField = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.18, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.14 })
    );
    transformerField.position.set(offset.x + width * archetype.pondX, 0.14, offset.z + depth * 0.34);
    transformerField.userData.buildingId = building.id;
    transformerField.visible = level >= 5;

    const switchyardTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.58, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.18 })
    );
    switchyardTower.position.set(offset.x + width * (archetype.pondX + 0.02), 0.34, offset.z + depth * 0.2);
    switchyardTower.userData.buildingId = building.id;
    switchyardTower.visible = level >= 5;

    const pipeField = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, 0.08, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.16 })
    );
    pipeField.position.set(offset.x - width * 0.22, 0.18, offset.z + depth * 0.2);
    pipeField.userData.buildingId = building.id;
    pipeField.visible = level >= 4;

    const turbineCourt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, 0.04, depth * 0.22),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 4) % 5], roughness: 0.84, metalness: 0.08 })
    );
    turbineCourt.position.set(offset.x - width * 0.12, 0.08, offset.z + depth * 0.06);
    turbineCourt.userData.buildingId = building.id;
    turbineCourt.visible = level >= 4;

    const batteryYard = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.24, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.14 })
    );
    batteryYard.position.set(offset.x - width * 0.3, 0.16, offset.z + depth * 0.28);
    batteryYard.userData.buildingId = building.id;
    batteryYard.visible = level >= 4;

    const coolingCanal = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.48, 0.05, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: 0x8ed3f4, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: 0x38bdf8, emissiveIntensity: 0.09 })
    );
    coolingCanal.position.set(offset.x - width * 0.08, 0.08, offset.z - depth * 0.36);
    coolingCanal.userData.buildingId = building.id;
    coolingCanal.visible = level >= 5;

    const condenserSpine = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 1.56, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 1) % 5], roughness: 0.7, metalness: 0.18 })
    );
    condenserSpine.position.set(offset.x + width * 0.46, 1.1, offset.z - depth * 0.18);
    condenserSpine.userData.buildingId = building.id;
    condenserSpine.visible = level >= 5;

    const batteryFieldB = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.24, 0.22, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.14 })
    );
    batteryFieldB.position.set(offset.x + width * 0.34, 0.16, offset.z + depth * 0.26);
    batteryFieldB.userData.buildingId = building.id;
    batteryFieldB.visible = supergridMode && level >= 4;

    const transmissionPylonA = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.28, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.18 })
    );
    transmissionPylonA.position.set(offset.x - width * 0.42, 0.7, offset.z - depth * 0.22);
    transmissionPylonA.userData.buildingId = building.id;
    transmissionPylonA.visible = supergridMode && level >= 5;

    const transmissionPylonB = transmissionPylonA.clone();
    transmissionPylonB.position.set(offset.x + width * 0.42, 0.7, offset.z + depth * 0.22);
    transmissionPylonB.userData.buildingId = building.id;
    transmissionPylonB.visible = supergridMode && level >= 5;

    const lineSpine = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.84, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 0.24, metalness: 0.08, emissive: accentPalette[(variant + 1) % 5], emissiveIntensity: 0.12 })
    );
    lineSpine.position.set(offset.x, 1.26, offset.z);
    lineSpine.userData.buildingId = building.id;
    lineSpine.visible = supergridMode && level >= 5;

    const solarField = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.32, 0.04, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0x34506a, roughness: 0.34, metalness: 0.18, emissive: 0x0f172a, emissiveIntensity: 0.08 })
    );
    solarField.position.set(offset.x - width * 0.26, 0.08, offset.z + depth * 0.36);
    solarField.userData.buildingId = building.id;
    solarField.visible = supergridMode && level >= 4;

    const cableBridge = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.56, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.18 })
    );
    cableBridge.position.set(offset.x + width * 0.06, 0.98, offset.z - depth * 0.18);
    cableBridge.userData.buildingId = building.id;
    cableBridge.visible = supergridMode && level >= 4;

    const cableGlow = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.48, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe5f3ff, roughness: 0.24, metalness: 0.08, emissive: accentPalette[(variant + 4) % 5], emissiveIntensity: 0.16 })
    );
    cableGlow.position.set(offset.x + width * 0.06, 1.02, offset.z - depth * 0.18);
    cableGlow.userData.buildingId = building.id;
    cableGlow.visible = supergridMode && level >= 5;

    const inverterHall = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.46, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.12 })
    );
    inverterHall.position.set(offset.x - width * 0.38, 0.28, offset.z + depth * 0.14);
    inverterHall.userData.buildingId = building.id;
    inverterHall.visible = supergridMode && level >= 4;

    const switchArray = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.2, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: hallPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.14 })
    );
    switchArray.position.set(offset.x + width * 0.38, 0.16, offset.z - depth * 0.28);
    switchArray.userData.buildingId = building.id;
    switchArray.visible = supergridMode && level >= 5;

    const stackSmoke = [
      ...this.createSmokePuffs(building.id, { x: stacks[0].position.x, y: 1.34, z: stacks[0].position.z }, 3, 1),
      ...this.createSmokePuffs(building.id, { x: stacks[1].position.x, y: 1.34, z: stacks[1].position.z }, 3, 0.92)
    ];
    if (level >= 5) {
      stackSmoke.push(
        ...this.createSmokePuffs(building.id, { x: hyperStack.position.x, y: 2.62, z: hyperStack.position.z }, 5, 1.14)
      );
    }

    group.add(walk);
    group.add(pad);
    group.add(hall);
    group.add(hallRoof);
    group.add(substation);
    group.add(pipeRack);
    group.add(fence);
    group.add(yardWalk);
    group.add(truck);
    group.add(lamp);
    group.add(powerCore);
    group.add(turbineWing);
    group.add(reactorTower);
    group.add(hyperStack);
    group.add(gantry);
    group.add(reactorBand);
    group.add(coolingBand);
    group.add(reactorCourt);
    group.add(condenser);
    group.add(hyperCore);
    group.add(hyperBeacon);
    group.add(reactorHallB);
    group.add(reactorGlowSpine);
    group.add(megaCoolingTower);
    group.add(coolingPond);
    group.add(transformerField);
    group.add(switchyardTower);
    group.add(pipeField);
    group.add(turbineCourt);
    group.add(batteryYard);
    group.add(batteryFieldB);
    group.add(coolingCanal);
    group.add(condenserSpine);
    group.add(transmissionPylonA);
    group.add(transmissionPylonB);
    group.add(lineSpine);
    group.add(solarField);
    group.add(cableBridge);
    group.add(cableGlow);
    group.add(inverterHall);
    group.add(switchArray);
    stackSmoke.forEach((puff) => group.add(puff.mesh));
    powerCore.visible = level >= 2;

    this.utilityAnimations.set(building.id, {
      smoke: stackSmoke,
      glow: [
        powerCore,
        reactorBand,
        coolingBand,
        hyperCore,
        hyperBeacon,
        coolingPond,
        switchyardTower,
        reactorGlowSpine,
        coolingCanal,
        lineSpine,
        solarField,
        cableGlow
      ].filter((mesh) => mesh.visible),
      phase: building.id * 0.13
    });

    this.selectableMeshes.set(building.id, [
      walk,
      pad,
      hall,
      hallRoof,
      substation,
      pipeRack,
      fence,
      yardWalk,
      powerCore,
      turbineWing,
      reactorTower,
      hyperStack,
      gantry,
      reactorBand,
      coolingBand,
      reactorCourt,
      condenser,
      hyperCore,
      hyperBeacon,
      coolingPond,
      transformerField,
      switchyardTower,
      pipeField,
      turbineCourt,
      batteryYard,
      batteryFieldB,
      coolingCanal,
      condenserSpine,
      transmissionPylonA,
      transmissionPylonB,
      lineSpine,
      solarField,
      cableBridge,
      cableGlow,
      inverterHall,
      switchArray,
      ...towers,
      ...stacks,
      ...stackSmoke.map((entry) => entry.mesh),
      ...this.collectMeshes(truck),
      ...this.collectMeshes(lamp)
    ]);

    return group;
  }

  private createMergedServiceCampus(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const level = building.level;
    const variant = building.id % 5;
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.95;
    const depth = cluster.tileDepth * 0.95;
    const isPolice = building.type === 'policeStation';
    const wallPalette = isPolice
      ? [0xdfe7f0, 0xd8e1ec, 0xe6ece4, 0xded9ec, 0xe7e0d2]
      : [0xe4c5bb, 0xe6d1bf, 0xdec2b4, 0xe7cfbf, 0xdcc9b2];
    const roofPalette = isPolice
      ? [0x4b5f79, 0x5e6f88, 0x556e63, 0x605986, 0x6d6555]
      : [0xaf473f, 0xc55f48, 0xb47b2d, 0x9a4c73, 0x8f5f35];
    const accentPalette = isPolice
      ? [0x60a5fa, 0x38bdf8, 0x22c55e, 0xa78bfa, 0xf59e0b]
      : [0xf97316, 0xef4444, 0xf59e0b, 0x22c55e, 0x60a5fa];
    const wallColor = wallPalette[variant];
    const roofColor = roofPalette[variant];
    const accentColor = accentPalette[variant];
    const archetype = [
      { bodyW: 0.78, bodyD: 0.42, towerX: -0.28, civicX: 0.18, adminX: 0.22, bridgeY: 0.72 },
      { bodyW: 0.56, bodyD: 0.32, towerX: 0.04, civicX: -0.22, adminX: -0.18, bridgeY: 0.86 },
      { bodyW: 0.84, bodyD: 0.48, towerX: -0.2, civicX: 0.28, adminX: 0.26, bridgeY: 0.66 },
      { bodyW: 0.66, bodyD: 0.34, towerX: 0.24, civicX: -0.16, adminX: -0.22, bridgeY: 0.94 },
      { bodyW: 0.9, bodyD: 0.46, towerX: -0.34, civicX: 0.08, adminX: 0.18, bridgeY: 0.76 }
    ][variant];

    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.16, 0.025, depth + 0.16),
      new THREE.MeshStandardMaterial({ color: 0xe5e1db, roughness: 0.96, metalness: 0.01 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.95, metalness: 0.01 })
    );
    lot.position.set(offset.x, 0.025, offset.z);
    lot.receiveShadow = true;
    lot.userData.buildingId = building.id;

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(width * archetype.bodyW, level >= 5 ? 0.92 : level >= 4 ? 0.74 : 0.56, depth * archetype.bodyD),
      new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.75, metalness: 0.03 })
    );
    body.position.set(offset.x, level >= 5 ? 0.47 : level >= 4 ? 0.38 : 0.29, offset.z);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.buildingId = building.id;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width * (archetype.bodyW + 0.06), 0.08, depth * (archetype.bodyD + 0.06)),
      new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8, metalness: 0.05 })
    );
    roof.position.set(offset.x, 0.61, offset.z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.buildingId = building.id;

    const forecourt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.56, 0.02, depth * 0.16),
      new THREE.MeshStandardMaterial({ color: 0xe0dfdb, roughness: 0.95, metalness: 0.01 })
    );
    forecourt.position.set(offset.x, 0.055, offset.z + depth * 0.34);
    forecourt.userData.buildingId = building.id;

    const frontAccent = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.32, 0.16, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.42,
        metalness: 0.06,
        emissive: accentColor,
        emissiveIntensity: 0.2
      })
    );
    frontAccent.position.set(offset.x, 0.38, offset.z + depth * 0.21);
    frontAccent.userData.buildingId = building.id;

    const vehicleA = this.createParkedCar(isPolice ? 0x1f4c8f : 0xc3312f, offset.x - width * 0.18, 0.08, offset.z - depth * 0.22, 0, building.id, 1.02);
    const vehicleB = this.createParkedCar(isPolice ? 0x2e5fa8 : 0xe55b3c, offset.x + width * 0.18, 0.08, offset.z - depth * 0.22, 0, building.id, 1.02);
    const lampLeft = this.createStreetLamp(offset.x - width * 0.28, 0.055, offset.z + depth * 0.22, building.id, isPolice ? 0xb8d8ff : 0xffd7a8);
    const lampRight = this.createStreetLamp(offset.x + width * 0.28, 0.055, offset.z + depth * 0.22, building.id, isPolice ? 0xb8d8ff : 0xffd7a8);

    const annex = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.24, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.78, metalness: 0.03 })
    );
    annex.position.set(offset.x + width * archetype.adminX, 0.14, offset.z - depth * 0.18);
    annex.castShadow = true;
    annex.receiveShadow = true;
    annex.userData.buildingId = building.id;
    annex.visible = level >= 2;

    const commandTower = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, level >= 5 ? 1.26 : level >= 4 ? 0.74 : 0.34, 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.76, metalness: 0.03 })
    );
    commandTower.position.set(offset.x + width * archetype.towerX, level >= 5 ? 1.18 : level >= 4 ? 0.9 : 0.72, offset.z - depth * 0.08);
    commandTower.castShadow = true;
    commandTower.receiveShadow = true;
    commandTower.userData.buildingId = building.id;
    commandTower.visible = level >= 3;

    const sideWing = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, level >= 3 ? 0.42 : 0.3, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.76, metalness: 0.03 })
    );
    sideWing.position.set(offset.x + width * archetype.towerX * 0.86, level >= 3 ? 0.22 : 0.16, offset.z - depth * 0.16);
    sideWing.castShadow = true;
    sideWing.receiveShadow = true;
    sideWing.userData.buildingId = building.id;
    sideWing.visible = level >= 2;

    const civicCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, 0.05, 0.14),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.7, metalness: 0.05 })
    );
    civicCanopy.position.set(offset.x, 0.26, offset.z + depth * 0.28);
    civicCanopy.castShadow = true;
    civicCanopy.receiveShadow = true;
    civicCanopy.userData.buildingId = building.id;
    civicCanopy.visible = level >= 2;

    const frontWindowBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.5, 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe7f6ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: accentColor, emissiveIntensity: 0.08 })
    );
    frontWindowBand.position.set(offset.x, 0.33, offset.z + depth * 0.23);
    frontWindowBand.userData.buildingId = building.id;
    const rearWindowBand = frontWindowBand.clone();
    rearWindowBand.position.set(offset.x, 0.33, offset.z - depth * 0.23);
    rearWindowBand.userData.buildingId = building.id;

    const towerLightBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.22, 0.14),
      new THREE.MeshStandardMaterial({ color: 0xe7f6ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: accentColor, emissiveIntensity: 0.1 })
    );
    towerLightBand.position.set(offset.x + width * archetype.towerX * 0.64, 0.74, offset.z - depth * 0.08);
    towerLightBand.userData.buildingId = building.id;
    towerLightBand.visible = level >= 3;

    const commandCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.06, 0.24),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.78, metalness: 0.05 })
    );
    commandCap.position.set(offset.x + width * archetype.towerX, 0.92, offset.z - depth * 0.08);
    commandCap.userData.buildingId = building.id;
    commandCap.visible = level >= 3;

    const civicTower = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 1.7, depth * 0.16),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.04 })
    );
    civicTower.position.set(offset.x + width * archetype.civicX, 1.36, offset.z + depth * 0.02);
    civicTower.userData.buildingId = building.id;
    civicTower.visible = level >= 5;

    const adminWing = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.3, 0.52, depth * 0.22),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.76, metalness: 0.03 })
    );
    adminWing.position.set(offset.x + width * archetype.adminX, 0.34, offset.z - depth * 0.24);
    adminWing.userData.buildingId = building.id;
    adminWing.visible = level >= 4;

    const adminGlass = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.22, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe7f6ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: accentColor, emissiveIntensity: 0.1 })
    );
    adminGlass.position.set(offset.x + width * archetype.adminX, 0.36, offset.z - depth * 0.12);
    adminGlass.userData.buildingId = building.id;
    adminGlass.visible = level >= 4;

    const plazaSculptureBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: 0xdad6ce, roughness: 0.9, metalness: 0.02 })
    );
    plazaSculptureBase.position.set(offset.x, 0.08, offset.z + depth * 0.12);
    plazaSculptureBase.userData.buildingId = building.id;
    plazaSculptureBase.visible = level >= 4;

    const plazaSculpture = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.28, 0.1),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.04, emissive: accentColor, emissiveIntensity: 0.08 })
    );
    plazaSculpture.position.set(offset.x, 0.24, offset.z + depth * 0.12);
    plazaSculpture.userData.buildingId = building.id;
    plazaSculpture.visible = level >= 4;

    const bannerPoleLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.42, 0.02),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 3) % 5], roughness: 0.74, metalness: 0.08 })
    );
    bannerPoleLeft.position.set(offset.x - width * 0.22, 0.22, offset.z + depth * 0.24);
    bannerPoleLeft.userData.buildingId = building.id;
    bannerPoleLeft.visible = level >= 4;
    const bannerPoleRight = bannerPoleLeft.clone();
    bannerPoleRight.position.set(offset.x + width * 0.22, 0.22, offset.z + depth * 0.24);
    bannerPoleRight.userData.buildingId = building.id;
    bannerPoleRight.visible = level >= 4;

    const beaconSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.64, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8f5ff, roughness: 0.2, metalness: 0.08, emissive: accentColor, emissiveIntensity: 0.24 })
    );
    beaconSpire.position.set(offset.x + width * archetype.civicX, 2.3, offset.z + depth * 0.02);
    beaconSpire.userData.buildingId = building.id;
    beaconSpire.visible = level >= 5;

    const civicBridge = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.12, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.04 })
    );
    civicBridge.position.set(offset.x, level >= 5 ? archetype.bridgeY : 0.54, offset.z - depth * 0.02);
    civicBridge.userData.buildingId = building.id;
    civicBridge.visible = level >= 5;

    const forecourtPool = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.04, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: 0xa8ddf5, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: accentColor, emissiveIntensity: 0.08 })
    );
    forecourtPool.position.set(offset.x, 0.08, offset.z + depth * 0.26);
    forecourtPool.userData.buildingId = building.id;
    forecourtPool.visible = level >= 4;

    const justicePlaza = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.42, 0.02, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe0ddd7, roughness: 0.94, metalness: 0.01 })
    );
    justicePlaza.position.set(offset.x - width * 0.04, 0.06, offset.z - depth * 0.28);
    justicePlaza.userData.buildingId = building.id;
    justicePlaza.visible = level >= 4;

    const trainingWing = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, 0.44, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.76, metalness: 0.04 })
    );
    trainingWing.position.set(offset.x - width * 0.32, 0.28, offset.z - depth * 0.18);
    trainingWing.userData.buildingId = building.id;
    trainingWing.visible = level >= 4;

    const honorGarden = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.22, 0.04, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0x83ab77, roughness: 0.94, metalness: 0.01 })
    );
    honorGarden.position.set(offset.x + width * 0.3, 0.08, offset.z - depth * 0.26);
    honorGarden.userData.buildingId = building.id;
    honorGarden.visible = level >= 4;

    const civicArch = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.08, depth * 0.08),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.76, metalness: 0.04, emissive: accentColor, emissiveIntensity: 0.08 })
    );
    civicArch.position.set(offset.x, 0.38, offset.z + depth * 0.36);
    civicArch.userData.buildingId = building.id;
    civicArch.visible = level >= 5;

    const trainingTower = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.12, 2.16, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.05 })
    );
    trainingTower.position.set(offset.x - width * 0.4, 1.46, offset.z + depth * 0.06);
    trainingTower.userData.buildingId = building.id;
    trainingTower.visible = level >= 5;

    group.add(walk);
    group.add(lot);
    group.add(body);
    group.add(roof);
    group.add(forecourt);
    group.add(frontAccent);
    group.add(vehicleA);
    group.add(vehicleB);
    group.add(lampLeft);
    group.add(lampRight);
    group.add(annex);
    group.add(commandTower);
    group.add(sideWing);
    group.add(civicCanopy);
    group.add(frontWindowBand);
    group.add(rearWindowBand);
    group.add(towerLightBand);
    group.add(commandCap);
    group.add(civicTower);
    group.add(adminWing);
    group.add(adminGlass);
    group.add(plazaSculptureBase);
    group.add(plazaSculpture);
    group.add(bannerPoleLeft);
    group.add(bannerPoleRight);
    group.add(beaconSpire);
    group.add(civicBridge);
    group.add(forecourtPool);
    group.add(justicePlaza);
    group.add(trainingWing);
    group.add(honorGarden);
    group.add(civicArch);
    group.add(trainingTower);

    this.utilityAnimations.set(building.id, {
      smoke: [],
      glow: [frontAccent, frontWindowBand, rearWindowBand, towerLightBand, adminGlass, plazaSculpture, beaconSpire, forecourtPool, civicArch].filter((mesh) => mesh.visible),
      phase: building.id * 0.16
    });

    this.selectableMeshes.set(building.id, [
      walk,
      lot,
      body,
      roof,
      forecourt,
      frontAccent,
      annex,
      commandTower,
      sideWing,
      civicCanopy,
      frontWindowBand,
      rearWindowBand,
      towerLightBand,
      commandCap,
      civicTower,
      adminWing,
      adminGlass,
      plazaSculptureBase,
      plazaSculpture,
      bannerPoleLeft,
      bannerPoleRight,
      beaconSpire,
      civicBridge,
      forecourtPool,
      ...this.collectMeshes(vehicleA),
      ...this.collectMeshes(vehicleB),
      ...this.collectMeshes(lampLeft),
      ...this.collectMeshes(lampRight)
    ]);

    return group;
  }

  private createMergedWorkshopYard(building: Building, cluster: BuildingClusterData): THREE.Group {
    const group = new THREE.Group();
    const level = building.level;
    const variant = building.id % 5;
    const offset = this.clusterCenterOffset(building, cluster);
    const width = cluster.tileWidth * 0.95;
    const depth = cluster.tileDepth * 0.95;
    const logisticsHub = cluster.size >= 6 || (cluster.originWidth >= 3 && cluster.originDepth >= 2);
    const wallPalette = [0xa98f74, 0x9d8773, 0x8f9787, 0xa2866a, 0x957d72];
    const roofPalette = [0x6a747c, 0x7b665b, 0x5c716b, 0x6d6376, 0x54656e];
    const metalPalette = [0x7b8792, 0x76828d, 0x6e867e, 0x7e7a90, 0x627b86];
    const accentPalette = [0xd99b43, 0x38bdf8, 0xf97316, 0x22c55e, 0xa855f7];
    const archetype = [
      { hallW: 0.76, hallD: 0.34, hallX: -0.08, siloX: -0.28, towerX: -0.02, craneX: 0.3, furnaceX: 0.18 },
      { hallW: 0.5, hallD: 0.22, hallX: -0.18, siloX: -0.08, towerX: 0.22, craneX: 0.18, furnaceX: 0.26 },
      { hallW: 0.82, hallD: 0.38, hallX: -0.02, siloX: -0.34, towerX: -0.18, craneX: 0.34, furnaceX: 0.08 },
      { hallW: 0.58, hallD: 0.26, hallX: 0.08, siloX: -0.18, towerX: 0.08, craneX: 0.12, furnaceX: 0.24 },
      { hallW: 0.68, hallD: 0.3, hallX: -0.14, siloX: -0.22, towerX: 0.16, craneX: 0.28, furnaceX: 0.3 }
    ][variant];

    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.12, 0.025, depth + 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.96, metalness: 0.01 })
    );
    walk.position.set(offset.x, 0.03, offset.z);
    walk.receiveShadow = true;
    walk.userData.buildingId = building.id;

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.05, depth),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.9, metalness: 0.02 })
    );
    pad.position.set(offset.x, 0.025, offset.z);
    pad.receiveShadow = true;
    pad.userData.buildingId = building.id;

    const hall = new THREE.Mesh(
      new THREE.BoxGeometry(width * archetype.hallW, level >= 5 ? 0.72 : level >= 4 ? 0.56 : 0.42, depth * archetype.hallD),
      new THREE.MeshStandardMaterial({ color: wallPalette[variant], roughness: 0.8, metalness: 0.03 })
    );
    hall.position.set(offset.x + width * archetype.hallX, level >= 5 ? 0.38 : level >= 4 ? 0.3 : 0.22, offset.z);
    hall.castShadow = true;
    hall.receiveShadow = true;
    hall.userData.buildingId = building.id;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(width * (archetype.hallW + 0.06), 0.08, depth * (archetype.hallD + 0.06)),
      new THREE.MeshStandardMaterial({ color: roofPalette[variant], roughness: 0.8, metalness: 0.05 })
    );
    roof.position.set(offset.x + width * archetype.hallX, 0.48, offset.z);
    roof.castShadow = true;
    roof.receiveShadow = true;
    roof.userData.buildingId = building.id;

    const loadingPad = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.4, 0.02, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: 0xd9d2c8, roughness: 0.94, metalness: 0.01 })
    );
    loadingPad.position.set(offset.x + width * 0.18, 0.055, offset.z + depth * 0.24);
    loadingPad.userData.buildingId = building.id;

    const containerA = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.18, 0.16),
      new THREE.MeshStandardMaterial({ color: metalPalette[variant], roughness: 0.8, metalness: 0.14 })
    );
    containerA.position.set(offset.x + width * 0.28, 0.12, offset.z - depth * 0.18);
    containerA.castShadow = true;
    containerA.receiveShadow = true;
    containerA.userData.buildingId = building.id;

    const containerB = containerA.clone();
    containerB.position.set(offset.x + width * 0.1, 0.12, offset.z - depth * 0.18);
    containerB.userData.buildingId = building.id;
    containerB.visible = level >= 2;

    const truck = this.createParkedCar(accentPalette[variant], offset.x - width * 0.26, 0.08, offset.z + depth * 0.24, 0, building.id, 1.02);
    const gantry = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.24, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.18 })
    );
    gantry.position.set(offset.x + width * 0.22, 0.34, offset.z + depth * 0.02);
    gantry.userData.buildingId = building.id;
    gantry.visible = level >= 3;

    const annex = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, level >= 3 ? 0.44 : 0.3, depth * 0.2),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.78, metalness: 0.04 })
    );
    annex.position.set(offset.x + width * 0.14, level >= 5 ? 0.38 : level >= 3 ? 0.24 : 0.17, offset.z + depth * 0.04);
    annex.castShadow = true;
    annex.receiveShadow = true;
    annex.userData.buildingId = building.id;
    annex.visible = level >= 2;

    const silo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.72, 14),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 2) % 5], roughness: 0.72, metalness: 0.16 })
    );
    silo.position.set(offset.x + width * archetype.siloX, 0.38, offset.z - depth * 0.12);
    silo.castShadow = true;
    silo.receiveShadow = true;
    silo.userData.buildingId = building.id;
    silo.visible = level >= 3;

    const officeBand = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.22, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.84, emissive: 0x7dd3fc, emissiveIntensity: 0.08 })
    );
    officeBand.position.set(offset.x + width * 0.14, level >= 3 ? 0.3 : 0.23, offset.z + depth * 0.15);
    officeBand.userData.buildingId = building.id;
    officeBand.visible = level >= 2;

    const craneMast = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.64, 0.05),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.16 })
    );
    craneMast.position.set(offset.x + width * archetype.craneX, 0.44, offset.z + depth * 0.1);
    craneMast.userData.buildingId = building.id;
    craneMast.visible = level >= 3;

    const craneBoom = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.26, 0.04, 0.04),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 2) % 5], roughness: 0.7, metalness: 0.1 })
    );
    craneBoom.position.set(offset.x + width * (archetype.craneX + 0.04), 0.74, offset.z + depth * 0.1);
    craneBoom.userData.buildingId = building.id;
    craneBoom.visible = level >= 3;

    const foundryTower = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 1.42, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.76, metalness: 0.04 })
    );
    foundryTower.position.set(offset.x + width * archetype.towerX, 1.18, offset.z - depth * 0.08);
    foundryTower.userData.buildingId = building.id;
    foundryTower.visible = level >= 4;

    const overheadCrane = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.52, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 1) % 5], roughness: 0.7, metalness: 0.1 })
    );
    overheadCrane.position.set(offset.x + width * 0.04, 1.52, offset.z - depth * 0.02);
    overheadCrane.userData.buildingId = building.id;
    overheadCrane.visible = level >= 5;

    const furnaceHall = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.24, 0.38, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 3) % 5], roughness: 0.76, metalness: 0.08 })
    );
    furnaceHall.position.set(offset.x + width * archetype.furnaceX, 0.24, offset.z - depth * 0.02);
    furnaceHall.castShadow = true;
    furnaceHall.receiveShadow = true;
    furnaceHall.userData.buildingId = building.id;
    furnaceHall.visible = level >= 4;

    const furnaceGlow = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 0.16, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xfff1d4, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.88, emissive: accentPalette[(variant + 2) % 5], emissiveIntensity: 0.22 })
    );
    furnaceGlow.position.set(offset.x + width * archetype.furnaceX, 0.22, offset.z + depth * 0.08);
    furnaceGlow.userData.buildingId = building.id;
    furnaceGlow.visible = level >= 4;

    const ventStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.09, 0.92, 14),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.18 })
    );
    ventStack.position.set(offset.x + width * (archetype.towerX - 0.1), 0.58, offset.z - depth * 0.22);
    ventStack.castShadow = true;
    ventStack.receiveShadow = true;
    ventStack.userData.buildingId = building.id;
    ventStack.visible = level >= 5;

    const railGantry = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.44, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 3) % 5], roughness: 0.7, metalness: 0.12 })
    );
    railGantry.position.set(offset.x + width * archetype.towerX, 1.02, offset.z - depth * 0.18);
    railGantry.userData.buildingId = building.id;
    railGantry.visible = level >= 5;

    const freightRail = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.62, 0.02, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x7c5d45, roughness: 0.84, metalness: 0.02 })
    );
    freightRail.position.set(offset.x, 0.06, offset.z - depth * 0.3);
    freightRail.userData.buildingId = building.id;
    freightRail.visible = level >= 4;

    const fabricationBay = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, 0.34, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.74, metalness: 0.04 })
    );
    fabricationBay.position.set(offset.x + width * (archetype.furnaceX + 0.06), 0.24, offset.z + depth * 0.02);
    fabricationBay.userData.buildingId = building.id;
    fabricationBay.visible = level >= 5;

    const catwalk = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.32, 0.06, 0.08),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 1) % 5], roughness: 0.72, metalness: 0.16 })
    );
    catwalk.position.set(offset.x + width * 0.02, 0.84, offset.z - depth * 0.1);
    catwalk.userData.buildingId = building.id;
    catwalk.visible = level >= 4;

    const loaderArm = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 4) % 5], roughness: 0.7, metalness: 0.12 })
    );
    loaderArm.position.set(offset.x + width * archetype.furnaceX, 0.56, offset.z - depth * 0.2);
    loaderArm.userData.buildingId = building.id;
    loaderArm.visible = level >= 5;

    const forgeCourt = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.38, 0.04, depth * 0.24),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.88, metalness: 0.04 })
    );
    forgeCourt.position.set(offset.x - width * 0.12, 0.08, offset.z + depth * 0.18);
    forgeCourt.userData.buildingId = building.id;
    forgeCourt.visible = level >= 4;

    const assemblyHall = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.56, depth * 0.2),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 4) % 5], roughness: 0.74, metalness: 0.06 })
    );
    assemblyHall.position.set(offset.x - width * 0.32, 0.3, offset.z + depth * 0.02);
    assemblyHall.userData.buildingId = building.id;
    assemblyHall.visible = level >= 5;

    const stackArray = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 1.08, depth * 0.12),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 4) % 5], roughness: 0.72, metalness: 0.18 })
    );
    stackArray.position.set(offset.x + width * 0.36, 0.8, offset.z - depth * 0.26);
    stackArray.userData.buildingId = building.id;
    stackArray.visible = level >= 5;

    const railDepot = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.28, 0.24, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 1) % 5], roughness: 0.76, metalness: 0.16 })
    );
    railDepot.position.set(offset.x - width * 0.26, 0.14, offset.z - depth * 0.3);
    railDepot.userData.buildingId = building.id;
    railDepot.visible = level >= 4;

    const logisticsWarehouse = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.36, 0.58, depth * 0.22),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 1) % 5], roughness: 0.74, metalness: 0.06 })
    );
    logisticsWarehouse.position.set(offset.x + width * 0.34, 0.32, offset.z + depth * 0.02);
    logisticsWarehouse.userData.buildingId = building.id;
    logisticsWarehouse.visible = logisticsHub && level >= 4;

    const logisticsWarehouseRoof = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.4, 0.08, depth * 0.26),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 2) % 5], roughness: 0.78, metalness: 0.06 })
    );
    logisticsWarehouseRoof.position.set(offset.x + width * 0.34, 0.64, offset.z + depth * 0.02);
    logisticsWarehouseRoof.userData.buildingId = building.id;
    logisticsWarehouseRoof.visible = logisticsHub && level >= 4;

    const containerStack = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.42, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.12 })
    );
    containerStack.position.set(offset.x + width * 0.24, 0.24, offset.z - depth * 0.24);
    containerStack.userData.buildingId = building.id;
    containerStack.visible = logisticsHub && level >= 5;

    const logisticsCrane = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: accentPalette[(variant + 4) % 5], roughness: 0.7, metalness: 0.12 })
    );
    logisticsCrane.position.set(offset.x + width * 0.18, 1.22, offset.z + depth * 0.18);
    logisticsCrane.userData.buildingId = building.id;
    logisticsCrane.visible = logisticsHub && level >= 5;

    const yardSmoke = level >= 4
      ? this.createSmokePuffs(building.id, { x: foundryTower.position.x, y: level >= 5 ? 2.0 : 1.72, z: foundryTower.position.z }, level >= 5 ? 5 : 3, level >= 5 ? 1.04 : 0.86)
      : [];

    const loadingCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.34, 0.1, depth * 0.18),
      new THREE.MeshStandardMaterial({ color: roofPalette[(variant + 1) % 5], roughness: 0.76, metalness: 0.08 })
    );
    loadingCanopy.position.set(offset.x + width * 0.22, 0.3, offset.z + depth * 0.26);
    loadingCanopy.userData.buildingId = building.id;
    loadingCanopy.visible = logisticsHub && level >= 4;

    const tanker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: metalPalette[(variant + 3) % 5], roughness: 0.72, metalness: 0.18 })
    );
    tanker.rotation.z = Math.PI / 2;
    tanker.position.set(offset.x - width * 0.18, 0.18, offset.z + depth * 0.28);
    tanker.userData.buildingId = building.id;
    tanker.visible = logisticsHub && level >= 4;

    const dispatchTower = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.16, 1.94, depth * 0.14),
      new THREE.MeshStandardMaterial({ color: wallPalette[(variant + 2) % 5], roughness: 0.74, metalness: 0.06 })
    );
    dispatchTower.position.set(offset.x + width * 0.4, 1.36, offset.z + depth * 0.02);
    dispatchTower.userData.buildingId = building.id;
    dispatchTower.visible = logisticsHub && level >= 5;

    const dispatchGlow = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.1, 1.04, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.2, metalness: 0.08, transparent: true, opacity: 0.86, emissive: accentPalette[(variant + 1) % 5], emissiveIntensity: 0.14 })
    );
    dispatchGlow.position.set(dispatchTower.position.x, dispatchTower.position.y, dispatchTower.position.z + depth * 0.08);
    dispatchGlow.userData.buildingId = building.id;
    dispatchGlow.visible = logisticsHub && level >= 5;

    const yardGrid = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.62, 0.02, depth * 0.24),
      new THREE.MeshStandardMaterial({ color: 0xd5cbbd, roughness: 0.9, metalness: 0.02 })
    );
    yardGrid.position.set(offset.x + width * 0.04, 0.055, offset.z + depth * 0.34);
    yardGrid.userData.buildingId = building.id;
    yardGrid.visible = logisticsHub && level >= 4;

    const loaderBayGlow = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.18, 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xfff1d4, roughness: 0.24, metalness: 0.08, transparent: true, opacity: 0.88, emissive: accentPalette[(variant + 2) % 5], emissiveIntensity: 0.2 })
    );
    loaderBayGlow.position.set(offset.x + width * 0.22, 0.34, offset.z + depth * 0.22);
    loaderBayGlow.userData.buildingId = building.id;
    loaderBayGlow.visible = logisticsHub && level >= 4;

    group.add(walk);
    group.add(pad);
    group.add(hall);
    group.add(roof);
    group.add(loadingPad);
    group.add(containerA);
    group.add(containerB);
    group.add(truck);
    group.add(gantry);
    group.add(annex);
    group.add(silo);
    group.add(officeBand);
    group.add(craneMast);
    group.add(craneBoom);
    group.add(foundryTower);
    group.add(overheadCrane);
    group.add(furnaceHall);
    group.add(furnaceGlow);
    group.add(ventStack);
    group.add(railGantry);
    group.add(freightRail);
    group.add(fabricationBay);
    group.add(catwalk);
    group.add(loaderArm);
    group.add(forgeCourt);
    group.add(assemblyHall);
    group.add(stackArray);
    group.add(railDepot);
    group.add(logisticsWarehouse);
    group.add(logisticsWarehouseRoof);
    group.add(containerStack);
    group.add(logisticsCrane);
    group.add(loadingCanopy);
    group.add(tanker);
    group.add(dispatchTower);
    group.add(dispatchGlow);
    group.add(yardGrid);
    group.add(loaderBayGlow);
    yardSmoke.forEach((puff) => group.add(puff.mesh));

    this.utilityAnimations.set(building.id, {
      smoke: yardSmoke,
      glow: [officeBand, furnaceGlow, loaderArm, assemblyHall, logisticsCrane, dispatchGlow, loaderBayGlow].filter((mesh) => mesh.visible),
      phase: building.id * 0.11
    });

    this.selectableMeshes.set(building.id, [
      walk,
      pad,
      hall,
      roof,
      loadingPad,
      containerA,
      containerB,
      gantry,
      annex,
      silo,
      officeBand,
      craneMast,
      craneBoom,
      foundryTower,
      overheadCrane,
      furnaceHall,
      furnaceGlow,
      ventStack,
      railGantry,
      freightRail,
      fabricationBay,
      catwalk,
      loaderArm,
      forgeCourt,
      assemblyHall,
      stackArray,
      railDepot,
      logisticsWarehouse,
      logisticsWarehouseRoof,
      containerStack,
      logisticsCrane,
      loadingCanopy,
      tanker,
      dispatchTower,
      dispatchGlow,
      yardGrid,
      loaderBayGlow,
      ...yardSmoke.map((entry) => entry.mesh),
      ...this.collectMeshes(truck)
    ]);

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

  private rebuildGroundDecor(state: GameState): void {
    const signature = state.buildings
      .map((building) => `${building.id}:${building.type}:${building.x}:${building.z}`)
      .join('|');
    if (signature === this.decorSignature) return;
    this.decorSignature = signature;

    while (this.decorRoot.children.length > 0) {
      const child = this.decorRoot.children.pop();
      if (!child) break;
      this.disposeObject(child);
    }

    this.createGroundDecor(state);
  }

  private createGroundDecor(state: GameState): void {
    const treeTrunk = new THREE.CylinderGeometry(0.028, 0.036, 0.16, 8);
    const treeLeaf = new THREE.ConeGeometry(0.14, 0.32, 9);
    const shrubGeom = new THREE.SphereGeometry(0.075, 9, 9);
    const flowerGeom = new THREE.SphereGeometry(0.028, 8, 8);
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xdfe0dc, roughness: 0.96, metalness: 0.01 });
    const pavingMat = new THREE.MeshStandardMaterial({ color: 0xd0c3b0, roughness: 0.92, metalness: 0.01 });
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: 0.92, metalness: 0.01 });
    const gravelMat = new THREE.MeshStandardMaterial({ color: 0xb8b3aa, roughness: 0.95, metalness: 0.01 });
    const lawnInsetMat = new THREE.MeshStandardMaterial({ color: 0x8ab17e, roughness: 0.96, metalness: 0.01 });
    const utilityMat = new THREE.MeshStandardMaterial({ color: 0x858f98, roughness: 0.82, metalness: 0.12 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6645, roughness: 0.95, metalness: 0.01 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x5f9566, roughness: 0.86, metalness: 0.01 });
    const shrubMat = new THREE.MeshStandardMaterial({ color: 0x6f9b61, roughness: 0.92, metalness: 0.01 });
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x6b965e, roughness: 0.92, metalness: 0.01 });
    const bannerMat = new THREE.MeshStandardMaterial({ color: 0xaecae7, roughness: 0.62, metalness: 0.04, emissive: 0x38bdf8, emissiveIntensity: 0.08 });
    const flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xf4b7b2, roughness: 0.82, metalness: 0.01 }),
      new THREE.MeshStandardMaterial({ color: 0xf2d089, roughness: 0.82, metalness: 0.01 }),
      new THREE.MeshStandardMaterial({ color: 0xcddfa4, roughness: 0.82, metalness: 0.01 })
    ];

    const isOccupied = (x: number, z: number) => this.buildingByCell.has(`${x}:${z}`);
    const roadDistance = (x: number, z: number) => {
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (this.cellHasType(x + dx, z + dz, (type) => this.isTransportFrontageType(type))) return true;
        }
      }
      return false;
    };
    const adjacentBuildings = (x: number, z: number): Building[] => {
      const found = new Map<number, Building>();
      const coords = [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1]
      ] as const;
      coords.forEach(([cx, cz]) => {
        this.adjacentBuildingsAt(cx, cz).forEach((building) => {
          if (!['road', 'railLine', 'powerLine'].includes(building.type)) found.set(building.id, building);
        });
      });
      return [...found.values()];
    };
    const roadSides = (x: number, z: number) => ({
      n: this.cellHasType(x, z - 1, (type) => this.isTransportFrontageType(type)),
      e: this.cellHasType(x + 1, z, (type) => this.isTransportFrontageType(type)),
      s: this.cellHasType(x, z + 1, (type) => this.isTransportFrontageType(type)),
      w: this.cellHasType(x - 1, z, (type) => this.isTransportFrontageType(type))
    });
    const addStreetTree = (wx: number, wz: number, scale = 1) => {
      const trunk = new THREE.Mesh(treeTrunk, trunkMat);
      trunk.position.set(wx, 0.08, wz);
      trunk.scale.setScalar(scale);
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      const leaf = new THREE.Mesh(treeLeaf, leafMat.clone());
      leaf.position.set(wx, 0.28, wz);
      leaf.scale.setScalar(scale);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      this.decorRoot.add(trunk);
      this.decorRoot.add(leaf);
    };
    const addGatewayArch = (wx: number, wz: number, rotationY: number, accent = 0x67e8f9) => {
      const group = new THREE.Group();
      group.position.set(wx, 0.05, wz);
      group.rotation.y = rotationY;
      const pierMat = new THREE.MeshStandardMaterial({ color: 0xd5d0c6, roughness: 0.84, metalness: 0.03 });
      const beamMat = new THREE.MeshStandardMaterial({ color: 0x6e8192, roughness: 0.74, metalness: 0.08 });
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0xe8f6ff,
        roughness: 0.22,
        metalness: 0.08,
        emissive: accent,
        emissiveIntensity: 0.14
      });
      const leftPier = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.08), pierMat);
      leftPier.position.set(-0.18, 0.18, 0);
      const rightPier = leftPier.clone();
      rightPier.position.x = 0.18;
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.08), beamMat);
      beam.position.set(0, 0.38, 0);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.03), glowMat);
      sign.position.set(0, 0.38, 0.045);
      group.add(leftPier, rightPier, beam, sign);
      this.decorRoot.add(group);
    };

    for (let z = 1; z < state.gridSize - 1; z += 1) {
      for (let x = 1; x < state.gridSize - 1; x += 1) {
        if (isOccupied(x, z)) continue;

        const world = this.gridToWorld(x, z, state.gridSize);
        const tint = state.tiles[z * state.gridSize + x].tint;
        const border = x < 3 || z < 3 || x > state.gridSize - 4 || z > state.gridSize - 4;
        const adjacentRoad = roadDistance(x, z);
        const adjacent = adjacentBuildings(x, z);
        const nearCommercial = adjacent.some((building) => this.isCommercialBuilding(building.type));
        const nearCivic = adjacent.some((building) => this.isCivicBuilding(building.type));
        const nearResidential = adjacent.some((building) => building.type === 'house');
        const nearUtility = adjacent.some((building) => building.type === 'workshop' || building.type === 'powerPlant');
        const nearWorkshop = adjacent.some((building) => building.type === 'workshop');
        const nearPower = adjacent.some((building) => building.type === 'powerPlant');
        const topTier = adjacent.reduce((max, building) => Math.max(max, building.level), 0);
        const sides = roadSides(x, z);
        const noise = (x * 37 + z * 19) % 11;

        if (border && tint > 0.98 && noise < 5) {
          const trunk = new THREE.Mesh(treeTrunk, trunkMat);
          trunk.position.set(world.x, 0.08, world.z);
          trunk.castShadow = true;
          trunk.receiveShadow = true;

          const leaf = new THREE.Mesh(treeLeaf, leafMat.clone());
          leaf.position.set(world.x, 0.28, world.z);
          leaf.scale.setScalar(0.9 + ((x + z) % 4) * 0.08);
          leaf.castShadow = true;
          leaf.receiveShadow = true;

          this.decorRoot.add(trunk);
          this.decorRoot.add(leaf);
          continue;
        }

        if (adjacentRoad) {
          if (nearCommercial || nearCivic || nearResidential || nearUtility) {
            const sidewalk = new THREE.Mesh(
              new THREE.BoxGeometry(0.88, 0.018, 0.88),
              nearUtility ? pavingMat.clone() : sidewalkMat.clone()
            );
            sidewalk.position.set(world.x, 0.045, world.z);
            sidewalk.receiveShadow = true;
            this.decorRoot.add(sidewalk);

            const districtInset = new THREE.Mesh(
              new THREE.BoxGeometry(0.68, 0.014, 0.68),
              nearResidential
                ? lawnInsetMat.clone()
                : nearCommercial
                  ? pavingMat.clone()
                  : nearCivic
                    ? plazaMat.clone()
                    : gravelMat.clone()
            );
            districtInset.position.set(world.x, 0.053, world.z);
            districtInset.receiveShadow = true;
            this.decorRoot.add(districtInset);

            if (nearCommercial && (noise === 0 || noise === 1)) {
              const shelter = new THREE.Group();
              shelter.position.set(world.x, 0.05, world.z);
              const pad = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.16), sidewalkMat.clone());
              pad.position.y = 0.01;
              const roof = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.16), new THREE.MeshStandardMaterial({ color: 0x6e7f90, roughness: 0.78, metalness: 0.08 }));
              roof.position.y = 0.26;
              const postA = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.24, 0.02), utilityMat.clone());
              postA.position.set(-0.16, 0.13, 0);
              const postB = postA.clone();
              postB.position.x = 0.16;
              const sign = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.02), new THREE.MeshStandardMaterial({ color: 0x86b9da, roughness: 0.7, metalness: 0.04 }));
              sign.position.set(0.22, 0.16, 0);
              shelter.add(pad, roof, postA, postB, sign);
              this.decorRoot.add(shelter);
              const seat = new THREE.Mesh(
                new THREE.BoxGeometry(0.16, 0.03, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x8b6848, roughness: 0.82, metalness: 0.02 })
              );
              seat.position.set(world.x, 0.11, world.z);
              seat.castShadow = true;
              seat.receiveShadow = true;
              this.decorRoot.add(seat);
              const bikeRack = new THREE.Mesh(
                new THREE.TorusGeometry(0.06, 0.01, 8, 14),
                new THREE.MeshStandardMaterial({ color: 0x6d7c89, roughness: 0.72, metalness: 0.14 })
              );
              bikeRack.rotation.y = Math.PI / 2;
              bikeRack.position.set(world.x - 0.16, 0.08, world.z - 0.08);
              bikeRack.castShadow = true;
              bikeRack.receiveShadow = true;
              this.decorRoot.add(bikeRack);
              if (topTier >= 4) {
                const neon = new THREE.Mesh(
                  new THREE.BoxGeometry(0.32, 0.04, 0.04),
                  new THREE.MeshStandardMaterial({ color: 0xaed4f6, roughness: 0.3, metalness: 0.08, emissive: 0x38bdf8, emissiveIntensity: 0.2 })
                );
                neon.position.set(world.x, 0.34, world.z);
                neon.castShadow = true;
                neon.receiveShadow = true;
                this.decorRoot.add(neon);

                const cafePad = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.34), pavingMat.clone());
                cafePad.position.set(world.x, 0.055, world.z);
                cafePad.receiveShadow = true;
                this.decorRoot.add(cafePad);

                const umbrella = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.12, 0.16, 0.08, 10),
                  new THREE.MeshStandardMaterial({ color: 0xf8d088, roughness: 0.74, metalness: 0.02 })
                );
                umbrella.position.set(world.x, 0.27, world.z);
                umbrella.castShadow = true;
                umbrella.receiveShadow = true;
                this.decorRoot.add(umbrella);
                const cafeTable = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.06, 0.06, 0.07, 10),
                  new THREE.MeshStandardMaterial({ color: 0xd8c5a6, roughness: 0.82, metalness: 0.02 })
                );
                cafeTable.position.set(world.x - 0.1, 0.1, world.z + 0.08);
                cafeTable.castShadow = true;
                cafeTable.receiveShadow = true;
                this.decorRoot.add(cafeTable);
                const bin = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.035, 0.04, 0.1, 10),
                  new THREE.MeshStandardMaterial({ color: 0x6a7682, roughness: 0.72, metalness: 0.14 })
                );
                bin.position.set(world.x + 0.16, 0.08, world.z - 0.12);
                bin.castShadow = true;
                bin.receiveShadow = true;
                this.decorRoot.add(bin);

                if (topTier >= 5) {
                  const pylon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.44, 0.08),
                    new THREE.MeshStandardMaterial({ color: 0xe1f2ff, roughness: 0.24, metalness: 0.08, emissive: 0x38bdf8, emissiveIntensity: 0.18 })
                  );
                  pylon.position.set(world.x + 0.24, 0.24, world.z);
                  pylon.castShadow = true;
                  pylon.receiveShadow = true;
                  this.decorRoot.add(pylon);

                  const kiosk = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.16, 0.12),
                    new THREE.MeshStandardMaterial({ color: 0x7f8ea0, roughness: 0.72, metalness: 0.08 })
                  );
                  kiosk.position.set(world.x - 0.2, 0.14, world.z);
                  kiosk.castShadow = true;
                  kiosk.receiveShadow = true;
                  this.decorRoot.add(kiosk);

                  const newsstand = new THREE.Mesh(
                    new THREE.BoxGeometry(0.14, 0.18, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0x536a7d, roughness: 0.72, metalness: 0.08 })
                  );
                  newsstand.position.set(world.x + 0.12, 0.14, world.z - 0.16);
                  newsstand.castShadow = true;
                  newsstand.receiveShadow = true;
                  this.decorRoot.add(newsstand);
                  const dumpster = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.14, 0.12),
                    new THREE.MeshStandardMaterial({ color: 0x4d6760, roughness: 0.78, metalness: 0.12 })
                  );
                  dumpster.position.set(world.x - 0.16, 0.12, world.z + 0.18);
                  dumpster.castShadow = true;
                  dumpster.receiveShadow = true;
                  this.decorRoot.add(dumpster);
                }
              }
              if (topTier >= 4 && ((sides.e && sides.w) || (sides.n && sides.s)) && noise === 0) {
                addGatewayArch(world.x, world.z, sides.e && sides.w ? 0 : Math.PI / 2, 0x67e8f9);
              }
            } else if (nearCivic && (noise === 2 || noise === 3)) {
              const monument = new THREE.Group();
              monument.position.set(world.x, 0.045, world.z);
              const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 12), pavingMat.clone());
              base.position.y = 0.025;
              const obelisk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), new THREE.MeshStandardMaterial({ color: 0xc8cfd8, roughness: 0.82, metalness: 0.04 }));
              obelisk.position.y = 0.17;
              monument.add(base, obelisk);
              const rack = new THREE.Mesh(
                new THREE.TorusGeometry(0.05, 0.01, 8, 14),
                new THREE.MeshStandardMaterial({ color: 0x6d7c89, roughness: 0.72, metalness: 0.14 })
              );
              rack.rotation.y = Math.PI / 2;
              rack.position.set(-0.16, 0.08, -0.08);
              monument.add(rack);
              if (topTier >= 4) {
                const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), utilityMat.clone());
                lamp.position.set(0.18, 0.14, 0);
                const glow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffefbf, roughness: 0.3, metalness: 0.04, emissive: 0xffefbf, emissiveIntensity: 0.18 }));
                glow.position.set(0.18, 0.3, 0);
                monument.add(lamp, glow);
                if (topTier >= 5) {
                  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x8b6848, roughness: 0.82, metalness: 0.02 }));
                  bench.position.set(-0.18, 0.06, 0.06);
                  monument.add(bench);
                  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8), utilityMat.clone());
                  flagPole.position.set(0.02, 0.22, -0.16);
                  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.012), bannerMat.clone());
                  flag.position.set(0.08, 0.28, -0.16);
                  monument.add(flagPole, flag);
                  const pool = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.03, 0.12),
                    new THREE.MeshStandardMaterial({ color: 0xa8ddf5, roughness: 0.18, metalness: 0.06, transparent: true, opacity: 0.82, emissive: 0x38bdf8, emissiveIntensity: 0.08 })
                  );
                  pool.position.set(-0.02, 0.04, 0.16);
                  monument.add(pool);
                }
              }
              this.decorRoot.add(monument);
              if (topTier >= 4 && ((sides.e && sides.w) || (sides.n && sides.s)) && noise === 2) {
                addGatewayArch(world.x, world.z, sides.e && sides.w ? 0 : Math.PI / 2, 0xa78bfa);
              }
            } else if (nearResidential && noise === 4) {
              const driveway = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.014, 0.74), pavingMat.clone());
              driveway.position.set(world.x, 0.045, world.z);
              driveway.receiveShadow = true;
              if (sides.e || sides.w) driveway.rotation.y = Math.PI / 2;
              this.decorRoot.add(driveway);
              const hedge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.38), hedgeMat.clone());
              hedge.position.set(world.x + 0.22, 0.08, world.z - 0.08);
              hedge.castShadow = true;
              hedge.receiveShadow = true;
              this.decorRoot.add(hedge);
              const mailboxPost = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.12, 0.02),
                new THREE.MeshStandardMaterial({ color: 0x8b6848, roughness: 0.82, metalness: 0.02 })
              );
              mailboxPost.position.set(world.x - 0.18, 0.08, world.z + 0.12);
              const mailbox = new THREE.Mesh(
                new THREE.BoxGeometry(0.07, 0.05, 0.04),
                new THREE.MeshStandardMaterial({ color: 0x6d88a8, roughness: 0.72, metalness: 0.12 })
              );
              mailbox.position.set(world.x - 0.15, 0.13, world.z + 0.12);
              mailbox.castShadow = true;
              mailbox.receiveShadow = true;
              this.decorRoot.add(mailboxPost, mailbox);
              if (topTier >= 4) {
                const pocketGreen = new THREE.Mesh(
                  new THREE.BoxGeometry(0.34, 0.02, 0.2),
                  new THREE.MeshStandardMaterial({ color: 0x7faa74, roughness: 0.96, metalness: 0.01 })
                );
                pocketGreen.position.set(world.x, 0.055, world.z);
                pocketGreen.receiveShadow = true;
                this.decorRoot.add(pocketGreen);
                const walkPad = new THREE.Mesh(
                  new THREE.BoxGeometry(0.22, 0.02, 0.12),
                  new THREE.MeshStandardMaterial({ color: 0xe3d8c7, roughness: 0.9, metalness: 0.01 })
                );
                walkPad.position.set(world.x + 0.1, 0.055, world.z + 0.1);
                walkPad.receiveShadow = true;
                this.decorRoot.add(walkPad);
                addStreetTree(world.x - 0.18, world.z + 0.14, 0.68);
                const lamp = this.createStreetLamp(world.x + 0.14, 0.05, world.z - 0.1, 0, 0xffefbf);
                this.decorRoot.add(lamp);

                if (topTier >= 5) {
                  const seatingPad = new THREE.Mesh(
                    new THREE.BoxGeometry(0.26, 0.02, 0.16),
                    new THREE.MeshStandardMaterial({ color: 0xd7cfbf, roughness: 0.92, metalness: 0.01 })
                  );
                  seatingPad.position.set(world.x + 0.12, 0.055, world.z - 0.02);
                  seatingPad.receiveShadow = true;
                  this.decorRoot.add(seatingPad);
                  const bench = new THREE.Mesh(
                    new THREE.BoxGeometry(0.14, 0.04, 0.05),
                    new THREE.MeshStandardMaterial({ color: 0x8b6848, roughness: 0.82, metalness: 0.02 })
                  );
                  bench.position.set(world.x - 0.16, 0.08, world.z - 0.12);
                  bench.castShadow = true;
                  bench.receiveShadow = true;
                  this.decorRoot.add(bench);
                  const lowHedge = new THREE.Mesh(
                    new THREE.BoxGeometry(0.22, 0.08, 0.08),
                    hedgeMat.clone()
                  );
                  lowHedge.position.set(world.x + 0.18, 0.08, world.z + 0.1);
                  lowHedge.castShadow = true;
                  lowHedge.receiveShadow = true;
                  this.decorRoot.add(lowHedge);
                }
              }
            } else if (nearUtility && (noise === 6 || noise === 7)) {
              const yard = new THREE.Group();
              yard.position.set(world.x, 0.045, world.z);
              const crate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.82, metalness: 0.02 }));
              crate.position.y = 0.06;
              const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 10), utilityMat.clone());
              drum.position.set(0.14, 0.06, 0.04);
              yard.add(crate, drum);
              if (topTier >= 4) {
                const mast = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), utilityMat.clone());
                mast.position.set(-0.14, 0.21, -0.04);
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.72, metalness: 0.12 }));
                beam.position.set(-0.04, 0.38, -0.04);
                yard.add(mast, beam);
                const fence = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.02), utilityMat.clone());
                fence.position.set(0, 0.08, 0.18);
                yard.add(fence);
                if (nearPower) {
                  const transformer = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.16, 0.12),
                    new THREE.MeshStandardMaterial({ color: 0x97a6b2, roughness: 0.74, metalness: 0.12 })
                  );
                  transformer.position.set(-0.08, 0.1, -0.12);
                  yard.add(transformer);
                  const beacon = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.025, 0.03, 0.14, 10),
                    new THREE.MeshStandardMaterial({ color: 0xfff1d4, roughness: 0.24, metalness: 0.08, emissive: 0xf59e0b, emissiveIntensity: 0.2 })
                  );
                  beacon.position.set(0.14, 0.1, -0.08);
                  yard.add(beacon);
                }
                if (nearWorkshop) {
                  const pallet = new THREE.Mesh(
                    new THREE.BoxGeometry(0.18, 0.04, 0.14),
                    new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.82, metalness: 0.02 })
                  );
                  pallet.position.set(0.08, 0.02, -0.14);
                  const cone = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.04, 0.12, 8),
                    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.68, metalness: 0.04 })
                  );
                  cone.position.set(0.18, 0.06, 0.08);
                  const forkliftBody = new THREE.Mesh(
                    new THREE.BoxGeometry(0.14, 0.1, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0xd99b43, roughness: 0.72, metalness: 0.1 })
                  );
                  forkliftBody.position.set(-0.12, 0.08, 0.1);
                  const fork = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08, 0.02, 0.08),
                    new THREE.MeshStandardMaterial({ color: 0x5b6570, roughness: 0.76, metalness: 0.18 })
                  );
                  fork.position.set(-0.04, 0.04, 0.1);
                  yard.add(pallet, cone, forkliftBody, fork);
                }
              }
              this.decorRoot.add(yard);
            } else if (nearCommercial || nearCivic) {
              addStreetTree(world.x + 0.18, world.z - 0.18, 0.92);
              if (nearCommercial && topTier >= 4) {
                const plazaTile = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.28), pavingMat.clone());
                plazaTile.position.set(world.x - 0.12, 0.055, world.z + 0.08);
                plazaTile.receiveShadow = true;
                this.decorRoot.add(plazaTile);
              }
              if (nearCivic && topTier >= 4) {
                const routePole = new THREE.Mesh(
                  new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8),
                  utilityMat.clone()
                );
                routePole.position.set(world.x - 0.18, 0.16, world.z + 0.16);
                const routePlate = new THREE.Mesh(
                  new THREE.BoxGeometry(0.08, 0.12, 0.02),
                  bannerMat.clone()
                );
                routePlate.position.set(world.x - 0.18, 0.26, world.z + 0.16);
                routePlate.castShadow = true;
                routePlate.receiveShadow = true;
                this.decorRoot.add(routePole, routePlate);
              }
            }
            continue;
          }

          if (noise === 0 || noise === 1) {
            const shrub = new THREE.Mesh(shrubGeom, shrubMat.clone());
            shrub.position.set(world.x + (noise === 0 ? -0.18 : 0.18), 0.06, world.z + 0.18);
            shrub.scale.set(1.1, 0.7, 0.95);
            shrub.castShadow = true;
            shrub.receiveShadow = true;
            this.decorRoot.add(shrub);
          }
          continue;
        }

        if (noise === 2 || noise === 3 || noise === 4) {
          const shrub = new THREE.Mesh(shrubGeom, shrubMat.clone());
          shrub.position.set(world.x + (((x + z) % 3) - 1) * 0.14, 0.055, world.z + (((x * 2 + z) % 3) - 1) * 0.12);
          shrub.scale.set(1.2, 0.72, 1.05);
          shrub.castShadow = true;
          shrub.receiveShadow = true;
          this.decorRoot.add(shrub);
        }

        if (noise === 5 || noise === 6) {
          const patch = new THREE.Group();
          patch.position.set(world.x, 0.045, world.z);
          for (let i = 0; i < 3; i += 1) {
            const flower = new THREE.Mesh(flowerGeom, flowerMats[(x + z + i) % flowerMats.length]);
            flower.position.set(-0.09 + i * 0.08, 0.01 + i * 0.006, ((x + i) % 2 === 0 ? -0.04 : 0.04));
            flower.scale.setScalar(0.9 + i * 0.12);
            flower.castShadow = true;
            flower.receiveShadow = true;
            patch.add(flower);
          }
          this.decorRoot.add(patch);
        }
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
