"use client";

import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";

export interface PreorderRow {
  id: string;
  size: string;
  quantity: number;
  notes: string | null;
  status: string;
  createdAt: string;
}

function PreorderRow({ row, onCancelled }: { row: PreorderRow; onCancelled: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  async function confirmCancel() {
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/preorder/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Couldn't cancel that pre-order. Please try again.");
        setCancelling(false);
        return;
      }
      onCancelled(row.id);
    } catch {
      setError("Network error. Check your connection and try again.");
      setCancelling(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 border-b border-ink/12 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm tracking-[0.05em] uppercase">
          {row.quantity} &times; {row.size}
        </p>
        <p className="mt-1 text-xs text-ink/50">
          {row.status} — placed{" "}
          {new Date(row.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        {row.notes && <p className="mt-1 text-xs text-ink/60">{row.notes}</p>}
        {error && <p className="mt-1 text-xs text-ink/70">{error}</p>}
      </div>

      {confirming ? (
        <div className="flex items-center gap-4 text-xs tracking-[0.15em] uppercase">
          <span className="text-ink/60">Cancel this pre-order?</span>
          <button
            type="button"
            onClick={confirmCancel}
            disabled={cancelling}
            className="flex items-center gap-2 text-ink underline underline-offset-4 disabled:opacity-50"
          >
            {cancelling && <SpinnerIcon className="h-3 w-3" />}
            Yes, cancel
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={cancelling}
            className="text-ink/60 hover:text-ink"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink sm:self-center"
        >
          Cancel
        </button>
      )}
    </li>
  );
}

export default function PreorderList({ initial }: { initial: PreorderRow[] }) {
  const [rows, setRows] = useState(initial);

  if (rows.length === 0) {
    return <p className="text-sm text-ink/60">No pre-orders yet.</p>;
  }

  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <PreorderRow
          key={row.id}
          row={row}
          onCancelled={(id) => setRows((prev) => prev.filter((r) => r.id !== id))}
        />
      ))}
    </ul>
  );
}
