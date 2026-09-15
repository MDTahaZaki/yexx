"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { nav, brand } from "@/config/brand";
import { useCart } from "@/lib/cart-context";
import { CartIcon, CloseIcon, MenuIcon, UserIcon } from "./icons";

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Full-screen mobile nav overlay, below-md only. The desktop nav links in
 * Nav.tsx are hidden below md with nothing replacing them, so on a phone
 * the only reachable pages were whatever the logo/account/cart already
 * linked to — this is the missing way in.
 */
export default function MobileNav({ accountHref }: { accountHref: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { totalCount, openCart } = useCart();
  const shouldReduceMotion = useReducedMotion();
  const menuRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  function close() {
    setIsOpen(false);
  }

  function handleCartClick() {
    close();
    openCart();
  }

  // Body scroll lock, keyed purely on isOpen — same pattern as CartDrawer.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      menuRef.current?.focus();
    } else {
      previouslyFocused.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab" || !menuRef.current) return;
      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
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
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
        className="flex h-11 w-11 items-center justify-center border border-ink/30 md:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            tabIndex={-1}
            className="fixed inset-0 z-[60] flex flex-col bg-bone text-ink outline-none md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
          >
            <div className="flex h-[var(--nav-h)] items-center justify-between px-6">
              <Link
                href="/"
                onClick={close}
                className="text-sm font-medium tracking-[0.3em] uppercase"
              >
                {brand.name}
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <motion.ul
              className="flex flex-1 flex-col justify-center gap-1 overflow-y-auto px-8 pb-[var(--nav-h)]"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: shouldReduceMotion ? 0 : 0.06,
                    delayChildren: shouldReduceMotion ? 0 : 0.1,
                  },
                },
              }}
            >
              {nav.map((item) => (
                <motion.li
                  key={item.href}
                  variants={ITEM_VARIANTS}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-[44px] items-center border-b border-gold/20 py-3 text-2xl tracking-wide uppercase"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
              <motion.li
                variants={ITEM_VARIANTS}
                transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  href={accountHref}
                  onClick={close}
                  className="flex min-h-[44px] items-center gap-3 border-b border-gold/20 py-3 text-2xl tracking-wide uppercase"
                >
                  <UserIcon className="h-5 w-5 text-gold-deep" />
                  Account
                </Link>
              </motion.li>
              <motion.li
                variants={ITEM_VARIANTS}
                transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={handleCartClick}
                  className="flex min-h-[44px] w-full items-center gap-3 py-3 text-2xl tracking-wide uppercase"
                >
                  <CartIcon className="h-5 w-5 text-gold-deep" />
                  Cart ({totalCount})
                </button>
              </motion.li>
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
