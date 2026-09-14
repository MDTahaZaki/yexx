"use client";

import { useState, type FormEvent } from "react";
import { profileSchema, type ProfileFieldErrors } from "@/lib/profile-schema";
import SweepButton from "@/components/SweepButton";
import { SpinnerIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "saved" | "error";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 text-sm outline-none focus:border-ink";

export interface ProfileFormValues {
  fullName: string;
  phone: string;
  city: string;
}

export default function ProfileForm({ initial }: { initial: ProfileFormValues }) {
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      city: String(formData.get("city") ?? ""),
    };

    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ fullName: fieldErrors.fullName?.[0], phone: fieldErrors.phone?.[0], city: fieldErrors.city?.[0] });
      return;
    }

    setErrors({});
    setMessage("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/account/profile", {
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

      setStatus("saved");
    } catch {
      setMessage("Network error. Check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="profile-fullName" className="mb-2 block text-xs tracking-[0.2em] uppercase">
          Full Name
        </label>
        <input
          id="profile-fullName"
          name="fullName"
          type="text"
          defaultValue={initial.fullName}
          className={inputClass}
        />
        {errors.fullName && <p className="mt-2 text-xs text-ink/70">{errors.fullName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-phone" className="mb-2 block text-xs tracking-[0.2em] uppercase">
            Phone
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            defaultValue={initial.phone}
            className={inputClass}
          />
          {errors.phone && <p className="mt-2 text-xs text-ink/70">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="profile-city" className="mb-2 block text-xs tracking-[0.2em] uppercase">
            City
          </label>
          <input
            id="profile-city"
            name="city"
            type="text"
            defaultValue={initial.city}
            className={inputClass}
          />
          {errors.city && <p className="mt-2 text-xs text-ink/70">{errors.city}</p>}
        </div>
      </div>

      {message && <p className="text-xs tracking-[0.05em] text-ink/70">{message}</p>}
      {status === "saved" && (
        <p className="text-xs tracking-[0.05em] text-ink/70">Saved.</p>
      )}

      <SweepButton
        variant="dark"
        size="compact"
        type="submit"
        disabled={status === "submitting"}
        className="self-start disabled:opacity-50"
      >
        {status === "submitting" && <SpinnerIcon className="h-3.5 w-3.5" />}
        {status === "submitting" ? "Saving..." : "Save Profile"}
      </SweepButton>
    </form>
  );
}
