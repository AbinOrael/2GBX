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

// Particle count (your laptop is gaming-grade, 12000 is good)
const TOTAL_POINTS = 12000;

// Spread distance when dispersed (world units)
const SPREAD = 2.2;

// Press & release easing speeds (0..1)
const PRESS_SPEED = 0.06;     // hold mouse -> gather speed
const RELEASE_SPEED = 0.08;   // release mouse -> disperse speed

// Local hover reveal (screen space, pixels)
const HOVER_RADIUS_PX = 180;
const HOVER_SOFTNESS = 0.0022; // larger = faster falloff

// Facing filter (makes it look thinner/cleaner)
// dot(normal, viewDir) -> 0..1, we gate it with smoothstep
const FACING_MIN = 0.05;
const FACING_MAX = 0.35;

// Visual style
const BG_COLOR = 0xffffff;     // keep white like your palette image
const DOT_SIZE = 2.2;          // main particle size in px
const GLOW_SIZE = 8.0;         // glow size in px
const DOT_OPACITY = 0.85;
const GLOW_OPACITY = 0.10;

// Show overlay UI text
const SHOW_UI = true;

/* ============================================================ */

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG_COLOR);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.7;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.6;

// light (not required for points, but safe)
scene.add(new THREE.AmbientLight(0xffffff, 1.0));

// UI overlay (clean + optional)
if (SHOW_UI) {
  const ui = document.createElement("div");
  ui.className = "ui";
  ui.innerHTML = `
    <div class="card title">
      <h1>Particle Model Reveal</h1>
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
  `;
  document.body.appendChild(ui);
}

/* ---------------- interaction state ---------------- */
let mouseDown = false;
let mouse = new THREE.Vector2(0, 0); // NDC
let globalForm = 0;

window.addEventListener("pointerdown", () => (mouseDown = true));
window.addEventListener("pointerup", () => (mouseDown = false));
window.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

/* ---------------- helpers ---------------- */
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

function smoothstep(x, edge0, edge1) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

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
  // collect meshes
  const meshes = [];
  root.traverse((o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes?.position) meshes.push(o);
  });
  if (meshes.length === 0) throw new Error("No meshes found in GLB.");

  // compute areas to distribute points
  const areas = meshes.map(computeMeshArea);
  const totalArea = areas.reduce((a, b) => a + b, 0);

  // allocate points by area (at least 60 per mesh)
  const allocations = areas.map((a) => Math.max(60, Math.round((a / totalArea) * TOTAL_POINTS)));

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
    const c = getMeshColor(mesh);

    // sampler built on this mesh
    const sampler = new MeshSurfaceSampler(mesh).build();

    for (let i = 0; i < n; i++) {
      // sample point + normal in LOCAL space
      // (three.js supports sampler.sample(pos, normal))
      sampler.sample(p, nrm);

      // point -> world
      mesh.localToWorld(p);

      // normal -> world (direction only)
      nrm.transformDirection(mesh.matrixWorld).normalize();

      // targets
      targetPositions[write * 3 + 0] = p.x;
      targetPositions[write * 3 + 1] = p.y;
      targetPositions[write * 3 + 2] = p.z;

      targetNormals[write * 3 + 0] = nrm.x;
      targetNormals[write * 3 + 1] = nrm.y;
      targetNormals[write * 3 + 2] = nrm.z;

      // dispersed (random direction)
      const rx = (Math.random() * 2 - 1);
      const ry = (Math.random() * 2 - 1);
      const rz = (Math.random() * 2 - 1);
      const len = Math.max(1e-6, Math.sqrt(rx * rx + ry * ry + rz * rz));
      dispersePositions[write * 3 + 0] = p.x + (rx / len) * SPREAD;
      dispersePositions[write * 3 + 1] = p.y + (ry / len) * SPREAD;
      dispersePositions[write * 3 + 2] = p.z + (rz / len) * SPREAD;

      // colors from Rhino material color
      colors[write * 3 + 0] = c.r;
      colors[write * 3 + 1] = c.g;
      colors[write * 3 + 2] = c.b;

      write++;
      if (write >= TOTAL_POINTS) break;
    }
    if (write >= TOTAL_POINTS) break;
  }

  // current positions start dispersed
  const currentPositions = dispersePositions.slice();
  pointsGeom = new THREE.BufferGeometry();
  pointsGeom.setAttribute("position", new THREE.BufferAttribute(currentPositions, 3));
  pointsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  // materials
  const matMain = new THREE.PointsMaterial({
    size: DOT_SIZE,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: DOT_OPACITY,
    depthWrite: false
  });

  const matGlow = new THREE.PointsMaterial({
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

  // fit camera to model box
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

    // We only show particles (hide original meshes)
    root.visible = false;

    buildParticlesFromGLB(root);
  },
  undefined,
  (e) => {
    console.error("Failed to load GLB:", e);
  }
);

/* ---------------- animation loop ---------------- */
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // global form easing
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

      // local reveal only when not pressed (scan)
      const local = mouseDown ? 0 : localStrengthForPoint(tx, ty, tz);

      // facing gate (thin/clean look)
      const nx = targetNormals[i * 3 + 0];
      const ny = targetNormals[i * 3 + 1];
      const nz = targetNormals[i * 3 + 2];

      const vx = camPos.x - tx;
      const vy = camPos.y - ty;
      const vz = camPos.z - tz;
      const vlen = Math.max(1e-6, Math.sqrt(vx * vx + vy * vy + vz * vz));
      const vnx = vx / vlen, vny = vy / vlen, vnz = vz / vlen;

      let facing = nx * vnx + ny * vny + nz * vnz; // -1..1
      facing = THREE.MathUtils.clamp(facing, 0, 1); // 0..1
      const facingGate = smoothstep(facing, FACING_MIN, FACING_MAX);

      // pressed: global reveal, hover: local reveal
      const amt = Math.max(globalForm, local) * facingGate;

      posAttr.setXYZ(
        i,
        THREE.MathUtils.lerp(hx, tx, amt),
        THREE.MathUtils.lerp(hy, ty, amt),
        THREE.MathUtils.lerp(hz, tz, amt)
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