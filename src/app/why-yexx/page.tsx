import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Pillars from "@/components/Pillars";
import Nutrition from "@/components/Nutrition";

export const metadata: Metadata = {
  title: "Why YEXX — Benefits & Ingredients",
  description: "Natural energy, focus, endurance, performance — and the formula behind them.",
};

export default function WhyYexxPage() {
  return (
    <>
      <PageHeader
        kicker="Why YEXX"
        title="Built On Four Things"
        description="Natural energy, sharp focus, endurance that holds, and performance when it counts. Here's what's actually in the can."
      />
      <Pillars />
      <Nutrition />
    </>
  );
}
