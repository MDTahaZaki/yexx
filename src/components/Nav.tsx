"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { nav, brand } from "@/config/brand";
import { useCart } from "@/lib/cart-context";
import { CartIcon, UserIcon } from "./icons";
import MobileNav from "./MobileNav";

export default function Nav({ accountHref }: { accountHref: string }) {
  const [scrolled, setScrolled] = useState(false);
  const { totalCount, openCart } = useCart();
  const shouldReduceMotion = useReducedMotion();
  const badgeControls = useAnimation();
  const previousCount = useRef(totalCount);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Bump the badge whenever the count goes up (not on mount, not on
  // decrease/removal) — skipped entirely under reduced motion.
  useEffect(() => {
    if (totalCount > previousCount.current && !shouldReduceMotion) {
      badgeControls.start({ scale: [1, 1.25, 1], transition: { duration: 0.35, ease: "easeOut" } });
    }
    previousCount.current = totalCount;
  }, [totalCount, shouldReduceMotion, badgeControls]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-bone/90 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[var(--nav-h)] max-w-[1400px] items-center justify-between px-6 text-ink md:px-12 lg:px-20">
        <Link href="/" className="text-sm font-medium tracking-[0.3em] uppercase">
          {brand.name}
        </Link>

        <ul className="hidden items-center gap-10 text-xs tracking-[0.2em] uppercase md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group relative inline-block py-1 opacity-80 transition-opacity hover:opacity-100 pointer-coarse:opacity-100"
              >
                {item.label}
                {/* Underline reveal has no touch equivalent (hover never fires
                    on a touchscreen) — shown by default under pointer: coarse
                    instead, e.g. a touch-screen laptop/tablet at this
                    breakpoint. */}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 ease-out group-hover:scale-x-100 pointer-coarse:scale-x-100 motion-reduce:transition-none" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <MobileNav accountHref={accountHref} />

          <Link
            href={accountHref}
            aria-label="Account"
            className="flex items-center border border-ink/30 p-2.5"
          >
            <UserIcon className="h-4 w-4" />
          </Link>

          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
            className="flex items-center gap-2 border border-ink/30 px-4 py-2 text-xs tracking-[0.2em] uppercase"
          >
            <CartIcon className="h-4 w-4" />
            <motion.span animate={badgeControls}>{totalCount}</motion.span>
          </button>
        </div>
      </nav>
    </header>
  );
}
