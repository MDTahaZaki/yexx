import crypto from "crypto";
import { NextResponse } from "next/server";
import { paymentVerifyRequestSchema } from "@/lib/checkout-schema";
import { getRazorpayConfig, getRazorpayInstance } from "@/lib/razorpay-client";
import { sendLead } from "@/lib/send-lead";
import { readJsonBody } from "@/lib/read-json-body";

// Same runtime requirement as /api/checkout — this route's HMAC check uses
// Node's crypto module directly.
export const runtime = "nodejs";

function isValidSignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  // timingSafeEqual throws on unequal-length buffers rather than returning
  // false — guard that case first instead of letting it throw.
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function POST(request: Request) {
  const config = getRazorpayConfig();
  if (!config) {
    return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503 });
  }

  const body = await readJsonBody(request);
  const parsed = paymentVerifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, delivery, items } = parsed.data;

  // This HMAC check is the anti-forgery mechanism: a forged POST can't
  // produce a valid signature without the key secret, so no separate CSRF
  // token is needed. Reject BEFORE ever calling sendLead — a forged
  // callback must never reach the webhook as a fake order.
  const authentic = isValidSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    config.keySecret
  );
  if (!authentic) {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 400 });
  }

  // Authoritative amount comes from Razorpay's own record of the order, not
  // from the client-resent `items` — those are used only to build a
  // human-readable summary string for the webhook/sheet.
  let subtotalRupees = 0;
  try {
    const razorpay = getRazorpayInstance()!;
    const order = await razorpay.orders.fetch(razorpay_order_id);
    subtotalRupees = Number(order.amount) / 100;
  } catch (error) {
    console.error("[payment/verify] failed to fetch order for record-keeping", error);
  }

  const itemsSummary = items.map((item) => `${item.label} x${item.quantity}`).join(", ");

  await sendLead("order", {
    customerName: delivery.fullName,
    customerPhone: delivery.phone,
    customerEmail: delivery.email,
    addressLine1: delivery.addressLine1,
    addressLine2: delivery.addressLine2 ?? "",
    city: delivery.city,
    state: delivery.state,
    pincode: delivery.pincode,
    itemsSummary,
    subtotalRupees,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
  });

  return NextResponse.json({ ok: true, paymentId: razorpay_payment_id });
}
