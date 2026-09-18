"use client";

import { useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { useInView } from "@/lib/use-in-view";
import StaticCanPoster from "./StaticCanPoster";
import CanErrorBoundary from "./CanErrorBoundary";
import type { CanSupportTier } from "@/lib/use-can-support";

// EnergyDrinkCan pulls in three.js / R3F / drei — keep it out of the initial
// bundle and off the server entirely, so the page paints instantly. No
// loading fallback here: the static poster underneath already covers the
// gap while the chunk loads.
const EnergyDrinkCan = dynamic(() => import("./EnergyDrinkCan"), {
  ssr: false,
  loading: () => null,
});

interface CanSceneProps {
  tier: CanSupportTier;
  /** Scroll progress (0-1), written outside React so it never crosses into
   *  the Canvas as a prop or triggers a re-render. Read inside the scene via
   *  useFrame to drive the scroll tilt. Unused when tier is "static". */
  scrollProgressRef?: RefObject<number>;
}

/**
 * Renders the real-time 3D can, pausing its render loop (rather than unmounting
 * it) whenever it scrolls out of view. `tier` is decided once by the caller
 * so this never flips mid-session and re-triggers a mount.
 */
export default function CanScene({ tier, scrollProgressRef }: CanSceneProps) {
  const [containerRef, inView] = useInView<HTMLDivElement>();
  const [canvasReady, setCanvasReady] = useState(false);

  if (tier === "static") {
    return (
      <div ref={containerRef} className="h-full w-full">
        <StaticCanPoster />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {/* Instant-paint LCP image. Fades out once the canvas below has
          rendered its first frame, rather than being replaced outright. */}
      <StaticCanPoster
        className={`transition-opacity duration-500 ${canvasReady ? "opacity-0" : "opacity-100"}`}
      />
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${canvasReady ? "opacity-100" : "opacity-0"}`}
      >
        <CanErrorBoundary>
          <EnergyDrinkCan
            paused={!inView}
            quality={tier}
            scrollProgressRef={scrollProgressRef}
            onReady={() => setCanvasReady(true)}
          />
        </CanErrorBoundary>
      </div>
    </div>
  );
}
