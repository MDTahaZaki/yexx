import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { registerSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";
import { registerLimiter, enforceRateLimit, getClientIp, formatRetryMessage } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Registration fails CLOSED: if Upstash is unreachable, block rather
  // than allow unlimited sign-ups — this is the endpoint the brief calls
  // out as the abuse surface to protect first.
  const { allowed, retryAfterSeconds } = await enforceRateLimit(
    registerLimiter,
    getClientIp(request),
    false
  );
  if (!allowed) {
    return NextResponse.json({ ok: false, message: formatRetryMessage(retryAfterSeconds) }, { status: 429 });
  }

  const body = await readJsonBody(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a real registrant never populates this field (it's
  // visually hidden and out of the tab order). A bot that does gets a
  // fake success — no error, no signal that it was caught.
  if ("website" in body && typeof (body as Record<string, unknown>).website === "string" && (body as Record<string, unknown>).website !== "") {
    return NextResponse.json({ ok: true, needsEmailConfirmation: true });
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Never echo the raw provider error — it can distinguish "no such
    // account" style detail an attacker could use to enumerate emails.
    return NextResponse.json(
      { ok: false, message: "Couldn't create that account. Please try again." },
      { status: 400 }
    );
  }

  // With email confirmation on, signUp against an email that already
  // belongs to a *confirmed* account succeeds with no error (by design —
  // Supabase avoids leaking existence via an error) but returns an empty
  // `identities` array. That's the only reliable signal to show the
  // brief's required human message instead of silently doing nothing.
  if (data.user && data.user.identities?.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        code: "email_exists",
        message: "An account with this email already exists. Sign in instead.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, needsEmailConfirmation: data.session === null });
}
