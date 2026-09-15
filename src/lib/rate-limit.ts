import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function makeLimiter(prefix: string, tokens: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window), prefix });
}

// One limiter per endpoint, each with its own Upstash key prefix so they
// don't share a bucket.
export const registerLimiter = makeLimiter("ratelimit:register", 10, "1 h");
export const loginLimiter = makeLimiter("ratelimit:login", 20, "15 m");
export const resetLimiter = makeLimiter("ratelimit:reset", 5, "1 h");
export const preorderLimiter = makeLimiter("ratelimit:preorder", 10, "1 h");

export interface RateLimitResult {
  allowed: boolean;
  /** Only meaningful when `allowed` is false. */
  retryAfterSeconds: number;
}

/**
 * Wraps a single Ratelimit instance with the brief's fail-open/fail-closed
 * policy: if Redis isn't configured at all, or Upstash is unreachable,
 * `failOpen: true` lets the request through (login, password reset — a
 * real user must never be locked out of their own account because a
 * third-party dependency is down) while `failOpen: false` blocks it
 * (registration, pre-order — the abuse-surface endpoints the brief calls
 * out as "the crash risk," where allowing unlimited traffic during an
 * outage is worse than a false-positive block).
 *
 * Rate limiting is skipped entirely when NODE_ENV is "development" — local
 * testing repeatedly hits these same endpoints, and a real Upstash bucket
 * shared across a dev session locks the developer out for the same window a
 * real customer would face. Next.js sets NODE_ENV to "production" for both
 * `next build`/`next start` and (per its own docs) deployment platforms, so
 * this can't accidentally stay open in a deployed environment.
 */
export async function enforceRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
  failOpen: boolean
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "development") {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (!limiter) return { allowed: failOpen, retryAfterSeconds: 60 };

  try {
    const result = await limiter.limit(identifier);
    return {
      allowed: result.success,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error("[rate-limit] Upstash request failed", error);
    return { allowed: failOpen, retryAfterSeconds: 60 };
  }
}

/** Best-effort client IP from the platform's forwarded-for header — this
 *  app isn't behind a proxy that sets anything more specific, and a
 *  spoofed/missing header just falls back to one shared bucket rather
 *  than throwing. */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function formatRetryMessage(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  const unit = minutes === 1 ? "minute" : "minutes";
  return `Too many attempts. Please try again in ${minutes} ${unit}.`;
}
