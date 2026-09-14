"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Wraps content in a small vertical drift tied to its own scroll progress
 * through the viewport — a few percent of movement, not a carousel. Give
 * different sections a different `rangePx` so they drift at visibly
 * different (but all subtle) rates rather than moving in lockstep.
 * Transform only, and a no-op under reduced motion.
 */
export default function Parallax({
  children,
  className = "",
  rangePx = 20,
}: {
  children: ReactNode;
  className?: string;
  rangePx?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [rangePx, -rangePx]);

  return (
    <motion.div ref={ref} style={shouldReduceMotion ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}
