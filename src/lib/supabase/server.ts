import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { timeoutFetch } from "./timeout-fetch";

// Request-scoped client for Server Components, Route Handlers, and Server
// Actions — reads/writes cookies through `next/headers` so the session
// stays in sync with middleware. Still just the publishable key: every
// query made with this client is subject to RLS as the signed-in user, so
// it's safe to use for reads and writes alike (unlike a service client).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: timeoutFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render, where cookies can't be
            // written — harmless as long as middleware is also refreshing
            // the session (it is), which is the only place that matters for
            // keeping the token alive.
          }
        },
      },
    }
  );
}
