import { z } from "zod";
import { isDisposableEmailDomain } from "./disposable-email-domains";
import { firstPasswordIssue } from "./password-rules";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .refine((value) => !isDisposableEmailDomain(value), {
    message: "Please use a permanent email address — disposable addresses can't receive updates.",
  });

// One password rule set shared with the live strength meter (see
// password-rules.ts) — checked via a single `superRefine` so the *first*
// failing rule is reported, matching what the meter highlights.
const password = z.string().superRefine((value, ctx) => {
  const issue = firstPasswordIssue(value);
  if (issue) ctx.addIssue({ code: "custom", message: issue });
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
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

export const magicLinkSchema = z.object({ email: loginSchema.shape.email });
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;

export const resetRequestSchema = z.object({ email: loginSchema.shape.email });
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
