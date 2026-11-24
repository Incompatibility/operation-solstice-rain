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
  <div class="viewer-main">
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


    <section class="briefing-panel">
      <div class="briefing-content">
        <VueMarkdownIt
          :source="cressidiumBriefing"
          class="planet-markdown"
        />
      </div>
    </section>

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

            <h2>LOCATION REGISTRY</h2>

            <div class="location-list">
              <button
                v-for="location in locations"
                :key="location.id"
                type="button"
                class="location-button"
                :class="{
                  active: selectedLocation?.id === location.id
                }"
                @click="selectLocation(location)"
              >
                <span class="location-indicator">◆</span>
                {{ location.name }}
              </button>
            </div>

            <div v-if="selectedLocation" class="location-detail">
              <p class="data-label">
                SELECTED LOCATION
              </p>

              <h3>{{ selectedLocation.name }}</h3>

              <p class="location-type">
                {{ selectedLocation.type }}
              </p>

              <p>
                {{ selectedLocation.description }}
              </p>

              <p class="location-coordinates">
                LAT {{ selectedLocation.latitude }}°
                /
                LONG {{ selectedLocation.longitude }}°
              </p>
            </div>


            <hr />

            <h2>VIEW CONTROLS</h2>
            <button
              type="button"
              class="rotation-toggle"
              @click="rotationPaused = !rotationPaused"
            >
              {{ rotationPaused ? "▶ RESUME" : "Ⅱ PAUSE" }}
              <span class="hotkey">[SPACE]</span>
            </button>

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
import locations from "@/assets/info/planet-locations.json";
import { VueMarkdownIt } from "@f3ve/vue-markdown-it";
import cressidiumBriefing from "@/assets/planet-briefings/cressidium.md?raw";


const emit = defineEmits(["close"]);

const canvasHost = ref(null);
const closeButton = ref(null);
const loading = ref(true);
const error = ref("");
const rotationPaused = ref(false);
const selectedLocation = ref(locations[0] ?? null);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const markerMeshes = [];

let markerGroup;
let pointerDown = null;


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
  if (
    planet &&
    !rotationPaused.value &&
    !window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    planet.rotation.y += delta * Math.PI * 2 / 60;

    if (cloudLayer) {
      cloudLayer.rotation.y += delta * Math.PI * 2 / 48;
    }
  }


  controls?.update();
  renderer?.render(scene, camera);
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    emit("close");
    return;
  }

  if (
    event.code === "Space" &&
    !event.repeat &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    const target = event.target;

    // Don't intercept typing in form fields.
    if (
      target instanceof HTMLElement &&
      (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(
          target.tagName
        )
      )
    ) {
      return;
    }

    // Prevent scrolling the page.
    event.preventDefault();

    rotationPaused.value = !rotationPaused.value;
  }
}


function latLonToPoint(latitude, longitude, radius = 1.055) {
  // Match Three.js SphereGeometry's UV orientation.
  const phi = THREE.MathUtils.degToRad(longitude + 180);
  const theta = THREE.MathUtils.degToRad(90 - latitude);

  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function selectLocation(location) {
  selectedLocation.value = location;

  // Highlight the selected marker.
  for (const mesh of markerMeshes) {
    if (!mesh.userData.isMarkerDot) continue;

    const selected =
      mesh.userData.locationId === location.id;

    mesh.material.color.set(
      selected ? 0xffffff : 0xea534c
    );
  }
}

function createMarkers() {
  markerGroup = new THREE.Group();

  // Attach markers directly to the planet.
  // They now follow its rotation automatically.
  planet.add(markerGroup);

  for (const location of locations) {
    const position = latLonToPoint(
      location.latitude,
      location.longitude
    );

    // Bright, clickable marker.
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xea534c,
        depthTest: true
      })
    );

    dot.position.copy(position);
    dot.userData.locationId = location.id;
    dot.userData.isMarkerDot = true;

    markerGroup.add(dot);
    markerMeshes.push(dot);

    // Red targeting ring around the marker.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.054, 0.075, 32),
      new THREE.MeshBasicMaterial({
        color: 0xea534c,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    const normal = position.clone().normalize();

    ring.position.copy(
      normal.clone().multiplyScalar(1.045)
    );

    ring.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );

    ring.userData.locationId = location.id;

    markerGroup.add(ring);
    markerMeshes.push(ring);
  }

  if (selectedLocation.value) {
    selectLocation(selectedLocation.value);
  }
}


function onGlobePointerDown(event) {
  pointerDown = {
    x: event.clientX,
    y: event.clientY
  };
}

function onGlobePointerUp(event) {
  if (!pointerDown || !renderer || !planet) return;

  const distanceMoved = Math.hypot(
    event.clientX - pointerDown.x,
    event.clientY - pointerDown.y
  );

  pointerDown = null;

  // Ignore drag gestures used to rotate the camera.
  if (distanceMoved > 6) return;

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x =
    ((event.clientX - rect.left) / rect.width) * 2 - 1;

  pointer.y =
    -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  planet.updateWorldMatrix(true, true);

  // First test the planet itself for occlusion.
  const surfaceHit = raycaster.intersectObject(
    planet,
    false
  )[0];

  // SHIFT + click: identify a position on the map.
  if (event.shiftKey && surfaceHit?.uv) {
    const latitude = (
      surfaceHit.uv.y * 180 - 90
    ).toFixed(2);

    const longitude = (
      surfaceHit.uv.x * 360 - 180
    ).toFixed(2);

    console.log("CRESSIDIUM LOCATION:", {
      latitude: Number(latitude),
      longitude: Number(longitude)
    });

    return;
  }

  const hits = raycaster.intersectObjects(
    markerMeshes,
    false
  );

  // Do not select markers behind the planet.
  const visibleHit = hits.find(
    hit => !surfaceHit || hit.distance < surfaceHit.distance
  );

  if (!visibleHit) return;

  const location = locations.find(
    item =>
      item.id === visibleHit.object.userData.locationId
  );

  if (location) {
    selectLocation(location);
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
    createMarkers();


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

    renderer.domElement.addEventListener(
      "pointerdown",
      onGlobePointerDown
    );

    renderer.domElement.addEventListener(
      "pointerup",
      onGlobePointerUp
    );


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
  
  if (renderer) {
    renderer.domElement.removeEventListener(
      "pointerdown",
      onGlobePointerDown
    );

    renderer.domElement.removeEventListener(
      "pointerup",
      onGlobePointerUp
    );
  }

  markerGroup?.traverse(object => {
    if (object.isMesh) {
      object.geometry?.dispose();
      object.material?.dispose();
    }
  });

  markerGroup?.removeFromParent();

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

/* UNION NAVY PLANETARY LOCATION REGISTRY */

.location-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.location-button {
  width: 100%;
  padding: 12px;
  text-align: left;

  background: #252b2c;
  color: #ddd;

  border: 1px solid #454545;

  font-family: "Roboto", sans-serif;
  font-weight: 700;
  font-size: 12px;

  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.location-button:hover {
  border-color: #ea534c;
}

.location-button.active {
  background: #422828;
  border-color: #ea534c;
  color: white;
}

.location-button:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.location-indicator {
  color: #ea534c;
  margin-right: 8px;
}

.location-detail {
  border-top: 1px solid #ea534c;
  padding-top: 12px;
  line-height: 1.6;
}

.location-detail h3 {
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 26px;
  color: white;
  margin: 8px 0;
  text-transform: uppercase;
}

.location-type {
  color: #ea534c;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.location-coordinates {
  font-family: monospace;
  color: #aaa;
  font-size: 11px;
  margin-top: 15px;
}


.rotation-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px;
  margin: 12px 0 20px;

  background: #252b2c;
  border: 1px solid var(--primary-color, #ea534c);
  color: white;

  font-family: "Roboto", sans-serif;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.rotation-toggle:hover {
  background: #422828;
}

.rotation-toggle:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.hotkey {
  color: var(--primary-color, #ea534c);
  white-space: nowrap;
}

.viewer-main {
  display: grid;
  grid-template-rows: minmax(320px, 65vh) minmax(220px, 1fr);
  min-height: 0;
}

.briefing-panel {
  background: #151b1f;
  border-top: 1px solid var(--primary-color, #ea534c);
  overflow-y: auto;
  min-height: 0;
}

.briefing-content {
  padding: 22px 26px 28px;
  color: rgba(255, 255, 255, 0.87);
  font-family: "Roboto", sans-serif;
  line-height: 1.65;
}


/* PLANETARY INTELLIGENCE MARKDOWN */

.planet-markdown {
  color: #ddd;
  line-height: 1.65;
}

.planet-markdown :deep(h1) {
  margin: 0 0 8px;
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #fff;
}

.planet-markdown :deep(h2) {
  margin: 28px 0 12px;
  font-family: "Big Shoulders Display", sans-serif;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--primary-color, #ea534c);
}

.planet-markdown :deep(p) {
  margin: 0 0 14px;
  font-size: 14px;
}

.planet-markdown :deep(h1 + p) {
  color: var(--primary-color, #ea534c);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
}

.planet-markdown :deep(strong) {
  color: #fff;
  font-weight: 700;
}

.planet-markdown :deep(ul) {
  list-style: square;
  padding-left: 24px;
  margin: 12px 0 20px;
}

.planet-markdown :deep(li) {
  margin-bottom: 7px;
  font-size: 14px;
}

.planet-markdown :deep(li::marker) {
  color: var(--primary-color, #ea534c);
}

.planet-markdown :deep(a) {
  color: var(--primary-color, #ea534c);
}

.planet-markdown :deep(blockquote) {
  margin: 18px 0;
  padding: 12px 16px;
  border-left: 3px solid var(--primary-color, #ea534c);
  background: rgba(234, 83, 76, 0.08);
}


</style>
