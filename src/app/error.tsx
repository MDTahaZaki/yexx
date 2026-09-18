"use client";

import { useEffect } from "react";
import { layout, type } from "@/config/brand";
import SweepButton from "@/components/SweepButton";

/**
 * Root error boundary (Next.js App Router convention — this file name is
 * special-cased by the framework). Before this existed, any uncaught
 * render-time throw anywhere on the site — the WebGL can's context creation
 * being the one CanErrorBoundary now catches locally, but also anything
 * else — fell through to Next's bare default error screen with no nav, no
 * way back, nothing salvageable.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootErrorBoundary] uncaught render error:", error);
  }, [error]);

  return (
    <div className={`${layout.container} flex min-h-[70vh] flex-col items-start justify-center gap-6 px-6 md:px-12 lg:px-20`}>
      <p className={`${type.eyebrow} text-gold-deep`}>Error</p>
      <h1 className={`${type.h2} font-medium uppercase`}>Something Went Wrong</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink/65">
        That page hit a snag loading. Try again, or head back home.
      </p>
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <SweepButton variant="dark" onClick={reset}>
          Try Again
        </SweepButton>
        <a href="/" className="text-xs tracking-[0.2em] text-ink underline underline-offset-4 uppercase">
          Back Home
        </a>
      </div>
    </div>
  );
}
