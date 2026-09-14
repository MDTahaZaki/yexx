import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import FadeUp from "@/components/FadeUp";
import { layout } from "@/config/brand";

export const metadata: Metadata = {
  title: "Our Story — YEXX Energy Drink",
  description: "How YEXX came to be.",
};

// Placeholder copy — swap in the real brand story once the client provides it.
export default function OurStoryPage() {
  return (
    <>
      <PageHeader
        kicker="Our Story"
        title="Made For More"
        description="The short version, for now — the full story is on its way."
      />
      <div className={`${layout.container} px-6 pb-24 md:px-12 lg:px-20`}>
        <div className="grid grid-cols-1 gap-8 border-t border-ink/12 pt-12 md:grid-cols-2">
          <FadeUp viewport className="text-sm leading-relaxed text-ink/70">
            YEXX started with a simple frustration: every energy drink on the shelf asked you to
            trade something away for the lift — a crash later, a taste you tolerate rather than
            enjoy, a can that looks like it belongs at a rave instead of on your desk.
          </FadeUp>
          <FadeUp viewport delay={0.15} className="text-sm leading-relaxed text-ink/70">
            We built the formula first, the look second — natural caffeine, a tuned B-vitamin
            complex, and nothing you&apos;d have to explain to your future self. The can followed:
            warm, considered, built to last on a shelf you&apos;re proud of.
          </FadeUp>
        </div>
      </div>
    </>
  );
}
