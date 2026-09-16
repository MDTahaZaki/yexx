const FETCH_TIMEOUT_MS = 8000;

/**
 * Same AbortSignal.timeout pattern as send-lead.ts's webhook fetch, shared
 * by every Supabase client in this app (see server.ts and admin.ts) —
 * supabase-js otherwise makes each auth/db call with the platform's
 * default (unbounded, for our purposes) fetch timeout, which could hold a
 * route open past Vercel's Hobby-tier 10s function cap if Supabase has a
 * slow moment. 8s leaves 2s of headroom.
 */
export function timeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}
