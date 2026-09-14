import { z } from "zod";
import { indianMobileSchema } from "./phone";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(200),
  // Optional on the profile itself (a signed-up user might not have
  // filled it in yet) — required in practice by the time they place a
  // pre-order, enforced in preorder-schema.ts instead, not here.
  phone: z.union([indianMobileSchema, z.literal("")]),
  city: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;
