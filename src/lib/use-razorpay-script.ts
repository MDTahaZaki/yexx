"use client";

import { useEffect, useState } from "react";

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpayFailureResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: { order_id?: string; payment_id?: string };
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckoutInstance;
  }
}

/** Lazy-loads Razorpay's Checkout.js exactly once (checking `window.Razorpay`
 *  first in case another mount already loaded it), only when the checkout
 *  step is actually reached — never on initial page load. */
export function useRazorpayScript() {
  const [ready, setReady] = useState(() => typeof window !== "undefined" && !!window.Razorpay);

  useEffect(() => {
    if (ready) return;
    if (window.Razorpay) {
      setReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => setReady(true);
    document.body.appendChild(script);
  }, [ready]);

  return ready;
}
