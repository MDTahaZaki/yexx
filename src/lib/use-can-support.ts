"use client";

import { useEffect, useState } from "react";

/**
 * "full" -> real-time 3D at full quality (desktop-class hardware).
 * "reduced" -> real-time 3D at a lightweight quality tier (typical phones):
 *  fixed dpr, no dynamic shadows, fewer droplets, no particle background.
 * "static" -> the flat poster only. Reserved for prefers-reduced-motion and
 *  devices reporting fewer than 4 CPU cores, which genuinely can't handle a
 *  live WebGL scene regardless of screen size.
 */
export type CanSupportTier = "full" | "reduced" | "static";

export function useCanSupport3D(): CanSupportTier {
  const [tier, setTier] = useState<CanSupportTier>("static");

  useEffect(() => {
    const evaluate = () => {
      const isSmallScreen = window.innerWidth < 768;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const lowCoreCount = (navigator.hardwareConcurrency ?? 8) < 4;

      if (reducedMotion || lowCoreCount) {
        setTier("static");
      } else if (isSmallScreen) {
        setTier("reduced");
      } else {
        setTier("full");
      }
    };

    evaluate();
    window.addEventListener("resize", evaluate);
    return () => window.removeEventListener("resize", evaluate);
  }, []);

  return tier;
}
