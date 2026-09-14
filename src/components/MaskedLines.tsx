"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

/**
 * Splits text into words, each clipped inside its own overflow-hidden box
 * and slid up from below — a mask reveal, not a fade. Reused for the hero
 * headline (animates on load) and section headings (animates on scroll).
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

  const transition = (i: number): Transition =>
    shouldReduceMotion
      ? { duration: 0 }
      : { duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger };

  const animateProps = viewport
    ? { whileInView: { y: "0%" }, viewport: { once: true, amount: 0.6 } }
    : { animate: { y: "0%" } };

  return (
    <As className={className}>
      {words.map((word, i) => (
        <span key={i} className={`block overflow-hidden ${lineClassName}`}>
          <motion.span
            className="block will-change-transform"
            initial={{ y: shouldReduceMotion ? "0%" : "110%" }}
            {...animateProps}
            transition={transition(i)}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </As>
  );
}
