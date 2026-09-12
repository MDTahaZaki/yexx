"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { sizes, type SizeId } from "@/config/brand";
import { setCanSize } from "./can-size-bus";
import { triggerCanSpin } from "./can-spin-bus";

interface ProductContextValue {
  selectedSize: (typeof sizes)[number];
  setSelectedSize: (id: SizeId) => void;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [sizeId, setSizeId] = useState<SizeId>(sizes[0].id);

  const value = useMemo<ProductContextValue>(() => {
    const selectedSize = sizes.find((s) => s.id === sizeId)!;
    return {
      selectedSize,
      // Centralized here so every caller gets the can's flourish-spin and
      // geometry change for free, instead of each call site having to
      // remember to fire both side effects itself.
      setSelectedSize: (id: SizeId) => {
        setSizeId(id);
        setCanSize(id);
        triggerCanSpin();
      },
    };
  }, [sizeId]);

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct() {
  const ctx = useContext(ProductContext);
  if (!ctx) throw new Error("useProduct must be used within a ProductProvider");
  return ctx;
}
