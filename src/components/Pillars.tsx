"use client";

import { motion, type Variants } from "motion/react";
import { pillars, type, layout } from "@/config/brand";
import { pillarImages } from "@/lib/product-images";
import { NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon } from "./icons";
import RevealImage from "./RevealImage";

const pillarIcons = [NaturalEnergyIcon, FocusIcon, EnduranceIcon, PerformanceIcon];

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Pillars() {
  return (
    <section id="benefits" className={`${layout.section} bg-bone text-ink`}>
      <div className={layout.container}>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className={`grid grid-cols-1 border-t ${layout.hairlineGold} sm:grid-cols-2 sm:divide-x ${layout.hairline} lg:grid-cols-4`}
        >
          {pillars.map((p, i) => {
            const Icon = pillarIcons[i];
            const photo = pillarImages[i];
            return (
              <motion.div
                key={p.id}
                variants={item}
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
                  wrapperClassName="h-40 w-full"
                />
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/40">
                  <Icon className="h-5 w-5 text-gold-deep" />
                </span>
                <h3 className={`${type.h3} font-medium uppercase`}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-ink/65">{p.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
