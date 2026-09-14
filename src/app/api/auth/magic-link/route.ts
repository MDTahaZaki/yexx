import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { magicLinkSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";
import { readJsonBody } from "@/lib/read-json-body";
import { loginLimiter, enforceRateLimit, getClientIp, formatRetryMessage } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // A magic link is an alternate login path, not its own bucket in the
  // brief — shares the login limiter (fails open, same reasoning).
  const { allowed, retryAfterSeconds } = await enforceRateLimit(loginLimiter, getClientIp(request), true);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: formatRetryMessage(retryAfterSeconds) }, { status: 429 });
  }

  const body = await readJsonBody(request);
  const parsed = magicLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // `redirect` is where to land *after* the link is clicked and the
  // session is established — carried through /auth/callback's `next`.
  // Falls back to the account dashboard rather than trusting an absolute
  // URL from the client.
  const redirectPath =
    body && typeof body === "object" && "redirect" in body && typeof body.redirect === "string" && body.redirect.startsWith("/")
      ? body.redirect
      : "/account";

  const origin = new URL(request.url).origin;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(redirectPath)}`,
    },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Couldn't send the sign-in link. Please try again." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
