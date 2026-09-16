import axios from "axios";
import Razorpay from "razorpay";

// The Razorpay SDK builds its own axios instance internally (see
// node_modules/razorpay/dist/api.js) and exposes no constructor option to
// set a request timeout, so an unreachable/slow Razorpay API would
// otherwise hang until Vercel force-kills the function. axios.create()
// merges its caller's config over axios.defaults, and Razorpay's own
// config never sets `timeout` — so setting it here, before the SDK's
// instance is created, flows through to every call it makes. 8s leaves
// 2s of headroom under Vercel's Hobby-tier 10s function cap.
axios.defaults.timeout = 8000;

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
