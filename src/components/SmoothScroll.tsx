"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Smooths wheel/touch scrolling site-wide. Deliberately left at Lenis'
 * default target (the real window) rather than a wrapper+content pair — a
 * transform-based virtual scroll would apply a transform to every ancestor
 * between it and the hero's <Canvas>, which is exactly what previously
 * rendered the canvas as a skewed panel and forced a full GPU recomposite
 * every frame. This mode instead drives the real `window.scrollTo` on a
 * rAF loop, so `window.scrollY` (and every Motion `useScroll()` in
 * the app) stays perfectly in sync with no extra wiring.
 */
export default function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  // The Lenis instance below is created once and lives for the whole
  // session (this component never remounts across client-side route
  // changes), so it caches its own scroll position independently of the
  // DOM. Next.js resets `window.scrollTo` to the top on a route change, but
  // without this, Lenis's own rAF loop stomps right back over that reset on
  // the very next frame, re-applying whatever scroll position it still
  // remembers from the *previous* page — landing a fresh page mid-scroll.
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Route in-page hash links (nav, footer) through Lenis too, otherwise
    // the browser's own instant/CSS-smooth jump fights Lenis' rAF-driven
    // one. Offset by the fixed nav's real rendered height so the target
    // section's heading clears it, matching the CSS scroll-margin-top
    // fallback used when JS is unavailable.
    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a[href^='#']"
      );
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      event.preventDefault();
      const navHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
      lenis.scrollTo(target, { offset: -navHeight });
    }
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", onClick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
