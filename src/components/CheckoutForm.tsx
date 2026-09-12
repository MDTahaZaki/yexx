"use client";

import { useRef, useState, type FormEvent } from "react";
import { brand, type } from "@/config/brand";
import { indianStates } from "@/lib/indian-states";
import { deliverySchema, type DeliveryFieldErrors, type DeliveryInput } from "@/lib/checkout-schema";
import { formatINR } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";
import { useRazorpayScript, type RazorpaySuccessResponse } from "@/lib/use-razorpay-script";
import SweepButton from "./SweepButton";
import { SpinnerIcon } from "./icons";

type Status = "idle" | "submitting";

interface CheckoutFormProps {
  onSuccess: (paymentId: string) => void;
  onPaymentInProgressChange: (inProgress: boolean) => void;
}

const inputClass =
  "w-full border border-black/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-black";

export default function CheckoutForm({ onSuccess, onPaymentInProgressChange }: CheckoutFormProps) {
  const { items, lines, subtotal, clearCart } = useCart();
  const scriptReady = useRazorpayScript();
  const [errors, setErrors] = useState<DeliveryFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentSucceededRef = useRef(false);

  function endPaymentAttempt(message: string | null) {
    setPaymentError(message);
    setStatus("idle");
    onPaymentInProgressChange(false);
  }

  async function verifyPayment(response: RazorpaySuccessResponse, delivery: DeliveryInput) {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          delivery,
          items: lines.map((line) => ({
            sizeId: line.sizeId,
            quantity: line.quantity,
            label: line.label,
          })),
        }),
      });

      if (!res.ok) {
        endPaymentAttempt(
          `Payment received (ID: ${response.razorpay_payment_id}) but we couldn't verify it automatically. Please contact support with this ID.`
        );
        return;
      }

      clearCart();
      onPaymentInProgressChange(false);
      onSuccess(response.razorpay_payment_id);
    } catch {
      endPaymentAttempt(
        `Payment received (ID: ${response.razorpay_payment_id}) but we couldn't verify it automatically. Please contact support with this ID.`
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      addressLine1: String(formData.get("addressLine1") ?? ""),
      addressLine2: String(formData.get("addressLine2") ?? ""),
      city: String(formData.get("city") ?? ""),
      state: String(formData.get("state") ?? ""),
      pincode: String(formData.get("pincode") ?? ""),
    };

    const parsed = deliverySchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: fieldErrors.fullName?.[0],
        phone: fieldErrors.phone?.[0],
        email: fieldErrors.email?.[0],
        addressLine1: fieldErrors.addressLine1?.[0],
        addressLine2: fieldErrors.addressLine2?.[0],
        city: fieldErrors.city?.[0],
        state: fieldErrors.state?.[0],
        pincode: fieldErrors.pincode?.[0],
      });
      return;
    }

    setErrors({});
    setPaymentError(null);
    setStatus("submitting");
    onPaymentInProgressChange(true);
    paymentSucceededRef.current = false;

    let orderRes: Response;
    try {
      orderRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      endPaymentAttempt("Network error. Check your connection and try again.");
      return;
    }

    if (!orderRes.ok) {
      const body = await orderRes.json().catch(() => null);
      if (body?.reason === "not_configured") {
        endPaymentAttempt("Payment isn't configured yet. Please try again later.");
      } else {
        endPaymentAttempt("Something went wrong creating your order. Please try again.");
      }
      return;
    }

    const order = await orderRes.json();

    if (!window.Razorpay) {
      endPaymentAttempt("Payment isn't configured yet. Please try again later.");
      return;
    }

    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
      amount: order.amount,
      currency: order.currency,
      name: brand.fullName,
      order_id: order.orderId,
      handler: (response) => {
        // Some Checkout.js versions also fire modal.ondismiss shortly after
        // a successful handler callback — this guards against that
        // spuriously re-marking a completed payment as cancelled.
        paymentSucceededRef.current = true;
        void verifyPayment(response, parsed.data);
      },
      prefill: {
        name: parsed.data.fullName,
        email: parsed.data.email,
        contact: `+91${parsed.data.phone}`,
      },
      theme: { color: "#000000" },
      modal: {
        ondismiss: () => {
          if (paymentSucceededRef.current) return;
          endPaymentAttempt("Payment cancelled.");
        },
      },
    });

    rzp.on("payment.failed", (response) => {
      endPaymentAttempt(response.error.description || "Payment failed. Please try again.");
    });

    rzp.open();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 px-6 py-4">
      <div>
        <label htmlFor="fullName" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Full Name
        </label>
        <input id="fullName" name="fullName" type="text" className={inputClass} />
        {errors.fullName && <p className="mt-2 text-xs text-black/70">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="checkout-phone" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Phone
        </label>
        <input id="checkout-phone" name="phone" type="tel" inputMode="numeric" className={inputClass} />
        {errors.phone && <p className="mt-2 text-xs text-black/70">{errors.phone}</p>}
      </div>

      <div>
        <label htmlFor="checkout-email" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Email
        </label>
        <input id="checkout-email" name="email" type="email" className={inputClass} />
        {errors.email && <p className="mt-2 text-xs text-black/70">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="addressLine1" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Address Line 1
        </label>
        <input id="addressLine1" name="addressLine1" type="text" className={inputClass} />
        {errors.addressLine1 && <p className="mt-2 text-xs text-black/70">{errors.addressLine1}</p>}
      </div>

      <div>
        <label htmlFor="addressLine2" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Address Line 2 <span className="text-black/40 normal-case">(optional)</span>
        </label>
        <input id="addressLine2" name="addressLine2" type="text" className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="mb-2 block text-xs tracking-[0.2em] uppercase">
            City
          </label>
          <input id="city" name="city" type="text" className={inputClass} />
          {errors.city && <p className="mt-2 text-xs text-black/70">{errors.city}</p>}
        </div>
        <div>
          <label htmlFor="pincode" className="mb-2 block text-xs tracking-[0.2em] uppercase">
            Pincode
          </label>
          <input id="pincode" name="pincode" type="text" inputMode="numeric" className={inputClass} />
          {errors.pincode && <p className="mt-2 text-xs text-black/70">{errors.pincode}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="state" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          State
        </label>
        <select id="state" name="state" defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select a state
          </option>
          {indianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
        {errors.state && <p className="mt-2 text-xs text-black/70">{errors.state}</p>}
      </div>

      {paymentError && (
        <p className="text-xs tracking-[0.05em] text-black/70">{paymentError}</p>
      )}

      <SweepButton
        variant="dark"
        type="submit"
        disabled={status === "submitting" || !scriptReady}
        className="mt-2 disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {!scriptReady
          ? "Loading..."
          : status === "submitting"
            ? "Processing..."
            : paymentError
              ? "Retry Payment"
              : `Pay ${formatINR(subtotal)}`}
      </SweepButton>
    </form>
  );
}
