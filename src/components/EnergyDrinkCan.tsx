"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import StaticCanPoster from "./StaticCanPoster";
import { onCanSpin } from "@/lib/can-spin-bus";
import { getCanSize, onCanSizeChange } from "@/lib/can-size-bus";
import type { SizeId } from "@/config/brand";

// Slim 500ml proportions: diameter:height ~= 1:3.2.
const CAN_HEIGHT = 2.0;
const CAN_RADIUS = CAN_HEIGHT / 6.4;
const CAN_LATHE_SEGMENTS = 64;
const CHIME_STEPS = 10;
const CHIME_H = CAN_HEIGHT * 0.03; // thin silver chime — ~3% of total height
const TAPER_H = CAN_HEIGHT * 0.03; // thin silver rim into the neck — ~3% of total height
// A slim can's shoulder is a gentle narrowing, not a dramatic taper — the
// neck stays close to the body's own radius.
const NECK_RADIUS = CAN_RADIUS * 0.85;
const LID_RIM_H = TAPER_H * 0.18;
const RIM_BUMP_RADIUS = NECK_RADIUS * 1.04;
const DISH_DEPTH = TAPER_H * 0.35;

// Shared Y coordinates (can-local space), hoisted so the profile builder, the
// wall cylinder, and the pull-tab placement all use the same numbers instead
// of recomputing them. Chime and taper heights are equal, so the wall is
// centered at y=0, same as the can itself.
const WALL_BOTTOM_Y = -CAN_HEIGHT / 2 + CHIME_H;
const WALL_TOP_Y = CAN_HEIGHT / 2 - TAPER_H;
const WALL_HEIGHT = WALL_TOP_Y - WALL_BOTTOM_Y;
const RIM_BUMP_Y = CAN_HEIGHT / 2 - LID_RIM_H + LID_RIM_H * 0.4;
const DISH_LOW_Y = RIM_BUMP_Y - DISH_DEPTH;

// Pull tab, sized and offset off-center within the dish, the way a real tab
// sits — not centered on the can's axis.
const TAB_RING_RADIUS = NECK_RADIUS * 0.22;
const TAB_TUBE_RADIUS = TAB_RING_RADIUS * 0.22;
const TAB_OFFSET_Z = NECK_RADIUS * 0.3;
const TAB_Y = DISH_LOW_Y + DISH_DEPTH * 0.6;

function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

interface CanProfile {
  /** Base center -> rounded chime, ending exactly where the straight wall
   *  begins. Starts at radius 0, which is what seals the bottom — no
   *  separate cap geometry, and nothing for the camera to see into. Its own
   *  mesh/material (bare brushed aluminium, like the lid) — the wall between
   *  it and the lid is a separate plain cylinder carrying the label. */
  chime: THREE.Vector2[];
  /** Shoulder taper -> neck -> raised rim lip -> concave dish -> lid center,
   *  starting from the wall's own top point so the wall cylinder and this
   *  lathed shell meet seamlessly with no gap or overlap. Its own
   *  mesh/material so the lid can read as brushed aluminium (broader
   *  specular response) without changing the wall's finish. */
  lid: THREE.Vector2[];
}

/**
 * The can's silhouette, bottom to top, each half revolved by
 * THREE.LatheGeometry into a closed solid. See the `CanProfile` fields above
 * for how the split is drawn and why.
 */
function buildCanProfile(): CanProfile {
  const chime: THREE.Vector2[] = [];
  const lid: THREE.Vector2[] = [];
  const yBottom = -CAN_HEIGHT / 2;

  chime.push(new THREE.Vector2(0, yBottom));

  for (let i = 1; i <= CHIME_STEPS; i++) {
    const t = i / CHIME_STEPS;
    const angle = t * (Math.PI / 2);
    chime.push(
      new THREE.Vector2(CAN_RADIUS * Math.sin(angle), yBottom + CHIME_H * (1 - Math.cos(angle)))
    );
  }

  lid.push(new THREE.Vector2(CAN_RADIUS, WALL_TOP_Y));

  const taperSpan = TAPER_H - LID_RIM_H;
  const taperSteps = 8;
  for (let i = 1; i <= taperSteps; i++) {
    const t = i / taperSteps;
    // A gentle symmetric ease — a slim can's shoulder is a soft narrowing,
    // not a pronounced tallboy-style shoulder line.
    const ease = smoothstep(t);
    lid.push(
      new THREE.Vector2(
        CAN_RADIUS + (NECK_RADIUS - CAN_RADIUS) * ease,
        WALL_TOP_Y + taperSpan * t
      )
    );
  }

  lid.push(new THREE.Vector2(RIM_BUMP_RADIUS, RIM_BUMP_Y));

  // Dish: curves inward and down from the rim lip to its lowest point, then
  // back up toward the (slightly higher) center — a shallow concave stamp.
  const dishLowRadius = NECK_RADIUS * 0.45;
  const dishSteps = 5;
  for (let i = 1; i <= dishSteps; i++) {
    const t = i / dishSteps;
    const ease = smoothstep(t);
    lid.push(
      new THREE.Vector2(
        RIM_BUMP_RADIUS + (dishLowRadius - RIM_BUMP_RADIUS) * ease,
        RIM_BUMP_Y + (DISH_LOW_Y - RIM_BUMP_Y) * ease
      )
    );
  }

  const centerY = DISH_LOW_Y + DISH_DEPTH * 0.7;
  const centerSteps = 4;
  for (let i = 1; i <= centerSteps; i++) {
    const t = i / centerSteps;
    const ease = smoothstep(t);
    lid.push(
      new THREE.Vector2(dishLowRadius * (1 - ease), DISH_LOW_Y + (centerY - DISH_LOW_Y) * ease)
    );
  }

  return { chime, lid };
}

// Pure math over fixed constants — computed once at module load, not inside
// a component, so there's no render-purity question about it.
const { chime: CHIME_PROFILE, lid: LID_PROFILE } = buildCanProfile();

/**
 * Loads the officially released label artwork (public/yexx-label.png) as the
 * wall's map. A full-circumference wrap, artwork centered at u=0.5 — the
 * wall mesh below is rotated 180 degrees so that center faces the camera,
 * the same trick the can's earlier procedural label used. No recoloring, no
 * outline, no restyling: this is the released design, used unchanged.
 */
function useLabelTexture(): THREE.Texture | null {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load("/yexx-label.png", (loaded) => {
      if (cancelled) return;
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.wrapS = THREE.RepeatWrapping;
      loaded.anisotropy = gl.capabilities.getMaxAnisotropy();
      setTexture(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [gl]);

  return texture;
}

interface Droplet {
  position: [number, number, number];
  scale: number;
}

/**
 * Deterministic PRNG (mulberry32) instead of Math.random: the droplet layout
 * only needs to look scattered, and a seeded generator keeps the function
 * pure (same inputs -> same output) rather than relying on useMemo to hide
 * an impure call from re-renders.
 */
function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDroplets(count: number): Droplet[] {
  const random = mulberry32(1337);
  const drops: Droplet[] = [];
  // Kept within the wall's y-span, margined in from both silver rims, so
  // droplets sit on the print and never spill onto the chime or shoulder.
  const yMargin = 0.05;
  const yRange = WALL_HEIGHT / 2 - yMargin;
  for (let i = 0; i < count; i++) {
    const angle = random() * Math.PI * 2;
    const y = THREE.MathUtils.lerp(-yRange, yRange, random());
    const r = CAN_RADIUS + 0.01;
    const scale = THREE.MathUtils.lerp(0.006, 0.02, Math.pow(random(), 1.5));
    drops.push({
      position: [Math.cos(angle) * r, y, Math.sin(angle) * r],
      scale,
    });
  }
  return drops;
}

function useDroplets(count: number): Droplet[] {
  return useMemo(() => buildDroplets(count), [count]);
}

/**
 * A simple stylized pull tab: a flattened finger-loop ring lying flat in the
 * dish, plus a small rivet nub toward the can's center. Off-center within
 * the dish, the way a real tab sits.
 */
function PullTab() {
  return (
    <group position={[0, TAB_Y, TAB_OFFSET_Z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[TAB_RING_RADIUS, TAB_TUBE_RADIUS, 12, 24]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, TAB_TUBE_RADIUS * 0.4, -TAB_OFFSET_Z * 0.9]} castShadow>
        <sphereGeometry args={[TAB_TUBE_RADIUS * 1.3, 12, 12]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Shared by the chime and the lid — both are bare brushed aluminium, just
// two separate meshes because they're on either side of the labeled wall.
const METAL_COLOR = "#ededed";
const METAL_METALNESS = 0.85;
const METAL_ROUGHNESS = 0.42;

function Can({ dropletCount }: { dropletCount: number }) {
  const labelTexture = useLabelTexture();
  const droplets = useDroplets(dropletCount);
  const group = useRef<THREE.Group>(null);

  return (
    <group ref={group}>
      {/* Chime: the rounded bottom edge, bare brushed aluminium, closed at
          the base — starts at radius 0, which is what seals the bottom with
          no separate cap geometry and nothing for the camera to see into. */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[CHIME_PROFILE, CAN_LATHE_SEGMENTS]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={METAL_METALNESS} roughness={METAL_ROUGHNESS} />
      </mesh>

      {/* Wall: a plain cylinder, exactly as tall as the gap between the
          chime and the shoulder, carrying the released label artwork edge
          to edge — no bare metal in the middle, no step where print meets
          metal, because there's no geometry seam here at all, just the one
          continuous printed surface.
          Rotated so the texture's u=0.5 (where the artwork is centered)
          faces the camera: the cylinder's u=0 seam sits at +Z by default. */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[CAN_RADIUS, CAN_RADIUS, WALL_HEIGHT, CAN_LATHE_SEGMENTS]} />
        {/* White base so the map shows through unchanged (map colors are
            multiplied by this), with enough roughness/metalness for a soft
            sheen rather than flat matte chalk. */}
        <meshStandardMaterial color="#ffffff" map={labelTexture ?? undefined} roughness={0.45} metalness={0.1} />
      </mesh>

      {/* Lid: shoulder taper, neck, rim lip and concave dish — bare brushed
          aluminium, same finish as the chime. */}
      <mesh castShadow receiveShadow>
        <latheGeometry args={[LID_PROFILE, CAN_LATHE_SEGMENTS]} />
        <meshStandardMaterial color={METAL_COLOR} metalness={METAL_METALNESS} roughness={METAL_ROUGHNESS} />
      </mesh>

      <PullTab />

      {/* Water droplets */}
      <Instances limit={droplets.length}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshPhysicalMaterial
          color="#ffffff"
          roughness={0.05}
          metalness={0}
          transmission={1}
          thickness={0.05}
          ior={1.33}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
        {droplets.map((d, i) => (
          <Instance
            key={i}
            position={d.position}
            scale={[d.scale, d.scale * 0.85, d.scale]}
          />
        ))}
      </Instances>
    </group>
  );
}

const IDLE_SWAY_DEG = 6;
const IDLE_SWAY_SPEED = 0.9; // rad/s of the sine argument — a slow back-and-forth, not a spin
const FLOURISH_SPIN_DURATION = 0.7; // seconds for the Shop-triggered 360
// Subtle continuous life at rest: a slow vertical bob plus a lazy x/z
// drift at two different, non-multiple speeds so it traces a slow organic
// wander rather than a back-and-forth line. Small enough (a few percent of
// CAN_HEIGHT/CAN_RADIUS) to read as "alive," not as motion sickness.
const BOB_AMPLITUDE = 0.04;
const BOB_SPEED = 0.5;
const DRIFT_AMPLITUDE = 0.02;
const DRIFT_SPEED_X = 0.17;
const DRIFT_SPEED_Z = 0.23;

// 250ml is the baseline the camera framing (see CANVAS_CAMERA below) is
// tuned against. 150ml is shorter and slightly narrower — X and Z share one
// factor so every horizontal cross-section stays circular (no oval
// distortion), only Y differs.
const SIZE_SCALE: Record<SizeId, [number, number, number]> = {
  "250ml": [1, 1, 1],
  "150ml": [0.92, 0.8, 0.92],
};
const SIZE_SCALE_LERP = 0.1;

/**
 * Owns the can's size (150ml vs 250ml), read from `can-size-bus` — set by
 * the Shop section outside the Canvas — and smoothly lerped rather than
 * snapped. Kept as its own group/useFrame, separate from SpinningCan's
 * rotation and bob/drift, so the two concerns never collide in one function.
 */
function CanSizeGroup({ dropletCount }: { dropletCount: number }) {
  const group = useRef<THREE.Group>(null);
  const targetScale = useRef(SIZE_SCALE[getCanSize()]);

  useEffect(
    () =>
      onCanSizeChange((size) => {
        targetScale.current = SIZE_SCALE[size];
      }),
    []
  );

  useFrame(() => {
    if (!group.current) return;
    const [tx, ty, tz] = targetScale.current;
    group.current.scale.x = THREE.MathUtils.lerp(group.current.scale.x, tx, SIZE_SCALE_LERP);
    group.current.scale.y = THREE.MathUtils.lerp(group.current.scale.y, ty, SIZE_SCALE_LERP);
    group.current.scale.z = THREE.MathUtils.lerp(group.current.scale.z, tz, SIZE_SCALE_LERP);
  });

  return (
    <group ref={group}>
      <Can dropletCount={dropletCount} />
    </group>
  );
}

/**
 * Idle motion is a gentle +/-15 degree sway around front-facing, not a
 * continuous rotation — the label must stay readable, not spin away from the
 * viewer. A full 360 is only ever a brief, explicitly-triggered flourish
 * (see `triggerCanSpin`), layered on top of the sway and then handed back to
 * it once complete. A slow bob + drift on position runs alongside the sway
 * so the can never looks frozen at rest.
 */
function SpinningCan({ dropletCount }: { dropletCount: number }) {
  const group = useRef<THREE.Group>(null);
  const flourish = useRef(0); // 0 = idle; while active, counts 0 -> 1 across FLOURISH_SPIN_DURATION

  useEffect(() => onCanSpin(() => {
    flourish.current = Number.EPSILON; // >0 marks "in progress"; useFrame drives it from here
  }), []);

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    const sway = THREE.MathUtils.degToRad(IDLE_SWAY_DEG) * Math.sin(t * IDLE_SWAY_SPEED);

    let extra = 0;
    if (flourish.current > 0) {
      const next = flourish.current + delta / FLOURISH_SPIN_DURATION;
      if (next >= 1) {
        flourish.current = 0;
      } else {
        flourish.current = next;
        extra = next * Math.PI * 2;
      }
    }

    group.current.rotation.y = sway + extra;
    group.current.position.y = BOB_AMPLITUDE * Math.sin(t * BOB_SPEED);
    group.current.position.x = DRIFT_AMPLITUDE * Math.sin(t * DRIFT_SPEED_X);
    group.current.position.z = DRIFT_AMPLITUDE * Math.cos(t * DRIFT_SPEED_Z);
  });

  return (
    <group ref={group}>
      <CanSizeGroup dropletCount={dropletCount} />
    </group>
  );
}

const TILT_LERP = 0.08;
const SCROLL_TILT_MAX_Y_DEG = 12;
const SCROLL_TILT_MAX_X_DEG = 4;

/**
 * Applies the scroll-driven tilt to the can, entirely inside the scene.
 * Reads `scrollProgressRef` each frame (never as a prop that changes
 * identity, never via React state) and lerps rotation toward the target so
 * the motion stays smooth even though the underlying value updates on its
 * own cadence (framer-motion's spring, decoupled from React's render loop).
 *
 * Both axes are clamped hard (12 degrees Y, 4 degrees X) — a product shot at
 * eye level, not a look down into the lid, and never far enough around to
 * turn the label away from the camera.
 */
function TiltGroup({
  scrollProgressRef,
  children,
}: {
  scrollProgressRef?: RefObject<number>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    const progress = THREE.MathUtils.clamp(scrollProgressRef?.current ?? 0, 0, 1);
    const targetY = THREE.MathUtils.degToRad(progress * SCROLL_TILT_MAX_Y_DEG);
    const targetX = THREE.MathUtils.degToRad(progress * -SCROLL_TILT_MAX_X_DEG);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, TILT_LERP);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, TILT_LERP);
  });
  return <group ref={group}>{children}</group>;
}

/** A soft white-to-transparent radial gradient, tunable per use (a wide gentle
 *  falloff for the halo behind the can, a tighter fast one for the floor
 *  reflection). Grey/white/black only — no colour stop is ever introduced. */
function createRadialGlowTexture(midStop: number, midAlpha: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(255,255,255,0.55)");
  gradient.addColorStop(midStop, `rgba(255,255,255,${midAlpha})`);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A soft-edged vertical light beam: opaque at one end, fading to transparent
 *  at the other, with the same fade blurring both side edges. */
function createShaftTexture(): THREE.CanvasTexture {
  const width = 128;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const vertical = ctx.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(255,255,255,0.9)");
  vertical.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "destination-in";
  const horizontal = ctx.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, "rgba(255,255,255,0)");
  horizontal.addColorStop(0.5, "rgba(255,255,255,1)");
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The three depth cues behind/around the can: a soft glow separating its
 * silhouette from the black background, a faint light shaft matching the key
 * light's upper-right direction, and a fast-fading floor reflection. All
 * three are static (no per-frame uniform updates) and additive/low-opacity,
 * so their cost is a few extra flat-shaded draw calls, not a simulation.
 * Built once via useState's lazy initializer, same rationale as
 * `useLabelTexture`: stable identity, no re-render on mutation.
 */
function SceneDepthEffects() {
  const [glowTexture] = useState(() => createRadialGlowTexture(0.4, 0.22));
  const [reflectionTexture] = useState(() => createRadialGlowTexture(0.18, 0.1));
  const [shaftTexture] = useState(() => createShaftTexture());

  return (
    <>
      <sprite position={[0, 0.05, -0.55]} scale={[2.7, 3.3, 1]} renderOrder={-2}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.5}
        />
      </sprite>

      <mesh
        position={[0.25, 0.25, -0.3]}
        rotation={[0, 0, THREE.MathUtils.degToRad(-20)]}
        renderOrder={-1}
      >
        <planeGeometry args={[1.1, 3.6]} />
        <meshBasicMaterial
          map={shaftTexture}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          opacity={0.22}
        />
      </mesh>

      <mesh position={[0, -1.03, 0.1]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1.15, 1.7]} />
        <meshBasicMaterial
          map={reflectionTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          opacity={0.16}
        />
      </mesh>
    </>
  );
}

/** A soft dark radial gradient, standing in for a real-time contact shadow on
 *  the reduced-quality mobile tier — a single flat-shaded draw call instead
 *  of a shadow-map pass. */
function createRadialShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(0,0,0,0.45)");
  gradient.addColorStop(0.55, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Cheap stand-in for `ContactShadows` on the reduced-quality mobile tier: a
 *  flat, non-shadow-mapped gradient plane under the can instead of a
 *  real-time computed shadow. */
function SimpleGradientShadow() {
  const [shadowTexture] = useState(() => createRadialShadowTexture());
  return (
    <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3, 1.8]} />
      <meshBasicMaterial map={shadowTexture} transparent depthWrite={false} />
    </mesh>
  );
}

// RectAreaLightTexturesLib.init() (called by RectAreaLightUniformsLib.init())
// unconditionally allocates fresh DataTextures on every call — it is NOT
// idempotent, despite that being an easy assumption from its name. Calling
// it at module scope meant every Fast Refresh reload during development
// re-ran it, each time orphaning the previous call's GPU-uploaded LTC
// textures (nothing disposes them) — a slow leak across a long dev session
// that ended in "THREE.WebGLRenderer: Context Lost." A flag on `globalThis`
// (not a module-level `let`, which HMR resets along with the rest of the
// module) makes it run at most once per real browser session.
function initRectAreaLightUniformsOnce() {
  const flagged = globalThis as typeof globalThis & { __yexxRectAreaLightInited?: boolean };
  if (flagged.__yexxRectAreaLightInited) return;
  RectAreaLightUniformsLib.init();
  flagged.__yexxRectAreaLightInited = true;
}

/**
 * A broad, soft fill — a large rect area light rather than another hard
 * directional — so the matte body's curvature reads through gentle,
 * graduated shading across its width instead of one narrow specular streak.
 * The existing directional key light is untouched, so the brushed-aluminium
 * lid still picks up its own distinct, tighter highlight.
 */
function AreaFillLight() {
  const ref = useRef<THREE.RectAreaLight>(null);
  useEffect(() => {
    initRectAreaLightUniformsOnce();
    ref.current?.lookAt(0, 0, 0);
  }, []);
  return (
    <rectAreaLight
      ref={ref}
      position={[1.2, 0.8, 3.6]}
      width={4.5}
      height={5.5}
      intensity={1.2}
      color="#ffffff"
    />
  );
}

// Hoisted to module scope so these are stable references across renders —
// Canvas reconfigures the renderer/camera whenever it sees a new object
// identity for these props, so recreating them inline caused a
// reconfigure-on-every-render loop (and, via `shadows` as a boolean, a
// repeated PCFSoftShadowMap deprecation warning each time it reapplied).
// Straight-on at eye level (y=0, looking at the can's own vertical center).
// This distance is tuned empirically, not purely by formula — measuring the
// actual rendered can's bright-pixel span in a screenshot against the
// container's own height is what the fov/distance textbook formula misses
// (lighting falloff softens the silhouette edge before the true geometric
// edge, and the near-surface-vs-center depth difference matters at this
// scale). At 4.1 the can's own silhouette measured to ~75-80% of the
// container height; recalibrated to 4.9 (inverse-distance estimate) to
// bring the 250ml can — the size baseline; see SIZE_SCALE above — down to
// ~65%, per client feedback that the can dominated the hero. Verify against
// a real screenshot after touching this, not just the math.
const CANVAS_CAMERA = { position: [0, 0, 4.9] as [number, number, number], fov: 36 };
// alpha: true + no scene.background keeps the canvas fully transparent, so
// the black Hero background reads as one continuous surface behind both the
// text and the can — no separate panel behind the 3D content.
const CANVAS_GL = { antialias: true, alpha: true };
const CANVAS_SHADOWS = { type: THREE.PCFShadowMap };
const DEFAULT_DPR: [number, number] = [1, 1.75];
// Reduced mobile tier: fixed at 1 regardless of the device's real pixel
// ratio, since the retina-range upper bound above is what actually strains a
// phone GPU.
const REDUCED_DPR: [number, number] = [1, 1];
const CONTEXT_RECOVERY_TIMEOUT_MS = 4000;
const FULL_DROPLET_COUNT = 60;
const REDUCED_DROPLET_COUNT = 15;

interface EnergyDrinkCanProps {
  /** Stops the render loop (e.g. while off-screen) without unmounting the scene. */
  paused?: boolean;
  /** "reduced" trims the scene for phone-class GPUs: fixed dpr, no dynamic
   *  shadows (a flat gradient plane stands in for ContactShadows), fewer
   *  droplets, and a plain directional fill instead of the RectAreaLight. */
  quality?: "full" | "reduced";
  /** Scroll progress (0-1) driving the can's tilt, read inside useFrame. */
  scrollProgressRef?: RefObject<number>;
  /** Fired once the WebGL context has been created and the first frame is
   *  about to render, so the caller can fade the canvas in over the poster. */
  onReady?: () => void;
}

function EnergyDrinkCan({
  paused = false,
  quality = "full",
  scrollProgressRef,
  onReady,
}: EnergyDrinkCanProps = {}) {
  // If the WebGL context is lost and doesn't recover in time, give up on the
  // 3D scene entirely and fall back to the flat poster rather than leaving a
  // dead canvas on screen.
  const [contextFailed, setContextFailed] = useState(false);
  const isReduced = quality === "reduced";

  // Read via a ref rather than a useCallback dependency: `onReady` is an
  // inline arrow function at the call site, and depending on it directly
  // would recreate `handleCreated` — and therefore the `onCreated` prop
  // identity — on every render, which retriggers a full Canvas reconfigure
  // (the same class of bug the hoisted `gl`/`camera`/`dpr` constants above
  // exist to avoid).
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const handleCreated = useCallback((state: RootState) => {
    const canvas = state.gl.domElement;
    let recoveryTimer: ReturnType<typeof setTimeout> | undefined;

    const onLost = (event: Event) => {
      // Allowing the default action is what lets the browser attempt to
      // restore the context at all — without this the loss is terminal.
      event.preventDefault();
      recoveryTimer = setTimeout(() => setContextFailed(true), CONTEXT_RECOVERY_TIMEOUT_MS);
    };
    const onRestored = () => {
      clearTimeout(recoveryTimer);
    };

    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    onReadyRef.current?.();
  }, []);

  if (contextFailed) {
    return <StaticCanPoster />;
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        shadows={isReduced ? false : CANVAS_SHADOWS}
        camera={CANVAS_CAMERA}
        gl={CANVAS_GL}
        dpr={isReduced ? REDUCED_DPR : DEFAULT_DPR}
        frameloop={paused ? "never" : "always"}
        onCreated={handleCreated}
      >
        {/* Plain lights instead of an HDRI Environment: no network fetch, no
            one-time PMREM generation cost. Key upper right, softer fill from
            the left, rim behind, low ambient — the rims stay bright enough
            to read as brushed aluminium off the directional highlights. */}
        <directionalLight position={[3, 4, 2]} intensity={2} color="#ffffff" castShadow />
        <directionalLight position={[-4, 1.5, 2]} intensity={0.6} color="#e8ecff" />
        <directionalLight position={[-2, 2, -4]} intensity={1} color="#dfe7ff" />
        {/* Near-overhead, aimed mostly straight down at the lid's dish and
            rim — the other three lights sit low enough that their specular
            hit on the lid's mostly-upward-facing normals is thin. */}
        <directionalLight position={[0.6, 6, 2.5]} intensity={0.8} color="#ffffff" />
        {/* Low, forward fill aimed up at the bottom chime — the other lights
            all sit above the can's center, so its downward-curving surface
            was the one band still reading black. */}
        <directionalLight position={[0, -2.5, 3]} intensity={0.55} color="#ffffff" />
        <ambientLight intensity={0.22} />
        {/* Matte body now carries a real diffuse response to every light
            above (unlike the old near-pure-metal surface), so the whole set
            is trimmed down from earlier tuning to avoid blowing the fake-
            metal bands and Y-mark outline out toward flat white. On the
            reduced mobile tier the RectAreaLight (an LTC-textured light,
            comparatively expensive) is swapped for a plain directional fill
            aimed from roughly the same direction. */}
        {isReduced ? (
          <directionalLight position={[1.2, 0.8, 3.6]} intensity={0.9} color="#ffffff" />
        ) : (
          <AreaFillLight />
        )}

        {/* Depth cues, back to front: glow behind the can, then the light
            shaft, then the can itself, then its floor reflection. */}
        <SceneDepthEffects />

        <TiltGroup scrollProgressRef={scrollProgressRef}>
          <SpinningCan dropletCount={isReduced ? REDUCED_DROPLET_COUNT : FULL_DROPLET_COUNT} />
        </TiltGroup>

        {isReduced ? (
          <SimpleGradientShadow />
        ) : (
          <ContactShadows
            position={[0, -1.05, 0]}
            opacity={0.55}
            scale={4}
            blur={2.2}
            far={1.5}
          />
        )}

        {/* Drag-to-orbit is desktop-only: on the reduced mobile tier a
            single-finger drag over the can needs to scroll the page, not
            rotate it. Only the automatic scroll tilt applies on phones. */}
        {!isReduced && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={3}
            maxDistance={7}
            // Keeps the user from orbiting underneath (near maxPolarAngle,
            // looking up into the base) or straight overhead (near
            // minPolarAngle, looking straight down past the lid) — the can
            // must always read as a can, not a floating disc.
            minPolarAngle={THREE.MathUtils.degToRad(35)}
            maxPolarAngle={THREE.MathUtils.degToRad(100)}
            autoRotate={false}
            makeDefault
          />
        )}
      </Canvas>
    </div>
  );
}

export default memo(EnergyDrinkCan);
