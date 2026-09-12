"use client";

import { useEffect, useRef } from "react";
import { Camera, Geometry, Mesh, Program, Renderer } from "ogl";

// Ported from React Bits' Particles background (reactbits.dev/backgrounds/particles):
// a slow, sparse field of soft white points drifting in 3D, rendered on its
// own tiny WebGL canvas via `ogl` rather than three.js — it never touches the
// R3F <Canvas> and has nothing to do with the can scene's render loop. The
// upstream component's color and pointer-hover props are dropped entirely:
// this brand stays strictly monochrome, and a background must never react to
// the cursor.
const PARTICLE_COUNT = 80;
const PARTICLE_SPREAD = 11;
const SPEED = 0.06;
const BASE_SIZE = 60;
const SIZE_RANDOMNESS = 1;
const CAMERA_DISTANCE = 20;

const vertex = /* glsl */ `
  attribute vec3 position;
  attribute vec4 random;

  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  uniform float uSizeRandomness;

  varying vec4 vRandom;

  void main() {
    vRandom = random;

    vec3 pos = position * uSpread;
    pos.z *= 10.0;

    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    float t = uTime;
    mPos.x += sin(t * random.z + 6.28 * random.w) * mix(0.1, 1.5, random.x);
    mPos.y += sin(t * random.y + 6.28 * random.x) * mix(0.1, 1.5, random.w);
    mPos.z += sin(t * random.w + 6.28 * random.y) * mix(0.1, 1.5, random.z);

    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = (uBaseSize * (1.0 + uSizeRandomness * (random.x - 0.5))) / length(mvPos.xyz);

    gl_Position = projectionMatrix * mvPos;
  }
`;

// Always pure white, softly circular — no per-particle color attribute at
// all, so there is no color to override.
const fragment = /* glsl */ `
  precision highp float;

  varying vec4 vRandom;

  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    float circle = smoothstep(0.5, 0.4, d) * 0.7;
    gl_FragColor = vec4(1.0, 1.0, 1.0, circle);
  }
`;

/**
 * Fixed, monochrome particle field behind the hero. Mounted only when the
 * caller has already decided 3D/motion content is safe to show (see
 * `useCanSupport3D`) — this component does not re-check reduced-motion or
 * screen size itself.
 */
export default function ParticlesBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ depth: false, alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, CAMERA_DISTANCE);

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener("resize", resize);
    resize();

    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x, y, z, len;
      do {
        x = Math.random() * 2 - 1;
        y = Math.random() * 2 - 1;
        z = Math.random() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      const r = Math.cbrt(Math.random());
      positions.set([x * r, y * r, z * r], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: PARTICLE_SPREAD },
        uBaseSize: { value: BASE_SIZE },
        uSizeRandomness: { value: SIZE_RANDOMNESS },
      },
      transparent: true,
      depthTest: false,
    });

    const particles = new Mesh(gl, { mode: gl.POINTS, geometry, program });

    let frameId: number;
    let lastTime = performance.now();
    let elapsed = 0;

    const update = (t: number) => {
      frameId = requestAnimationFrame(update);
      const delta = t - lastTime;
      lastTime = t;
      elapsed += delta * SPEED;

      program.uniforms.uTime.value = elapsed * 0.001;
      particles.rotation.x = Math.sin(elapsed * 0.0002) * 0.1;
      particles.rotation.y = Math.cos(elapsed * 0.0005) * 0.15;
      particles.rotation.z += 0.01 * SPEED;

      renderer.render({ scene: particles, camera });
    };
    frameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-40"
    />
  );
}
