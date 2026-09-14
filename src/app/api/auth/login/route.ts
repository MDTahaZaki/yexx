import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { loginSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";
import { loginLimiter, enforceRateLimit, getClientIp, formatRetryMessage } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Login fails OPEN: a real user must never be locked out of their own
  // account because Upstash is unreachable.
  const { allowed, retryAfterSeconds } = await enforceRateLimit(loginLimiter, getClientIp(request), true);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: formatRetryMessage(retryAfterSeconds) }, { status: 429 });
  }

  const body = await readJsonBody(request);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Incorrect email or password." },
      { status: 401 }
    );
  }

  return NextResponse.json({ ok: true });
}
