"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpinnerIcon } from "@/components/icons";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        setError("Couldn't delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs tracking-[0.05em] text-ink/70">
          This permanently deletes your account, profile, and pre-orders. This can&apos;t be undone.
        </p>
        {error && <p className="text-xs text-ink/70">{error}</p>}
        <div className="flex items-center gap-4 text-xs tracking-[0.15em] uppercase">
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-ink underline underline-offset-4 disabled:opacity-50"
          >
            {deleting && <SpinnerIcon className="h-3 w-3" />}
            Yes, delete my account
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="text-ink/60 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink"
    >
      Delete My Account
    </button>
  );
}
