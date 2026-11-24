<template>
  <Teleport to="body">
    <div class="orbital-overlay" @click.self="emit('close')">
      <section
        class="orbital-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Cressidium planetary viewer"
      >
        <div class="orbital-header">
          <div>
            <span class="eyebrow">
              UNION NAVAL COMMAND // ORBITAL SURVEY
            </span>
            <h1>CRESSIDIUM</h1>
          </div>

          <button
            ref="closeButton"
            class="close-button"
            @click="emit('close')"
          >
            CLOSE ✕
          </button>
        </div>

        <div class="viewer-layout">
          <div class="globe-stage">
            <div ref="canvasHost" class="globe-canvas"></div>

            <div class="stage-label">
              PLANETARY RECONNAISSANCE FEED
            </div>

            <div v-if="loading && !error" class="loading">
              LOADING PLANETARY DATA...
            </div>

            <div v-if="error" class="loading">
              {{ error }}
            </div>
          </div>

          <aside class="orbital-data">
            <h2>PLANETARY DATA</h2>

            <p class="data-label">DESIGNATION</p>
            <p>CRESSIDIUM</p>

            <p class="data-label">SYSTEM</p>
            <p>CRESSIDIUM</p>

            <p class="data-label">ACTIVE OPERATION</p>
            <p>SOLSTICE RAIN</p>

            <p class="data-label">AREA OF OPERATIONS</p>
            <p>NOV ELYSIA</p>

            <hr />

            <h2>VIEW CONTROLS</h2>
            <p>DRAG — ROTATE</p>
            <p>SCROLL — ZOOM</p>
            <p>ESC — CLOSE VIEWER</p>
          </aside>
        </div>

        <footer class="orbital-footer">
          UNS-CV RIO GRANDE // ORBITAL OBSERVATION SYSTEM
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createAtmosphere } from "@/utils/createAtmosphere.js";
import { createCloudLayer } from "@/utils/createCloudLayer.js";

const emit = defineEmits(["close"]);

const canvasHost = ref(null);
const closeButton = ref(null);
const loading = ref(true);
const error = ref("");

let renderer;
let scene;
let camera;
let controls;
let geometry;
let material;
let texture;
let planet;
let atmosphere;
let cloudLayer;
let observer;
let animationFrame = 0;
let lastFrame = 0;
let destroyed = false;

function resize() {
  if (!renderer || !camera || !canvasHost.value) return;

  const { width, height } =
    canvasHost.value.getBoundingClientRect();

  if (width < 1 || height < 1) return;

  renderer.setSize(
    Math.floor(width),
    Math.floor(height),
    false
  );

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate(time) {
  animationFrame = requestAnimationFrame(animate);

  if (document.hidden) {
    lastFrame = time;
    return;
  }

  // Limit rendering to approximately 30 FPS.
  if (time - lastFrame < 33) return;

  const delta = lastFrame
    ? Math.min((time - lastFrame) / 1000, 0.1)
    : 0;

  lastFrame = time;

  // One full revolution every 60 seconds.
  if (planet && !window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches) {
    planet.rotation.y += delta * Math.PI * 2 / 60;
    
  cloudLayer.rotation.y +=
    delta * Math.PI * 2 / 48;

  }

  controls?.update();
  renderer?.render(scene, camera);
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    emit("close");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  closeButton.value?.focus();

  try {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      40,
      1,
      0.1,
      100
    );

    camera.position.set(0, 0, 3.6);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.5)
    );

    renderer.setClearColor(0x000000, 0);

    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    canvasHost.value.appendChild(renderer.domElement);

    texture = new THREE.TextureLoader().load(
      "/planets/cressidium.png",
      () => {
        if (!destroyed) loading.value = false;
      },
      undefined,
      (reason) => {
        console.error(reason);
        if (!destroyed) {
          error.value = "PLANETARY TEXTURE UNAVAILABLE";
        }
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;

    geometry = new THREE.SphereGeometry(1, 96, 64);

    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      metalness: 0
    });

    planet = new THREE.Mesh(geometry, material);

    planet.rotation.y = 0.7;
    planet.rotation.z = 0.08;

    scene.add(planet);

    cloudLayer = createCloudLayer();
    cloudLayer.rotation.copy(planet.rotation);
    scene.add(cloudLayer);

    atmosphere = createAtmosphere(1.10);
    scene.add(atmosphere);

    const sunlight = new THREE.DirectionalLight(
      0xffffff, 2.0
    );

    sunlight.position.set(-3, 2, 4);
    scene.add(sunlight);

    scene.add(
      new THREE.AmbientLight(0x9bbed8, 0.45)
    );

    // Enable mouse interaction.
    controls = new OrbitControls(
      camera,
      renderer.domElement
    );

    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.65;

    controls.minDistance = 1.7;
    controls.maxDistance = 7;

    controls.update();

    observer = new ResizeObserver(resize);
    observer.observe(canvasHost.value);

    resize();

    animationFrame = requestAnimationFrame(animate);

  } catch (reason) {
    console.error("Planet viewer error:", reason);
    error.value = "3D RENDERER UNAVAILABLE";
  }
});

onBeforeUnmount(() => {
  destroyed = true;

  window.removeEventListener("keydown", handleKeydown);

  cancelAnimationFrame(animationFrame);
  observer?.disconnect();

  controls?.dispose();

  atmosphere?.geometry.dispose();
  atmosphere?.material.dispose();

  geometry?.dispose();
  material?.dispose();
  texture?.dispose();

  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
});
</script>

<style scoped>
.orbital-overlay {
  position: fixed;
  inset: 0;
  z-index: 999999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.88);
  font-family: "Roboto", sans-serif;
  box-sizing: border-box;
}

.orbital-panel {
  width: min(1100px, 100%);
  max-height: 95vh;
  overflow-y: auto;
  background: #15191b;
  border: 2px solid var(--primary-color, #ea534c);
  color: white;
}

.orbital-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 25px;
  background: var(--primary-color, #ea534c);
  color: #111;
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  font-weight: 700;
}

.orbital-header h1 {
  margin: 4px 0 0;
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 40px;
  font-weight: 800;
}

.close-button {
  padding: 10px 16px;
  background: #15191b;
  color: white;
  border: 1px solid #15191b;
  cursor: pointer;
}

.close-button:hover,
.close-button:focus-visible {
  border-color: white;
}

.viewer-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
}

.globe-stage {
  position: relative;
  height: min(65vh, 600px);
  min-height: 320px;
  background: radial-gradient(
    circle,
    #20292e 0%,
    #080c10 70%
  );
  overflow: hidden;
}

.globe-canvas {
  position: absolute;
  inset: 0;
  cursor: grab;
}

.globe-canvas:active {
  cursor: grabbing;
}

.stage-label {
  position: absolute;
  top: 18px;
  left: 20px;
  color: var(--primary-color, #ea534c);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
  pointer-events: none;
}

.loading {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: white;
  font-size: 12px;
  pointer-events: none;
}

.orbital-data {
  padding: 24px;
  background: #1e2528;
  border-left: 1px solid var(--primary-color, #ea534c);
  font-size: 13px;
}

.orbital-data h2 {
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 25px;
  color: var(--primary-color, #ea534c);
  margin: 0 0 20px;
}

.data-label {
  color: var(--primary-color, #ea534c);
  font-size: 11px;
  letter-spacing: 1px;
  margin: 20px 0 5px;
}

.orbital-data hr {
  border: 0;
  border-top: 1px solid #444;
  margin: 25px 0;
}

.orbital-footer {
  padding: 12px 25px;
  border-top: 1px solid var(--primary-color, #ea534c);
  font-size: 11px;
  letter-spacing: 2px;
  color: #aaa;
}

@media (max-width: 700px) {
  .viewer-layout {
    grid-template-columns: 1fr;
  }

  .globe-stage {
    height: 45vh;
    min-height: 280px;
  }

  .orbital-data {
    border-left: 0;
    border-top: 1px solid var(--primary-color, #ea534c);
  }
}
</style>
