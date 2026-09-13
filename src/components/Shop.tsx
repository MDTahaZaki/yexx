"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { sizes, type, layout } from "@/config/brand";
import { formatINR } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";
import { useProduct } from "@/lib/product-context";
import { shopImages } from "@/lib/product-images";
import QuantityStepper from "./QuantityStepper";
import MaskedLines from "./MaskedLines";
import FadeUp from "./FadeUp";
import Parallax from "./Parallax";
import SweepButton from "./SweepButton";

export default function Shop() {
  const { selectedSize, setSelectedSize } = useProduct();
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCart();
  const shouldReduceMotion = useReducedMotion();

  const total = useMemo(() => selectedSize.price * quantity, [selectedSize, quantity]);
  const photo = shopImages[selectedSize.id];

  const handleAddToCart = () => {
    addItem(selectedSize.id, quantity);
    openCart();
  };

  return (
    <section id="shop" className={`${layout.section} bg-white text-black`}>
      <div className={`${layout.container} grid grid-cols-1 gap-16 lg:grid-cols-2`}>
        <div className="flex flex-col justify-center gap-8">
          {/* Wipe reveals once, the first time this scrolls into view. The
              size-switch crossfade below is a separate, repeatable
              animation nested inside it — keeping "reveal on scroll" and
              "swap on click" as two distinct triggers instead of one
              wipe firing every time the size changes. */}
          <Parallax rangePx={18} className="w-full max-w-[240px] self-center sm:self-start">
            <motion.div
              initial={shouldReduceMotion ? undefined : { clipPath: "inset(100% 0% 0% 0%)" }}
              whileInView={shouldReduceMotion ? undefined : { clipPath: "inset(0% 0% 0% 0%)" }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[3/4] w-full overflow-hidden"
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={selectedSize.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={photo.src}
                    alt={`YEXX ${selectedSize.label}`}
                    width={photo.width}
                    height={photo.height}
                    sizes="(min-width: 1024px) 240px, 60vw"
                    className="h-full w-full object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </Parallax>

          <div className="flex flex-col gap-6">
            <MaskedLines
              as="h2"
              text="Shop YEXX"
              className={`${type.h2} font-bold uppercase`}
              viewport
            />
            <FadeUp viewport className="max-w-sm text-sm leading-relaxed text-black/65">
              Pick your can size. Every can is brewed to the same spec — clean energy, zero
              compromise.
            </FadeUp>
          </div>
        </div>

        <div className="flex flex-col gap-10 border-t border-black/15 pt-10">
          <div className="grid grid-cols-1 gap-0 border border-black/20 sm:grid-cols-2 sm:divide-x sm:divide-black/20">
            {sizes.map((s) => {
              const active = s.id === selectedSize.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSize(s.id)}
                  className={`flex flex-col gap-1 border-b border-black/20 px-5 py-5 text-left transition-colors last:border-b-0 sm:border-b-0 ${
                    active ? "bg-black text-white" : "bg-white text-black hover:bg-black/5"
                  }`}
                >
                  <span className="text-xs tracking-[0.15em] uppercase opacity-70">{s.label}</span>
                  <span className={`text-lg ${type.mono}`}>{formatINR(s.price)}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-xs tracking-[0.2em] text-black/50 uppercase">Qty</span>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
            <div className="text-right">
              <p className="text-xs tracking-[0.2em] text-black/50 uppercase">Total</p>
              <p className={`text-2xl ${type.mono}`}>{formatINR(total)}</p>
            </div>
          </div>

          <SweepButton variant="dark" onClick={handleAddToCart}>
            Add to Cart
          </SweepButton>
        </div>
      </div>
    </section>
  );
}
