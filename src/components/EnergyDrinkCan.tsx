"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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

// Single-finger horizontal drag, mobile-tier only (see `touchEnabled` at the
// call site — desktop's OrbitControls already covers mouse/multi-touch
// orbit). Reads the horizontal delta in CSS pixels off raw TouchEvents
// attached directly to the canvas, not R3F's own pointer events, because
// those don't give a pixel-width-relative delta without extra bookkeeping.
// `touch-action: pan-y` — set on the Canvas via a `style` prop at the call
// site, not mutated here — is what actually keeps page scroll working: it
// tells the browser vertical drags on this element are its own native
// scroll, so these handlers only ever see/need the horizontal delta; they
// never call preventDefault, so a diagonal drag both rotates and scrolls.
const DRAG_RADIANS_PER_PIXEL = 0.012;
const DRAG_VELOCITY_DAMPING = 0.93; // per-frame decay once released — a second or so of momentum
const DRAG_RETURN_LERP = 0.03; // slow constant pull back toward front-facing (0)
const DRAG_MOMENTUM_STOP_EPS = 0.0001;

function useCanTouchDrag(enabled: boolean) {
  const { gl } = useThree();
  const dragOffsetRef = useRef(0);
  const velocityRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;

    let lastX = 0;
    let lastT = 0;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      draggingRef.current = true;
      velocityRef.current = 0;
      lastX = event.touches[0].clientX;
      lastT = performance.now();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!draggingRef.current || event.touches.length !== 1) return;
      const x = event.touches[0].clientX;
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      const angleDelta = (x - lastX) * DRAG_RADIANS_PER_PIXEL;
      dragOffsetRef.current += angleDelta;
      // Normalized to "radians this would cover in one ~60fps frame" so the
      // momentum decay loop in useFrame (a per-frame multiply) starts from
      // a magnitude that's comparable frame to frame regardless of the
      // touchmove event's own irregular timing.
      velocityRef.current = (angleDelta / dt) * 16.67;
      lastX = x;
      lastT = now;
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, gl]);

  return { dragOffsetRef, velocityRef, draggingRef };
}

/**
 * Idle motion is a gentle +/-15 degree sway around front-facing, not a
 * continuous rotation — the label must stay readable, not spin away from the
 * viewer. A full 360 is only ever a brief, explicitly-triggered flourish
 * (see `triggerCanSpin`), layered on top of the sway and then handed back to
 * it once complete. A slow bob + drift on position runs alongside the sway
 * so the can never looks frozen at rest. On the mobile tier (`touchEnabled`),
 * a single-finger horizontal drag adds a Y-rotation offset on top of all of
 * that, with momentum on release that eases back toward 0 (see
 * `useCanTouchDrag`) — desktop keeps OrbitControls instead (see the
 * `!isReduced` gate around it in EnergyDrinkCan).
 */
function SpinningCan({
  dropletCount,
  touchEnabled = false,
}: {
  dropletCount: number;
  touchEnabled?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const flourish = useRef(0); // 0 = idle; while active, counts 0 -> 1 across FLOURISH_SPIN_DURATION
  const { dragOffsetRef, velocityRef, draggingRef } = useCanTouchDrag(touchEnabled);

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

    if (touchEnabled && !draggingRef.current) {
      if (Math.abs(velocityRef.current) > DRAG_MOMENTUM_STOP_EPS) {
        dragOffsetRef.current += velocityRef.current;
        velocityRef.current *= DRAG_VELOCITY_DAMPING;
      } else {
        velocityRef.current = 0;
      }
      dragOffsetRef.current = THREE.MathUtils.lerp(dragOffsetRef.current, 0, DRAG_RETURN_LERP);
    }

    group.current.rotation.y = sway + extra + (touchEnabled ? dragOffsetRef.current : 0);
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

// --- Theatrical spotlight rig -------------------------------------------
// Stage-style beams sweeping down from above and converging on the can.
// Full-quality tier only (see `!isReduced` at the call site) — this never
// mounts on the reduced mobile tier or the static poster, and since the
// static tier is also what `useCanSupport3D` falls back to under
// prefers-reduced-motion, that case is covered for free.

// A lit 3D cone (fresnel edge fade via a custom ShaderMaterial) was the
// first attempt here, but a low-poly open cone stretched hugely non-
// uniformly (thin radius, long length) plus DoubleSide plus additive
// blending produced a hard-edged rectangular ghost across the whole hero —
// two coincident near/far tube walls adding together into a flat, sharp-
// edged panel instead of a soft shaft. Rebuilt as a camera-facing textured
// "billboard" plane instead: the exact visible shape (tight bright core,
// soft halo, sharp length falloff, a bright hotspot at the lamp end) is
// baked into the texture's alpha channel once, at full control, with no
// per-angle lighting-shader edge cases left to go wrong. The plane is
// locked to the source->target axis but still always faces the camera
// around that axis (the same construction used for laser/trail billboards),
// so it reads as a correctly-foreshortened 3D shaft from any angle
// OrbitControls allows, never a flat cutout.
const BEAM_TEXTURE_W = 96;
const BEAM_TEXTURE_H = 384;
// Fraction of the beam's length (0 = source, 1 = target) where visible
// brightness has fully died out — stage beams read as a defined shaft with
// an end, not an infinite soft gradient reaching all the way to the floor.
const BEAM_FADE_CUTOFF = 0.6;
const BEAM_FADE_POWER = 2.2;
// Alpha at the very source, before the small lamp hotspot is added on top —
// the "0.25-0.35" the beam should read as away from that hotspot.
const BEAM_BODY_PEAK_ALPHA = 0.34;
const BEAM_HOTSPOT_PEAK_ALPHA = 0.85;

/** The beam's entire visible shape — taper, tight core, soft halo, sharp
 *  length falloff, and a bright hotspot at the source end — baked once into
 *  a texture's alpha channel. `flipY = false` so texture row 0 (drawn as
 *  the bright end below) lands at the plane's local -Y, which the per-frame
 *  orientation below always points at the beam's actual source. */
function createBeamTexture(): THREE.CanvasTexture {
  const w = BEAM_TEXTURE_W;
  const h = BEAM_TEXTURE_H;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  const data = image.data;
  const cx = w / 2;

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1); // 0 = source (bright end), 1 = target (floor end)
    const lengthFade =
      v >= BEAM_FADE_CUTOFF ? 0 : Math.pow(1 - v / BEAM_FADE_CUTOFF, BEAM_FADE_POWER);
    // Half-width still grows the whole way down (keeps the taper reading as
    // a cone), even though alpha is already 0 well before the target end.
    const halfWidthPx = Math.max(1, THREE.MathUtils.lerp(0.055, 0.5, v) * cx);
    const hotspot = Math.exp(-((v / 0.035) ** 2));

    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x - cx);
      const core = Math.exp(-((dx / (halfWidthPx * 0.22)) ** 2));
      const halo = Math.exp(-((dx / (halfWidthPx * 0.95)) ** 2)) * 0.45;
      const bodyShape = Math.min(1, core + halo);
      const hotspotShape = hotspot * Math.exp(-((dx / (halfWidthPx * 0.55)) ** 2));

      const alpha = Math.min(
        1,
        bodyShape * lengthFade * BEAM_BODY_PEAK_ALPHA + hotspotShape * BEAM_HOTSPOT_PEAK_ALPHA
      );

      const idx = (y * w + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.round(alpha * 255);
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  texture.needsUpdate = true;
  return texture;
}

/** Small radial hotspot sprite pinned to each beam's source point — a
 *  dedicated "the lamp itself is visible" glint, independent of the beam
 *  texture's own hotspot so it stays crisp at any beam width. Sprites are
 *  always fully camera-facing with no normals/edge math at all, so this
 *  carries none of the risk the old lit-cone approach did. */
function createLampGlowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const BEAM_LIGHT_INTENSITY = 2.4;
const BEAM_TARGET_Y = 0.15; // roughly the can's vertical center, slightly toward the label

interface BeamConfig {
  baseAzimuthDeg: number;
  orbitRadius: number;
  orbitHeight: number;
  /** World-space width of the beam plane at its widest (target) end —
   *  narrow: these are tight shafts, not wide cones. */
  baseWidth: number;
  sweepAmpDeg: number;
  periodSec: number;
  phase: number;
  flickerFreqHz: number;
  flickerPhase: number;
  wanderAmp: number;
  wanderPeriodSec: number;
  wanderPhase: number;
}

// Five beams, deliberately uneven in every parameter — angle, distance,
// height, width, and every timing constant. Even spacing or matching
// periods is what makes a sweep rig read as a mechanical pattern instead of
// independent lamps; periods are irregular decimals within the 10-18s
// window specifically so no two beams ever fall back into phase.
const BEAM_CONFIGS: BeamConfig[] = [
  {
    // orbitHeight is deliberately kept within the camera's visible vertical
    // range (roughly +-1.3 world units at this depth/fov) — a source placed
    // above that, off-frame, means the on-screen part of the beam is only
    // ever the already-faded tail, which is what made the first pass
    // invisible: the fade fraction is measured from the (invisible) source,
    // so a beam whose source never appears on screen just reads as gone.
    baseAzimuthDeg: -58,
    orbitRadius: 0.85,
    orbitHeight: 1.15,
    baseWidth: 0.24,
    sweepAmpDeg: 26,
    periodSec: 11.3,
    phase: 0.4,
    flickerFreqHz: 0.72,
    flickerPhase: 0.6,
    wanderAmp: 0.1,
    wanderPeriodSec: 6.3,
    wanderPhase: 0.2,
  },
  {
    baseAzimuthDeg: -21,
    orbitRadius: 1.15,
    orbitHeight: 1.4,
    baseWidth: 0.3,
    sweepAmpDeg: 31,
    periodSec: 14.7,
    phase: 2.1,
    flickerFreqHz: 0.91,
    flickerPhase: 1.7,
    wanderAmp: 0.13,
    wanderPeriodSec: 7.9,
    wanderPhase: 1.4,
  },
  {
    baseAzimuthDeg: 9,
    orbitRadius: 0.7,
    orbitHeight: 1.05,
    baseWidth: 0.2,
    sweepAmpDeg: 20,
    periodSec: 16.5,
    phase: 4.7,
    flickerFreqHz: 0.55,
    flickerPhase: 3.1,
    wanderAmp: 0.08,
    wanderPeriodSec: 5.5,
    wanderPhase: 3.3,
  },
  {
    baseAzimuthDeg: 34,
    orbitRadius: 1.3,
    orbitHeight: 1.5,
    baseWidth: 0.34,
    sweepAmpDeg: 27,
    periodSec: 12.8,
    phase: 1.3,
    flickerFreqHz: 1.08,
    flickerPhase: 4.4,
    wanderAmp: 0.14,
    wanderPeriodSec: 8.7,
    wanderPhase: 5.0,
  },
  {
    baseAzimuthDeg: 63,
    orbitRadius: 0.95,
    orbitHeight: 1.25,
    baseWidth: 0.22,
    sweepAmpDeg: 22,
    periodSec: 17.6,
    phase: 5.5,
    flickerFreqHz: 0.63,
    flickerPhase: 0.2,
    wanderAmp: 0.1,
    wanderPeriodSec: 6.9,
    wanderPhase: 2.6,
  },
];

/** Shared by every beam mesh (only the per-instance transform differs) and
 *  every lamp-glow sprite — built once, not per beam. */
const BEAM_PLANE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

/**
 * One beam: a camera-facing textured shaft plus a small lamp-glow sprite at
 * its source, plus a real SpotLight aimed exactly the same way — all three
 * driven from the same per-frame source/target so the visible shaft, its
 * hotspot, and the light actually hitting the can never drift apart. All
 * motion (sweep, wander, flicker) lives in this one useFrame — nothing here
 * crosses back out of the Canvas as React state.
 */
function SpotBeam({ config }: { config: BeamConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lampRef = useRef<THREE.Sprite>(null);
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  const beamTexture = useMemo(() => createBeamTexture(), []);
  const lampTexture = useMemo(() => createLampGlowTexture(), []);
  const beamMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: beamTexture,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [beamTexture]
  );
  const lampMaterial = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: lampTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.85,
      }),
    [lampTexture]
  );

  // Mutated every frame below (flicker) — routed through refs, the same
  // sanctioned escape hatch every other useFrame in this file uses, rather
  // than closing over the plain `beamMaterial`/`lampMaterial` variables.
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const lampMaterialRef = useRef<THREE.SpriteMaterial | null>(null);

  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);

  useEffect(() => {
    beamMaterialRef.current = beamMaterial;
    lampMaterialRef.current = lampMaterial;
  }, [beamMaterial, lampMaterial]);

  useEffect(
    () => () => {
      beamTexture.dispose();
      lampTexture.dispose();
      beamMaterial.dispose();
      lampMaterial.dispose();
    },
    [beamTexture, lampTexture, beamMaterial, lampMaterial]
  );

  const source = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const mid = useRef(new THREE.Vector3());
  const toCamera = useRef(new THREE.Vector3());
  const right = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const basis = useRef(new THREE.Matrix4());

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const az =
      THREE.MathUtils.degToRad(config.baseAzimuthDeg) +
      THREE.MathUtils.degToRad(config.sweepAmpDeg) *
        Math.sin((2 * Math.PI * t) / config.periodSec + config.phase);

    source.current.set(
      config.orbitRadius * Math.sin(az),
      config.orbitHeight,
      config.orbitRadius * Math.cos(az)
    );

    const wanderAngle = (2 * Math.PI * t) / config.wanderPeriodSec + config.wanderPhase;
    target.current.set(
      config.wanderAmp * Math.sin(wanderAngle),
      BEAM_TARGET_Y + config.wanderAmp * 0.35 * Math.sin(wanderAngle * 1.7 + config.wanderPhase),
      config.wanderAmp * 0.6 * Math.cos(wanderAngle)
    );

    if (lightRef.current) lightRef.current.position.copy(source.current);
    if (targetRef.current) targetRef.current.position.copy(target.current);
    if (lampRef.current) lampRef.current.position.copy(source.current);

    if (meshRef.current) {
      dir.current.copy(target.current).sub(source.current);
      const length = dir.current.length();
      dir.current.normalize();
      mid.current.copy(source.current).add(target.current).multiplyScalar(0.5);

      // Axis-locked billboard: the plane's local +Y is pinned to the actual
      // source->target direction (so the shaft is correctly foreshortened
      // in 3D from any angle), while it still rotates around that axis to
      // face the camera as closely as possible — the same construction used
      // for laser/trail billboards in games, and what keeps this immune to
      // the edge-on-silhouette problem a lit 3D cone has.
      toCamera.current.copy(state.camera.position).sub(mid.current).normalize();
      right.current.crossVectors(dir.current, toCamera.current);
      if (right.current.lengthSq() < 1e-6) {
        right.current.set(1, 0, 0);
      } else {
        right.current.normalize();
      }
      forward.current.crossVectors(right.current, dir.current).normalize();
      basis.current.makeBasis(right.current, dir.current, forward.current);

      meshRef.current.position.copy(mid.current);
      meshRef.current.quaternion.setFromRotationMatrix(basis.current);
      meshRef.current.scale.set(config.baseWidth, length, 1);
    }

    // Barely-perceptible lamp flicker, shared by the visible shaft, its
    // hotspot, and its paired real light so they never desync.
    const flicker =
      1 + 0.05 * Math.sin(2 * Math.PI * t * config.flickerFreqHz + config.flickerPhase);
    if (beamMaterialRef.current) beamMaterialRef.current.opacity = flicker;
    if (lampMaterialRef.current) lampMaterialRef.current.opacity = 0.85 * flicker;
    if (lightRef.current) lightRef.current.intensity = BEAM_LIGHT_INTENSITY * flicker;
  });

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={BEAM_PLANE_GEOMETRY}
        material={beamMaterial}
        renderOrder={10}
      />
      <sprite ref={lampRef} material={lampMaterial} scale={[0.16, 0.16, 1]} renderOrder={11} />
      <spotLight
        ref={lightRef}
        color="#ffffff"
        angle={0.22}
        penumbra={0.55}
        decay={2}
        distance={6.5}
        intensity={BEAM_LIGHT_INTENSITY}
      />
      <object3D ref={targetRef} />
    </>
  );
}

/** A faint pool of light on the floor gradient plane the beams converge on
 *  toward, plus a very low-contrast elliptical gobo break-up so the pool
 *  doesn't read as a flat, perfectly uniform disc. */
function createGoboPoolTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;

  const pool = ctx.createRadialGradient(r, r, 0, r, r, r);
  pool.addColorStop(0, "rgba(255,255,255,0.5)");
  pool.addColorStop(0.45, "rgba(255,255,255,0.22)");
  pool.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, size, size);

  // Very low-contrast gobo break-up: a handful of soft elliptical dips,
  // barely darker than the pool itself.
  ctx.globalCompositeOperation = "destination-out";
  const spots: Array<[number, number, number, number]> = [
    [0.32, 0.4, 0.22, 0.12],
    [0.62, 0.32, 0.18, 0.1],
    [0.5, 0.68, 0.26, 0.08],
    [0.72, 0.62, 0.16, 0.09],
  ];
  for (const [cx, cy, rad, alpha] of spots) {
    const spot = ctx.createRadialGradient(
      cx * size,
      cy * size,
      0,
      cx * size,
      cy * size,
      rad * size
    );
    spot.addColorStop(0, `rgba(0,0,0,${alpha})`);
    spot.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function FloorGoboPool() {
  const [texture] = useState(() => createGoboPoolTexture());
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!materialRef.current) return;
    const t = state.clock.elapsedTime;
    // Slow, shared shimmer standing in for the combined effect of five
    // independently flickering beams landing on the same spot — one cheap
    // sine rather than averaging all five configs every frame.
    materialRef.current.opacity = 0.22 + 0.03 * Math.sin(t * 0.5);
  });

  return (
    <mesh position={[0, -1.04, 0.05]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={9}>
      <planeGeometry args={[2.2, 2.2]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={0.22}
      />
    </mesh>
  );
}

/**
 * The full stage rig: five sweeping beams plus the floor pool they converge
 * on. Mounted only on the full-quality desktop tier (see `!isReduced` at the
 * call site) — the reduced mobile tier and prefers-reduced-motion (which
 * never mounts EnergyDrinkCan at all, see `useCanSupport3D`) both skip it.
 */
function SpotlightRig() {
  return (
    <>
      {BEAM_CONFIGS.map((config, i) => (
        <SpotBeam key={i} config={config} />
      ))}
      <FloorGoboPool />
    </>
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
// Mobile tier only: lets a single-finger vertical drag scroll the page
// natively while our own touch handlers (see useCanTouchDrag) read the
// horizontal component to rotate the can — set as a prop rather than an
// imperative DOM mutation so it never trips the no-mutating-hook-results
// lint rule, and hoisted so it's a stable reference like the other Canvas
// config below.
const CANVAS_STYLE_TOUCH_PAN_Y: CSSProperties = { touchAction: "pan-y" };
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
        style={isReduced ? CANVAS_STYLE_TOUCH_PAN_Y : undefined}
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
          <SpinningCan
            dropletCount={isReduced ? REDUCED_DROPLET_COUNT : FULL_DROPLET_COUNT}
            touchEnabled={isReduced}
          />
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

        {/* Stage spotlight rig: full-quality tier only. The reduced mobile
            tier skips it for cost, and prefers-reduced-motion never reaches
            here at all since useCanSupport3D falls back to the static
            poster before EnergyDrinkCan ever mounts. */}
        {!isReduced && <SpotlightRig />}

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
