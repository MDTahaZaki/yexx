"use client";

// A plain (non-React) pub/sub so UI far outside the Canvas — e.g. the Shop
// section's pack-size buttons — can ask the 3D can to do a flourish, without
// going through React state/props. Crossing the Canvas boundary via props or
// context would re-render the scene tree; this crosses it as a single
// imperative event instead, read inside useFrame like everything else the
// scene reacts to.
type Listener = () => void;
const listeners = new Set<Listener>();

export function triggerCanSpin() {
  listeners.forEach((listener) => listener());
}

export function onCanSpin(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
