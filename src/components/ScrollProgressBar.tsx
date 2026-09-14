"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** A thin bar pinned to the top of the viewport, tracking whole-page scroll progress. */
export default function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const shouldReduceMotion = useReducedMotion();
  // Reduced motion: track the raw value directly instead of a springy lag.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: shouldReduceMotion ? 1000 : 120,
    damping: shouldReduceMotion ? 100 : 25,
    mass: 0.2,
  });

  return (
    <motion.div
      style={{ scaleX: smoothed }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gold"
      aria-hidden="true"
    />
  );
}
