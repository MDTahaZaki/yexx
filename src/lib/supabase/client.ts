import { createBrowserClient } from "@supabase/ssr";

// Browser-side client — publishable key only, safe to expose. Never import
// this from server-only code; use `./server` there so cookies are read from
// the request instead of `document.cookie`.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
