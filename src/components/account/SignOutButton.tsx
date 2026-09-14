"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpinnerIcon } from "@/components/icons";

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => null);
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-2 text-xs tracking-[0.15em] text-ink/60 underline underline-offset-4 uppercase hover:text-ink disabled:opacity-50"
    >
      {loading && <SpinnerIcon className="h-3 w-3" />}
      Sign Out
    </button>
  );
}
