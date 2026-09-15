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
 * Loads the label artwork (public/yexx-label-gold.png — the released mark
 * recolored gold-on-bone for the warm luxury direction, see the sibling
 * yexx-label.png for the original) as the wall's map. A full-circumference
 * wrap, artwork centered at u=0.5 — the wall mesh below is rotated 180
 * degrees so that center faces the camera, the same trick the can's earlier
 * procedural label used.
 */
function useLabelTexture(): THREE.Texture | null {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load("/yexx-label-gold.png", (loaded) => {
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
        <meshStandardMaterial color="#c6a664" metalness={0.8} roughness={0.28} />
      </mesh>
      <mesh position={[0, TAB_TUBE_RADIUS * 0.4, -TAB_OFFSET_Z * 0.9]} castShadow>
        <sphereGeometry args={[TAB_TUBE_RADIUS * 1.3, 12, 12]} />
        <meshStandardMaterial color="#c6a664" metalness={0.8} roughness={0.28} />
      </mesh>
    </group>
  );
}

// Shared by the chime and the lid — both are brushed gold, just two
// separate meshes because they're on either side of the labeled wall.
const METAL_COLOR = "#c6a664";
const METAL_METALNESS = 0.75;
const METAL_ROUGHNESS = 0.38;
// Warm white body — the label map (mostly bone/white, gold only where the
// mark/wordmark print) is multiplied by this, so this is what actually
// carries the "warm" in "warm white can," not pure #ffffff.
const BODY_COLOR = "#f5f0e6";

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
        {/* Warm-white base so the map shows through tinted (map colors are
            multiplied by this), with enough roughness/metalness for a soft
            sheen rather than flat matte chalk. */}
        <meshStandardMaterial color={BODY_COLOR} map={labelTexture ?? undefined} roughness={0.5} metalness={0.06} />
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
// Subtle continuous life at rest: a slow vertical bob plus a lazy x/z
// drift at two different, non-multiple speeds so it traces a slow organic
// wander rather than a back-and-forth line. Small enough (a few percent of
// CAN_HEIGHT/CAN_RADIUS) to read as "alive," not as motion sickness.
const BOB_AMPLITUDE = 0.04;
const BOB_SPEED = 0.5;
const DRIFT_AMPLITUDE = 0.02;
const DRIFT_SPEED_X = 0.17;
const DRIFT_SPEED_Z = 0.23;

/**
 * Idle motion is a gentle +/-15 degree sway around front-facing, not a
 * continuous rotation — the label must stay readable, not spin away from the
 * viewer. A slow bob + drift on position runs alongside the sway so the can
 * never looks frozen at rest.
 *
 * `suppressRef`, when true, freezes this entirely (no sway, no bob/drift) —
 * used on the mobile touch-rotate tier so a finger drag doesn't fight the
 * idle animation for control of the same rotation. Frozen time is tracked
 * separately from `state.clock.elapsedTime` (which keeps ticking) so motion
 * resumes exactly where it paused instead of jumping to wherever the sine
 * wave would otherwise be after the gap.
 */
function SpinningCan({
  dropletCount,
  suppressRef,
}: {
  dropletCount: number;
  suppressRef?: RefObject<boolean>;
}) {
  const group = useRef<THREE.Group>(null);
  const pausedDurationRef = useRef(0);
  const lastElapsedRef = useRef(0);

  useFrame((state) => {
    if (!group.current) return;
    const raw = state.clock.elapsedTime;
    const dt = raw - lastElapsedRef.current;
    lastElapsedRef.current = raw;

    if (suppressRef?.current) {
      pausedDurationRef.current += dt;
      return;
    }

    const t = raw - pausedDurationRef.current;
    const sway = THREE.MathUtils.degToRad(IDLE_SWAY_DEG) * Math.sin(t * IDLE_SWAY_SPEED);

    group.current.rotation.y = sway;
    group.current.position.y = BOB_AMPLITUDE * Math.sin(t * BOB_SPEED);
    group.current.position.x = DRIFT_AMPLITUDE * Math.sin(t * DRIFT_SPEED_X);
    group.current.position.z = DRIFT_AMPLITUDE * Math.cos(t * DRIFT_SPEED_Z);
  });

  return (
    <group ref={group}>
      <Can dropletCount={dropletCount} />
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
 * own cadence (Motion's spring, decoupled from React's render loop).
 *
 * Both axes are clamped hard (12 degrees Y, 4 degrees X) — a product shot at
 * eye level, not a look down into the lid, and never far enough around to
 * turn the label away from the camera.
 *
 * `suppressRef`, when true, skips the update entirely — used on the mobile
 * touch-rotate tier so scroll tilt doesn't fight a finger drag for the same
 * rotation. Freezing (rather than resetting) means it resumes the lerp from
 * wherever it left off, with no jump.
 */
function TiltGroup({
  scrollProgressRef,
  suppressRef,
  children,
}: {
  scrollProgressRef?: RefObject<number>;
  suppressRef?: RefObject<boolean>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!group.current) return;
    if (suppressRef?.current) return;
    const progress = THREE.MathUtils.clamp(scrollProgressRef?.current ?? 0, 0, 1);
    const targetY = THREE.MathUtils.degToRad(progress * SCROLL_TILT_MAX_Y_DEG);
    const targetX = THREE.MathUtils.degToRad(progress * -SCROLL_TILT_MAX_X_DEG);
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetY, TILT_LERP);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, targetX, TILT_LERP);
  });
  return <group ref={group}>{children}</group>;
}

const DRAG_DECIDE_THRESHOLD_PX = 10;
// Half the canvas width dragged -> ~180 degrees of rotation.
const DRAG_RADIANS_PER_PX = (width: number) => (Math.PI * 2) / width;
const MOMENTUM_DECAY_PER_SEC = 0.05; // velocity multiplier applied over a full second
const MOMENTUM_STOP_THRESHOLD = 0.02; // rad/s
const SNAPBACK_TAU_S = 0.4; // exponential time constant -> "settled" around ~1.5s
const SNAPBACK_STOP_THRESHOLD = 0.01; // rad
const HINT_DELAY_MS = 1400;
const HINT_DURATION_S = 1.1;
const HINT_NUDGE_RAD = THREE.MathUtils.degToRad(14);
const HINT_SESSION_KEY = "yexx-can-touch-hint-shown";

type TouchPhase = "idle" | "undecided" | "rotating" | "scrolling" | "momentum" | "snapback" | "hint";

interface TouchRotationState {
  phase: TouchPhase;
  startX: number;
  startY: number;
  dragStartRotation: number;
  lastMoveTime: number;
  velocity: number; // rad/s
  canvasWidth: number;
}

function readHintShown(): boolean {
  try {
    return sessionStorage.getItem(HINT_SESSION_KEY) === "1";
  } catch {
    // Storage can throw in locked-down contexts (private browsing limits,
    // disabled storage) — treat as "already shown" so we fail toward not
    // nagging rather than retrying every render.
    return true;
  }
}

function markHintShown() {
  try {
    sessionStorage.setItem(HINT_SESSION_KEY, "1");
  } catch {
    // Nothing to do if storage is unavailable — see readHintShown above.
  }
}

/**
 * Touch-drag rotation for the mobile tier, wrapping TiltGroup/SpinningCan so
 * it can suppress both while a drag (or its momentum/snap-back) is in
 * control of the can's yaw. Sits outside both because it owns a single,
 * separate rotation.y that composes with (rather than fights) the layers
 * inside it.
 *
 * The core problem this solves: a one-finger drag starting on the can is
 * ambiguous between "rotate the can" and "scroll the page," and phones only
 * let native scrolling proceed smoothly if we decide fast and get out of the
 * way. Native touch/pointer events (not R3F's synthetic pointer layer) are
 * used deliberately, attached directly to the canvas, because disambiguation
 * needs a non-passive touchmove listener that conditionally calls
 * preventDefault — R3F's synthetic events don't expose that control.
 *
 * State machine per gesture:
 *  - touchstart: record the start point, go "undecided". Nothing else yet.
 *  - touchmove, before ~10px of travel: still "undecided", do nothing.
 *  - touchmove, past ~10px: decide once — horizontal wins ties toward
 *    "rotating" (preventDefault from here on, drag tracks the finger 1:1);
 *    otherwise "scrolling" (release for good, canvas' own `touch-action:
 *    pan-y` lets the browser's native scroll take over).
 *  - touchend while rotating: "momentum" if the last tracked velocity is
 *    above a small floor, else straight to "snapback".
 *  - momentum: exponential velocity decay each frame; once it drops below
 *    the floor, hand off to snapback.
 *  - snapback: ease the rotation toward the nearest multiple of a full turn
 *    (i.e. front-facing) over roughly 1.5s, then settle exactly at 0 and
 *    hand control back to TiltGroup/SpinningCan.
 * A second finger landing mid-gesture, or a lift before a rotate was ever
 * decided, both fall through to snapback rather than leaving the can stuck
 * at an offset.
 */
function TouchRotateGroup({
  interactionRef,
  children,
}: {
  interactionRef: RefObject<boolean>;
  children: ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const rotationRef = useRef(0);
  const hintElapsedRef = useRef(0);
  const stateRef = useRef<TouchRotationState>({
    phase: "idle",
    startX: 0,
    startY: 0,
    dragStartRotation: 0,
    lastMoveTime: 0,
    velocity: 0,
    canvasWidth: 1,
  });
  const { gl } = useThree();

  // gl.domElement is a real <canvas> DOM node; setting its style inside an
  // effect (restored on cleanup below) is the standard imperative pattern
  // for it — the same one drei's own OrbitControls uses internally — not a
  // render-time mutation of React-owned state. react-hooks/immutability
  // flags it anyway since it's reached through useThree()'s return value.
  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    const canvas = gl.domElement;
    // Lets the browser keep handling vertical scroll on its own compositor
    // thread the moment we decide a gesture is a scroll, instead of that
    // scroll waiting on our (necessarily non-passive) touchmove listener.
    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "pan-y";
    const s = stateRef.current;
    let hintTimer: ReturnType<typeof setTimeout> | null = null;

    function cancelHint() {
      if (hintTimer) {
        clearTimeout(hintTimer);
        hintTimer = null;
      }
      markHintShown();
      if (s.phase === "hint") {
        s.phase = "idle";
      }
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length > 1) {
        // A second finger landing mid-gesture interrupts cleanly rather than
        // trying to reconcile two contacts into one rotation.
        if (s.phase === "rotating" || s.phase === "undecided") {
          s.phase = "snapback";
        }
        return;
      }
      cancelHint();
      const touch = event.touches[0];
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.lastMoveTime = performance.now();
      s.velocity = 0;
      s.canvasWidth = canvas.clientWidth || 1;
      s.dragStartRotation = rotationRef.current;
      s.phase = "undecided";
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];

      if (s.phase === "undecided") {
        const dx = touch.clientX - s.startX;
        const dy = touch.clientY - s.startY;
        if (Math.abs(dx) < DRAG_DECIDE_THRESHOLD_PX && Math.abs(dy) < DRAG_DECIDE_THRESHOLD_PX) {
          return;
        }
        s.phase = Math.abs(dx) > Math.abs(dy) ? "rotating" : "scrolling";
        if (s.phase === "rotating") {
          interactionRef.current = true;
        }
      }

      if (s.phase !== "rotating") return; // "scrolling" — hands off entirely

      event.preventDefault();
      const now = performance.now();
      const dx = touch.clientX - s.startX;
      const angle = s.dragStartRotation + dx * DRAG_RADIANS_PER_PX(s.canvasWidth);
      const dt = Math.max((now - s.lastMoveTime) / 1000, 1 / 240);
      const instantVelocity = (angle - rotationRef.current) / dt;
      // Light smoothing so one jittery event doesn't dominate the momentum
      // handed off at touchend.
      s.velocity = THREE.MathUtils.lerp(s.velocity, instantVelocity, 0.5);
      rotationRef.current = angle;
      s.lastMoveTime = now;
    }

    function onTouchEnd() {
      if (s.phase === "rotating") {
        s.phase = Math.abs(s.velocity) > MOMENTUM_STOP_THRESHOLD ? "momentum" : "snapback";
      } else if (s.phase === "undecided" || s.phase === "scrolling") {
        // Covers a tap, and a gesture that resolved to "scrolling" — either
        // way, make sure the can isn't left stuck off-center from a drag
        // that got interrupted before this touch began.
        s.phase = "snapback";
      }
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: true });

    if (!readHintShown()) {
      hintTimer = setTimeout(() => {
        hintTimer = null;
        if (s.phase === "idle") {
          hintElapsedRef.current = 0;
          s.phase = "hint";
          interactionRef.current = true;
        }
      }, HINT_DELAY_MS);
    }

    return () => {
      canvas.style.touchAction = previousTouchAction;
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
      if (hintTimer) clearTimeout(hintTimer);
    };
  }, [gl, interactionRef]);
  /* eslint-enable react-hooks/immutability */

  useFrame((_state, delta) => {
    if (!group.current) return;
    const s = stateRef.current;

    if (s.phase === "momentum") {
      rotationRef.current += s.velocity * delta;
      s.velocity *= Math.pow(MOMENTUM_DECAY_PER_SEC, delta);
      if (Math.abs(s.velocity) < MOMENTUM_STOP_THRESHOLD) {
        s.phase = "snapback";
      }
    } else if (s.phase === "snapback") {
      const target = Math.round(rotationRef.current / (Math.PI * 2)) * Math.PI * 2;
      rotationRef.current = THREE.MathUtils.lerp(
        rotationRef.current,
        target,
        1 - Math.exp(-delta / SNAPBACK_TAU_S)
      );
      if (Math.abs(rotationRef.current - target) < SNAPBACK_STOP_THRESHOLD) {
        rotationRef.current = 0;
        s.phase = "idle";
        interactionRef.current = false;
      }
    } else if (s.phase === "hint") {
      hintElapsedRef.current += delta;
      const t = Math.min(hintElapsedRef.current / HINT_DURATION_S, 1);
      rotationRef.current = HINT_NUDGE_RAD * Math.sin(t * Math.PI); // out and back
      if (t >= 1) {
        rotationRef.current = 0;
        s.phase = "idle";
        interactionRef.current = false;
        markHintShown();
      }
    }
    // "rotating" needs no per-frame work here — the touchmove handler above
    // already writes rotationRef.current directly, 1:1 with the finger.

    group.current.rotation.y = rotationRef.current;
  });

  return <group ref={group}>{children}</group>;
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
 * A broad, soft warm fill — a large rect area light rather than another hard
 * directional — so the matte body's curvature reads through gentle,
 * graduated shading across its width instead of one narrow specular streak.
 * The existing upper-left key light is untouched, so the gold rim still
 * picks up its own distinct, tighter highlight.
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
      intensity={1}
      color="#fff4e0"
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
// bring the can down to ~65%, per client feedback that the can dominated
// the hero. Verify against a real screenshot after touching this, not just
// the math.
const CANVAS_CAMERA = { position: [0, 0, 4.9] as [number, number, number], fov: 36 };
// alpha: true + no scene.background keeps the canvas fully transparent, so
// the bone Hero background reads as one continuous surface behind both the
// text and the can — no separate panel behind the 3D content.
const CANVAS_GL = { antialias: true, alpha: true };
const CANVAS_SHADOWS = { type: THREE.PCFShadowMap };
const DEFAULT_DPR: [number, number] = [1, 1.75];
// Reduced mobile tier: still capped, but at 2 rather than 1. Modern phones
// report a devicePixelRatio of 2.5-3.5, so a cap of 1 was rendering at
// roughly a third of the screen's real resolution and upscaling — visibly
// blurry. Frame-time cost on phone GPUs is cut elsewhere (no dynamic
// shadows, fewer droplets, no particle background, no RectAreaLight) so
// resolution itself doesn't need to be sacrificed too.
const REDUCED_DPR: [number, number] = [1, 2];
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
  // True while a touch drag (or its momentum/snap-back) owns the can's yaw
  // on the mobile tier — read by TiltGroup and SpinningCan to back off for
  // the duration, never crosses the Canvas boundary as a prop.
  const interactionRef = useRef(false);

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
        {/* One large soft warm key from the upper left, like a window, plus
            a gentle warm fill and a little low bounce — nothing theatrical,
            no HDRI Environment (no network fetch, no one-time PMREM
            generation cost). Every light is warm-white; there is no cool/
            blue fill left in the rig. */}
        <directionalLight position={[-3, 4, 2.5]} intensity={2} color="#fff4e0" castShadow />
        <directionalLight position={[3, 1.5, 2]} intensity={0.45} color="#ffe9cf" />
        <directionalLight position={[-1.5, 1.5, -3]} intensity={0.5} color="#ffe9cf" />
        {/* Near-overhead, aimed mostly straight down at the lid's dish and
            rim — the other lights sit low enough that their specular hit on
            the lid's mostly-upward-facing normals is thin. */}
        <directionalLight position={[-0.6, 6, 2]} intensity={0.6} color="#fff7ea" />
        {/* Low, forward bounce aimed up at the bottom chime — the other
            lights all sit above the can's center, so its downward-curving
            surface was the one band still reading dark. */}
        <directionalLight position={[0, -2.5, 3]} intensity={0.4} color="#fff4e0" />
        <ambientLight intensity={0.28} color="#fff7ea" />
        {/* Matte body now carries a real diffuse response to every light
            above (unlike the old near-pure-metal surface), so the whole set
            is trimmed down from earlier tuning to avoid blowing the gold
            rim and Y-mark out toward flat white. On the reduced mobile tier
            the RectAreaLight (an LTC-textured light, comparatively
            expensive) is swapped for a plain directional fill aimed from
            roughly the same direction. */}
        {isReduced ? (
          <directionalLight position={[1.2, 0.8, 3.6]} intensity={0.7} color="#fff4e0" />
        ) : (
          <AreaFillLight />
        )}

        {isReduced ? (
          <TouchRotateGroup interactionRef={interactionRef}>
            <TiltGroup scrollProgressRef={scrollProgressRef} suppressRef={interactionRef}>
              <SpinningCan dropletCount={REDUCED_DROPLET_COUNT} suppressRef={interactionRef} />
            </TiltGroup>
          </TouchRotateGroup>
        ) : (
          <TiltGroup scrollProgressRef={scrollProgressRef}>
            <SpinningCan dropletCount={FULL_DROPLET_COUNT} />
          </TiltGroup>
        )}

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

        {/* OrbitControls (full drag-to-orbit, pinch zoom) stays desktop-only
            and unchanged. The reduced mobile tier gets its own Y-only touch
            rotation via TouchRotateGroup above instead — a one-finger drag
            on a phone must resolve to either "rotate" or "scroll the page,"
            which OrbitControls' pointer handling doesn't disambiguate. */}
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
