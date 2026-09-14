"use client";

import { motion } from "motion/react";
import { brand, layout, type } from "@/config/brand";
import { embossTexture } from "@/lib/grain";
import { gridImages } from "@/lib/product-images";
import MaskedLines from "./MaskedLines";
import Parallax from "./Parallax";
import RevealImage from "./RevealImage";

const tiles = [
  { id: 1, span: "col-span-2 row-span-2", tag: "@yexx_official", image: 0 },
  { id: 2, span: "col-span-1 row-span-1", tag: "@r.torres", image: 1 },
  { id: 3, span: "col-span-1 row-span-1", tag: "@leah.k", image: 2 },
  { id: 4, span: "col-span-1 row-span-2", tag: "@danny_lifts", image: 3 },
  { id: 5, span: "col-span-2 row-span-1", special: true as const },
  { id: 6, span: "col-span-1 row-span-1", tag: "@marta.codes", image: 4 },
  { id: 7, span: "col-span-1 row-span-1", tag: "@jules_runs", image: 5 },
];

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
  tag,
  image,
}: {
  id: number;
  span: string;
  tag: string;
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
          alt: "",
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

      {/* Scrim + username: hidden until hover on a mouse, but hover can never
          fire on a touchscreen, so it's shown by default there instead
          (pointer: coarse, not a screen-width guess — a touch laptop/tablet
          at desktop width has the same problem a phone does). */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 translate-y-full bg-gradient-to-t from-ink/85 via-ink/30 to-transparent opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100"
        aria-hidden="true"
      />
      <span className="pointer-events-none absolute bottom-3 left-3 translate-y-2 text-[0.65rem] font-light tracking-[0.25em] text-bone/90 uppercase opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
        {tag}
      </span>
    </TileFrame>
  );
}

function TagUsTile({ id, span }: { id: number; span: string }) {
  return (
    <TileFrame id={id} span={span}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-gold/30 bg-bone-deep">
        <span className="text-lg font-medium tracking-[0.15em] text-ink uppercase">
          {brand.hashtag}
        </span>
        <span className="text-[0.65rem] tracking-[0.35em] text-ink/45 uppercase">Tag us</span>
      </div>
    </TileFrame>
  );
}

export default function SocialGrid() {
  return (
    <section className={`${layout.section} bg-bone text-ink`}>
      <div className={layout.container}>
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines
            as="h2"
            text={brand.hashtag}
            className={`${type.h2} font-medium uppercase`}
            viewport
          />
          <p className={`${type.eyebrow} text-ink/50`}>Tag us to be featured</p>
        </div>

        <Parallax rangePx={22}>
          <div className="grid auto-rows-[140px] grid-cols-2 gap-1 grid-flow-row-dense md:grid-cols-4">
            {tiles.map((t) =>
              t.special ? (
                <TagUsTile key={t.id} id={t.id} span={t.span} />
              ) : (
                <PhotoTile key={t.id} id={t.id} span={t.span} tag={t.tag!} image={t.image!} />
              )
            )}
          </div>
        </Parallax>
      </div>
    </section>
  );
}
