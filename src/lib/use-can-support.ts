"use client";

import { useEffect, useState } from "react";
import { isIOS } from "./is-ios";

/**
 * "full" -> real-time 3D at full quality (desktop-class hardware).
 * "reduced" -> real-time 3D at a lightweight quality tier (typical phones):
 *  dpr capped at 2, no dynamic shadows, fewer droplets, no particle
 *  background.
 * "static" -> the flat poster only. Reserved for prefers-reduced-motion and
 *  devices reporting fewer than 4 CPU cores, which genuinely can't handle a
 *  live WebGL scene regardless of screen size.
 */
export type CanSupportTier = "full" | "reduced" | "static";

export function useCanSupport3D(): CanSupportTier {
  const [tier, setTier] = useState<CanSupportTier>("static");

  useEffect(() => {
    // WebKit caps `navigator.hardwareConcurrency` at 2 on every iOS device
    // as a fingerprinting mitigation — a brand-new iPhone reports the same
    // "2" a decade-old one would. Treating that as a genuine low-core
    // signal silently forced every iPhone (and iPad) onto the static tier,
    // regardless of how capable the hardware actually is. iOS/iPadOS is
    // detected and excluded from that specific check; screen size and
    // prefers-reduced-motion still apply normally there.
    const onIOS = isIOS();

    const evaluate = () => {
      const isSmallScreen = window.innerWidth < 768;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const lowCoreCount = !onIOS && (navigator.hardwareConcurrency ?? 8) < 4;

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
