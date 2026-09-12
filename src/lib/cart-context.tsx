"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { sizes, type SizeId } from "@/config/brand";

export interface CartLineItem {
  sizeId: SizeId;
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
  addItem: (sizeId: SizeId, quantity: number) => void;
  updateQuantity: (sizeId: SizeId, quantity: number) => void;
  removeItem: (sizeId: SizeId) => void;
  clearCart: () => void;
  subtotal: number;
  totalCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CartContextValue>(() => {
    // Unit price is derived from the live `sizes` config here, not
    // snapshotted onto the line item — there's no order history or
    // price-change scenario in this session-only cart to justify
    // snapshotting, so deriving it keeps one source of truth for price.
    const lines: CartLine[] = items.map((item) => {
      const size = sizes.find((s) => s.id === item.sizeId)!;
      return {
        ...item,
        label: size.label,
        unitPrice: size.price,
        lineTotal: size.price * item.quantity,
      };
    });

    return {
      items,
      lines,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (sizeId, quantity) => {
        setItems((prev) => {
          const existing = prev.find((i) => i.sizeId === sizeId);
          if (existing) {
            return prev.map((i) =>
              i.sizeId === sizeId ? { ...i, quantity: i.quantity + quantity } : i
            );
          }
          return [...prev, { sizeId, quantity }];
        });
      },
      updateQuantity: (sizeId, quantity) => {
        setItems((prev) => prev.map((i) => (i.sizeId === sizeId ? { ...i, quantity } : i)));
      },
      removeItem: (sizeId) => {
        setItems((prev) => prev.filter((i) => i.sizeId !== sizeId));
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
