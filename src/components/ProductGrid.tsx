import Link from "next/link";
import Image from "next/image";
import { products } from "@/lib/products";
import { formatINR } from "@/lib/currency";
import { type, layout } from "@/config/brand";

/** The /shop listing — one card per product (one per can size), each linking
 *  to its own handle-based PDP. No size picker here; picking a size *is*
 *  picking which card to open. */
export default function ProductGrid() {
  return (
    <div className={`${layout.container} grid grid-cols-1 gap-px bg-ink/12 sm:grid-cols-2`}>
      {products.map((product) => {
        const variant = product.variants[0];
        const image = product.images[0];
        return (
          <Link
            key={product.handle}
            href={`/product/${product.handle}`}
            className="group flex flex-col items-center gap-6 bg-bone px-8 py-16 text-center transition-colors hover:bg-bone-deep"
          >
            <div className="relative aspect-[3/4] w-full max-w-[220px]">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 640px) 30vw, 60vw"
                className="object-contain transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-2">
              <span className={`${type.h3} font-medium uppercase`}>{variant.title}</span>
              <span className={`text-sm text-gold-deep ${type.mono}`}>{formatINR(variant.price)}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
