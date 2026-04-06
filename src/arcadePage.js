import * as THREE from "three";

export function startArcadePage(container) {
  document.body.dataset.theme = "light";

  const root = document.createElement("div");
  root.className = "page arcade-page";
  root.style.position = "relative";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.overflow = "hidden";
  container.appendChild(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfff9f0);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 2, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  root.appendChild(renderer.domElement);

  const light = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(light);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xffadad })
  );
  scene.add(sphere);

  const ui = document.createElement("div");
  ui.style.position = "absolute";
  ui.style.top = "120px";
  ui.style.left = "24px";
  ui.style.zIndex = "30";
  ui.style.padding = "20px";
  ui.style.borderRadius = "20px";
  ui.style.background = "rgba(255,249,240,0.9)";
  ui.style.border = "1px solid rgba(0,0,0,0.08)";
  ui.style.pointerEvents = "auto";
  ui.innerHTML = `
    <h2 style="margin:0 0 8px 0; color:#5D4037;">The Arcade</h2>
    <p style="margin:0 0 16px 0; color:#7a6258;">Arcade page loaded successfully.</p>
    <button id="back-btn" style="padding:10px 18px; border-radius:999px; border:1px solid rgba(0,0,0,0.1); background:white; cursor:pointer;">
      Return to Museum
    </button>
  `;
  root.appendChild(ui);

  ui.querySelector("#back-btn").onclick = () => {
    window.location.hash = "#/viewer";
  };

  function onResize() {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  window.addEventListener("resize", onResize);

  let raf = 0;
  let disposed = false;

  function animate() {
    if (disposed) return;
    raf = requestAnimationFrame(animate);
    sphere.rotation.y += 0.01;
    renderer.render(scene, camera);
  }

  animate();

  return function stop() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    sphere.geometry.dispose();
    sphere.material.dispose();
    renderer.dispose();
    root.remove();
  };
}