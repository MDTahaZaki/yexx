"use client";

import { motion, useReducedMotion } from "motion/react";
import { pillars, type, layout } from "@/config/brand";
import { pillarImages } from "@/lib/product-images";
import { useRevealed } from "@/lib/use-revealed";
import { NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon } from "./icons";
import RevealImage from "./RevealImage";

const pillarIcons = [NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon];

export default function Pillars() {
  // Native IntersectionObserver + a fallback timer, animated via `animate`
  // rather than `whileInView` — see useRevealed for why: `whileInView`
  // relies entirely on the observer firing, and in production that
  // sometimes just doesn't happen, leaving whatever it gates permanently
  // invisible instead of merely late.
  //
  // Each item's `initial`/`animate` is set directly from `revealed` rather
  // than through variants + `staggerChildren`: variant propagation from a
  // parent's dynamically-computed `animate` string turned out not to reach
  // these children reliably (they stayed stuck at their "hidden" values even
  // once the parent's own state had flipped) — passing the same `revealed`
  // boolean straight to every item sidesteps that propagation path entirely.
  const [ref, , revealed] = useRevealed<HTMLDivElement>(0.3);
  const shouldReduceMotion = useReducedMotion();
  const settled = shouldReduceMotion || revealed;

  return (
    <section id="benefits" className={`${layout.section} bg-bone text-ink`}>
      <div className={layout.container}>
        <div
          ref={ref}
          className={`grid grid-cols-1 border-t ${layout.hairlineGold} sm:grid-cols-2 sm:divide-x ${layout.hairline} lg:grid-cols-4`}
        >
          {pillars.map((p, i) => {
            const Icon = pillarIcons[i];
            const photo = pillarImages[i];
            return (
              <motion.div
                key={p.id}
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
                animate={shouldReduceMotion ? undefined : { opacity: settled ? 1 : 0, y: settled ? 0 : 24 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.6,
                  ease: "easeOut",
                  delay: shouldReduceMotion || !revealed ? 0 : i * 0.15,
                }}
                className={`flex flex-col gap-6 border-b ${layout.hairline} px-0 py-12 sm:px-8 sm:first:pl-0 lg:px-8`}
              >
                <RevealImage
                  imageProps={{
                    src: photo.src,
                    alt: "",
                    width: photo.width,
                    height: photo.height,
                    sizes: "(min-width: 1024px) 25vw, 45vw",
                    style: { objectPosition: photo.objectPosition },
                  }}
                  wrapperClassName="aspect-[4/5] w-full"
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40">
                  <Icon className="h-5 w-5 text-gold-deep" />
                </span>
                <h3 className={`${type.h3} font-medium uppercase`}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-ink/65">{p.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
