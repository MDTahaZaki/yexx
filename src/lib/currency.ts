// Single source of truth for money formatting — nothing else in the app
// should call Intl.NumberFormat or interpolate a currency symbol directly.
// Indian digit grouping (₹1,25,000) and no paise: every price in brand.ts
// must already be a whole number of rupees, since maximumFractionDigits: 0
// rounds rather than truncates.
const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(rupees: number): string {
  return formatter.format(rupees);
}
