// Single source of truth for where each real product render is used —
// dimensions come straight from the source files so next/image never has to
// guess an aspect ratio (avoids layout shift).

interface ProductImage {
  src: string;
  width: number;
  height: number;
}

interface CroppedProductImage extends ProductImage {
  /** CSS object-position. Every render places its Y-mark logo at roughly
   *  the same vertical band, so the *default* (centered) crop looks near-
   *  identical from tile to tile regardless of which of the ten source
   *  files is used — explicit, differing positions are what actually
   *  varies the crop. */
  objectPosition: string;
}

// The two can sizes actually sold (see config/brand.ts `sizes`) have a
// literal same-named render each.
export const shopImages: Record<"150ml" | "250ml", ProductImage> = {
  "150ml": { src: "/product/01_slim_150.webp", width: 362, height: 509 },
  "250ml": { src: "/product/02_slim_250.webp", width: 362, height: 698 },
};

// Six of the eight remaining can-format renders, one per photo tile in the
// #YEXXYOURWAY grid — deliberately different crops/formats so no two tiles
// read the same. The other two (05, 10) are reserved for the Pillars detail
// crops below.
export const gridImages: CroppedProductImage[] = [
  // The large anchor tile keeps the full Y mark — the one crop where
  // showing the logo dead-on is the point.
  { src: "/product/06_tallboy_500.webp", width: 417, height: 845, objectPosition: "50% 45%" },
  { src: "/product/03_sleek_250.webp", width: 383, height: 610, objectPosition: "50% 8%" }, // lid/rim
  { src: "/product/09_bullet_250.webp", width: 362, height: 698, objectPosition: "50% 88%" }, // wordmark/base
  { src: "/product/08_slim_tall_330.webp", width: 383, height: 845, objectPosition: "50% 55%" }, // full body (tall tile, less cropping)
  { src: "/product/04_sleek_330.webp", width: 383, height: 749, objectPosition: "50% 20%" }, // shoulder taper
  { src: "/product/07_stubby_200.webp", width: 404, height: 505, objectPosition: "50% 70%" }, // lower body
];

// Tightly-cropped detail shot beside each pillar. None of the ten renders
// actually show condensation (they're clean studio-style CGI, not the
// photoreal splash/condensation shots the brief described) — the first
// entry crops in on the body's specular highlight as the closest available
// stand-in, called out honestly rather than mislabeled.
export const pillarImages: CroppedProductImage[] = [
  // Cropped low, on the wordmark/base band — the Y mark dominates the mid-
  // body on every render, so a crop anywhere near it looked identical to
  // the "Y mark" pillar below; this stays visually distinct from both.
  { src: "/product/05_standard_330.webp", width: 417, height: 623, objectPosition: "50% 92%" }, // body/base — condensation stand-in
  { src: "/product/10_straight_250.webp", width: 375, height: 665, objectPosition: "50% 40%" }, // Y mark
  { src: "/product/06_tallboy_500.webp", width: 417, height: 845, objectPosition: "50% 6%" }, // lid/rim
];
