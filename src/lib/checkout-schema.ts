import { z } from "zod";
import { indianMobileSchema } from "./phone";
import { indianStates } from "./indian-states";

export const deliverySchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name"),
  phone: indianMobileSchema,
  email: z.string().trim().email("Enter a valid email address"),
  addressLine1: z.string().trim().min(3, "Enter your address"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.enum(indianStates, { message: "Select a state" }),
  // Indian PIN codes never start with 0.
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
});

export type DeliveryInput = z.infer<typeof deliverySchema>;
export type DeliveryFieldErrors = Partial<Record<keyof DeliveryInput, string>>;

// What the client sends to /api/checkout and re-sends (as a snapshot) to
// /api/payment/verify — prices are never included, only which variant and
// how many; the server looks up pricing itself in both routes.
export const checkoutItemSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().positive().max(20),
});

export const checkoutRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, "Your cart is empty").max(20),
});

export const paymentVerifyRequestSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  delivery: deliverySchema,
  items: z.array(checkoutItemSchema.extend({ label: z.string() })).min(1),
});
