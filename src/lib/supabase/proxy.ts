import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Account sub-paths that must stay reachable while signed out — the sign-in
// screen itself, obviously, plus registration and both password-reset
// steps. Everything else under /account is the protected dashboard.
const PUBLIC_ACCOUNT_PATHS = ["/account/login", "/account/register", "/account/reset"];

function isProtectedAccountPath(pathname: string) {
  if (!pathname.startsWith("/account")) return false;
  return !PUBLIC_ACCOUNT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie on every matched request and
 * redirects signed-out visitors away from the protected /account
 * dashboard. Deliberately does NOT guard /preorder — that page is
 * browsable while signed out (it just doesn't show the form); only the
 * submit route and this proxy's /account guard enforce login.
 *
 * Also forwards a lightweight `x-user-signed-in` request header so
 * layout.tsx can render the Nav's account link without a second
 * `getUser()` network round trip on every single page load — the one
 * here is unavoidable (it's the actual authorization check), a second
 * one purely for a nav link isn't.
 */
export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not add logic between createServerClient and getUser() — anything
  // that reads/writes cookies in between can silently desync the session,
  // per Supabase's own SSR guidance. getUser() (not getSession()) because
  // this is the actual authorization decision below, and getSession()
  // alone doesn't revalidate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedAccountPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.search = `?redirect=${encodeURIComponent(request.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }

  // Rebuild once more so the forwarded *request* carries the flag (not
  // just the response — those reach different places, see proxy.ts's own
  // notes on the two `headers` options), then replay any Set-Cookie work
  // `setAll` already did onto this final response.
  requestHeaders.set("x-user-signed-in", user ? "1" : "0");
  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });
  supabaseResponse.cookies.getAll().forEach((cookie) => finalResponse.cookies.set(cookie));

  return finalResponse;
}
