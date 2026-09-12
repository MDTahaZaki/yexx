"use client";

import { motion } from "framer-motion";
import { getNutritionForVolume, type, layout } from "@/config/brand";
import { useProduct } from "@/lib/product-context";
import MaskedLines from "./MaskedLines";
import CountUpNumber from "./CountUpNumber";

export default function Nutrition() {
  const { selectedSize } = useProduct();
  const nutrition = getNutritionForVolume(selectedSize.volumeMl);

  return (
    <section id="formula" className={`${layout.section} bg-black text-white`}>
      <div className={layout.container}>
        <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines
            as="h2"
            text="The Formula"
            className={`${type.h2} font-bold uppercase`}
            viewport
          />
          <p className={`${type.eyebrow} text-white/50`}>Per {selectedSize.volumeMl}mL serving</p>
        </div>

        <motion.table
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="w-full border-collapse text-left"
        >
          <thead>
            <tr className="border-b border-white/20">
              <th className="py-4 text-xs font-normal tracking-[0.25em] text-white/50 uppercase">
                Spec
              </th>
              <th className="py-4 text-right text-xs font-normal tracking-[0.25em] text-white/50 uppercase">
                Amount
              </th>
              <th className="hidden py-4 text-right text-xs font-normal tracking-[0.25em] text-white/50 uppercase md:table-cell">
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {nutrition.map((row) => (
              <tr key={row.label} className="border-b border-white/10">
                <td className="py-5 text-sm tracking-wide uppercase">{row.label}</td>
                <td className={`py-5 text-right text-base ${type.mono}`}>
                  <CountUpNumber value={Number(row.value)} />
                  <span className="ml-1 text-white/50">{row.unit}</span>
                </td>
                <td className="hidden py-5 text-right text-xs text-white/40 md:table-cell">
                  {"note" in row ? row.note : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </motion.table>
      </div>
    </section>
  );
}
