import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5, "Choose a rating"),
  title: z.string().trim().min(3, "Give it a short title").max(200),
  body: z.string().trim().min(10, "Say a bit more").max(4000),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
export type ReviewFieldErrors = Partial<Record<keyof ReviewInput, string>>;
