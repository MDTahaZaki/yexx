"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";

// If a viewport-triggered reveal's IntersectionObserver never reports the
// element as visible (backgrounded tab, a slow/never-settling scroll
// container, anything else that can make the observer simply not fire),
// the words would otherwise stay clipped and invisible forever. This forces
// the reveal after a short wait so a failed trigger never means permanently
// missing content.
const VIEWPORT_FALLBACK_MS = 1500;
const VIEWPORT_THRESHOLD = 0.6;

/**
 * Splits text into words, each clipped inside its own overflow-hidden box
 * and slid up from below — a mask reveal, not a fade. Reused for the hero
 * headline (animates on load) and section headings (animates on scroll).
 *
 * The reveal is always driven by plain state + Motion's `animate` prop
 * (never `whileInView` directly) — a viewport-triggered instance just
 * decides *when* `revealed` flips, via its own IntersectionObserver, with
 * the timer above as a guaranteed backstop. That keeps the actual visual
 * transition on the exact same, already-reliable code path mount-triggered
 * instances use.
 */
export default function MaskedLines({
  text,
  as: As = "span",
  className = "",
  lineClassName = "",
  stagger = 0.08,
  delay = 0,
  viewport = false,
}: {
  text: string;
  as?: "span" | "h1" | "h2";
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
  /** Animate on scroll into view instead of once on mount. */
  viewport?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  const containerRef = useRef<HTMLElement | null>(null);

  // Mount-triggered reveals just start revealed (Motion's `initial` ->
  // `animate` transition still plays). Viewport-triggered ones wait for
  // the observer below — or the fallback timer — before flipping.
  const [revealed, setRevealed] = useState(!viewport);

  useEffect(() => {
    if (!viewport || revealed) return;

    const node = containerRef.current;
    let observer: IntersectionObserver | undefined;
    if (node && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) setRevealed(true);
        },
        { threshold: VIEWPORT_THRESHOLD }
      );
      observer.observe(node);
    }

    const timer = setTimeout(() => setRevealed(true), VIEWPORT_FALLBACK_MS);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
    };
  }, [viewport, revealed]);

  const transition = (i: number): Transition =>
    shouldReduceMotion
      ? { duration: 0 }
      : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger };

  return (
    <As ref={containerRef as never} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className={`block overflow-hidden ${lineClassName}`}
          // The mask box itself must never render as anything other than
          // the surrounding text colour on transparent — if the reveal
          // below fails for any reason, this box is what's left on screen.
          style={{ color: "inherit", backgroundColor: "transparent" }}
        >
          <motion.span
            className="block will-change-transform"
            style={{ color: "inherit", backgroundColor: "transparent" }}
            initial={{ y: shouldReduceMotion ? "0%" : "110%" }}
            animate={{ y: shouldReduceMotion || revealed ? "0%" : "110%" }}
            transition={transition(i)}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </As>
  );
}
