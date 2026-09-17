// Single source of truth for product data — sizes, prices, descriptions,
// images. Nothing product-related is hardcoded in components; they all read
// from `products` (or the `findVariant`/`findProduct` helpers) below.
//
// Shaped to mirror Shopify's product/variant model on purpose: a `handle`
// per product, an `images` array, and a `variants` array with `id`/`title`/
// `price`. If a Shopify storefront is wired up later, that's a change to
// *where* this data comes from (swap this module for a fetch against the
// Storefront API), not a rewrite of every component that reads it.
//
// Each can size ships as its own product (its own handle, its own PDP —
// e.g. /product/yexx-250ml) rather than one product with a size picker.

export interface ProductVariant {
  id: string;
  title: string;
  /** Whole rupees — see src/lib/currency.ts (formatINR). */
  price: number;
  volumeMl: number;
}

export interface ProductImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface Product {
  handle: string;
  title: string;
  description: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export const products: Product[] = [
  {
    handle: "yexx-150ml",
    title: "YEXX Energy Drink — 150ml",
    description:
      "The compact can. Same formula, same clean lift, sized for a shorter session or a first try.",
    images: [
      { src: "/product/yexx-150ml-can.webp", width: 525, height: 965, alt: "YEXX 150ml can" },
    ],
    // TODO(client): placeholder price — swap for the real 150ml price once confirmed.
    variants: [{ id: "yexx-150ml-can", title: "150 ml Can", price: 69, volumeMl: 150 }],
  },
  {
    handle: "yexx-250ml",
    title: "YEXX Energy Drink — 250ml",
    description:
      "The full-size can. Clean natural energy, sharp focus, and the endurance to go the distance — brewed to the same spec as every other size, just more of it.",
    images: [
      { src: "/product/yexx-250ml-can.webp", width: 525, height: 965, alt: "YEXX 250ml can" },
    ],
    // TODO(client): placeholder price — swap for the real 250ml price once confirmed.
    variants: [{ id: "yexx-250ml-can", title: "250 ml Can", price: 99, volumeMl: 250 }],
  },
];

export function findProduct(handle: string): Product | undefined {
  return products.find((p) => p.handle === handle);
}

export function findVariant(variantId: string): { product: Product; variant: ProductVariant } | undefined {
  for (const product of products) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return undefined;
}

// The can shown in the home hero and used as the default/featured listing —
// the 250ml can, per the "Volume badge: 250 ml" brief. Looked up by handle
// (not array order) since `products` is ordered small-to-large for the shop
// grid, not by "featured" status.
export const featuredProduct = findProduct("yexx-250ml")!;
