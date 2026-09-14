"use client";

import { useState } from "react";
import Link from "next/link";
import { brand, socials, nav, layout, type } from "@/config/brand";
import { newsletterSchema, type NewsletterFieldErrors } from "@/lib/newsletter-schema";
import MaskedLines from "./MaskedLines";
import SweepButton from "./SweepButton";
import { SpinnerIcon } from "./icons";

type Status = "idle" | "submitting" | "success" | "error";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<NewsletterFieldErrors>({});

  async function submit() {
    const parsed = newsletterSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors({ email: parsed.error.flatten().fieldErrors.email?.[0] });
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="bg-bone-deep text-ink">
      <div className={`${layout.container} ${layout.section} pb-12`}>
        <MaskedLines
          as="h2"
          text={brand.mantra}
          className={`${type.h2} mb-16 font-medium uppercase`}
          viewport
        />

        <div className={`grid grid-cols-1 gap-12 border-t ${layout.hairline} pt-12 md:grid-cols-3`}>
          <div className="flex flex-col gap-4">
            <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Follow</p>
            <ul className="flex flex-col gap-2">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} className="text-sm underline-offset-4 hover:underline">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Site</p>
            <ul className="flex flex-col gap-2">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm underline-offset-4 hover:underline">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs tracking-[0.25em] text-ink/50 uppercase">Newsletter</p>
            {status === "success" ? (
              <p className="text-sm text-ink/70">Subscribed — thanks for joining.</p>
            ) : (
              <>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                  }}
                  className="flex border-b border-ink/30"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-ink/40"
                  />
                  <SweepButton
                    variant="dark"
                    size="compact"
                    type="submit"
                    disabled={status === "submitting"}
                    className="disabled:opacity-50"
                  >
                    {status === "submitting" && <SpinnerIcon className="h-3.5 w-3.5" />}
                    {status === "submitting" ? "Joining..." : "Join"}
                  </SweepButton>
                </form>
                {errors.email && <p className="text-xs text-ink/50">{errors.email}</p>}
                {status === "error" && (
                  <p className="text-xs text-ink/50">
                    Something went wrong.{" "}
                    <button type="button" onClick={submit} className="underline">
                      Retry
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className={`mt-16 flex flex-col gap-4 border-t ${layout.hairline} pt-8 text-xs text-ink/40 md:flex-row md:items-center md:justify-between`}
        >
          <p>{brand.caffeineAdvisory}</p>
          <p>
            &copy; {new Date().getFullYear()} {brand.fullName}
          </p>
        </div>
      </div>
    </footer>
  );
}
