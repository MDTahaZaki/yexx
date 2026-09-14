"use client";

import { useState, type FormEvent } from "react";
import { reviewSchema, type ReviewFieldErrors } from "@/lib/review-schema";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "submitted" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export default function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [errors, setErrors] = useState<ReviewFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      rating,
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    };

    const parsed = reviewSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ rating: fieldErrors.rating?.[0], title: fieldErrors.title?.[0], body: fieldErrors.body?.[0] });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/reviews", {
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

      setStatus("submitted");
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "submitted") {
    return (
      <p className="text-sm text-ink/70">
        Thanks — your review is in for approval. It&apos;ll appear on the product page once
        approved.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <p className="mb-2 block text-xs tracking-[0.2em] uppercase">Rating</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
              aria-pressed={rating === value}
              className={`h-10 w-10 border text-sm ${rating >= value ? "border-gold-deep bg-gold-deep/10 text-gold-deep" : "border-ink/25 text-ink/40"}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-2 text-xs text-ink/70">{errors.rating}</p>}
      </div>

      <div>
        <label htmlFor="review-title" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Title
        </label>
        <input id="review-title" name="title" type="text" className={inputClass} />
        {errors.title && <p className="mt-2 text-xs text-ink/70">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="review-body" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Review
        </label>
        <textarea id="review-body" name="body" rows={4} className={inputClass} />
        {errors.body && <p className="mt-2 text-xs text-ink/70">{errors.body}</p>}
      </div>

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}

      <SweepButton
        variant="dark"
        size="compact"
        type="submit"
        disabled={status === "submitting"}
        className="self-start disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-3.5 w-3.5" />}
        {status === "submitting" ? "Submitting..." : "Submit Review"}
      </SweepButton>
    </form>
  );
}
