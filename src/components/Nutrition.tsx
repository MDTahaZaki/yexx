"use client";

import { motion } from "motion/react";
import { getNutritionForVolume, type, layout } from "@/config/brand";
import { featuredProduct } from "@/lib/products";
import MaskedLines from "./MaskedLines";
import CountUpNumber from "./CountUpNumber";
import Parallax from "./Parallax";

export default function Nutrition() {
  const volumeMl = featuredProduct.variants[0].volumeMl;
  const nutrition = getNutritionForVolume(volumeMl);

  return (
    <section id="formula" className={`${layout.section} bg-bone-deep text-ink`}>
      <div className={layout.container}>
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines
            as="h2"
            text="The Formula"
            className={`${type.h2} font-medium uppercase`}
            viewport
          />
          <p className={`${type.eyebrow} text-ink/50`}>Per {volumeMl}mL serving</p>
        </div>

        <Parallax rangePx={16}>
        <motion.table
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="w-full border-collapse text-left"
        >
          <thead>
            <tr className="border-b border-ink/20">
              <th className="py-4 text-xs font-normal tracking-[0.25em] text-ink/50 uppercase">
                Spec
              </th>
              <th className="py-4 text-right text-xs font-normal tracking-[0.25em] text-ink/50 uppercase">
                Amount
              </th>
              <th className="hidden py-4 text-right text-xs font-normal tracking-[0.25em] text-ink/50 uppercase md:table-cell">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {nutrition.map((row) => (
              <tr key={row.label} className="border-b border-ink/10">
                <td className="py-5 text-sm tracking-wide uppercase">{row.label}</td>
                <td className={`py-5 text-right text-base ${type.mono}`}>
                  <CountUpNumber value={Number(row.value)} />
                  <span className="ml-1 text-ink/50">{row.unit}</span>
                </td>
                <td className="hidden py-5 text-right text-xs text-ink/40 md:table-cell">
                  {"note" in row ? row.note : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </motion.table>
        </Parallax>
      </div>
    </section>
  );
}
