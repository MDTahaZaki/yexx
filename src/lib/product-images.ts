// Single source of truth for where each real product render is used —
// dimensions come straight from the source files so next/image never has to
// guess an aspect ratio (avoids layout shift).

interface ProductImage {
  src: string;
  width: number;
  height: number;
}

interface CroppedProductImage extends ProductImage {
  /** CSS object-position, tuned per photo so its subject stays centred in
   *  frame and nothing load-bearing (the Y-mark, a can's rim) gets cropped
   *  off at the tile's edges. */
  objectPosition: string;
}

// All six /public/product/gallery photos share the same 1024x1536 (2:3)
// portrait frame.
const GALLERY_WIDTH = 1024;
const GALLERY_HEIGHT = 1536;

function galleryImage(n: 1 | 2 | 3 | 4 | 5 | 6): ProductImage {
  return { src: `/product/gallery/yexx-${n}.webp`, width: GALLERY_WIDTH, height: GALLERY_HEIGHT };
}

// One photoreal gallery shot per benefit pillar, picked for what each
// benefit is actually about — order matches `pillars` in config/brand.ts
// (Natural Energy, Focus, Endurance, Performance).
export const pillarImages: CroppedProductImage[] = [
  // Natural Energy — ice and fresh mint around the cans, the closest thing
  // the gallery has to an ingredient shot.
  { ...galleryImage(4), objectPosition: "48% 42%" },
  // Focus — a tight macro of the Y-mark itself, sharp and unobstructed.
  { ...galleryImage(5), objectPosition: "45% 48%" },
  // Endurance — a single can standing steady on its own, not mid-motion.
  { ...galleryImage(1), objectPosition: "50% 40%" },
  // Performance — three cans caught mid-tumble, the gallery's one real
  // group-and-motion shot.
  { ...galleryImage(2), objectPosition: "50% 42%" },
];
