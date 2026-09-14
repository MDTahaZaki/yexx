"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { findVariant } from "./products";

export interface CartLineItem {
  variantId: string;
  quantity: number;
}

export interface CartLine extends CartLineItem {
  label: string;
  unitPrice: number;
  lineTotal: number;
}

interface CartContextValue {
  items: CartLineItem[];
  lines: CartLine[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (variantId: string, quantity: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  subtotal: number;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    // Unit price is derived from the live product catalog here, not
    // snapshotted onto the line item — there's no order history or
    // price-change scenario in this session-only cart to justify
    // snapshotting, so deriving it keeps one source of truth for price.
    // A variant that's since disappeared from the catalog is silently
    // dropped from the rendered lines rather than crashing the cart.
    const lines: CartLine[] = items.flatMap((item) => {
      const found = findVariant(item.variantId);
      if (!found) return [];
      return [
        {
          ...item,
          label: found.variant.title,
          unitPrice: found.variant.price,
          lineTotal: found.variant.price * item.quantity,
        },
      ];
    });

    return {
      items,
      lines,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (variantId, quantity) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.variantId === variantId);
          if (existing) {
            return prev.map((i) =>
              i.variantId === variantId ? { ...i, quantity: i.quantity + quantity } : i
            );
          }
          return [...prev, { variantId, quantity }];
        });
      },
      updateQuantity: (variantId, quantity) => {
        setItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
      },
      removeItem: (variantId) => {
        setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      },
      clearCart: () => setItems([]),
      subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
      totalCount: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [items, isOpen]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
