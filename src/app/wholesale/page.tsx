import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import WholesaleForm from "@/components/WholesaleForm";

export const metadata: Metadata = {
  title: "Wholesale — YEXX Energy Drink",
  description: "Stock YEXX in your store, gym, or venue.",
};

export default function WholesalePage() {
  return (
    <>
      <PageHeader
        kicker="Wholesale"
        title="Stock YEXX"
        description="Tell us about your business and we'll follow up with pricing and case sizes."
      />
      <WholesaleForm />
    </>
  );
}
