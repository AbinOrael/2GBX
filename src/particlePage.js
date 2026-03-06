import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

/* ============================================================
   Program-based particle page
   ============================================================ */

const PROGRAM_DEFS = [
  {
    key: "structure",
    label: "Structure",
    file: "/models/structure.gltf",
    color: "#cfcfcf"
  },
  {
    key: "columns",
    label: "Columns",
    file: "/models/columns.gltf",
    color: "#a8a8a8"
  },
  {
    key: "circulation",
    label: "Circulation",
    file: "/models/circulation.gltf",
    color: "#ffd24a"
  },
  {
    key: "public",
    label: "Public",
    file: "/models/public.gltf",
    color: "#ff9f43"
  },
  {
    key: "civic",
    label: "Civic",
    file: "/models/civic.gltf",
    color: "#ff6b6b"
  },
  {
    key: "guest_center",
    label: "Guest Center",
    file: "/models/guest_center.gltf",
    color: "#7bed9f"
  },
  {
    key: "optical_gallery",
    label: "Optical Gallery",
    file: "/models/optical_gallery.gltf",
    color: "#21d4ff"
  },
  {
    key: "immersive_field",
    label: "Immersive Field",
    file: "/models/immersive_field.gltf",
    color: "#00d2d3"
  },
  {
    key: "frame_gallery_type_a",
    label: "Frame Gallery A",
    file: "/models/frame_gallery_type_a.gltf",
    color: "#6c5ce7"
  },
  {
    key: "frame_gallery_type_b",
    label: "Frame Gallery B",
    file: "/models/frame_gallery_type_b.gltf",
    color: "#8c7ae6"
  },
  {
    key: "volumetric_gallery_type_a",
    label: "Volumetric Gallery A",
    file: "/models/volumetric_gallery_type_a.gltf",
    color: "#ff4fd8"
  },
  {
    key: "volumetric_gallery_type_b",
    label: "Volumetric Gallery B",
    file: "/models/volumetric_gallery_type_b.gltf",
    color: "#ff79c6"
  }
];

const LEGEND_ITEMS = [
  {
    key: "circulation",
    label: "Circulation",
    color: "#ffd24a",
    match: ["circulation"]
  },
  {
    key: "public",
    label: "Public",
    color: "#ff9f43",
    match: ["public"]
  },
  {
    key: "civic",
    label: "Civic",
    color: "#ff6b6b",
    match: ["civic"]
  },
  {
    key: "guest_center",
    label: "Guest Center",
    color: "#7bed9f",
    match: ["guest_center"]
  },
  {
    key: "optical_gallery",
    label: "Optical Gallery",
    color: "#21d4ff",
    match: ["optical_gallery"]
  },
  {
    key: "immersive_field",
    label: "Immersive Field",
    color: "#00d2d3",
    match: ["immersive_field"]
  },
  {
    key: "frame_gallery",
    label: "Frame Gallery",
    color: "#6c5ce7",
    match: ["frame_gallery_type_a", "frame_gallery_type_b"]
  },
  {
    key: "volumetric_gallery",
    label: "Volumetric Gallery",
    color: "#ff4fd8",
    match: ["volumetric_gallery_type_a", "volumetric_gallery_type_b"]
  }
];

const PROGRAM_KEY_TO_LEGEND_KEY = new Map();
for (const item of LEGEND_ITEMS) {
  item.match.forEach((programKey) => PROGRAM_KEY_TO_LEGEND_KEY.set(programKey, item.key));
}

/* ============================================================
   Tuning
   ============================================================ */

const TOTAL_POINTS = 42000;
const SPREAD = 20;

const PRESS_SPEED = 0.08;
const RELEASE_SPEED = 0.08;

const HOVER_RADIUS_PX = 120;
const HOVER_SOFTNESS = 0.0022;

const FACING_MIN = 0.0;
const FACING_MAX = 0.5;

const BG_COLOR = 0x05050a;
const DOT_SIZE = 2;
const GLOW_SIZE = 5;
const DOT_OPACITY = 0.85;
const GLOW_OPACITY = 0.11;

const SHOW_UI = true;

const DIM_FACTOR = 0.12;
const BRIGHT_FACTOR = 1.28;

/* ============================================================ */

function makeDotTexture(size = 96) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const r = size / 2;

  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.95)");
  g.addColorStop(0.55, "rgba(255,255,255,0.35)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function easeSmooth(t) {
  t = THREE.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function smoothstep(x, edge0, edge1) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function computeMeshArea(mesh) {
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const idx = geom.index;

  let area = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const ia = idx.getX(i);
      const ib = idx.getX(i + 1);
      const ic = idx.getX(i + 2);
      a.fromBufferAttribute(pos, ia);
      b.fromBufferAttribute(pos, ib);
      c.fromBufferAttribute(pos, ic);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      area += cross.length() * 0.5;
    }
  } else {
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, i + 1);
      c.fromBufferAttribute(pos, i + 2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      area += cross.length() * 0.5;
    }
  }

  return area;
}

function hexToColor(hex) {
  return new THREE.Color(hex);
}

export function startParticlePage(mountEl) {
  if (!mountEl) throw new Error("startParticlePage(mountEl) needs a DOM element.");

  document.body.dataset.theme = "dark";

  const root = document.createElement("div");
  root.className = "page particle-page";
  root.style.position = "relative";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.overflow = "hidden";
  mountEl.appendChild(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG_COLOR);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  root.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.6;

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  let ui = null;
  let legendCard = null;

  if (SHOW_UI) {
    const legendItemsHTML = LEGEND_ITEMS.map(
      (item) => `
        <div class="legend-item" data-key="${item.key}">
          <span class="swatch" style="background:${item.color}"></span>
          <span class="legend-label">${item.label}</span>
        </div>
      `
    ).join("");

    ui = document.createElement("div");
    ui.className = "ui";
    ui.innerHTML = `
      <div class="card title">
        <h1>Media Nexus</h1>
        <p>Hold to gather • Hover to scan • Drag to orbit</p>
      </div>

      <div class="card hint">
        <div style="margin-bottom:8px;">
          <kbd>Drag</kbd> rotate &nbsp; <kbd>Wheel</kbd> zoom &nbsp; <kbd>Shift+Drag</kbd> pan
        </div>
        <div>
          <kbd>Hold mouse</kbd> global reveal &nbsp; <kbd>Hover legend</kbd> program highlight
        </div>
      </div>

      <div class="card legend-card">
        <div class="legend-title">Program Legend</div>
        <div class="legend-grid">
          ${legendItemsHTML}
        </div>
      </div>
    `;
    root.appendChild(ui);

    legendCard = ui.querySelector(".legend-card");
    if (legendCard) legendCard.style.pointerEvents = "auto";
  }

  let mouseDown = false;
  const mouse = new THREE.Vector2(0, 0);
  let globalForm = 0;

  let activeLegendKey = null;
  let lockedLegendKey = null;
  let baseColors = null;
  let legendKeyPerPoint = null;

  let pointsGeom = null;
  let pointsMain = null;
  let pointsGlow = null;

  let targetPositions = null;
  let dispersePositions = null;
  let targetNormals = null;
  let colors = null;
  let usedCount = 0;

  const tmpV3 = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function localStrengthForPoint(worldX, worldY, worldZ) {
    tmpV3.set(worldX, worldY, worldZ);
    proj.copy(tmpV3).project(camera);

    const rect = renderer.domElement.getBoundingClientRect();
    const sx = (proj.x * 0.5 + 0.5) * rect.width;
    const sy = (-proj.y * 0.5 + 0.5) * rect.height;

    const mx = (mouse.x * 0.5 + 0.5) * rect.width;
    const my = (-mouse.y * 0.5 + 0.5) * rect.height;

    const dx = sx - mx;
    const dy = sy - my;
    const d2 = dx * dx + dy * dy;

    if (d2 > HOVER_RADIUS_PX * HOVER_RADIUS_PX) return 0;
    const t = Math.exp(-HOVER_SOFTNESS * d2);
    return THREE.MathUtils.clamp(t, 0, 1);
  }

  function applyLegendHighlight(key) {
    if (!pointsGeom || !legendKeyPerPoint) return;

    const colorAttr = pointsGeom.getAttribute("color");
    if (!baseColors) baseColors = colorAttr.array.slice();

    if (!key) {
      colorAttr.array.set(baseColors);
      colorAttr.needsUpdate = true;
      return;
    }

    const arr = colorAttr.array;

    for (let i = 0; i < usedCount; i++) {
      const r0 = baseColors[i * 3 + 0];
      const g0 = baseColors[i * 3 + 1];
      const b0 = baseColors[i * 3 + 2];

      const isMatch = legendKeyPerPoint[i] === key;
      const mul = isMatch ? BRIGHT_FACTOR : DIM_FACTOR;

      arr[i * 3 + 0] = Math.min(1, r0 * mul);
      arr[i * 3 + 1] = Math.min(1, g0 * mul);
      arr[i * 3 + 2] = Math.min(1, b0 * mul);
    }

    colorAttr.needsUpdate = true;
  }

  async function loadProgramScenes() {
    const loader = new GLTFLoader();

    return Promise.all(
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
  }

  function buildParticlesFromPrograms(loadedPrograms) {
    const allMeshes = [];
    const allBox = new THREE.Box3();

    loadedPrograms.forEach(({ def, scene: model }, programIndex) => {
      model.updateMatrixWorld(true);

      model.traverse((o) => {
        if (o.isMesh && o.geometry && o.geometry.attributes?.position) {
          const area = computeMeshArea(o);
          if (area <= 0) return;

          allMeshes.push({
            mesh: o,
            area,
            color: hexToColor(def.color),
            programIndex,
            programKey: def.key
          });
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      if (!box.isEmpty()) allBox.union(box);
    });

    if (allMeshes.length === 0) {
      throw new Error("No meshes found in program GLTFs.");
    }

    const totalArea = allMeshes.reduce((sum, m) => sum + m.area, 0);

    const allocations = allMeshes.map((m) =>
      Math.max(24, Math.round((m.area / totalArea) * TOTAL_POINTS))
    );

    let sum = allocations.reduce((a, b) => a + b, 0);

    while (sum > TOTAL_POINTS) {
      let k = allocations.indexOf(Math.max(...allocations));
      if (allocations[k] > 8) {
        allocations[k] -= 1;
        sum -= 1;
      } else {
        break;
      }
    }

    while (sum < TOTAL_POINTS) {
      let k = allocations.indexOf(Math.max(...allocations));
      allocations[k] += 1;
      sum += 1;
    }

    targetPositions = new Float32Array(TOTAL_POINTS * 3);
    dispersePositions = new Float32Array(TOTAL_POINTS * 3);
    targetNormals = new Float32Array(TOTAL_POINTS * 3);
    colors = new Float32Array(TOTAL_POINTS * 3);
    legendKeyPerPoint = new Array(TOTAL_POINTS);

    let write = 0;
    const p = new THREE.Vector3();
    const nrm = new THREE.Vector3();

    for (let mi = 0; mi < allMeshes.length; mi++) {
      const entry = allMeshes[mi];
      const n = allocations[mi];
      const sampler = new MeshSurfaceSampler(entry.mesh).build();

      for (let i = 0; i < n; i++) {
        sampler.sample(p, nrm);

        entry.mesh.localToWorld(p);
        nrm.transformDirection(entry.mesh.matrixWorld).normalize();

        targetPositions[write * 3 + 0] = p.x;
        targetPositions[write * 3 + 1] = p.y;
        targetPositions[write * 3 + 2] = p.z;

        targetNormals[write * 3 + 0] = nrm.x;
        targetNormals[write * 3 + 1] = nrm.y;
        targetNormals[write * 3 + 2] = nrm.z;

        const rx = Math.random() * 2 - 1;
        const ry = Math.random() * 2 - 1;
        const rz = Math.random() * 2 - 1;
        const len = Math.max(1e-6, Math.sqrt(rx * rx + ry * ry + rz * rz));

        dispersePositions[write * 3 + 0] = p.x + (rx / len) * SPREAD;
        dispersePositions[write * 3 + 1] = p.y + (ry / len) * SPREAD;
        dispersePositions[write * 3 + 2] = p.z + (rz / len) * SPREAD;

        colors[write * 3 + 0] = entry.color.r;
        colors[write * 3 + 1] = entry.color.g;
        colors[write * 3 + 2] = entry.color.b;

        legendKeyPerPoint[write] = PROGRAM_KEY_TO_LEGEND_KEY.get(entry.programKey) || null;

        write++;
        if (write >= TOTAL_POINTS) break;
      }

      if (write >= TOTAL_POINTS) break;
    }

    usedCount = write;

    const currentPositions = dispersePositions.slice(0, usedCount * 3);
    const currentColors = colors.slice(0, usedCount * 3);
    legendKeyPerPoint = legendKeyPerPoint.slice(0, usedCount);

    pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));
    pointsGeom.setAttribute("color", new THREE.BufferAttribute(currentColors, 3));

    const dotTex = makeDotTexture(96);

    const matMain = new THREE.PointsMaterial({
      map: dotTex,
      alphaTest: 0.02,
      size: DOT_SIZE,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: DOT_OPACITY,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    const matGlow = new THREE.PointsMaterial({
      map: dotTex,
      alphaTest: 0.01,
      size: GLOW_SIZE,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: GLOW_OPACITY,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    pointsGlow = new THREE.Points(pointsGeom, matGlow);
    pointsMain = new THREE.Points(pointsGeom, matMain);
    scene.add(pointsGlow);
    scene.add(pointsMain);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    allBox.getSize(size);
    allBox.getCenter(center);

    controls.target.copy(center);
    controls.update();

    const maxDim = Math.max(size.x, size.y, size.z);
    camera.position
      .copy(center)
      .add(new THREE.Vector3(maxDim * 1.25, maxDim * 0.85, maxDim * 1.25));
    camera.near = Math.max(0.01, maxDim / 200);
    camera.far = maxDim * 60;
    camera.updateProjectionMatrix();
  }

  function onPointerDown() {
    mouseDown = true;
  }

  function onPointerUp() {
    mouseDown = false;
  }

  function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    mouse.x = x * 2 - 1;
    mouse.y = -(y * 2 - 1);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerUp);
  renderer.domElement.addEventListener("pointermove", onPointerMove);

  function onLegendPointerMove(e) {
    const item = e.target.closest(".legend-item");
    if (!item) return;
    if (lockedLegendKey) return;

    const key = item.dataset.key;
    if (key && key !== activeLegendKey) {
      activeLegendKey = key;
      applyLegendHighlight(activeLegendKey);
    }
  }

  function onLegendPointerLeave() {
    if (lockedLegendKey) return;
    activeLegendKey = null;
    applyLegendHighlight(null);
  }

  function onLegendClick(e) {
    const item = e.target.closest(".legend-item");
    if (!item) return;

    const key = item.dataset.key;
    lockedLegendKey = lockedLegendKey === key ? null : key;
    applyLegendHighlight(lockedLegendKey);
  }

  if (legendCard) {
    legendCard.addEventListener("pointermove", onLegendPointerMove);
    legendCard.addEventListener("pointerleave", onLegendPointerLeave);
    legendCard.addEventListener("click", onLegendClick);
  }

  function resize() {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function onResize() {
    resize();
  }

  window.addEventListener("resize", onResize);
  resize();

  let rafId = 0;
  let disposed = false;

  loadProgramScenes()
    .then((loaded) => {
      if (disposed) return;
      buildParticlesFromPrograms(loaded);
    })
    .catch((err) => {
      console.error("Failed to load particle programs:", err);
    });

  function animate() {
    if (disposed) return;
    rafId = requestAnimationFrame(animate);
    controls.update();

    const target = mouseDown ? 1 : 0;
    const ease = mouseDown ? PRESS_SPEED : RELEASE_SPEED;
    globalForm = THREE.MathUtils.lerp(globalForm, target, ease);

    if (pointsGeom && usedCount > 0) {
      camera.getWorldPosition(camPos);
      const posAttr = pointsGeom.getAttribute("position");

      for (let i = 0; i < usedCount; i++) {
        const tx = targetPositions[i * 3 + 0];
        const ty = targetPositions[i * 3 + 1];
        const tz = targetPositions[i * 3 + 2];

        const hx = dispersePositions[i * 3 + 0];
        const hy = dispersePositions[i * 3 + 1];
        const hz = dispersePositions[i * 3 + 2];

        const local = mouseDown ? 0 : localStrengthForPoint(tx, ty, tz);

        const nx = targetNormals[i * 3 + 0];
        const ny = targetNormals[i * 3 + 1];
        const nz = targetNormals[i * 3 + 2];

        const vx = camPos.x - tx;
        const vy = camPos.y - ty;
        const vz = camPos.z - tz;
        const vlen = Math.max(1e-6, Math.sqrt(vx * vx + vy * vy + vz * vz));
        const vnx = vx / vlen;
        const vny = vy / vlen;
        const vnz = vz / vlen;

        let facing = nx * vnx + ny * vny + nz * vnz;
        facing = THREE.MathUtils.clamp(facing, 0, 1);
        const facingGate = smoothstep(facing, FACING_MIN, FACING_MAX);

        const gate = THREE.MathUtils.lerp(facingGate, 1.0, globalForm);
        const amt = Math.max(globalForm, local) * gate;
        const e = easeSmooth(amt);

        posAttr.setXYZ(
          i,
          THREE.MathUtils.lerp(hx, tx, e),
          THREE.MathUtils.lerp(hy, ty, e),
          THREE.MathUtils.lerp(hz, tz, e)
        );
      }

      posAttr.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  animate();

  function stop() {
    disposed = true;
    cancelAnimationFrame(rafId);

    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    renderer.domElement.removeEventListener("pointerup", onPointerUp);
    renderer.domElement.removeEventListener("pointerleave", onPointerUp);
    renderer.domElement.removeEventListener("pointermove", onPointerMove);

    if (legendCard) {
      legendCard.removeEventListener("pointermove", onLegendPointerMove);
      legendCard.removeEventListener("pointerleave", onLegendPointerLeave);
      legendCard.removeEventListener("click", onLegendClick);
    }

    window.removeEventListener("resize", onResize);

    controls.dispose();

    if (pointsGeom) pointsGeom.dispose();

    if (pointsMain?.material) {
      if (pointsMain.material.map) pointsMain.material.map.dispose();
      pointsMain.material.dispose();
    }

    if (pointsGlow?.material) {
      if (pointsGlow.material.map) pointsGlow.material.map.dispose();
      pointsGlow.material.dispose();
    }

    renderer.dispose();
    root.remove();
  }

  return stop;
}