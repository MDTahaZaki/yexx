import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
// Supabase's own default minimum is 6 — 8 is this project's own floor, not
// Supabase's, kept independent of whatever the dashboard is configured to.
const password = z.string().min(8, "Password must be at least 8 characters");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;
export type LoginFieldErrors = Partial<Record<keyof LoginInput, string>>;

export const registerSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterFieldErrors = Partial<Record<"email" | "password" | "confirmPassword", string>>;

export const magicLinkSchema = z.object({ email });
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

export const resetRequestSchema = z.object({ email });
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;

export const resetConfirmSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
export type ResetConfirmInput = z.infer<typeof resetConfirmSchema>;
export type ResetConfirmFieldErrors = Partial<Record<"password" | "confirmPassword", string>>;
