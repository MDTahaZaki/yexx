import crypto from "crypto";
import { NextResponse } from "next/server";
import { sizes } from "@/config/brand";
import { checkoutRequestSchema } from "@/lib/checkout-schema";
import { getRazorpayInstance } from "@/lib/razorpay-client";

// Hard-depends on Node's crypto/https (via the razorpay package) — would
// break silently on the Edge runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const razorpay = getRazorpayInstance();
  if (!razorpay) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  // Prices are never trusted from the client — only sizeId + quantity.
  // Reject anything referencing a size that doesn't exist.
  let amountRupees = 0;
  for (const item of parsed.data.items) {
    const size = sizes.find((s) => s.id === item.sizeId);
    if (!size) {
      return NextResponse.json(
        { ok: false, errors: { items: [`Unknown size: ${item.sizeId}`] } },
        { status: 400 }
      );
    }
    amountRupees += size.price * item.quantity;
  }

  if (amountRupees <= 0) {
    return NextResponse.json({ ok: false, errors: { items: ["Cart is empty"] } }, { status: 400 });
  }

  try {
    const order = await razorpay.orders.create({
      amount: amountRupees * 100, // Razorpay wants the smallest currency subunit (paise)
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    });

    return NextResponse.json({ ok: true, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    // Never leak raw SDK/error internals to the client.
    console.error("[checkout] order creation failed", error);
    return NextResponse.json({ ok: false, reason: "order_failed" }, { status: 502 });
  }
}
