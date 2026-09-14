"use client";

import Image, { type ImageProps } from "next/image";
import { motion, useReducedMotion } from "motion/react";

/**
 * Wraps a next/image in a clip-path wipe (bottom -> top, not a fade — wipes
 * read as directed, fades read as cheap) plus a slow continuous scale creep
 * once the image is in view, so nothing on the page ever sits perfectly
 * static. Both layers animate `clipPath`/`transform` only, never a layout
 * property, and both collapse to a plain static image under
 * prefers-reduced-motion.
 */
export default function RevealImage({
  imageProps,
  wrapperClassName = "",
  imageClassName = "",
  scaleDurationSec = 9,
  position = "relative",
}: {
  imageProps: ImageProps;
  wrapperClassName?: string;
  imageClassName?: string;
  /** How long the 1.0 -> 1.06 drift takes once the image enters view. */
  scaleDurationSec?: number;
  /** "absolute" for fill-mode usage inside an already-positioned parent
   *  (e.g. `fill` images sized via `wrapperClassName="absolute inset-0"`)
   *  — passing `absolute` there too would fight this component's own
   *  default `relative`, and since Tailwind's cascade order (not class
   *  string order) decides which wins, that conflict is silent: the
   *  loser's `inset-0` stops sizing anything and the whole image collapses
   *  to a 0-height box. */
  position?: "relative" | "absolute";
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`${position} overflow-hidden ${wrapperClassName}`}>
      <motion.div
        initial={shouldReduceMotion ? undefined : { clipPath: "inset(100% 0% 0% 0%)" }}
        whileInView={shouldReduceMotion ? undefined : { clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-full w-full"
      >
        <motion.div
          initial={false}
          whileInView={shouldReduceMotion ? undefined : { scale: 1.06 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: scaleDurationSec, ease: "easeOut" }}
          className="relative h-full w-full"
        >
          {/* alt is spread in via imageProps — next/image's ImageProps type
              already makes it mandatory at every call site, so this is a
              false positive on the static-analysis rule below. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            {...imageProps}
            className={`h-full w-full object-cover ${imageClassName} ${imageProps.className ?? ""}`}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
