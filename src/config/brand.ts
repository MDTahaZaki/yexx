// Single source of truth for YEXX brand copy, colours, type scale and spacing.
// Import from here rather than hard-coding strings or magic Tailwind values in components.

export const brand = {
  name: "YEXX",
  fullName: "YEXX Energy Drink",
  headline: "ENERGY THAT ELEVATES",
  tagline: "FOCUS. ENERGY. YOU.",
  bio: "YEXX is more than an energy drink. It's your boost for the moments that matter.",
  mantra: "POWER YOUR POTENTIAL",
  hashtag: "#YEXXYOURWAY",
  // Generic on purpose: the two can sizes carry different caffeine amounts
  // (see `nutritionPer100ml`/`getNutritionForVolume`), so a single fixed mg
  // figure would be wrong for one of them.
  caffeineAdvisory:
    "Contains caffeine. Not recommended for children, pregnant or nursing women, or individuals sensitive to caffeine.",
} as const;

export const nav = [
  { label: "Formula", href: "#formula" },
  { label: "Benefits", href: "#benefits" },
  { label: "Shop", href: "#shop" },
  { label: "Wholesale", href: "#wholesale" },
] as const;

export const pillars = [
  {
    id: "clean-energy",
    title: "Clean Energy",
    description: "No crash, no jitters — sustained lift from natural caffeine, not sugar spikes.",
  },
  {
    id: "enhanced-focus",
    title: "Enhanced Focus",
    description: "A B-vitamin complex tuned to sharpen attention when it matters most.",
  },
  {
    id: "performance-boost",
    title: "Performance Boost",
    description: "Formulated for output — training, deadlines, or the next four hours straight.",
  },
] as const;

export const callouts = ["B Vitamins", "Low Calorie", "Refreshing Taste"] as const;

// Per-100mL rates, scaled to whichever can size is selected — see
// `getNutritionForVolume` below. Percent-DV notes are deliberately not
// carried here: a %DV claim computed against the old fixed 355mL serving
// would be silently wrong once the underlying amount scales with can size.
export const nutritionPer100ml = [
  { label: "Calories", perHundredMl: 2.82, unit: "kcal" },
  { label: "Total Sugar", perHundredMl: 0, unit: "g" },
  {
    label: "Caffeine",
    perHundredMl: 45.07,
    unit: "mg",
    note: "Natural caffeine, coffee bean derived",
  },
  { label: "Vitamin B6", perHundredMl: 0.56, unit: "mg" },
  { label: "Vitamin B12", perHundredMl: 1.69, unit: "µg" },
  { label: "Sodium", perHundredMl: 11.27, unit: "mg" },
] as const;

/**
 * Scales the per-100mL table to a specific can size. Rounds to whole
 * numbers (the nutrition table's CountUpNumber only animates integers), but
 * never rounds a genuinely nonzero amount down to a misleading "0" — only a
 * true per-100mL rate of 0 (Total Sugar) stays 0.
 */
export function getNutritionForVolume(volumeMl: number) {
  const servingSize = { label: "Serving Size", value: volumeMl, unit: "mL" as const };
  const scaled = nutritionPer100ml.map((row) => {
    const raw = (row.perHundredMl * volumeMl) / 100;
    const value = Math.round(raw) || (row.perHundredMl > 0 ? 1 : 0);
    return "note" in row
      ? { label: row.label, value, unit: row.unit, note: row.note }
      : { label: row.label, value, unit: row.unit };
  });
  return [servingSize, ...scaled];
}

// Two can sizes — prices are placeholders until the client confirms real
// INR pricing; formatINR (src/lib/currency.ts) renders these as whole rupees.
export const sizes = [
  {
    id: "150ml",
    label: "150ml Can",
    volumeMl: 150,
    price: 6900, // TODO(client): confirm real INR price for the 150ml can
  },
  {
    id: "250ml",
    label: "250ml Can",
    volumeMl: 250,
    price: 9900, // TODO(client): confirm real INR price for the 250ml can
  },
] as const;

export type SizeId = (typeof sizes)[number]["id"];

export const socials = [
  { label: "Instagram", href: "#" },
  { label: "TikTok", href: "#" },
  { label: "X", href: "#" },
] as const;

// Type scale — huge uppercase headline type, tight tracking, line-height under 0.9 for display sizes.
export const type = {
  hero: "text-[clamp(2.75rem,9vw,7.5rem)] leading-[0.85] tracking-[-0.04em]",
  h2: "text-[clamp(2.25rem,6vw,4.5rem)] leading-[0.88] tracking-[-0.035em]",
  h3: "text-[clamp(1.25rem,2.5vw,1.75rem)] leading-[0.95] tracking-[-0.02em]",
  eyebrow: "text-[0.7rem] tracking-[0.35em] uppercase",
  body: "text-sm md:text-base leading-relaxed",
  mono: "font-mono tabular-nums",
} as const;

// Spacing / layout primitives shared across sections.
export const layout = {
  section: "px-6 md:px-12 lg:px-20 py-24 md:py-32",
  container: "max-w-[1400px] mx-auto",
  hairline: "border-black/15",
  hairlineDark: "border-white/15",
} as const;
