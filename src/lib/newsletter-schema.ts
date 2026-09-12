import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
export type NewsletterFieldErrors = Partial<Record<keyof NewsletterInput, string>>;
