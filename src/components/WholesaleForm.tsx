"use client";

import { useState, type FormEvent } from "react";
import { layout, type } from "@/config/brand";
import { wholesaleSchema, type WholesaleFieldErrors } from "@/lib/wholesale-schema";
import MaskedLines from "./MaskedLines";
import SweepButton from "./SweepButton";
import { SpinnerIcon } from "./icons";

const volumeOptions = ["Under 50 units", "50–200 units", "200–1000 units", "1000+ units"];

type Status = "idle" | "submitting" | "success" | "error";

export default function WholesaleForm() {
  const [errors, setErrors] = useState<WholesaleFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      businessName: String(formData.get("businessName") ?? ""),
      monthlyVolume: String(formData.get("monthlyVolume") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    };

    const parsed = wholesaleSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        businessName: fieldErrors.businessName?.[0],
        monthlyVolume: fieldErrors.monthlyVolume?.[0],
        notes: fieldErrors.notes?.[0],
      });
      return;
    }

    setErrors({});
    setStatus("submitting");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        setStatus("success");
        return;
      }

      // Defensive coverage beyond client-side zod: surface server-returned
      // field errors if present (rarely fires since the schemas match, but
      // guards against client/server drift), otherwise show a generic retry.
      const body = await res.json().catch(() => null);
      if (body?.errors) {
        setErrors({
          name: body.errors.name?.[0],
          email: body.errors.email?.[0],
          phone: body.errors.phone?.[0],
          businessName: body.errors.businessName?.[0],
          monthlyVolume: body.errors.monthlyVolume?.[0],
          notes: body.errors.notes?.[0],
        });
        setStatus("idle");
        return;
      }

      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  const inputClass =
    "w-full border border-black/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-black";

  return (
    <section id="wholesale" className={`${layout.section} bg-white text-black`}>
      <div className={`${layout.container} grid grid-cols-1 gap-16 lg:grid-cols-2`}>
        <div className="flex flex-col justify-center gap-6">
          <MaskedLines as="h2" text="Wholesale" className={`${type.h2} font-bold uppercase`} viewport />
          <p className="max-w-sm text-sm leading-relaxed text-black/65">
            Stock YEXX in your store, gym, or venue. Tell us about your business and we&apos;ll
            follow up with pricing and case sizes.
          </p>
        </div>

        {status === "success" ? (
          <div className="flex flex-col items-start gap-4 border-t border-black/15 pt-10">
            <p className="text-sm tracking-[0.1em] uppercase">
              Request received — we&apos;ll be in touch.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="text-xs tracking-[0.15em] text-black/60 underline underline-offset-4 uppercase hover:text-black"
            >
              Send another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 border-t border-black/15 pt-10">
            <div>
              <label htmlFor="name" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Name
              </label>
              <input id="name" name="name" type="text" className={inputClass} />
              {errors.name && <p className="mt-2 text-xs text-black/70">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Email
              </label>
              <input id="email" name="email" type="email" className={inputClass} />
              {errors.email && <p className="mt-2 text-xs text-black/70">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Phone
              </label>
              <input id="phone" name="phone" type="tel" inputMode="numeric" className={inputClass} />
              {errors.phone && <p className="mt-2 text-xs text-black/70">{errors.phone}</p>}
            </div>

            <div>
              <label htmlFor="businessName" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Business Name
              </label>
              <input id="businessName" name="businessName" type="text" className={inputClass} />
              {errors.businessName && (
                <p className="mt-2 text-xs text-black/70">{errors.businessName}</p>
              )}
            </div>

            <div>
              <label htmlFor="monthlyVolume" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Monthly Volume
              </label>
              <select id="monthlyVolume" name="monthlyVolume" defaultValue="" className={inputClass}>
                <option value="" disabled>
                  Select a range
                </option>
                {volumeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.monthlyVolume && (
                <p className="mt-2 text-xs text-black/70">{errors.monthlyVolume}</p>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="mb-2 block text-xs tracking-[0.2em] uppercase">
                Notes
              </label>
              <textarea id="notes" name="notes" rows={4} className={inputClass} />
              {errors.notes && <p className="mt-2 text-xs text-black/70">{errors.notes}</p>}
            </div>

            {status === "error" && (
              <p className="text-xs tracking-[0.1em] text-black/70 uppercase">{errorMessage}</p>
            )}

            <SweepButton
              variant="dark"
              type="submit"
              disabled={status === "submitting"}
              className="mt-2 disabled:opacity-50"
            >
              {status === "submitting" && <SpinnerIcon className="h-4 w-4" />}
              {status === "submitting" ? "Sending..." : status === "error" ? "Retry" : "Submit Request"}
            </SweepButton>
          </form>
        )}
      </div>
    </section>
  );
}
