"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import { formatINR } from "@/lib/currency";
import { type } from "@/config/brand";
import { CloseIcon, TrashIcon } from "./icons";
import QuantityStepper from "./QuantityStepper";
import SweepButton from "./SweepButton";
import CheckoutForm from "./CheckoutForm";
import OrderConfirmation from "./OrderConfirmation";

type Step = "cart" | "details" | "success";

const STEP_TITLES: Record<Step, string> = {
  cart: "Cart",
  details: "Delivery Details",
  success: "Order Confirmed",
};

export default function CartDrawer() {
  const { lines, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isPaymentInProgress, setIsPaymentInProgress] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Body scroll lock: independent of every other effect here and of the
  // checkout step machine — keyed purely on `isOpen` so it never needs to
  // change as the drawer's contents do.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Focus management: remember whatever had focus before the drawer opened
  // (the nav cart icon, an "Add to Cart" button, ...) and return it there on
  // close, moving focus into the drawer itself while it's open. Also resets
  // the checkout step machine, so reopening after a completed or abandoned
  // checkout always starts fresh.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      drawerRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
      setStep("cart");
      setPaymentId(null);
      setIsPaymentInProgress(false);
    }
  }, [isOpen]);

  // Closing mid-payment (Razorpay's modal open, or the order/verify request
  // in flight) would orphan that in-progress payment and lose track of
  // which order it belongs to — every close path is routed through this
  // instead of calling closeCart directly.
  function requestClose() {
    if (isPaymentInProgress) return;
    closeCart();
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
        return;
      }
      // Minimal focus trap: cycle Tab within the drawer's focusable elements.
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isPaymentInProgress]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={requestClose}
            aria-hidden="true"
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col bg-white text-black outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-black/15 px-6 py-5">
              <div className="flex items-center gap-3">
                {step === "details" && (
                  <button
                    type="button"
                    onClick={() => setStep("cart")}
                    disabled={isPaymentInProgress}
                    aria-label="Back to cart"
                    className="text-lg leading-none disabled:opacity-30"
                  >
                    ←
                  </button>
                )}
                <h2 className={`${type.h3} font-bold uppercase`}>{STEP_TITLES[step]}</h2>
              </div>
              <button
                type="button"
                onClick={requestClose}
                disabled={isPaymentInProgress}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {step === "success" && paymentId ? (
              <OrderConfirmation paymentId={paymentId} onClose={closeCart} />
            ) : step === "details" ? (
              <CheckoutForm
                onSuccess={(id) => {
                  setPaymentId(id);
                  setStep("success");
                }}
                onPaymentInProgressChange={setIsPaymentInProgress}
              />
            ) : lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
                <p className="text-sm text-black/60">Your cart is empty.</p>
                <SweepButton variant="dark" href="#shop" onClick={closeCart}>
                  Back to Shop
                </SweepButton>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-6 py-4">
                  {lines.map((line) => (
                    <li
                      key={line.sizeId}
                      className="flex items-center justify-between gap-4 border-b border-black/10 py-5"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold uppercase tracking-wide">
                          {line.label}
                        </span>
                        <span className={`text-xs text-black/50 ${type.mono}`}>
                          {formatINR(line.unitPrice)} each
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(line.sizeId)}
                          className="mt-1 flex items-center gap-1.5 text-xs text-black/50 hover:text-black"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <QuantityStepper
                          value={line.quantity}
                          onChange={(q) => updateQuantity(line.sizeId, q)}
                        />
                        <span className={`text-sm ${type.mono}`}>{formatINR(line.lineTotal)}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col gap-4 border-t border-black/15 px-6 py-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-[0.2em] text-black/50 uppercase">Subtotal</span>
                    <span className={`text-xl ${type.mono}`}>{formatINR(subtotal)}</span>
                  </div>
                  <SweepButton variant="dark" onClick={() => setStep("details")} className="w-full">
                    Checkout
                  </SweepButton>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
