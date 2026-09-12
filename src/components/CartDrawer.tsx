"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCart } from "@/lib/cart-context";
import { formatINR } from "@/lib/currency";
import { type } from "@/config/brand";
import { CloseIcon, TrashIcon } from "./icons";
import QuantityStepper from "./QuantityStepper";
import SweepButton from "./SweepButton";

const COMING_SOON_DURATION_MS = 2500;

export default function CartDrawer() {
  const { lines, isOpen, closeCart, updateQuantity, removeItem, subtotal } = useCart();
  const [checkoutState, setCheckoutState] = useState<"idle" | "comingSoon">("idle");
  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Focus management: remember whatever had focus before the drawer opened
  // (the nav cart icon, an "Add to Cart" button, ...) and return it there on
  // close, moving focus into the drawer itself while it's open.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      drawerRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
      setCheckoutState("idle");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCart();
        return;
      }
      // Minimal focus trap: cycle Tab within the drawer's focusable elements.
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, [tabindex]:not([tabindex="-1"])'
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
  }, [isOpen, closeCart]);

  function handleCheckout() {
    setCheckoutState("comingSoon");
    setTimeout(() => setCheckoutState("idle"), COMING_SOON_DURATION_MS);
  }

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
            onClick={closeCart}
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
              <h2 className={`${type.h3} font-bold uppercase`}>Cart</h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="flex h-9 w-9 items-center justify-center"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {lines.length === 0 ? (
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
                  <SweepButton variant="dark" onClick={handleCheckout} className="w-full">
                    {checkoutState === "comingSoon" ? "Checkout Coming Soon" : "Checkout"}
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
