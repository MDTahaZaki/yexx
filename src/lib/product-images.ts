// Single source of truth for where each real product render is used —
// dimensions come straight from the source files so next/image never has to
// guess an aspect ratio (avoids layout shift).
//
// Every image on the site must show the same can FORMAT — the ten renders
// in /public/product/ cover eight different shapes (slim, sleek, standard,
// tallboy, stubby, slim-tall, bullet, straight), and using more than one of
// them at once makes the site look like it's selling a product that
// doesn't exist. "slim" (01/02) is the only shape with both a 150ml and a
// 250ml render — the two sizes actually sold — so it's the placeholder
// format everywhere below, until the client picks the real one. Swapping
// formats later means changing the two SLIM_* paths/dimensions here, not
// touching Pillars or SocialGrid.
//
// The "-gold" suffix marks the recolored (warm bone + brushed gold) render —
// see the sibling non-suffixed .webp for the original dark-theme source.
const SLIM_150 = { src: "/product/01_slim_150-gold.png", width: 362, height: 509 };
const SLIM_250 = { src: "/product/02_slim_250-gold.png", width: 362, height: 698 };

interface ProductImage {
  src: string;
  width: number;
  height: number;
}

interface CroppedProductImage extends ProductImage {
  /** CSS object-position. Both renders place their lid/logo/wordmark at
   *  the same proportional height (250ml is the same design, just taller),
   *  so the default centered crop looks near-identical everywhere it's
   *  used unless given an explicit, differing position. Vary this to vary
   *  the framing — never swap in a different shape to do it. */
  objectPosition: string;
}

// One photo tile in the #YEXXYOURWAY grid per entry. Both the 150ml and
// 250ml slim renders are used across these — same format throughout, the
// crop/zoom and which of the two sizes is what varies.
export const gridImages: CroppedProductImage[] = [
  { ...SLIM_250, objectPosition: "50% 45%" }, // large anchor tile — Y mark, full logo dead-on
  { ...SLIM_150, objectPosition: "50% 8%" }, // lid/rim
  { ...SLIM_250, objectPosition: "50% 88%" }, // wordmark/base
  { ...SLIM_250, objectPosition: "50% 58%" }, // full body (tall tile, less cropping)
  { ...SLIM_150, objectPosition: "50% 20%" }, // shoulder taper
  { ...SLIM_150, objectPosition: "50% 72%" }, // lower body
];

// Tightly-cropped detail shot beside each pillar. None of the renders
// actually show condensation (they're clean studio-style CGI, not the
// photoreal splash/condensation shots the brief described) — the first
// entry crops in on the wordmark/base band as the closest available
// stand-in, called out honestly rather than mislabeled.
export const pillarImages: CroppedProductImage[] = [
  { ...SLIM_150, objectPosition: "50% 92%" }, // wordmark/base — condensation stand-in
  { ...SLIM_250, objectPosition: "50% 40%" }, // Y mark
  { ...SLIM_150, objectPosition: "50% 6%" }, // lid/rim
  { ...SLIM_250, objectPosition: "50% 25%" }, // shoulder
];
