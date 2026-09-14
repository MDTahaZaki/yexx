import { z } from "zod";

export const PREORDER_SIZES = ["150ml", "250ml"] as const;

export const preorderSchema = z.object({
  size: z.enum(PREORDER_SIZES, { message: "Choose a can size" }),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(20, "Max 20 per pre-order"),
  notes: z.string().trim().max(2000, "Keep notes under 2000 characters").optional().or(z.literal("")),
  // Must be exactly `true` — an unchecked box submits `false`/undefined,
  // both of which fail this, which is the point: consent can't default
  // to yes.
  consent: z.literal(true, { message: "You must agree to be contacted about this pre-order" }),
});

export type PreorderInput = z.infer<typeof preorderSchema>;
export type PreorderFieldErrors = Partial<Record<keyof PreorderInput, string>>;
