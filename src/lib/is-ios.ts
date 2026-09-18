/**
 * True on iPhone/iPad/iPod, including iPadOS 13+, which reports its
 * platform as "MacIntel" (identical to a real Mac) but — unlike a real
 * Mac — has touch points. Client-side only; always false during SSR.
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
