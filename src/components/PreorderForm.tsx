"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PREORDER_SIZES, preorderSchema, type PreorderFieldErrors } from "@/lib/preorder-schema";
import QuantityStepper from "./QuantityStepper";
import SweepButton from "./SweepButton";
import { SpinnerIcon } from "./icons";

type Status = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export interface ContactOnFile {
  fullName: string;
  phone: string;
  city: string;
}

export default function PreorderForm({ contact }: { contact: ContactOnFile }) {
  const [size, setSize] = useState<(typeof PREORDER_SIZES)[number]>("250ml");
  const [quantity, setQuantity] = useState(1);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<PreorderFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const contactIncomplete = !contact.fullName || !contact.phone;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      size,
      quantity,
      notes: String(formData.get("notes") ?? ""),
      consent,
    };

    const parsed = preorderSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        size: fieldErrors.size?.[0],
        quantity: fieldErrors.quantity?.[0],
        notes: fieldErrors.notes?.[0],
        consent: fieldErrors.consent?.[0],
      });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(body?.message ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-start gap-4 border-t border-ink/15 pt-10">
        <p className="text-sm tracking-[0.1em] uppercase">
          Pre-order registered — we&apos;ll be in touch.
        </p>
        <Link
          href="/account"
          className="text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink"
        >
          View your pre-orders
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 border-t border-ink/15 pt-10">
      <div className="flex flex-col gap-1 text-sm text-ink/70">
        <p className="text-xs tracking-[0.2em] text-ink/50 uppercase">We&apos;ll reach you at</p>
        <p>
          {contact.fullName || "—"} · {contact.phone || "—"} · {contact.city || "—"}
        </p>
        {contactIncomplete && (
          <p className="text-xs">
            Missing details?{" "}
            <Link href="/account" className="underline underline-offset-4 hover:text-ink">
              Update your profile
            </Link>
            .
          </p>
        )}
      </div>

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
        {errors.size && <p className="mt-2 text-xs text-ink/70">{errors.size}</p>}
      </div>

      <div>
        <p className="mb-2 block text-xs tracking-[0.2em] uppercase">Quantity</p>
        <QuantityStepper value={quantity} onChange={setQuantity} />
        {errors.quantity && <p className="mt-2 text-xs text-ink/70">{errors.quantity}</p>}
      </div>

      <div>
        <label htmlFor="preorder-notes" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Notes <span className="text-ink/40 normal-case">(optional)</span>
        </label>
        <textarea id="preorder-notes" name="notes" rows={3} className={inputClass} />
        {errors.notes && <p className="mt-2 text-xs text-ink/70">{errors.notes}</p>}
      </div>

      <div className="border-t border-ink/12 pt-6 text-sm text-ink/80">
        <p>No payment is taken now. The shipping date is not yet confirmed.</p>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm text-ink/80">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gold-deep"
          />
          I agree to be contacted about this pre-order.
        </label>
        {errors.consent && <p className="mt-2 text-xs text-ink/70">{errors.consent}</p>}
      </div>

      {status === "error" && (
        <p className="text-xs tracking-[0.1em] text-ink/70 uppercase">{message}</p>
      )}

      <SweepButton
        variant="dark"
        type="submit"
        disabled={status === "submitting"}
        className="self-start disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Registering..." : "Register Pre-Order"}
      </SweepButton>
    </form>
  );
}
