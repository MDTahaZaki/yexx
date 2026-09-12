"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import { nav, brand } from "@/config/brand";
import { useCart } from "@/lib/cart-context";
import { CartIcon } from "./icons";

export default function Nav() {
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
        scrolled ? "bg-black/80 backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[var(--nav-h)] max-w-[1400px] items-center justify-between px-6 text-white md:px-12 lg:px-20">
        <a href="#top" className="text-sm font-bold tracking-[0.3em] uppercase">
          {brand.name}
        </a>

        <ul className="hidden items-center gap-10 text-xs tracking-[0.2em] uppercase md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="group relative inline-block py-1 opacity-80 transition-opacity hover:opacity-100">
                {item.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none" />
              </a>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={openCart}
          aria-label={`Open cart, ${totalCount} item${totalCount === 1 ? "" : "s"}`}
          className="flex items-center gap-2 border border-white/40 px-4 py-2 text-xs tracking-[0.2em] uppercase"
        >
          <CartIcon className="h-4 w-4" />
          <motion.span animate={badgeControls}>{totalCount}</motion.span>
        </button>
      </nav>
    </header>
  );
}
