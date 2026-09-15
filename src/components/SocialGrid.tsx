"use client";

import { motion } from "motion/react";
import { brand, layout, type } from "@/config/brand";
import { embossTexture } from "@/lib/grain";
import { gridImages } from "@/lib/product-images";
import MaskedLines from "./MaskedLines";
import Parallax from "./Parallax";
import RevealImage from "./RevealImage";

// Pre-launch: no customers yet, so this is a product gallery (different
// crops/angles of the can), not a social wall. No usernames or handles on
// any tile — the one exception is the dedicated Instagram panel below,
// which links the client's real account rather than inventing UGC.
const tiles = [
  { id: 1, span: "col-span-2 row-span-2", alt: "YEXX can, full body with Y-mark logo", image: 0 },
  { id: 2, span: "col-span-1 row-span-1", alt: "YEXX can, lid and rim detail", image: 1 },
  { id: 3, span: "col-span-1 row-span-1", alt: "YEXX can, wordmark and base detail", image: 2 },
  { id: 4, span: "col-span-1 row-span-2", alt: "YEXX can, full body, tall crop", image: 3 },
  { id: 5, span: "col-span-2 row-span-1", special: true as const },
  { id: 6, span: "col-span-1 row-span-1", alt: "YEXX can, shoulder taper detail", image: 4 },
  { id: 7, span: "col-span-1 row-span-1", alt: "YEXX can, lower body detail", image: 5 },
];

const INSTAGRAM_HANDLE = "@yexxofficial.co";
const INSTAGRAM_URL = "https://instagram.com/yexxofficial.co";

function TileFrame({
  id,
  span,
  children,
}: {
  id: number;
  span: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: (id % 4) * 0.05 }}
      className={`group relative overflow-hidden ${span} min-h-[120px]`}
    >
      {children}
    </motion.div>
  );
}

function PhotoTile({
  id,
  span,
  alt,
  image,
}: {
  id: number;
  span: string;
  alt: string;
  image: number;
}) {
  const photo = gridImages[image];
  return (
    <TileFrame id={id} span={span}>
      {/* Real product render. Every can render places its Y-mark logo at
          about the same vertical band, so a default centered crop looked
          near-identical across tiles regardless of source file — the
          explicit per-tile objectPosition below is what actually varies
          the crop. Scaling this wrapper on hover (not RevealImage's own
          inner drift layer) keeps the two transforms on separate nodes so
          they compose instead of one clobbering the other's inline style. */}
      <div className="absolute inset-0 bg-bone-deep" aria-hidden="true" />
      <RevealImage
        imageProps={{
          src: photo.src,
          alt,
          fill: true,
          sizes: "(min-width: 768px) 25vw, 50vw",
          style: { objectPosition: photo.objectPosition },
        }}
        position="absolute"
        wrapperClassName="inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{ backgroundImage: embossTexture }}
        aria-hidden="true"
      />
    </TileFrame>
  );
}

function InstagramTile({ id, span }: { id: number; span: string }) {
  return (
    <TileFrame id={id} span={span}>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full flex-col items-center justify-center gap-3 border border-gold/30 bg-bone-deep transition-colors duration-300 hover:bg-gold/5"
      >
        <span className="text-lg font-medium tracking-[0.15em] text-ink uppercase">
          {brand.hashtag}
        </span>
        <span className="text-[0.65rem] tracking-[0.35em] text-ink/45 uppercase">
          {INSTAGRAM_HANDLE}
        </span>
      </a>
    </TileFrame>
  );
}

export default function SocialGrid() {
  return (
    <section className={`${layout.section} bg-bone text-ink`}>
      <div className={layout.container}>
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines as="h2" text="The Can" className={`${type.h2} font-medium uppercase`} viewport />
          <p className={`${type.eyebrow} text-ink/50`}>Launching soon — follow along</p>
        </div>

        <Parallax rangePx={22}>
          <div className="grid auto-rows-[140px] grid-cols-2 gap-1 grid-flow-row-dense md:grid-cols-4">
            {tiles.map((t) =>
              t.special ? (
                <InstagramTile key={t.id} id={t.id} span={t.span} />
              ) : (
                <PhotoTile key={t.id} id={t.id} span={t.span} alt={t.alt!} image={t.image!} />
              )
            )}
          </div>
        </Parallax>
      </div>
    </section>
  );
}
