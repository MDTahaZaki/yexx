import Razorpay from "razorpay";

// Server-only — never import this from a "use client" file. The key secret
// must never reach the browser bundle.
export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

let cachedInstance: Razorpay | null = null;

/** Module-scope singleton — the SDK holds no connection pool, so this is a
 *  cheap micro-optimization, not a correctness requirement. Returns null if
 *  the env vars aren't configured, so callers can show a clean
 *  "not configured" response instead of the SDK throwing. */
export function getRazorpayInstance(): Razorpay | null {
  const config = getRazorpayConfig();
  if (!config) return null;
  if (!cachedInstance) {
    cachedInstance = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  }
  return cachedInstance;
}
