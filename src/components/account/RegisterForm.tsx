"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, type RegisterFieldErrors } from "@/lib/auth-schema";
import PasswordField from "./PasswordField";
import HoneypotField from "./HoneypotField";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "error" | "confirm-email" | "email-exists";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export default function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      email: String(formData.get("email") ?? ""),
      password,
      confirmPassword,
    };

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, website: String(formData.get("website") ?? "") }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => null);
        setMessage(body?.message ?? "Too many attempts. Please try again later.");
        setStatus("error");
        return;
      }

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        if (body?.code === "email_exists") {
          setStatus("email-exists");
          return;
        }
        setMessage(body?.message ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      if (body.needsEmailConfirmation) {
        setStatus("confirm-email");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "confirm-email") {
    return (
      <p className="text-sm tracking-[0.05em] text-ink/70">
        Check your email to confirm your account, then sign in.
      </p>
    );
  }

  if (status === "email-exists") {
    return (
      <p className="text-sm tracking-[0.05em] text-ink/70">
        An account with this email already exists.{" "}
        <Link
          href={`/account/login?redirect=${encodeURIComponent(redirectTo)}`}
          className="underline underline-offset-4 hover:text-ink"
        >
          Sign in instead
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <HoneypotField />

      <div>
        <label htmlFor="register-email" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Email
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
        />
        {errors.email && <p className="mt-2 text-xs text-ink/70">{errors.email}</p>}
      </div>

      <PasswordField
        id="register-password"
        name="password"
        label="Password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        error={errors.password}
        showStrength
      />

      <PasswordField
        id="register-confirm"
        name="confirmPassword"
        label="Confirm Password"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        error={errors.confirmPassword}
      />

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}

      <SweepButton
        variant="dark"
        type="submit"
        disabled={status === "submitting"}
        className="mt-1 disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Creating account..." : "Create Account"}
      </SweepButton>

      <div className="border-t border-ink/12 pt-5 text-xs tracking-[0.1em] text-ink/60 uppercase">
        <Link href={`/account/login?redirect=${encodeURIComponent(redirectTo)}`} className="hover:text-ink">
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
}
