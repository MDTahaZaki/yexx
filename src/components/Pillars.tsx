"use client";

import { motion, type Variants } from "framer-motion";
import { pillars, type, layout } from "@/config/brand";
import { CleanEnergyIcon, FocusIcon, PerformanceIcon } from "./icons";

const pillarIcons = [CleanEnergyIcon, FocusIcon, PerformanceIcon];

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
    <section id="benefits" className={`${layout.section} bg-white text-black`}>
      <div className={layout.container}>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 border-t border-black/15 md:grid-cols-3 md:divide-x md:divide-black/15"
        >
          {pillars.map((p, i) => {
            const Icon = pillarIcons[i];
            return (
              <motion.div
                key={p.id}
                variants={item}
                className="flex flex-col gap-6 border-b border-black/15 px-0 py-12 md:border-b-0 md:px-10 md:first:pl-0 lg:px-14"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-black/25">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className={`${type.h3} font-bold uppercase`}>{p.title}</h3>
                <p className="text-sm leading-relaxed text-black/65">{p.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
