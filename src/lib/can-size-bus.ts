"use client";

import { sizes, type SizeId } from "@/config/brand";

// Same rationale as can-spin-bus.ts: the Shop section (outside the R3F
// <Canvas>) needs to tell the 3D can which size geometry to show. Going
// through React props/context would re-render the Canvas tree; this crosses
// the boundary as a plain value + subscription instead, read inside
// useFrame like everything else the scene reacts to.
// Defaults to the same size ProductProvider starts with (sizes[0]) — the
// two must agree, or the can renders a different size than what's shown as
// selected in the Shop UI on first load.
let currentSize: SizeId = sizes[0].id;

type Listener = (size: SizeId) => void;
const listeners = new Set<Listener>();

export function setCanSize(size: SizeId) {
  currentSize = size;
  listeners.forEach((listener) => listener(currentSize));
}

export function getCanSize(): SizeId {
  return currentSize;
}

export function onCanSizeChange(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
