import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Secret-key client — bypasses RLS entirely. `server-only` makes any
// accidental import from client code a build error rather than a leaked
// key. The ONLY thing this project uses it for is deleting a user's own
// auth.users row (see /api/account/delete), which needs the admin API;
// every other read/write goes through the request-scoped client in
// `./server` so RLS stays the actual enforcement, not this key.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
