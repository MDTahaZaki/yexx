"use client";

import { useMemo, useState } from "react";
import { sizes, type, layout } from "@/config/brand";
import { formatINR } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";
import { useProduct } from "@/lib/product-context";
import QuantityStepper from "./QuantityStepper";
import MaskedLines from "./MaskedLines";
import SweepButton from "./SweepButton";

export default function Shop() {
  const { selectedSize, setSelectedSize } = useProduct();
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCart();

  const total = useMemo(() => selectedSize.price * quantity, [selectedSize, quantity]);

  const handleAddToCart = () => {
    addItem(selectedSize.id, quantity);
    openCart();
  };

  return (
    <section id="shop" className={`${layout.section} bg-white text-black`}>
      <div className={`${layout.container} grid grid-cols-1 gap-16 lg:grid-cols-2`}>
        <div className="flex flex-col justify-center gap-6">
          <MaskedLines as="h2" text="Shop YEXX" className={`${type.h2} font-bold uppercase`} viewport />
          <p className="max-w-sm text-sm leading-relaxed text-black/65">
            Pick your can size. Every can is brewed to the same spec — clean energy, zero
            compromise.
          </p>
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
