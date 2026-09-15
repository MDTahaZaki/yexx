"use client";

import { useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import CanScene from "./CanScene";
import MaskedLines from "./MaskedLines";
import FadeUp from "./FadeUp";
import SweepButton from "./SweepButton";
import { useCanSupport3D } from "@/lib/use-can-support";
import { brand, callouts, pillars, type } from "@/config/brand";
import { NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon } from "./icons";

const pillarIcons = [NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon];

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
      className="relative min-h-screen overflow-hidden bg-bone text-ink"
    >
      <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col gap-8 px-6 pt-[var(--nav-h)] pb-20 md:px-12 lg:flex-row lg:items-center lg:px-20">
        {/* Left column. `min-w-0` overrides the flex default of `min-width:
            auto`, which otherwise lets the headline's intrinsic width push
            this column (and the page) wider than the viewport instead of
            wrapping. A single consistent gap (tighter on mobile, where the
            whole hero must read as one flow rather than separate fragments)
            drives the vertical rhythm — no per-item pt-* overrides. */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-9">
          <p className={`${type.eyebrow} text-gold-deep`}>{brand.tagline}</p>

          <MaskedLines
            as="h1"
            text={`${brand.headline} ${brand.headlineSecondLine}`}
            className={`${type.hero} max-w-[10ch] font-medium uppercase`}
            delay={0.15}
          />

          <FadeUp as="p" delay={0.5} className={`${type.body} max-w-md text-ink/70`}>
            {brand.bio}
          </FadeUp>

          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs tracking-[0.15em] text-ink/60 uppercase">
            {callouts.map((c, i) => (
              <li key={c} className="flex items-center gap-5">
                {i > 0 && <span className="h-3 w-px bg-ink/20" aria-hidden="true" />}
                {c}
              </li>
            ))}
          </ul>

          {/* Pillar badges, stacked down the left. Smaller on mobile so the
              four-item list doesn't dominate the screen before the can even
              appears. */}
          <ul className="flex flex-col gap-3 lg:gap-4">
            {pillars.map((p, i) => {
              const Icon = pillarIcons[i];
              return (
                <li key={p.id} className="flex items-center gap-3 lg:gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/40 lg:h-10 lg:w-10">
                    <Icon className="h-3.5 w-3.5 text-gold-deep lg:h-4 lg:w-4" />
                  </span>
                  <span className="text-xs tracking-wide text-ink/80 uppercase lg:text-sm">
                    {p.title}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-6 lg:gap-8">
            <SweepButton variant="dark" href="/shop">
              Shop Now
            </SweepButton>
            <a
              href="/why-yexx"
              className="text-xs tracking-[0.2em] text-ink underline underline-offset-4"
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
            separately tuned. The volume badge is an overlay anchored to the
            can's own container (not a separate flex item below it) so it
            reads as attached to the can, and doesn't add its own line of
            vertical space to the mobile flow. */}
        <div className="flex flex-1 flex-col items-center">
          <div className="relative h-[clamp(240px,46dvh,400px)] w-full lg:h-[clamp(360px,58dvh,640px)]">
            <motion.div
              style={tier === "static" ? { y: parallaxY } : undefined}
              className="h-full w-full"
            >
              <CanScene tier={tier} scrollProgressRef={scrollProgressRef} />
            </motion.div>
            <span className="absolute inset-x-0 bottom-2 mx-auto w-fit border border-gold/50 bg-bone/80 px-3 py-1 text-[0.65rem] tracking-[0.3em] text-gold-deep uppercase backdrop-blur-sm">
              {brand.volumeBadge}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
