import { NextResponse } from "next/server";
import { magicLinkSchema } from "@/lib/auth-schema";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
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
    typeof body?.redirect === "string" && body.redirect.startsWith("/") ? body.redirect : "/account";

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
