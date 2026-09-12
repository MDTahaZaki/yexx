import { z } from "zod";

export const wholesaleSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  businessName: z.string().trim().min(2, "Enter a business name"),
  monthlyVolume: z.string().trim().min(1, "Select an estimated monthly volume"),
  notes: z.string().trim().max(2000, "Keep notes under 2000 characters").optional(),
});

export type WholesaleInput = z.infer<typeof wholesaleSchema>;
export type WholesaleFieldErrors = Partial<Record<keyof WholesaleInput, string>>;
