import { z } from "zod";

// Shared Indian mobile number normalization — used by the wholesale form and
// the checkout delivery form. Strips an optional +91/91/0 prefix, but only
// when the total digit count implies one is actually present (13/12/11
// digits respectively) — otherwise a genuine 10-digit number that happens to
// start with "9" (e.g. 9198765432) would be mistaken for a 91-prefixed one
// and incorrectly truncated to 8 digits.
export function normalizeIndianMobile(input: string): string | null {
  const digitsWithPlus = input.replace(/[\s-]/g, "");

  let candidate = digitsWithPlus;
  if (digitsWithPlus.length === 13 && digitsWithPlus.startsWith("+91")) {
    candidate = digitsWithPlus.slice(3);
  } else if (digitsWithPlus.length === 12 && digitsWithPlus.startsWith("91")) {
    candidate = digitsWithPlus.slice(2);
  } else if (digitsWithPlus.length === 11 && digitsWithPlus.startsWith("0")) {
    candidate = digitsWithPlus.slice(1);
  }

  return /^[6-9]\d{9}$/.test(candidate) ? candidate : null;
}

/** Normalizes and validates in one step — `.data` on a successful parse is
 *  always the clean 10-digit number, never the raw user input. */
export const indianMobileSchema = z
  .string()
  .trim()
  .transform(normalizeIndianMobile)
  .refine((v): v is string => v !== null, "Enter a valid 10-digit Indian mobile number");

