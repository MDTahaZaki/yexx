"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PREORDER_SIZES } from "@/lib/preorder-schema";
import QuantityStepper from "./QuantityStepper";
import SweepButton from "./SweepButton";
import { SpinnerIcon } from "./icons";

type Status = "viewing" | "editing" | "saving" | "cancel-confirm" | "cancelling";

export interface ExistingPreorderData {
  id: string;
  size: (typeof PREORDER_SIZES)[number];
  quantity: number;
  notes: string | null;
}

export default function ExistingPreorder({ preorder }: { preorder: ExistingPreorderData }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("viewing");
  const [size, setSize] = useState(preorder.size);
  const [quantity, setQuantity] = useState(preorder.quantity);
  const [error, setError] = useState("");

  async function saveEdit() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/preorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size, quantity, notes: preorder.notes ?? "" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? "Couldn't save changes. Please try again.");
        setStatus("editing");
        return;
      }
      setStatus("viewing");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setStatus("editing");
    }
  }

  async function confirmCancel() {
    setStatus("cancelling");
    setError("");
    try {
      const res = await fetch(`/api/preorder/${preorder.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't cancel your pre-order. Please try again.");
        setStatus("cancel-confirm");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setStatus("cancel-confirm");
    }
  }

  if (status === "editing" || status === "saving") {
    return (
      <div className="flex flex-col gap-6 border-t border-ink/15 pt-10">
        <div>
          <p className="mb-2 block text-xs tracking-[0.2em] uppercase">Size</p>
          <div className="flex gap-3">
            {PREORDER_SIZES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                aria-pressed={size === option}
                className={`border px-5 py-3 text-sm uppercase transition-colors ${
                  size === option ? "border-ink bg-ink text-bone" : "border-ink/25 text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 block text-xs tracking-[0.2em] uppercase">Quantity</p>
          <QuantityStepper value={quantity} onChange={setQuantity} />
        </div>

        {error && <p className="text-xs text-ink/70">{error}</p>}

        <div className="flex items-center gap-6">
          <SweepButton variant="dark" onClick={saveEdit} disabled={status === "saving"} className="disabled:opacity-50">
            {status === "saving" && <SpinnerIcon className="h-4 w-4" />}
            {status === "saving" ? "Saving..." : "Save Changes"}
          </SweepButton>
          <button
            type="button"
            onClick={() => {
              setSize(preorder.size);
              setQuantity(preorder.quantity);
              setStatus("viewing");
            }}
            disabled={status === "saving"}
            className="text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink"
          >
            Cancel edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 border-t border-ink/15 pt-10">
      <p className="text-sm tracking-[0.1em] uppercase">You&apos;re registered for {preorder.quantity} &times; {preorder.size}</p>
      <p className="text-sm text-ink/70">
        No payment has been taken, and the shipping date isn&apos;t confirmed yet. You can change the
        size or quantity, or cancel, any time before it ships.
      </p>

      {error && <p className="text-xs text-ink/70">{error}</p>}

      {status === "cancel-confirm" || status === "cancelling" ? (
        <div className="flex items-center gap-4 text-xs tracking-[0.15em] uppercase">
          <span className="text-ink/60">Cancel this pre-order?</span>
          <button
            type="button"
            onClick={confirmCancel}
            disabled={status === "cancelling"}
            className="flex items-center gap-2 text-ink underline underline-offset-4 disabled:opacity-50"
          >
            {status === "cancelling" && <SpinnerIcon className="h-3 w-3" />}
            Yes, cancel
          </button>
          <button
            type="button"
            onClick={() => setStatus("viewing")}
            disabled={status === "cancelling"}
            className="text-ink/60 hover:text-ink disabled:opacity-50"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-6 text-xs tracking-[0.15em] uppercase">
          <button type="button" onClick={() => setStatus("editing")} className="text-ink underline underline-offset-4 hover:text-ink/70">
            Edit size or quantity
          </button>
          <button
            type="button"
            onClick={() => setStatus("cancel-confirm")}
            className="text-ink/60 underline underline-offset-4 hover:text-ink"
          >
            Cancel pre-order
          </button>
        </div>
      )}
    </div>
  );
}
