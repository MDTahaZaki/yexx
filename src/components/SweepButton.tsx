import type { AnchorHTMLAttributes, ButtonHTMLAttributes, PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

interface SweepButtonBaseProps {
  /** "dark" = black button (sweeps white, text inverts black->white) — for
   *  light sections. "light" = white button (sweeps black, text inverts
   *  white->black) — for dark sections. Named after the button's own base
   *  color, not the section it sits on. */
  variant: "dark" | "light";
  /** "compact" trims the padding for tight inline placements (e.g. next to
   *  a newsletter input) without losing the sweep/invert effect. */
  size?: "default" | "compact";
  children: ReactNode;
  className?: string;
}

// framer-motion's motion.a/motion.button redeclare onDrag*/onAnimation* with
// gesture-specific signatures that conflict with the native DOM event
// handler types of the same name — excluded here since nothing in this
// component uses the native versions anyway.
type ConflictingMotionHandlers =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration";

type SweepButtonProps =
  | (SweepButtonBaseProps & { href: string } & Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        "className" | "children" | ConflictingMotionHandlers
      >)
  | (SweepButtonBaseProps & { href?: undefined } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "className" | "children" | ConflictingMotionHandlers
      >);

// How far the button drifts toward the cursor, as a fraction of the cursor's
// offset from center — kept small, this is a "pull," not a chase.
const MAGNETIC_STRENGTH = 0.25;
const MAGNETIC_SPRING = { stiffness: 150, damping: 15, mass: 0.2 };

/**
 * The sweep-fill + text-invert hover effect used across the site: a solid
 * fill scales in from the left on hover while a duplicate, oppositely-
 * colored copy of the label is revealed via a syncing clip-path — a
 * pixel-accurate "invert" that doesn't depend on mix-blend-mode support.
 * Renders as an <a> when `href` is given (real navigation, e.g. the hero
 * CTA), otherwise a <button> (form submits, cart actions).
 *
 * Also carries a slight magnetic pull toward the cursor — mouse only
 * (gated on `pointerType === "mouse"`, which a touch or pen input never
 * reports, so this needs no separate touch-detection query) and skipped
 * entirely under reduced motion.
 */
export default function SweepButton({
  variant,
  size = "default",
  children,
  className = "",
  href,
  ...rest
}: SweepButtonProps) {
  const shouldReduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, MAGNETIC_SPRING);
  const springY = useSpring(y, MAGNETIC_SPRING);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * MAGNETIC_STRENGTH);
    y.set((event.clientY - (rect.top + rect.height / 2)) * MAGNETIC_STRENGTH);
  }
  function handlePointerLeave() {
    x.set(0);
    y.set(0);
  }

  const base = variant === "dark" ? "bg-black text-white" : "bg-white text-black";
  const sweep = variant === "dark" ? "bg-white" : "bg-black";
  const invertText = variant === "dark" ? "text-black" : "text-white";
  const padding = size === "compact" ? "px-4 py-2" : "px-8 py-4";
  const sharedClassName = `group relative overflow-hidden ${base} ${padding} text-xs font-semibold tracking-[0.25em] uppercase ${className}`;

  const content = (
    <>
      <span
        className={`absolute inset-0 origin-left scale-x-0 ${sweep} transition-transform duration-500 ease-out group-hover:scale-x-100 motion-reduce:transition-none`}
        aria-hidden="true"
      />
      <span className="relative flex items-center justify-center gap-2">{children}</span>
      <span
        className={`absolute inset-0 flex items-center justify-center gap-2 ${padding} ${invertText} [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-out group-hover:[clip-path:inset(0_0%_0_0)] motion-reduce:transition-none`}
        aria-hidden="true"
      >
        {children}
      </span>
    </>
  );

  if (href !== undefined) {
    return (
      <motion.a
        href={href}
        {...(rest as Omit<
          AnchorHTMLAttributes<HTMLAnchorElement>,
          "className" | "children" | ConflictingMotionHandlers
        >)}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{ x: springX, y: springY }}
        className={sharedClassName}
      >
        {content}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      {...(rest as Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "className" | "children" | ConflictingMotionHandlers
      >)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ x: springX, y: springY }}
      className={sharedClassName}
    >
      {content}
    </motion.button>
  );
}
