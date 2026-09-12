import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

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

type SweepButtonProps =
  | (SweepButtonBaseProps & { href: string } & Omit<
        AnchorHTMLAttributes<HTMLAnchorElement>,
        "className" | "children"
      >)
  | (SweepButtonBaseProps & { href?: undefined } & Omit<
        ButtonHTMLAttributes<HTMLButtonElement>,
        "className" | "children"
      >);

/**
 * The sweep-fill + text-invert hover effect used across the site: a solid
 * fill scales in from the left on hover while a duplicate, oppositely-
 * colored copy of the label is revealed via a syncing clip-path — a
 * pixel-accurate "invert" that doesn't depend on mix-blend-mode support.
 * Renders as an <a> when `href` is given (real navigation, e.g. the hero
 * CTA), otherwise a <button> (form submits, cart actions).
 */
export default function SweepButton({
  variant,
  size = "default",
  children,
  className = "",
  href,
  ...rest
}: SweepButtonProps) {
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
      <a href={href} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={sharedClassName}>
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}
