"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resetConfirmSchema, type ResetConfirmFieldErrors } from "@/lib/auth-schema";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export default function ResetConfirmForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<ResetConfirmFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const parsed = resetConfirmSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ password: fieldErrors.password?.[0], confirmPassword: fieldErrors.confirmPassword?.[0] });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset/confirm", {
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

      router.push("/account");
      router.refresh();
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="new-password" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          New Password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        {errors.password && <p className="mt-2 text-xs text-ink/70">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="new-password-confirm" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Confirm New Password
        </label>
        <input
          id="new-password-confirm"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
        {errors.confirmPassword && <p className="mt-2 text-xs text-ink/70">{errors.confirmPassword}</p>}
      </div>

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}

      <SweepButton variant="dark" type="submit" disabled={status === "submitting"} className="mt-1 disabled:opacity-50">
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Saving..." : "Set New Password"}
      </SweepButton>
    </form>
  );
}
