import * as THREE from "three";

export function createAtmosphere(radius = 1.10) {

  const geometry = new THREE.SphereGeometry(
    radius,
    64,
    64
  );

  const material = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: {
        value: new THREE.Color(0x4a9fff)
      },
      glowStrength: {
        value: 0.4
      }
    },

    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {
        vec4 viewPosition =
          modelViewMatrix * vec4(position, 1.0);

        vNormalView = normalize(
          normalMatrix * normal
        );

        vViewDirection = normalize(
          -viewPosition.xyz
        );

        gl_Position =
          projectionMatrix * viewPosition;
      }
    `,

    fragmentShader: `
      uniform vec3 glowColor;
      uniform float glowStrength;

      varying vec3 vNormalView;
      varying vec3 vViewDirection;

      void main() {

        float facing = abs(dot(
          normalize(vNormalView),
          normalize(vViewDirection)
        ));

        float fresnel = pow(
          1.0 - clamp(facing, 0.0, 1.0),
          3.0
        );

        float alpha = fresnel * glowStrength;

        gl_FragColor = vec4(
          glowColor,
          alpha
        );
      }
    `,

    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true
  });

  return new THREE.Mesh(geometry, material);
}
