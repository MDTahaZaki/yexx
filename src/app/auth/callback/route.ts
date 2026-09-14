import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point for both magic-link sign-in and password-reset emails —
// Supabase sends the browser here with a one-time `code`; exchanging it
// is what actually establishes the session cookie (this is a real GET
// navigation from the email client, not a fetch, so it has to happen in a
// route handler that can set cookies, not in a page component).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") ? next : "/account";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/account/login?error=${encodeURIComponent("That link has expired. Please try again.")}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
