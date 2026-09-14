"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { type, layout } from "@/config/brand";
import { formatINR } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";
import QuantityStepper from "./QuantityStepper";
import MaskedLines from "./MaskedLines";
import FadeUp from "./FadeUp";
import Parallax from "./Parallax";
import SweepButton from "./SweepButton";

export default function ProductDetail({ product }: { product: Product }) {
  const variant = product.variants[0];
  const image = product.images[0];
  const [quantity, setQuantity] = useState(1);
  const { addItem, openCart } = useCart();

  const total = useMemo(() => variant.price * quantity, [variant.price, quantity]);

  const handleAddToCart = () => {
    addItem(variant.id, quantity);
    openCart();
  };

  return (
    <section className={`${layout.section} bg-bone text-ink`}>
      <div className={`${layout.container} grid grid-cols-1 gap-16 lg:grid-cols-2`}>
        <div className="flex flex-col justify-center gap-8">
          <Parallax rangePx={18} className="w-full max-w-[280px] self-center sm:self-start">
            <div className="relative aspect-[3/4] w-full overflow-hidden">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(min-width: 1024px) 280px, 60vw"
                className="h-full w-full object-contain"
                priority
              />
            </div>
          </Parallax>

          <div className="flex flex-col gap-6">
            <MaskedLines
              as="h1"
              text={variant.title}
              className={`${type.h2} font-medium uppercase`}
              viewport
            />
            <FadeUp viewport className="max-w-sm text-sm leading-relaxed text-ink/65">
              {product.description}
            </FadeUp>
          </div>
        </div>

        <div className={`flex flex-col gap-10 border-t ${layout.hairline} pt-10`}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.2em] text-ink/50 uppercase">Price</p>
              <p className={`text-2xl ${type.mono} text-gold-deep`}>{formatINR(variant.price)}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs tracking-[0.2em] text-ink/50 uppercase">Qty</span>
              <QuantityStepper value={quantity} onChange={setQuantity} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-6 border-t border-ink/10 pt-6">
            <p className="text-xs tracking-[0.2em] text-ink/50 uppercase">Total</p>
            <p className={`text-2xl ${type.mono}`}>{formatINR(total)}</p>
          </div>

          <SweepButton variant="dark" onClick={handleAddToCart}>
            Add to Cart
          </SweepButton>
        </div>
      </div>
    </section>
  );
}
