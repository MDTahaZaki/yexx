"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginFieldErrors } from "@/lib/auth-schema";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "sending-link" | "link-sent" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/login", {
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

      router.push(redirectTo);
      router.refresh();
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  async function handleMagicLink() {
    const email = (document.getElementById("login-email") as HTMLInputElement | null)?.value ?? "";
    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) {
      setErrors({ email: parsed.error.issues[0]?.message });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("sending-link");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: parsed.data, redirect: redirectTo }),
      });
      if (!res.ok) {
        setMessage("Couldn't send the sign-in link. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("link-sent");
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "link-sent") {
    return (
      <p className="text-sm tracking-[0.05em] text-ink/70">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="login-email" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Email
        </label>
        <input id="login-email" name="email" type="email" autoComplete="email" className={inputClass} />
        {errors.email && <p className="mt-2 text-xs text-ink/70">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="login-password" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
        {errors.password && <p className="mt-2 text-xs text-ink/70">{errors.password}</p>}
      </div>

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}

      <SweepButton
        variant="dark"
        type="submit"
        disabled={status === "submitting" || status === "sending-link"}
        className="mt-1 disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
        {status === "submitting" ? "Signing in..." : "Sign In"}
      </SweepButton>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={status === "submitting" || status === "sending-link"}
        className="text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink disabled:opacity-50"
      >
        {status === "sending-link" ? "Sending link..." : "Email me a sign-in link instead"}
      </button>

      <div className="flex flex-col gap-2 border-t border-ink/12 pt-5 text-xs tracking-[0.1em] text-ink/60 uppercase">
        <Link href={`/account/register?redirect=${encodeURIComponent(redirectTo)}`} className="hover:text-ink">
          Create an account
        </Link>
        <Link href="/account/reset" className="hover:text-ink">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}
