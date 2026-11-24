
import * as THREE from "three";

export function createCloudLayer(
  texturePath = "/planets/cressidium-clouds.png"
) {
  const texture = new THREE.TextureLoader().load(
    texturePath
  );

  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.SphereGeometry(
    1.018,
    64,
    64
  );

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    side: THREE.FrontSide
  });

  const clouds = new THREE.Mesh(
    geometry,
    material
  );

  clouds.userData.cloudTexture = texture;

  return clouds;
}
