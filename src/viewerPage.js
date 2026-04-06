import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const PROGRAM_DEFS = [
  {
    key: "buildings",
    label: "Buildings",
    file: "/models/Buildings.gltf",
    color: "#6c6c6c",
    explode: 0.0,
    info: "Surrounding urban context and skyline massing.",
    baseOpacity: 0.22
  },
  {
    key: "ground",
    label: "Ground",
    file: "/models/Ground.gltf",
    color: "#2f2f34",
    explode: 0.0,
    info: "Site ground, base topography, and supporting platform surface.",
    baseOpacity: 0.82
  },
  {
    key: "highline",
    label: "Highline",
    file: "/models/Highline.gltf",
    color: "#efefef",
    explode: 0.18,
    info: "The High Line connection and elevated pedestrian approach.",
    baseOpacity: 1.0
  },
  {
    key: "platform",
    label: "Platform",
    file: "/models/Platform.gltf",
    color: "#b8b8b8",
    explode: 0.32,
    info: "Elevated access platform linking the High Line and museum entry.",
    baseOpacity: 0.95
  },
  {
    key: "circulation",
    label: "Circulation",
    file: "/models/Circulation.gltf",
    color: "#f8c7ff",
    explode: 0.7,
    info: "Internal circulation, route logic, and movement spine.",
    baseOpacity: 1.0
  },
  {
    key: "core_engine",
    label: "Core Engine",
    file: "/models/Core_Engine.gltf",
    color: "#ffe066",
    explode: 1.15,
    info: "Central scanning theater and avatar-generation core.",
    baseOpacity: 1.0
  },
  {
    key: "media_maze",
    label: "Media Maze",
    file: "/models/Media_Maze.gltf",
    color: "#95e7ff",
    explode: 1.6,
    info: "Public media maze / game plaza at the lower level.",
    baseOpacity: 1.0
  },
  {
    key: "pixel_gallery",
    label: "Pixel Gallery",
    file: "/models/Pixel_Gallery.gltf",
    color: "#ff8ad8",
    explode: 2.05,
    info: "Pixel-based themed gallery environment.",
    baseOpacity: 1.0
  },
  {
    key: "anime_gallery",
    label: "Anime Gallery",
    file: "/models/Anime_Gallery.gltf",
    color: "#b388ff",
    explode: 2.5,
    info: "Anime-themed scenario gallery and identity transformation zone.",
    baseOpacity: 1.0
  },
  {
    key: "gallery_3d",
    label: "3D Gallery",
    file: "/models/3D_Gallery.gltf",
    color: "#7af0b5",
    explode: 2.95,
    info: "3D / volumetric media gallery and spatial interaction zone.",
    baseOpacity: 1.0
  }
];

const LEGEND_ITEMS = [
  {
    key: "context",
    label: "Context",
    color: "#6c6c6c",
    match: ["buildings", "ground", "highline", "platform"],
    info: "Urban context, site ground, and the High Line access framework."
  },
  {
    key: "circulation",
    label: "Circulation",
    color: "#f8c7ff",
    match: ["circulation"],
    info: "Movement spine, transitions, and route sequence through the museum."
  },
  {
    key: "core_engine",
    label: "Core Engine",
    color: "#ffe066",
    match: ["core_engine"],
    info: "Central scanning chamber where the visitor avatar is generated."
  },
  {
    key: "media_maze",
    label: "Media Maze",
    color: "#95e7ff",
    match: ["media_maze"],
    info: "Public media maze / game plaza forming the open lower-level field."
  },
  {
    key: "pixel_gallery",
    label: "Pixel Gallery",
    color: "#ff8ad8",
    match: ["pixel_gallery"],
    info: "Gallery zone based on pixel logic and stylized media worlds."
  },
  {
    key: "anime_gallery",
    label: "Anime Gallery",
    color: "#b388ff",
    match: ["anime_gallery"],
    info: "Anime-themed gallery world with a distinct media identity."
  },
  {
    key: "gallery_3d",
    label: "3D Gallery",
    color: "#7af0b5",
    match: ["gallery_3d"],
    info: "3D media gallery focused on volumetric and spatial interaction."
  }
];

const LEGEND_KEY_TO_ITEM = new Map(LEGEND_ITEMS.map((item) => [item.key, item]));

const BG = 0xffffff;
const TARGET_Y = 0.9;

const HORIZON_SIZE = 100;
const HORIZON_DENSITY = 90;
const HORIZON_COLOR = 0xd8d8d8;
const HORIZON_OPACITY = 0.32;
const HORIZON_Y_OFFSET = 0.015;

const MIN_POLAR = 0.42;
const MAX_POLAR = 1.35;

const MIN_RADIUS = 1.5;
const MAX_RADIUS = 400;
const AUTO_SPEED = 0.0022;
const EXPLODE_SCALE = 20;
const ZOOM_SENSITIVITY = 0.12;
const DRAG_SPEED = 0.18;

const ACTIVE_COLOR_MIX = 0.38;
const ACTIVE_EMISSIVE = 0.2;
const DIM_OPACITY = 0.06;
const DIM_EMISSIVE = 0.0;

const EDITABLE_KEYS = new Set([]);

const DRAG_MODES = {
  UV: "uv",
  VERTICAL: "vertical",
  FREE: "free"
};

export function startViewerPage(container) {
  document.body.dataset.theme = "light";

  const root = document.createElement("div");
  root.className = "page viewer-page";
  root.style.position = "relative";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.overflow = "hidden";
  container.appendChild(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(
    42,
    container.clientWidth / container.clientHeight,
    0.01,
    2000
  );

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  root.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e9e9, 1.15));

  const dir1 = new THREE.DirectionalLight(0xffffff, 1.15);
  dir1.position.set(5, 8, 6);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0xffffff, 0.55);
  dir2.position.set(-4, 3, -5);
  scene.add(dir2);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.95,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const horizon = createHorizonPlane()
  horizon.position.y = ground.position.y - 0.02
  scene.add(horizon)

  const ui = document.createElement("div");
  ui.className = "ui viewer-ui";
  ui.innerHTML = `
    <div class="viewer-topbar">
      <div class="viewer-title-wrap">
        <div class="viewer-kicker">GAME MUSEUM</div>
        <div class="viewer-title">Game Museum Program Viewer</div>
      </div>
      <div class="viewer-topbar-right">Turntable / Exploded Axon / Program Highlight</div>
    </div>

    <div class="viewer-sidepanel">
      <div class="viewer-panel-block">
        <div class="viewer-panel-label">Explode</div>
        <input id="explode-slider" type="range" min="0" max="1" step="0.001" value="0" />
      </div>

      <div class="viewer-panel-block">
        <div class="viewer-panel-label">Move Mode</div>
        <div class="viewer-mode-group">
          <button class="viewer-mode-btn is-active" data-mode="uv">UV Plane</button>
          <button class="viewer-mode-btn" data-mode="vertical">Vertical</button>
          <button class="viewer-mode-btn" data-mode="free">Free Move</button>
        </div>
        <div class="viewer-info" style="margin-top:8px;">
          Hold <kbd>Alt</kbd> and drag editable gallery volumes.
        </div>
      </div>

      <div class="viewer-panel-block">
        <div class="viewer-panel-label">Selected</div>
        <div id="viewer-selected" class="viewer-selected">None</div>
      </div>

      <div class="viewer-panel-block">
        <div class="viewer-panel-label">Info</div>
        <div id="viewer-info" class="viewer-info">
          Hover a legend item to highlight a program. Click to lock. Hold Alt and drag editable gallery volumes.
        </div>
      </div>

      <div class="viewer-panel-block viewer-hint-block">
        <div><kbd>Drag</kbd> orbit</div>
        <div><kbd>Wheel</kbd> zoom</div>
        <div><kbd>Right Drag</kbd> pan</div>
        <div><kbd>Alt + Drag</kbd> move editable mass</div>
        <div><kbd>Space</kbd> play / pause</div>
        <div><kbd>R</kbd> reset</div>
      </div>
    </div>


    <div class="viewer-legend-wrap">
      <div class="viewer-legend-title">Programs</div>
      <div id="viewer-legend" class="viewer-legend"></div>
    </div>
  `;
  root.appendChild(ui);

  const legendEl = ui.querySelector("#viewer-legend");
  const sliderEl = ui.querySelector("#explode-slider");
  const selectedEl = ui.querySelector("#viewer-selected");
  const infoEl = ui.querySelector("#viewer-info");
  const modeButtons = ui.querySelectorAll(".viewer-mode-btn");

  const loader = new GLTFLoader();
  const groups = [];

  const state = {
    target: new THREE.Vector3(0, TARGET_Y, 0),
    center: new THREE.Vector3(0, TARGET_Y, 0),

    radius: 8,
    targetRadius: 8,
    theta: Math.PI * 0.25,
    phi: 1.0,

    autoRotate: true,
    isDragging: false,
    dragButton: 0,

    explodeT: 0,
    targetExplodeT: 0,

    hoverKey: null,
    lockedKey: null,

    moveMode: DRAG_MODES.UV,
    dragTarget: null,
    isObjectDragging: false
  };

  const pointer = {
    lastX: 0,
    lastY: 0
  };

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const dragPlane = new THREE.Plane();
  const dragPoint = new THREE.Vector3();
  const dragStart = new THREE.Vector3();
  const dragObjectStart = new THREE.Vector3();

  const tmpSpherePos = new THREE.Vector3();
  const tmpBox = new THREE.Box3();
  const tmpSize = new THREE.Vector3();
  const tmpCenter = new THREE.Vector3();
  const tmpVec = new THREE.Vector3();
  const tmpCamDir = new THREE.Vector3();
  const tmpPlaneNormal = new THREE.Vector3();

  function getActiveProgramKeys() {
    const activeLegendKey = state.lockedKey || state.hoverKey;
    if (!activeLegendKey) return null;

    const item = LEGEND_KEY_TO_ITEM.get(activeLegendKey);
    return item ? item.match : null;
  }

  function buildLegend() {
    legendEl.innerHTML = "";

    for (const item of LEGEND_ITEMS) {
      const btn = document.createElement("button");
      btn.className = "viewer-legend-item";
      btn.dataset.key = item.key;
      btn.innerHTML = `
        <span class="viewer-legend-swatch" style="background:${item.color}"></span>
        <span class="viewer-legend-text">${item.label}</span>
      `;

      btn.addEventListener("mouseenter", () => {
        if (state.lockedKey) return;
        state.hoverKey = item.key;
        selectedEl.textContent = item.label;
        infoEl.textContent = item.info;
        updateLegendClasses();
      });

      btn.addEventListener("mouseleave", () => {
        if (state.lockedKey) return;
        state.hoverKey = null;
        selectedEl.textContent = "None";
        infoEl.textContent =
          "Hover a legend item to highlight a program. Click to lock. Hold Alt and drag editable gallery volumes.";
        updateLegendClasses();
      });

      btn.addEventListener("click", () => {
        if (state.lockedKey === item.key) {
          state.lockedKey = null;
          state.hoverKey = null;
          selectedEl.textContent = "None";
          infoEl.textContent =
            "Hover a legend item to highlight a program. Click to lock. Hold Alt and drag editable gallery volumes.";
        } else {
          state.lockedKey = item.key;
          state.hoverKey = item.key;
          selectedEl.textContent = item.label;
          infoEl.textContent = item.info;
        }
        updateLegendClasses();
      });

      legendEl.appendChild(btn);
    }
  }

  function updateLegendClasses() {
    const activeKey = state.lockedKey || state.hoverKey;

    legendEl.querySelectorAll(".viewer-legend-item").forEach((el) => {
      const isOn = el.dataset.key === activeKey;
      el.classList.toggle("is-active", !!activeKey && isOn);
      el.classList.toggle("is-dim", !!activeKey && !isOn);
    });
  }

  function createHorizonPlane() {

    const count = HORIZON_DENSITY * HORIZON_DENSITY
    const positions = new Float32Array(count * 3)

    let i = 0

    for (let x = 0; x < HORIZON_DENSITY; x++) {
      for (let z = 0; z < HORIZON_DENSITY; z++) {

        const px =
          (x / (HORIZON_DENSITY - 1) - 0.5) * HORIZON_SIZE

        const pz =
          (z / (HORIZON_DENSITY - 1) - 0.5) * HORIZON_SIZE

        positions[i++] = px
        positions[i++] = 0
        positions[i++] = pz
      }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    )

    const material = new THREE.PointsMaterial({
      color: HORIZON_COLOR,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: HORIZON_OPACITY,
      depthWrite: false
    })

    const points = new THREE.Points(geometry, material)

    return points
  }

  function cloneAsStandard(sourceMat, colorHex) {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.72,
      metalness: 0.02
    });

    mat.userData.baseColor = new THREE.Color(colorHex);
    return mat;
  }

  function tintObject(rootObj, colorHex) {
    rootObj.traverse((o) => {
      if (!o.isMesh) return;

      let mat = o.material;
      if (Array.isArray(mat)) {
        mat = mat.map((m) => cloneAsStandard(m, colorHex));
        o.material = mat;
      } else {
        o.material = cloneAsStandard(mat, colorHex);
      }
    });
  }

  function prepareEditablePieces(rootObj, groupKey) {
    rootObj.traverse((o) => {
      if (!o.isObject3D) return;
      o.userData.groupKey = groupKey;
    });

    rootObj.children.forEach((child) => {
      let hasMeshDescendant = false;

      child.traverse((o) => {
        if (o.isMesh) hasMeshDescendant = true;
      });

      if (!hasMeshDescendant) return;

      child.userData.isEditablePiece = true;
      child.userData.userOffset = new THREE.Vector3();
      child.userData.basePosition = child.position.clone();
    });
  }

  function setVisualRecursive(rootObj, opts = {}) {
    const {
      opacity = 1,
      emissiveBoost = 0,
      active = false
    } = opts;

    rootObj.traverse((o) => {
      if (!o.isMesh) return;

      const mats = Array.isArray(o.material) ? o.material : [o.material];

      mats.forEach((m) => {
        if (!m) return;

        const baseColor = m.userData.baseColor
          ? m.userData.baseColor.clone()
          : m.color.clone();

        m.color.copy(baseColor);

        if (active) {
          m.color.lerp(new THREE.Color(0xffffff), ACTIVE_COLOR_MIX);
        }

        m.transparent = opacity < 0.999;
        m.opacity = opacity;

        if ("emissive" in m) {
          if (active) {
            m.emissive.copy(baseColor).multiplyScalar(emissiveBoost);
          } else {
            m.emissive.setScalar(0);
          }
        }
      });
    });
  }

  function applyHighlightState() {
    const activeProgramKeys = getActiveProgramKeys();

    for (const g of groups) {
      if (!g.object) continue;

      const baseOpacity = g.baseOpacity ?? 1.0;

      if (!activeProgramKeys) {
        setVisualRecursive(g.object, {
          opacity: baseOpacity,
          emissiveBoost: 0,
          active: false
        });
      } else if (activeProgramKeys.includes(g.key)) {
        setVisualRecursive(g.object, {
          opacity: 1.0,
          emissiveBoost: ACTIVE_EMISSIVE,
          active: true
        });
      } else {
              const isContext =
                g.key === "buildings" ||
                g.key === "ground" ||
                g.key === "highline" ||
                g.key === "platform";

              setVisualRecursive(g.object, {
                opacity: isContext ? Math.max(g.baseOpacity, 0.18) : DIM_OPACITY,
                emissiveBoost: DIM_EMISSIVE,
                active: false
              });
            }
          }
        }

  function applyExplode() {
    for (const g of groups) {
      if (!g.object) continue;

      g.object.position.copy(g.basePosition);
      g.object.position.add(g.userOffset);
      g.object.position.y += g.explodeDistance * EXPLODE_SCALE * state.explodeT;

      if (g.editable) {
        g.object.traverse((o) => {
          if (!o.userData || !o.userData.isEditablePiece) return;

          o.position.copy(o.userData.basePosition);
          o.position.add(o.userData.userOffset);
        });
      }
    }
  }

  function resetView() {
    state.lockedKey = null;
    state.hoverKey = null;
    state.targetExplodeT = 0;
    selectedEl.textContent = "None";
    infoEl.textContent =
      "Hover a legend item to highlight a program. Click to lock. Hold Alt and drag editable gallery volumes.";

    for (const g of groups) {
      g.userOffset.set(0, 0, 0);

      if (g.editable) {
        g.object.traverse((o) => {
          if (o.userData && o.userData.isEditablePiece) {
            o.userData.userOffset.set(0, 0, 0);
          }
        });
      }
    }

    updateLegendClasses();
  }

  function updateMouse(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function findEditableGroupFromObject(obj) {
    let current = obj;
    while (current) {
      const found = groups.find((g) => g.object === current && g.editable);
      if (found) return found;
      current = current.parent;
    }
    return null;
  }

  function findEditablePieceFromObject(obj) {
    let current = obj;
    while (current) {
      if (current.userData && current.userData.isEditablePiece) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  function setDragPlaneForGroup(group) {
    const worldPos = tmpVec.copy(group.object.position);

    if (state.moveMode === DRAG_MODES.UV) {
      dragPlane.set(new THREE.Vector3(0, 1, 0), -worldPos.y);
      return;
    }

    if (state.moveMode === DRAG_MODES.VERTICAL) {
      camera.getWorldDirection(tmpCamDir);
      tmpPlaneNormal.set(tmpCamDir.x, 0, tmpCamDir.z);
      if (tmpPlaneNormal.lengthSq() < 1e-6) {
        tmpPlaneNormal.set(1, 0, 0);
      } else {
        tmpPlaneNormal.normalize();
      }
      dragPlane.setFromNormalAndCoplanarPoint(tmpPlaneNormal, worldPos);
      return;
    }

    camera.getWorldDirection(tmpCamDir);
    dragPlane.setFromNormalAndCoplanarPoint(tmpCamDir, worldPos);
  }

  async function loadPrograms() {
    const loaded = await Promise.all(
      PROGRAM_DEFS.map(
        (def) =>
          new Promise((resolve, reject) => {
            loader.load(
              def.file,
              (gltf) => resolve({ def, scene: gltf.scene }),
              undefined,
              (err) => reject({ def, err })
            );
          })
      )
    );

    const allBox = new THREE.Box3();

    for (const item of loaded) {
      const { def, scene: obj } = item;

      tintObject(obj, def.color);
      scene.add(obj);

      tmpBox.setFromObject(obj);
      if (!tmpBox.isEmpty()) {
        allBox.union(tmpBox);
      }

      const editable = EDITABLE_KEYS.has(def.key);

      if (editable) {
        prepareEditablePieces(obj, def.key);
      }

      groups.push({
        key: def.key,
        label: def.label,
        info: def.info,
        object: obj,
        basePosition: obj.position.clone(),
        userOffset: new THREE.Vector3(),
        explodeDistance: def.explode,
        baseOpacity: def.baseOpacity ?? 1.0,
        editable
      });
    }

    if (!allBox.isEmpty()) {
      allBox.getCenter(tmpCenter);
      allBox.getSize(tmpSize);

      state.center.copy(tmpCenter);
      state.target.set(tmpCenter.x, tmpCenter.y, tmpCenter.z);

      const maxDim = Math.max(tmpSize.x, tmpSize.y, tmpSize.z);
      horizon.scale.setScalar(maxDim * 3.5);
      state.radius = Math.max(7.5, maxDim * 1.9);
      state.targetRadius = state.radius;

      ground.position.y = allBox.min.y - 0.03;
      ground.position.x = tmpCenter.x;
      ground.position.z = tmpCenter.z;

      horizon.position.y = ground.position.y + HORIZON_Y_OFFSET;
      horizon.position.x = tmpCenter.x;
      horizon.position.z = tmpCenter.z;

      camera.near = Math.max(0.01, maxDim / 300);
      camera.far = Math.max(200, maxDim * 80);
      camera.updateProjectionMatrix();
    }

    applyExplode();
    applyHighlightState();
  }

  function updateCamera() {
    const sinPhi = Math.sin(state.phi);

    tmpSpherePos.set(
      state.target.x + state.radius * sinPhi * Math.sin(state.theta),
      state.target.y + state.radius * Math.cos(state.phi),
      state.target.z + state.radius * sinPhi * Math.cos(state.theta)
    );

    camera.position.copy(tmpSpherePos);
    camera.lookAt(state.target);
  }

  function onPointerDown(e) {
    updateMouse(e);

    if (e.altKey && e.button === 0) {
      raycaster.setFromCamera(mouse, camera);

      const editableMeshes = [];
      for (const g of groups) {
        if (!g.editable) continue;
        g.object.traverse((o) => {
          if (o.isMesh) editableMeshes.push(o);
        });
      }

      const hits = raycaster.intersectObjects(editableMeshes, true);

      if (hits.length > 0) {
        const pickedPiece = findEditablePieceFromObject(hits[0].object);
        const pickedGroup = findEditableGroupFromObject(hits[0].object);

        if (pickedPiece && pickedGroup) {
          state.dragTarget = pickedPiece;
          state.isObjectDragging = true;
          state.isDragging = false;
          state.autoRotate = false;

          dragObjectStart.copy(pickedPiece.userData.userOffset);
          setDragPlaneForGroup(pickedGroup);

          if (raycaster.ray.intersectPlane(dragPlane, dragStart)) {
            selectedEl.textContent = pickedGroup.label;
            infoEl.textContent = `${pickedGroup.label} — Alt-drag piece editing mode.`;
            return;
          }

          state.dragTarget = null;
          state.isObjectDragging = false;
        }
      }
    }

    state.isDragging = true;
    state.dragButton = e.button;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    state.autoRotate = false;
  }

  function onPointerMove(e) {
    updateMouse(e);

    if (state.isObjectDragging && state.dragTarget) {
      raycaster.setFromCamera(mouse, camera);

      if (raycaster.ray.intersectPlane(dragPlane, dragPoint)) {
        const delta = tmpVec
          .subVectors(dragPoint, dragStart)
          .multiplyScalar(DRAG_SPEED);

        const target = state.dragTarget;
        const startOffset = dragObjectStart;

        if (state.moveMode === DRAG_MODES.UV) {
          target.userData.userOffset.set(
            startOffset.x + delta.x,
            startOffset.y,
            startOffset.z + delta.z
          );
        } else if (state.moveMode === DRAG_MODES.VERTICAL) {
          target.userData.userOffset.set(
            startOffset.x,
            startOffset.y + delta.y,
            startOffset.z
          );
        } else {
          target.userData.userOffset.set(
            startOffset.x + delta.x,
            startOffset.y + delta.y,
            startOffset.z + delta.z
          );
        }
      }
      return;
    }

    if (!state.isDragging) return;

    const dx = e.clientX - pointer.lastX;
    const dy = e.clientY - pointer.lastY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;

    if (state.dragButton === 2) {
      const panScale = state.radius * 0.0018;
      state.target.x -= dx * panScale;
      state.target.z += dy * panScale;
    } else {
      state.theta -= dx * 0.006;
      state.phi -= dy * 0.006;
      state.phi = THREE.MathUtils.clamp(state.phi, MIN_POLAR, MAX_POLAR);
    }
  }

  function onPointerUp() {
    if (state.isObjectDragging) {
      state.isObjectDragging = false;
      state.dragTarget = null;
    }

    state.isDragging = false;
  }

  function onWheel(e) {
    e.preventDefault();

    const dir = Math.sign(e.deltaY);
    if (dir === 0) return;

    const step = Math.max(0.35, state.targetRadius * ZOOM_SENSITIVITY);

    if (dir < 0) {
      state.targetRadius -= step;
    } else {
      state.targetRadius += step;
    }

    state.targetRadius = THREE.MathUtils.clamp(
      state.targetRadius,
      MIN_RADIUS,
      MAX_RADIUS
    );
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  function onKeyDown(e) {
    const key = e.key.toLowerCase();

    if (key === " ") {
      e.preventDefault();
      state.autoRotate = !state.autoRotate;
    }

    if (key === "r") {
      resetView();
    }
  }

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  renderer.domElement.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  sliderEl.addEventListener("input", (e) => {
    state.targetExplodeT = parseFloat(e.target.value);
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.moveMode = btn.dataset.mode;
    });
  });

  buildLegend();
  onResize();
  updateCamera();

  let raf = 0;
  let disposed = false;

  loadPrograms().catch((err) => {
    console.error("Program load failed:", err);
    infoEl.textContent =
      "One or more glTF files failed to load. Check file names and /public/models path.";
  });

  function animate() {
    if (disposed) return;
    raf = requestAnimationFrame(animate);

    if (state.autoRotate && !state.isDragging && !state.isObjectDragging) {
      state.theta += AUTO_SPEED;
    }

    state.radius = THREE.MathUtils.lerp(state.radius, state.targetRadius, 0.18);
    state.explodeT = THREE.MathUtils.lerp(
      state.explodeT,
      state.targetExplodeT,
      0.08
    );

    applyExplode();
    applyHighlightState();
    updateCamera();
    renderer.render(scene, camera);
  }

  animate();

  return function stop() {
    disposed = true;
    cancelAnimationFrame(raf);

    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("wheel", onWheel);
    renderer.domElement.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);

    scene.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        if (o.material) {
          if (Array.isArray(o.material)) {
            o.material.forEach((m) => m.dispose?.());
          } else {
            o.material.dispose?.();
          }
        }
      }
    });

    renderer.dispose();
    root.remove();
  };
}