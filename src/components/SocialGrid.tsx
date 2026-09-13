"use client";

import { motion } from "framer-motion";
import { brand, layout, type } from "@/config/brand";
import { grainBackground } from "@/lib/grain";
import MaskedLines from "./MaskedLines";

// Each "look" is a distinct monochrome composition: a gradient direction/
// origin plus which corner a large ghosted Y mark bleeds off of, so no two
// tiles read the same even though they share one palette.
const LOOKS = [
  {
    gradient: "radial-gradient(circle at 28% 22%, #3a3a3a 0%, #161616 58%, #050505 100%)",
    markCorner: "-top-10 -right-8",
    markRotate: -10,
  },
  {
    gradient: "linear-gradient(135deg, #050505 0%, #2b2b2b 100%)",
    markCorner: "-bottom-12 -left-10",
    markRotate: 12,
  },
  {
    gradient: "radial-gradient(circle at 72% 78%, #2c2c2c 0%, #0a0a0a 62%)",
    markCorner: "-top-10 -left-10",
    markRotate: 7,
  },
  {
    gradient: "linear-gradient(200deg, #1c1c1c 0%, #050505 55%, #272727 100%)",
    markCorner: "-bottom-10 -right-10",
    markRotate: -14,
  },
  {
    gradient: "radial-gradient(circle at 18% 86%, #343434 0%, #0a0a0a 68%)",
    markCorner: "-top-8 -right-12",
    markRotate: 5,
  },
  {
    gradient: "linear-gradient(60deg, #0a0a0a 0%, #303030 100%)",
    markCorner: "-bottom-8 -left-8",
    markRotate: -6,
  },
] as const;

const tiles = [
  { id: 1, span: "col-span-2 row-span-2", tag: "@yexx_official", look: 0 },
  { id: 2, span: "col-span-1 row-span-1", tag: "@r.torres", look: 1 },
  { id: 3, span: "col-span-1 row-span-1", tag: "@leah.k", look: 2 },
  { id: 4, span: "col-span-1 row-span-2", tag: "@danny_lifts", look: 3 },
  { id: 5, span: "col-span-2 row-span-1", special: true as const },
  { id: 6, span: "col-span-1 row-span-1", tag: "@marta.codes", look: 4 },
  { id: 7, span: "col-span-1 row-span-1", tag: "@jules_runs", look: 5 },
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

function GrainTile({ id, span, tag, look }: { id: number; span: string; tag: string; look: number }) {
  const { gradient, markCorner, markRotate } = LOOKS[look];
  return (
    <TileFrame id={id} span={span}>
      {/* Content layer: gradient + grain + ghost mark, scales up on hover.
          The scrim/username below sit outside this layer so they don't. */}
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-105"
        style={{ backgroundImage: gradient }}
      >
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay"
          style={{ backgroundImage: grainBackground }}
          aria-hidden="true"
        />
        <span
          className={`pointer-events-none absolute ${markCorner} font-bold text-white/[0.07] uppercase select-none`}
          style={{ fontSize: "10rem", lineHeight: 1, transform: `rotate(${markRotate}deg)` }}
          aria-hidden="true"
        >
          Y
        </span>
      </div>

      {/* Scrim + username: hidden until hover on a mouse, but hover can never
          fire on a touchscreen, so it's shown by default there instead
          (pointer: coarse, not a screen-width guess — a touch laptop/tablet
          at desktop width has the same problem a phone does). */}
      <div
        className="absolute inset-x-0 bottom-0 h-2/3 translate-y-full bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100"
        aria-hidden="true"
      />
      <span className="absolute bottom-3 left-3 translate-y-2 text-[0.65rem] font-light tracking-[0.25em] text-white/80 uppercase opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 pointer-coarse:translate-y-0 pointer-coarse:opacity-100">
        {tag}
      </span>
    </TileFrame>
  );
}

function TagUsTile({ id, span }: { id: number; span: string }) {
  return (
    <TileFrame id={id} span={span}>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 border border-white/10 bg-black">
        <span className="text-lg font-bold tracking-[0.15em] text-white uppercase">
          {brand.hashtag}
        </span>
        <span className="text-[0.65rem] tracking-[0.35em] text-white/45 uppercase">Tag us</span>
      </div>
    </TileFrame>
  );
}

export default function SocialGrid() {
  return (
    <section className={`${layout.section} bg-black text-white`}>
      <div className={layout.container}>
        <div className="mb-14 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <MaskedLines
            as="h2"
            text={brand.hashtag}
            className={`${type.h2} font-bold uppercase`}
            viewport
          />
          <p className={`${type.eyebrow} text-white/50`}>Tag us to be featured</p>
        </div>

        <div className="grid auto-rows-[140px] grid-cols-2 gap-1 grid-flow-row-dense md:grid-cols-4">
          {tiles.map((t) =>
            t.special ? (
              <TagUsTile key={t.id} id={t.id} span={t.span} />
            ) : (
              <GrainTile key={t.id} id={t.id} span={t.span} tag={t.tag!} look={t.look!} />
            )
          )}
        </div>
      </div>
    </section>
  );
}
