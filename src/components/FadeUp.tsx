"use client";

import { motion, useReducedMotion } from "motion/react";
import { useMemo, type ElementType, type ReactNode } from "react";

/**
 * Body copy fading up under a heading with a short delay — used after a
 * MaskedLines heading so the two read as one staggered reveal rather than
 * two separate animations firing at once. Transform + opacity only.
 */
export default function FadeUp({
  as: As = "p",
  children,
  className = "",
  delay = 0.25,
  viewport = false,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Animate on scroll into view instead of once on mount. */
  viewport?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  // motion.create (not the deprecated motion() call) — memoized on `As` so a
  // stable component type survives re-renders instead of a fresh one every
  // time, which would otherwise force React to remount instead of reconcile.
  const MotionAs = useMemo(() => motion.create(As) as typeof motion.p, [As]);

  const animateProps = viewport
    ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.6 } }
    : { animate: { opacity: 1, y: 0 } };

  return (
    <MotionAs
      className={className}
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 16 }}
      {...animateProps}
      transition={
        shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }
      }
    >
      {children}
    </MotionAs>
  );
}
