"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import CanScene from "./CanScene";
import MaskedLines from "./MaskedLines";
import FadeUp from "./FadeUp";
import SweepButton from "./SweepButton";
import { useCanSupport3D } from "@/lib/use-can-support";
import { brand, callouts, pillars, type } from "@/config/brand";
import { CleanEnergyIcon, FocusIcon, PerformanceIcon } from "./icons";

// Pulls in `ogl`/WebGL — kept out of the initial bundle like the can itself,
// and only ever mounted when `tier` says full motion content is safe to show.
const ParticlesBackground = dynamic(() => import("./ParticlesBackground"), {
  ssr: false,
});

const pillarIcons = [CleanEnergyIcon, FocusIcon, PerformanceIcon];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const tier = useCanSupport3D();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.6 });
  const parallaxY = useTransform(smoothProgress, [0, 1], [0, 70]);

  // The 3D can reads scroll progress itself, inside the Canvas: written to a
  // ref (not React state) so scrolling never crosses the Canvas boundary and
  // never triggers a React re-render of the scene. The tilt is applied to the
  // can mesh via useFrame, not as a CSS transform on the Canvas' container —
  // a transform there produces a visibly skewed rectangle since the canvas
  // has a rectangular clip.
  const scrollProgressRef = useRef(0);
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    scrollProgressRef.current = latest;
  });

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative min-h-screen overflow-hidden bg-black text-white"
    >
      {/* Full-quality only: skipped on the reduced mobile 3D tier, the
          static fallback, and under prefers-reduced-motion. Sits behind the
          z-10 content below with no z-index of its own. */}
      {tier === "full" && <ParticlesBackground />}

      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-14 px-6 pt-[var(--nav-h)] pb-20 md:px-12 lg:flex-row lg:items-center lg:gap-8 lg:px-20">
        {/* Left column. `min-w-0` overrides the flex default of `min-width:
            auto`, which otherwise lets the headline's intrinsic width push
            this column (and the page) wider than the viewport instead of
            wrapping. */}
        <div className="flex min-w-0 flex-1 flex-col gap-9">
          <p className={`${type.eyebrow} text-white/60`}>{brand.tagline}</p>

          <MaskedLines
            as="h1"
            text={brand.headline}
            className={`${type.hero} max-w-[10ch] font-bold uppercase`}
            delay={0.15}
          />

          <FadeUp as="p" delay={0.5} className={`${type.body} max-w-md text-white/70`}>
            {brand.bio}
          </FadeUp>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-[0.15em] text-white/60 uppercase">
            {callouts.map((c, i) => (
              <li key={c} className="flex items-center gap-5">
                {i > 0 && <span className="h-3 w-px bg-white/25" aria-hidden="true" />}
                {c}
              </li>
            ))}
          </ul>

          {/* Pillar badges, stacked down the left */}
          <ul className="flex flex-col gap-4 pt-2">
            {pillars.map((p, i) => {
              const Icon = pillarIcons[i];
              return (
                <li key={p.id} className="flex items-center gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30">
                    <Icon className="h-4 w-4 text-white" />
                  </span>
                  <span className="text-sm tracking-wide text-white/80 uppercase">{p.title}</span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-8 pt-4">
            {/* Plain anchor to #shop, letting the user choose a size
                themselves — no longer pre-adds a hardcoded quantity to the
                cart before a size is even selected. */}
            <SweepButton variant="light" href="#shop">
              Shop Now
            </SweepButton>
            <a
              href="#formula"
              className="text-xs tracking-[0.2em] text-white uppercase underline underline-offset-4"
            >
              View Nutrition
            </a>
          </div>
        </div>

        {/* Right column: the can. Same element tree regardless of tier, so
            it flipping after mount never triggers a remount. The wrapper
            never carries a transform for either 3D tier — the scroll tilt is
            applied inside the Canvas, to the can mesh itself, via
            `scrollProgressRef`. It's only used here for the flat poster's
            simple vertical parallax. Height is viewport-height-aware
            (clamp, not a fixed pixel value) so the can's container itself
            never overflows a short window — see EnergyDrinkCan's camera
            comment for how the can's size *within* this container is
            separately tuned. */}
        <div className="relative h-[clamp(260px,48dvh,420px)] flex-1 lg:h-[clamp(360px,58dvh,640px)]">
          <motion.div
            style={tier === "static" ? { y: parallaxY } : undefined}
            className="h-full w-full"
          >
            <CanScene tier={tier} scrollProgressRef={scrollProgressRef} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
