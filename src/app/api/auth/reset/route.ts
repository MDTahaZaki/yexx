import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resetRequestSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";
import { resetLimiter, enforceRateLimit, getClientIp, formatRetryMessage } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Fails OPEN, same reasoning as login: this is account recovery for a
  // real, already-registered user — an Upstash outage shouldn't be able
  // to strand someone who's locked out of their own account.
  const { allowed, retryAfterSeconds } = await enforceRateLimit(resetLimiter, getClientIp(request), true);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: formatRetryMessage(retryAfterSeconds) }, { status: 429 });
  }

  const body = await readJsonBody(request);
  const parsed = resetRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  // Result is intentionally not checked for a distinguishable error —
  // resetPasswordForEmail is used to avoid confirming or denying that an
  // email address has an account (a below-the-line email-enumeration
  // guard, not the headline security here — see the RLS/service-role
  // notes for what actually protects data).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/account/reset/confirm")}`,
  });

  return NextResponse.json({ ok: true });
}
