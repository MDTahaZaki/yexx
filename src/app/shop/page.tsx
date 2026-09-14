import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import ProductGrid from "@/components/ProductGrid";

export const metadata: Metadata = {
  title: "Shop — YEXX Energy Drink",
  description: "Pick your can size. Every YEXX can is brewed to the same spec — clean energy, zero compromise.",
};

export default function ShopPage() {
  return (
    <>
      <PageHeader
        kicker="Shop"
        title="Pick Your Can"
        description="Every size is brewed to the same spec — clean natural energy, zero compromise. Pick a can to see pricing and add it to your cart."
      />
      <div className="px-6 pb-24 md:px-12 lg:px-20">
        <ProductGrid />
      </div>
    </>
  );
}
