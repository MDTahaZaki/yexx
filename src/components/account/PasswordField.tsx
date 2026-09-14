"use client";

import { useState } from "react";
import { checkPassword } from "@/lib/password-rules";

const inputClass =
  "w-full border border-ink/25 bg-transparent px-4 py-3 pr-12 text-sm outline-none focus:border-ink";

interface PasswordFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  error?: string;
  /** Shows the live rule-by-rule meter — only for a *new* password
   *  (register, reset-confirm), never for a login or confirm-password
   *  field. */
  showStrength?: boolean;
}

export default function PasswordField({
  id,
  name,
  label,
  value,
  onChange,
  autoComplete,
  error,
  showStrength = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const checks = showStrength ? checkPassword(value) : [];

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs tracking-[0.2em] uppercase">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-xs tracking-[0.1em] text-ink/50 uppercase hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {checks.map((check) => (
            <li
              key={check.key}
              className={`flex items-center gap-2 text-xs ${check.met ? "text-ink/50" : "text-ink/80"}`}
            >
              <span aria-hidden="true" className={check.met ? "text-gold-deep" : "text-ink/30"}>
                {check.met ? "✓" : "○"}
              </span>
              {check.label}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-xs text-ink/70">{error}</p>}
    </div>
  );
}
