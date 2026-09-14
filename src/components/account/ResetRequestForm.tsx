"use client";

import { useState, type FormEvent } from "react";
import { resetRequestSchema } from "@/lib/auth-schema";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "sent" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export default function ResetRequestForm() {
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = resetRequestSchema.safeParse({ email: String(formData.get("email") ?? "") });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email address");
      return;
    }

    setError("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm tracking-[0.05em] text-ink/70">
        If that email has an account, a reset link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="reset-email" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Email
        </label>
        <input id="reset-email" name="email" type="email" autoComplete="email" className={inputClass} />
        {error && <p className="mt-2 text-xs text-ink/70">{error}</p>}
      </div>

      {status === "error" && (
        <p className="text-xs tracking-[0.1em] text-ink/70 uppercase">
          Something went wrong. Please try again.
        </p>
      )}

      <SweepButton variant="dark" type="submit" disabled={status === "submitting"} className="mt-1 disabled:opacity-50">
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Sending..." : "Send Reset Link"}
      </SweepButton>
    </form>
  );
}
