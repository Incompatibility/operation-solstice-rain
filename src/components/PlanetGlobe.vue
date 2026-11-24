
<template>
  <div ref="container" class="cressidium-globe">
    <video
      v-if="failed"
      class="fallback-video"
      src="/planet.webm"
      autoplay
      muted
      loop
      playsinline
    ></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as THREE from "three";
import { createAtmosphere } from "@/utils/createAtmosphere.js";
import { createCloudLayer } from "@/utils/createCloudLayer.js";

const container = ref(null);
const failed = ref(false);

let renderer;
let geometry;
let material;
let texture;
let sphere;
let atmosphere;
let cloudLayer;
let scene;
let camera;
let animationFrame;
let lastFrame = 0;

onMounted(() => {
  try {
    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.OrthographicCamera(
      -1.2, 1.2, 1.2, -1.2, 0.1, 10
    );
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    // Transparent WebGL renderer
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power"
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(90, 90);
    renderer.setClearColor(0x000000, 0);

    container.value.appendChild(renderer.domElement);

    // Load Orogen surface texture
    texture = new THREE.TextureLoader().load(
      "/planets/cressidium.png",
      undefined,
      undefined,
      (error) => {
        console.error("Planet texture failed:", error);
        failed.value = true;
      }
    );

    texture.colorSpace = THREE.SRGBColorSpace;

    // Planet geometry and material
    geometry = new THREE.SphereGeometry(1, 64, 64);

    material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      metalness: 0
    });

    sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.y = 0.7;
    sphere.rotation.z = 0.08;
    scene.add(sphere);
    cloudLayer = createCloudLayer();
    cloudLayer.rotation.copy(sphere.rotation);
    scene.add(cloudLayer);
    atmosphere = createAtmosphere(1.10);
    scene.add(atmosphere);


    // Sunlight
    const sunlight = new THREE.DirectionalLight(
      0xffffff, 2.0
    );
    sunlight.position.set(-3, 2, 4);
    scene.add(sunlight);

    // Soft illumination on night side
    const ambient = new THREE.AmbientLight(
      0x9bbed8, 0.45
    );
    scene.add(ambient);

    // Animation loop: 30 FPS maximum
    const animate = (time) => {
      animationFrame = requestAnimationFrame(animate);

      if (document.hidden) {
        lastFrame = time;
        return;
      }

      if (time - lastFrame < 33) return;

      const delta = lastFrame
        ? Math.min(time - lastFrame, 100)
        : 0;

      lastFrame = time;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (!reduceMotion) {
        sphere.rotation.y +=
          (delta / 30000) * Math.PI * 2;
        cloudLayer.rotation.y +=
            (delta / 24000) * Math.PI * 2;

      }

      renderer.render(scene, camera);
    };

    animationFrame = requestAnimationFrame(animate);

  } catch (error) {
    console.error("Globe initialization failed:", error);
    failed.value = true;
  }
});

// Release GPU resources when component is removed
onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  atmosphere?.geometry.dispose();
  atmosphere?.material.dispose();  
  geometry?.dispose();
  material?.dispose();
  texture?.dispose();

cloudLayer?.geometry.dispose();
cloudLayer?.material.dispose();
cloudLayer?.userData.cloudTexture?.dispose();


  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
});
</script>

<style scoped>
.cressidium-globe {
  position: relative;
  width: 90px;
  height: 90px;
  min-width: 90px;
  flex-shrink: 0;
  overflow: hidden;
}

.cressidium-globe canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.fallback-video {
  position: absolute;
  inset: 0;
  width: 90px;
  height: 90px;
  object-fit: contain;
}
</style>
