"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { brand, layout, type } from "@/config/brand";
import { useRevealed } from "@/lib/use-revealed";
import MaskedLines from "./MaskedLines";
import Parallax from "./Parallax";

// Pre-launch: no customers yet, so this is a product gallery grid, not a
// social wall — no usernames or fake handles on any tile. The one
// exception is the dedicated Instagram panel below, which links the
// client's real account rather than inventing UGC.
const INSTAGRAM_HANDLE = "@yexxofficial.co";
const INSTAGRAM_URL = "https://instagram.com/yexxofficial.co";

// Full there-and-back Ken Burns cycle (1.0 -> 1.08 -> 1.0). Each tile
// starts partway through this via its own phase delay, so they never move
// in sync.
const DRIFT_CYCLE_S = 20;

type Tile =
  | {
      id: number;
      span: string;
      kind: "photo";
      src: string;
      alt: string;
      /** CSS object-position — deliberately aimed at the identifiable
       *  subject (can, lid, Y-mark) in each source photo, not left to
       *  center-crop chance. */
      objectPosition: string;
      /** Base zoom, composed into the Ken Burns drift range (see
       *  PhotoTile) rather than a separate transform layer — scaling is
       *  commutative, so folding it into the same drift values is
       *  equivalent to nesting another wrapper and avoids one. Forms a
       *  deliberate wide/tight/medium rhythm across the grid instead of
       *  every tile using the same framing. */
      zoom: number;
    }
  | { id: number; span: string; kind: "instagram" };

const tiles: Tile[] = [
  // Anchor — the clearest single-can shot of the six, sharp throughout
  // with the lid and full Y-mark both legible. Given row-span-3 (taller
  // than the other tiles), a WIDE zoom keeps the crop from having to
  // choose between lid and logo the way row-span-2 forced it to.
  {
    id: 1,
    span: "col-span-2 row-span-3",
    kind: "photo",
    src: "/product/gallery/yexx-1.webp",
    alt: "YEXX can on a marble pedestal, condensation beaded on the surface",
    objectPosition: "50% 30%",
    zoom: 1.08,
  },
  // Lid + tab macro — already a tight, graphic, symmetric close-up, so a
  // TIGHT zoom just fills the tile cleanly without wasting edge space on
  // the soft background behind it.
  {
    id: 2,
    span: "col-span-1 row-span-1",
    kind: "photo",
    src: "/product/gallery/yexx-3.webp",
    alt: "Close-up of the YEXX can's lid and tab, beaded with condensation",
    objectPosition: "48% 32%",
    zoom: 1.2,
  },
  // Y-mark macro — the gold stroke sits left-of-center in the source, so
  // objectPosition is pulled left to keep it from being cropped toward
  // plain droplet texture on the right. MEDIUM zoom keeps some of the
  // condensation detail around it rather than filling the frame with
  // just the gold.
  {
    id: 3,
    span: "col-span-1 row-span-1",
    kind: "photo",
    src: "/product/gallery/yexx-5.webp",
    alt: "Macro close-up of the Y-mark logo with condensation droplets",
    objectPosition: "32% 46%",
    zoom: 1.14,
  },
  // Three cans tumbling — already a full, sharp group shot spanning most
  // of the frame; WIDE zoom keeps all three cans in frame rather than
  // cropping one out.
  {
    id: 4,
    span: "col-span-1 row-span-2",
    kind: "photo",
    src: "/product/gallery/yexx-2.webp",
    alt: "Three YEXX cans tumbling in mid-air",
    objectPosition: "50% 38%",
    zoom: 1.08,
  },
  { id: 5, span: "col-span-2 row-span-1", kind: "instagram" },
  // Three cans on ice with mint — another group shot; MEDIUM zoom, centred
  // slightly high since the cans cluster in the upper two-thirds of frame.
  {
    id: 6,
    span: "col-span-1 row-span-1",
    kind: "photo",
    src: "/product/gallery/yexx-4.webp",
    alt: "Three YEXX cans resting on ice with fresh mint leaves",
    objectPosition: "48% 38%",
    zoom: 1.14,
  },
  // Splash — the can sits center-left; without a deliberate crop this tile
  // was almost all water with no product in frame. TIGHT zoom centred on
  // the can + Y-mark band makes the product the subject instead of the
  // splash being the subject.
  {
    id: 7,
    span: "col-span-1 row-span-1",
    kind: "photo",
    src: "/product/gallery/yexx-6.webp",
    alt: "YEXX can amid a splash of water",
    objectPosition: "50% 40%",
    zoom: 1.2,
  },
];

/** True on devices whose primary pointer is touch — used to swap the
 *  hover-only interactions for a gentle scroll-linked parallax, since
 *  `:hover` has no real equivalent there. `useSyncExternalStore` is the
 *  correct primitive for a value that lives outside React (matchMedia)
 *  and can change on its own; it avoids the setState-in-effect pattern
 *  that just moves the same problem into an effect body. */
function subscribeToCoarsePointer(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getCoarsePointerSnapshot() {
  return typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
}

function getCoarsePointerServerSnapshot() {
  return false;
}

function useCoarsePointer() {
  return useSyncExternalStore(subscribeToCoarsePointer, getCoarsePointerSnapshot, getCoarsePointerServerSnapshot);
}

function PhotoTile({
  tile,
  sectionInView,
  revealed,
  shouldReduceMotion,
  isTouch,
  isDimmed,
  onHoverStart,
  onHoverEnd,
}: {
  tile: Extract<Tile, { kind: "photo" }>;
  sectionInView: boolean;
  revealed: boolean;
  shouldReduceMotion: boolean;
  isTouch: boolean;
  isDimmed: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const driftControls = useAnimationControls();
  const phaseDelay = (tile.id * 2.7) % DRIFT_CYCLE_S;

  useEffect(() => {
    if (shouldReduceMotion) {
      driftControls.set({ scale: tile.zoom });
      return;
    }
    if (sectionInView) {
      driftControls.start({
        scale: [tile.zoom, tile.zoom * 1.08, tile.zoom],
        transition: { duration: DRIFT_CYCLE_S, repeat: Infinity, ease: "easeInOut", delay: phaseDelay },
      });
    } else {
      driftControls.stop();
    }
  }, [sectionInView, shouldReduceMotion, driftControls, phaseDelay, tile.zoom]);

  const image = (
    <Image
      src={tile.src}
      alt={tile.alt}
      fill
      sizes="(min-width: 768px) 25vw, 50vw"
      className="object-cover"
      style={{ objectPosition: tile.objectPosition }}
    />
  );

  return (
    <div
      className={`group relative overflow-hidden ${tile.span} min-h-[120px] transition-opacity duration-500 ease-out ${
        isDimmed ? "opacity-85" : "opacity-100"
      }`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
    >
      {/* Reveal layer — opacity only, driven by plain `revealed` state via
          Motion's `animate` prop, never `whileInView` directly. That's the
          fix for the production bug where these tiles fetched their images
          fine but stayed permanently invisible: `useRevealed`'s fallback
          timer guarantees `revealed` flips even if the IntersectionObserver
          never reports intersection. */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
        animate={{ opacity: shouldReduceMotion || revealed ? 1 : 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.6,
          delay: shouldReduceMotion ? 0 : (tile.id % 4) * 0.08,
        }}
      >
        {/* Hover-zoom layer — its own node, separate from the drift layer
            below, so the two scales compose instead of one clobbering the
            other's inline transform. */}
        <div className="absolute inset-0 transition-transform duration-[600ms] ease-out group-hover:scale-[112%]">
          {/* Drift (Ken Burns) layer — continuous while the section is in
              view, paused (frozen, not reset) via imperative controls once
              it scrolls out. */}
          <motion.div className="absolute inset-0" initial={{ scale: tile.zoom }} animate={driftControls}>
            {isTouch && !shouldReduceMotion ? (
              <Parallax rangePx={6 + (tile.id % 3) * 3} className="absolute inset-0">
                {image}
              </Parallax>
            ) : (
              image
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Always-on warm gradient at the tile foot — barely visible, just
          enough weight along the bottom edge that six separate photos read
          as one composition rather than six unrelated rectangles. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(156,124,62,0.16) 0%, transparent 30%)" }}
        aria-hidden="true"
      />

      {/* Warm vignette, hover only — plain CSS group-hover so it reacts to
          the tile's hover state without needing pointer events of its own
          (it's purely decorative, `pointer-events-none`). */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-400 ease-out group-hover:opacity-100"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(198,166,100,0.35), transparent 70%)" }}
        aria-hidden="true"
      />
    </div>
  );
}

function InstagramTile({ span }: { span: string }) {
  return (
    <div className={`relative overflow-hidden ${span} min-h-[120px]`}>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full flex-col items-center justify-center gap-3 border border-gold/30 bg-bone-deep transition-colors duration-300 hover:bg-gold/5"
      >
        <span className="text-lg font-medium tracking-[0.15em] text-ink uppercase">{brand.hashtag}</span>
        <span className="text-[0.65rem] tracking-[0.35em] text-ink/45 uppercase">{INSTAGRAM_HANDLE}</span>
      </a>
    </div>
  );
}

export default function SocialGrid() {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isTouch = useCoarsePointer();
  const [gridRef, sectionInView, revealed] = useRevealed<HTMLDivElement>(0.1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section className={`${layout.section} bg-bone text-ink`}>
      <div className={layout.container}>
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines as="h2" text={brand.hashtag} className={`${type.h2} font-medium uppercase`} viewport />
          <p className={`${type.eyebrow} text-ink/50`}>Launching soon — follow along</p>
        </div>

        <div ref={gridRef} className="grid auto-rows-[140px] grid-cols-2 gap-1 grid-flow-row-dense md:grid-cols-4">
          {tiles.map((tile) =>
            tile.kind === "instagram" ? (
              <InstagramTile key={tile.id} span={tile.span} />
            ) : (
              <PhotoTile
                key={tile.id}
                tile={tile}
                sectionInView={sectionInView}
                revealed={revealed}
                shouldReduceMotion={shouldReduceMotion}
                isTouch={isTouch}
                isDimmed={hoveredId !== null && hoveredId !== tile.id}
                onHoverStart={() => setHoveredId(tile.id)}
                onHoverEnd={() => setHoveredId(null)}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
