"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Same pattern MaskedLines uses: if a viewport-triggered reveal's
// IntersectionObserver never reports the element as visible (backgrounded
// tab, a slow/never-settling scroll container, anything else that can make
// the observer simply not fire — this is what happened to the gallery's
// old Framer Motion `whileInView` tiles in production, where images fetched
// fine but stayed permanently clipped/transparent), the fallback forces the
// reveal after a short wait so a failed trigger never means permanently
// missing content.
const FALLBACK_MS = 1500;

/**
 * Tracks both whether an element is currently intersecting the viewport and
 * whether it has ever been revealed (a one-way latch, backed by the
 * fallback timer above). Pair `inView` with a continuous effect (pause a
 * loop when it goes false) and `revealed` with a one-shot animation driven
 * by Motion's `animate` prop — never `whileInView` directly, which is the
 * failure mode this hook exists to avoid.
 */
export function useRevealed<T extends HTMLElement>(
  threshold = 0.1
): [RefObject<T | null>, boolean, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    console.log("[useRevealed] effect ran, node =", ref.current);
    const node = ref.current;
    let observer: IntersectionObserver | undefined;
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const isIntersecting = entries.some((entry) => entry.isIntersecting);
          setInView(isIntersecting);
          if (isIntersecting) setRevealed(true);
        },
        { threshold }
      );
      observer.observe(node);
    }

    const timer = setTimeout(() => {
      console.log("[useRevealed] fallback timer fired for", node);
      setRevealed(true);
    }, FALLBACK_MS);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, inView, revealed];
}
