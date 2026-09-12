import { brand } from "@/config/brand";

const REPEATS = 8;

function TextRun() {
  return (
    <div className="flex shrink-0 items-center gap-16 pr-16">
      {Array.from({ length: REPEATS }).map((_, i) => (
        <span key={i} className="text-sm tracking-[0.4em] text-white/25 uppercase">
          {brand.mantra}
        </span>
      ))}
    </div>
  );
}

/**
 * A slow, low-contrast infinite marquee. Pure CSS (no per-frame JS), and the
 * two identical `TextRun` blocks are what make the -50% translate loop
 * seamlessly — the seam always lands exactly where the next block begins.
 */
export default function Marquee() {
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black py-6" aria-hidden="true">
      <div className="animate-marquee motion-reduce:animate-none flex w-max">
        <TextRun />
        <TextRun />
      </div>
    </div>
  );
}
