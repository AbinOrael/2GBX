import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

/* ============================================================
   ==== YOU CAN CHANGE HERE (core tuning knobs) ================
   ============================================================ */

// Model file (put it in /public)
const MODEL_URL = "/model.glb";

// Particles
const TOTAL_POINTS = 30000;
const SPREAD = 20;

// Interaction easing
const PRESS_SPEED = 0.05;
const RELEASE_SPEED = 0.08;

// Local hover reveal (screen space, pixels)
const HOVER_RADIUS_PX = 120;
const HOVER_SOFTNESS = 0.0022;

// Facing filter (thin/clean look)
const FACING_MIN = 0.00;
const FACING_MAX = 0.5;

// Visual style
const BG_COLOR = 0x05050a; // 深黑带一点点冷色
const DOT_SIZE = 2;
const GLOW_SIZE = 5;
const DOT_OPACITY = 0.85;
const GLOW_OPACITY = 0.11;

// UI overlay
const SHOW_UI = true;

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
  return t * t * (3 - 2 * t); // smoothstep
}

function smoothstep(x, edge0, edge1) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getMeshColor(mesh) {
  const m = mesh.material;
  if (Array.isArray(m)) {
    const c = m[0]?.color;
    return c ? c.clone() : new THREE.Color(1, 1, 1);
  }
  return (m && m.color) ? m.color.clone() : new THREE.Color(1, 1, 1);
}

function computeMeshArea(mesh) {
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const idx = geom.index;

  let area = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cross = new THREE.Vector3();

  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const ia = idx.getX(i), ib = idx.getX(i + 1), ic = idx.getX(i + 2);
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

/* ---------------- three base ---------------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG_COLOR);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  2000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.6;

scene.add(new THREE.AmbientLight(0xffffff, 1.0));

/* ---------------- UI overlay ---------------- */
if (SHOW_UI) {
  const ui = document.createElement("div");
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
        <kbd>Hold mouse</kbd> global reveal &nbsp; <kbd>Hover</kbd> local reveal
      </div>
    </div>

    <div class="card legend-card">
      <div class="legend-title">Program Legend</div>
      <div class="legend-grid">
        <div class="legend-item" data-key="media">
          <span class="swatch" style="background:#ff4fd8"></span>
          <span class="legend-label">Media / Exhibition</span>
        </div>

        <div class="legend-item" data-key="ai">
          <span class="swatch" style="background:#21d4ff"></span>
          <span class="legend-label">AI Core / Data Spine</span>
        </div>

        <div class="legend-item" data-key="public">
          <span class="swatch" style="background:#ffd24a"></span>
          <span class="legend-label">Public / Circulation</span>
        </div>

        <div class="legend-item" data-key="service">
          <span class="swatch" style="background:#7c5cff"></span>
          <span class="legend-label">Service / Infrastructure</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(ui);
// 让 legend 能吃到鼠标事件：把 pointer-events 打开
// （你的 .ui 是 pointer-events: none，我们只给 legend-card 开）
setTimeout(() => {
  const legendCard = document.querySelector(".legend-card");
  if (!legendCard) return;

  legendCard.style.pointerEvents = "auto";

  legendCard.addEventListener("pointermove", (e) => {
    const item = e.target.closest(".legend-item");
    if (!item) return;
    if (lockedLegendKey) return; // 锁定时不随 hover 变化

    const key = item.dataset.key;
    if (key && key !== activeLegendKey) {
      activeLegendKey = key;
      applyLegendHighlight(activeLegendKey);
    }
  });

  legendCard.addEventListener("pointerleave", () => {
    if (lockedLegendKey) return;
    activeLegendKey = null;
    applyLegendHighlight(null);
  });

  // 点击锁定（可选）
  legendCard.addEventListener("click", (e) => {
    const item = e.target.closest(".legend-item");
    if (!item) return;

    const key = item.dataset.key;
    lockedLegendKey = (lockedLegendKey === key) ? null : key;
    applyLegendHighlight(lockedLegendKey);
  });
}, 0);
}

/* ---------------- interaction state ---------------- */
let mouseDown = false;
let mouse = new THREE.Vector2(0, 0); // NDC
let globalForm = 0;
let activeLegendKey = null;   // 当前 hover 的 legend key
let lockedLegendKey = null;   // 点击锁定（可选）
let baseColors = null;        // 保存原始颜色

window.addEventListener("pointerdown", () => (mouseDown = true));
window.addEventListener("pointerup", () => (mouseDown = false));
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ---------------- particle buffers ---------------- */
let pointsGeom, pointsMain, pointsGlow;
let targetPositions, dispersePositions, targetNormals, colors;

const tmpV3 = new THREE.Vector3();
const proj = new THREE.Vector3();
const camPos = new THREE.Vector3();

function localStrengthForPoint(worldX, worldY, worldZ) {
  tmpV3.set(worldX, worldY, worldZ);
  proj.copy(tmpV3).project(camera);

  const sx = (proj.x * 0.5 + 0.5) * window.innerWidth;
  const sy = (-proj.y * 0.5 + 0.5) * window.innerHeight;

  const mx = (mouse.x * 0.5 + 0.5) * window.innerWidth;
  const my = (-mouse.y * 0.5 + 0.5) * window.innerHeight;

  const dx = sx - mx;
  const dy = sy - my;
  const d2 = dx * dx + dy * dy;

  if (d2 > HOVER_RADIUS_PX * HOVER_RADIUS_PX) return 0;
  const t = Math.exp(-HOVER_SOFTNESS * d2);
  return THREE.MathUtils.clamp(t, 0, 1);
}

function buildParticlesFromGLB(root) {
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes?.position) meshes.push(o);
  });
  if (meshes.length === 0) throw new Error("No meshes found in GLB.");

  const areas = meshes.map(computeMeshArea);
  const totalArea = areas.reduce((a, b) => a + b, 0);

  // (美感优先) 给每个 mesh 点数上下限：避免一片颜色统治
  const MIN_PER_MESH = 500;
  const MAX_PER_MESH = 1500;
  const allocations = areas.map((a) => {
    const raw = Math.round((a / totalArea) * TOTAL_POINTS);
    return Math.min(MAX_PER_MESH, Math.max(MIN_PER_MESH, raw));
  });

  // normalize to exactly TOTAL_POINTS
  let sum = allocations.reduce((a, b) => a + b, 0);
  while (sum > TOTAL_POINTS) {
    const k = allocations.indexOf(Math.max(...allocations));
    allocations[k] -= 1; sum -= 1;
  }
  while (sum < TOTAL_POINTS) {
    const k = allocations.indexOf(Math.max(...allocations));
    allocations[k] += 1; sum += 1;
  }

  targetPositions = new Float32Array(TOTAL_POINTS * 3);
  dispersePositions = new Float32Array(TOTAL_POINTS * 3);
  targetNormals = new Float32Array(TOTAL_POINTS * 3);
  colors = new Float32Array(TOTAL_POINTS * 3);

  let write = 0;
  const p = new THREE.Vector3();
  const nrm = new THREE.Vector3();

  for (let mi = 0; mi < meshes.length; mi++) {
    const mesh = meshes[mi];
    const n = allocations[mi];
    const col = getMeshColor(mesh);

    const sampler = new MeshSurfaceSampler(mesh).build();

    for (let i = 0; i < n; i++) {
      sampler.sample(p, nrm);

      mesh.localToWorld(p);
      nrm.transformDirection(mesh.matrixWorld).normalize();

      targetPositions[write * 3 + 0] = p.x;
      targetPositions[write * 3 + 1] = p.y;
      targetPositions[write * 3 + 2] = p.z;

      targetNormals[write * 3 + 0] = nrm.x;
      targetNormals[write * 3 + 1] = nrm.y;
      targetNormals[write * 3 + 2] = nrm.z;

      const rx = (Math.random() * 2 - 1);
      const ry = (Math.random() * 2 - 1);
      const rz = (Math.random() * 2 - 1);
      const len = Math.max(1e-6, Math.sqrt(rx * rx + ry * ry + rz * rz));

      dispersePositions[write * 3 + 0] = p.x + (rx / len) * SPREAD;
      dispersePositions[write * 3 + 1] = p.y + (ry / len) * SPREAD;
      dispersePositions[write * 3 + 2] = p.z + (rz / len) * SPREAD;

      colors[write * 3 + 0] = col.r;
      colors[write * 3 + 1] = col.g;
      colors[write * 3 + 2] = col.b;

      write++;
      if (write >= TOTAL_POINTS) break;
    }
    if (write >= TOTAL_POINTS) break;
  }

  const currentPositions = dispersePositions.slice();
  pointsGeom = new THREE.BufferGeometry();
  pointsGeom.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));
  pointsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

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

  // fit camera
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  controls.target.copy(center);
  controls.update();

  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.copy(center).add(new THREE.Vector3(maxDim * 1.25, maxDim * 0.85, maxDim * 1.25));
  camera.near = Math.max(0.01, maxDim / 200);
  camera.far = maxDim * 60;
  camera.updateProjectionMatrix();
}

/* ---------------- load GLB ---------------- */
const loader = new GLTFLoader();
loader.load(
  MODEL_URL,
  (gltf) => {
    const root = gltf.scene;
    scene.add(root);
    root.visible = false; // only show particles
    buildParticlesFromGLB(root);
  },
  undefined,
  (e) => console.error("Failed to load GLB:", e)
);
// 你在 legend 里写的色块（hex）要在这里对应起来
const LEGEND = {
  media:  new THREE.Color("#ff4fd8"),
  ai:     new THREE.Color("#21d4ff"),
  public: new THREE.Color("#ffd24a"),
  service:new THREE.Color("#7c5cff")
};

// 颜色匹配阈值：越大越“宽松”
// 如果你的 Rhino 颜色不是完全一致（有轻微差），可以提高到 0.18~0.25
const COLOR_MATCH_EPS = 0.12;

// 高亮/压暗强度
const DIM_FACTOR = 0.14;     // 非选中变暗
const BRIGHT_FACTOR = 1.18;  // 选中提亮

function colorClose(r,g,b, targetColor){
  const dr = r - targetColor.r;
  const dg = g - targetColor.g;
  const db = b - targetColor.b;
  return (dr*dr + dg*dg + db*db) < (COLOR_MATCH_EPS * COLOR_MATCH_EPS);
}

function applyLegendHighlight(key){
  if (!pointsGeom) return;

  const colorAttr = pointsGeom.getAttribute("color");
  if (!baseColors) baseColors = colorAttr.array.slice(); // 只存一次

  // 没有 key：恢复原色
  if (!key || !LEGEND[key]) {
    colorAttr.array.set(baseColors);
    colorAttr.needsUpdate = true;
    return;
  }

  const target = LEGEND[key];
  const arr = colorAttr.array;

  for (let i = 0; i < TOTAL_POINTS; i++) {
    const r0 = baseColors[i*3+0];
    const g0 = baseColors[i*3+1];
    const b0 = baseColors[i*3+2];

    const isMatch = colorClose(r0, g0, b0, target);

    const mul = isMatch ? BRIGHT_FACTOR : DIM_FACTOR;

    arr[i*3+0] = Math.min(1, r0 * mul);
    arr[i*3+1] = Math.min(1, g0 * mul);
    arr[i*3+2] = Math.min(1, b0 * mul);
  }

  colorAttr.needsUpdate = true;
}
/* ---------------- animation loop ---------------- */
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  const target = mouseDown ? 1 : 0;
  const ease = mouseDown ? PRESS_SPEED : RELEASE_SPEED;
  globalForm = THREE.MathUtils.lerp(globalForm, target, ease);

  if (pointsGeom) {
    camera.getWorldPosition(camPos);
    const posAttr = pointsGeom.getAttribute("position");

    for (let i = 0; i < TOTAL_POINTS; i++) {
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
      const vnx = vx / vlen, vny = vy / vlen, vnz = vz / vlen;

      let facing = nx * vnx + ny * vny + nz * vnz;
      facing = THREE.MathUtils.clamp(facing, 0, 1);
      const facingGate = smoothstep(facing, FACING_MIN, FACING_MAX);

      const edge = 1.0 - facing;
      const edgeBoost = 0.6 + edge * 0.4;

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

/* ---------------- resize ---------------- */
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});