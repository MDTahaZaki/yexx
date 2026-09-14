import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preorderSchema, preorderEditSchema } from "@/lib/preorder-schema";
import { createClient } from "@/lib/supabase/server";
import { sendLead } from "@/lib/send-lead";
import { sendEmail, preorderConfirmationEmail } from "@/lib/email";
import { readJsonBody } from "@/lib/read-json-body";
import { preorderLimiter, enforceRateLimit, getClientIp, formatRetryMessage } from "@/lib/rate-limit";

const UNIQUE_VIOLATION = "23505";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to place a pre-order." }, { status: 401 });
  }
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { ok: false, message: "Confirm your email before placing a pre-order." },
      { status: 403 }
    );
  }

  // Fails CLOSED — the brief calls this endpoint out as an abuse
  // surface, same as registration.
  const { allowed, retryAfterSeconds } = await enforceRateLimit(preorderLimiter, getClientIp(request), false);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: formatRetryMessage(retryAfterSeconds) }, { status: 429 });
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot — see HoneypotField's comment. Fake success, no signal.
  if ("website" in body && typeof (body as Record<string, unknown>).website === "string" && (body as Record<string, unknown>).website !== "") {
    return NextResponse.json({ ok: true, id: "0" });
  }

  const parsed = preorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const consentAt = new Date().toISOString();

  // user_id is set from the verified session, never from the request
  // body — the insert policy (preorders_insert_own) would reject a
  // mismatched id anyway, but there's no reason to give a client the
  // chance to even try.
  const { data: row, error } = await supabase
    .from("preorders")
    .insert({
      user_id: user.id,
      size: parsed.data.size,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes || null,
      consent_at: consentAt,
    })
    .select("id")
    .single();

  if (error) {
    // The one-pre-order-per-user unique index is the real enforcement
    // (see schema.sql) — this is just the difference between a clear
    // message and a raw 500 when two tabs/requests race each other.
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json(
        { ok: false, code: "already_exists", message: "You already have a pre-order registered." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, message: "Couldn't register your pre-order. Please try again." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, city")
    .eq("id", user.id)
    .single();

  await sendLead("preorder", {
    preorderId: row.id,
    email: user.email,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    city: profile?.city ?? null,
    size: parsed.data.size,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes || null,
    consentAt,
  });

  // Email failure must never fail the pre-order itself — sendEmail
  // already swallows and logs its own errors, so this is fire-and-forget
  // by construction, not by an extra try/catch here.
  if (user.email) {
    const { subject, html } = preorderConfirmationEmail({ size: parsed.data.size, quantity: parsed.data.quantity });
    void sendEmail({ to: user.email, subject, html });
  }

  return NextResponse.json({ ok: true, id: row.id });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Sign in to edit your pre-order." }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const parsed = preorderEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { error, count } = await supabase
    .from("preorders")
    .update({ size: parsed.data.size, quantity: parsed.data.quantity, notes: parsed.data.notes || null }, { count: "exact" })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't update your pre-order. Please try again." },
      { status: 400 }
    );
  }
  if (!count) {
    return NextResponse.json({ ok: false, message: "No pre-order found to update." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
