"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { resetConfirmSchema, type ResetConfirmFieldErrors } from "@/lib/auth-schema";
import PasswordField from "./PasswordField";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "error";

export default function ResetConfirmForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<ResetConfirmFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetConfirmSchema.safeParse({ password, confirmPassword });
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
      <PasswordField
        id="new-password"
        name="password"
        label="New Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={errors.password}
        showStrength
      />

      <PasswordField
        id="new-password-confirm"
        name="confirmPassword"
        label="Confirm New Password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}

      <SweepButton variant="dark" type="submit" disabled={status === "submitting"} className="mt-1 disabled:opacity-50">
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Saving..." : "Set New Password"}
      </SweepButton>
    </form>
  );
}
