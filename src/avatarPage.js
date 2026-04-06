import * as THREE from "three";

const SOUL_COLORS = [
  { label: "Core Engine", color: 0xFFADAD },
  { label: "Anime Gallery", color: 0xFFC6FF },
  { label: "3D Gallery", color: 0xBDB2FF },
  { label: "Sky Walk", color: 0x9BF6FF }
];

export function startAvatarPage(container) {
  document.body.dataset.theme = "light";

  const root = document.createElement("div");
  root.className = "page avatar-page";
  root.style.position = "relative";
  root.style.width = "100%";
  root.style.height = "100%";
  root.style.overflow = "hidden";
  container.appendChild(root);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFFF9F0);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 1.0, 3.2);

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

  const ambient = new THREE.AmbientLight(0xffffff, 1.25);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
  fillLight.position.set(-2, 1.5, 2);
  scene.add(fillLight);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 48),
    new THREE.MeshStandardMaterial({
      color: 0xf1e7da,
      roughness: 1
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.72;
  scene.add(ground);

  const bodyGeometry = new THREE.CapsuleGeometry(0.42, 0.62, 6, 18);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xFFADAD,
    roughness: 0.82,
    metalness: 0.08
  });
  const avatarBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
  avatarBody.position.y = 0.05;

  const eyeGeo = new THREE.SphereGeometry(0.045, 12, 12);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(0.14, 0.22, 0.36);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(-0.14, 0.22, 0.36);

  const blushGeo = new THREE.SphereGeometry(0.035, 10, 10);
  const blushMat = new THREE.MeshBasicMaterial({
    color: 0xf4a6b8,
    transparent: true,
    opacity: 0.55
  });

  const leftBlush = new THREE.Mesh(blushGeo, blushMat);
  leftBlush.position.set(0.24, 0.08, 0.33);
  leftBlush.scale.set(1.4, 0.8, 0.6);

  const rightBlush = new THREE.Mesh(blushGeo, blushMat);
  rightBlush.position.set(-0.24, 0.08, 0.33);
  rightBlush.scale.set(1.4, 0.8, 0.6);

  const avatarGroup = new THREE.Group();
  avatarGroup.add(avatarBody);
  avatarGroup.add(leftEye);
  avatarGroup.add(rightEye);
  avatarGroup.add(leftBlush);
  avatarGroup.add(rightBlush);
  scene.add(avatarGroup);

  const ui = document.createElement("div");
  ui.className = "avatar-ui";
  ui.style.position = "absolute";
  ui.style.top = "120px";
  ui.style.left = "24px";
  ui.style.zIndex = "30";
  ui.style.pointerEvents = "auto";
  ui.style.width = "340px";
  ui.style.padding = "22px";
  ui.style.borderRadius = "22px";
  ui.style.background = "rgba(255, 249, 240, 0.9)";
  ui.style.border = "1px solid rgba(0,0,0,0.08)";
  ui.style.backdropFilter = "blur(10px)";
  ui.style.boxShadow = "0 8px 30px rgba(0,0,0,0.08)";
  ui.innerHTML = `
    <h2 style="margin:0 0 8px 0; font-size:28px; color:#5D4037; line-height:1.2;">
      Create Your Avatar
    </h2>

    <p style="margin:0 0 18px 0; color:#7a6258; line-height:1.6; font-size:14px;">
      Choose a soul color and define how your virtual self enters the museum.
    </p>

    <div style="margin-bottom:10px; color:#5D4037; font-size:14px; font-weight:500;">
      Soul Color
    </div>
    <div
      id="color-palette"
      style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:20px;"
    ></div>

    <div style="margin-bottom:10px; color:#5D4037; font-size:14px; font-weight:500;">
      Body Width
    </div>
    <input
      type="range"
      id="weight-slider"
      min="0.75"
      max="1.35"
      step="0.05"
      value="1"
      style="width:100%; margin-bottom:22px;"
    />

    <button
      id="save-avatar"
      style="
        padding: 12px 24px;
        font-size: 16px;
        border-radius: 999px;
        border: 1px solid rgba(0,0,0,0.10);
        background: white;
        color: #5D4037;
        cursor: pointer;
        transition: transform 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
      "
    >
      Enter the Museum
    </button>
  `;
  root.appendChild(ui);

  const palette = ui.querySelector("#color-palette");
  const weightSlider = ui.querySelector("#weight-slider");
  const saveBtn = ui.querySelector("#save-avatar");

  let selectedColorBtn = null;

  SOUL_COLORS.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = item.label;
    btn.setAttribute("aria-label", item.label);
    btn.style.width = "38px";
    btn.style.height = "38px";
    btn.style.borderRadius = "50%";
    btn.style.cursor = "pointer";
    btn.style.background = `#${item.color.toString(16).padStart(6, "0")}`;
    btn.style.border = "2px solid rgba(255,255,255,0.9)";
    btn.style.boxShadow = "0 2px 10px rgba(0,0,0,0.12)";
    btn.style.transition =
      "transform 0.18s ease, box-shadow 0.18s ease, outline 0.18s ease";
    btn.style.outline = "none";

    btn.onmouseenter = () => {
      btn.style.transform = "translateY(-2px) scale(1.05)";
    };

    btn.onmouseleave = () => {
      btn.style.transform = "translateY(0) scale(1)";
    };

    btn.onclick = () => {
      avatarBody.material.color.setHex(item.color);
      localStorage.setItem("avatarColor", String(item.color));
      localStorage.setItem("avatarLabel", item.label);

      if (selectedColorBtn) {
        selectedColorBtn.style.outline = "none";
      }

      btn.style.outline = "3px solid rgba(93, 64, 55, 0.25)";
      selectedColorBtn = btn;
    };

    palette.appendChild(btn);

    if (index === 0) {
      btn.click();
    }
  });

  weightSlider.oninput = (e) => {
    const val = parseFloat(e.target.value);
    avatarGroup.scale.set(val, 1, val);
    localStorage.setItem("avatarWeight", String(val));
  };

  saveBtn.onmouseenter = () => {
    saveBtn.style.transform = "translateY(-1px)";
    saveBtn.style.background = "#fffdf9";
    saveBtn.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
  };

  saveBtn.onmouseleave = () => {
    saveBtn.style.transform = "translateY(0)";
    saveBtn.style.background = "white";
    saveBtn.style.boxShadow = "none";
  };

  saveBtn.onclick = () => {
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

    avatarGroup.rotation.y += 0.01;
    renderer.render(scene, camera);
  }

  animate();

  return function stop() {
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);

    bodyGeometry.dispose();
    bodyMaterial.dispose();
    eyeGeo.dispose();
    eyeMat.dispose();
    blushGeo.dispose();
    blushMat.dispose();
    ground.geometry.dispose();
    ground.material.dispose();

    renderer.dispose();
    root.remove();
  };
}