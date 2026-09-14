import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import FaqAccordion from "@/components/FaqAccordion";
import { layout } from "@/config/brand";
import { preorderFaqs } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ — YEXX Energy Drink",
  description: "Common questions about YEXX pre-orders, sizes, ingredients, and shipping.",
};

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: preorderFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader kicker="Support" title="Frequently Asked Questions" />
      <div className={`${layout.container} max-w-3xl px-6 pb-24 md:px-12 lg:px-20`}>
        <FaqAccordion items={preorderFaqs} />
      </div>
    </>
  );
}
