import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import { layout, type } from "@/config/brand";

export const metadata: Metadata = {
  title: "Contact — YEXX Energy Drink",
  description: "Get in touch, or check the FAQs.",
};

// Placeholder contact details/FAQs — swap in the real ones once the client provides them.
const faqs = [
  {
    q: "Where is YEXX available?",
    a: "Online through this site today, with retail and gym partners rolling out — see Wholesale if you want to stock it.",
  },
  {
    q: "How much caffeine is in a can?",
    a: "Natural, coffee-bean-derived caffeine, scaled to can size — see the formula table on the Why YEXX page for exact numbers per size.",
  },
  {
    q: "Do you ship outside India?",
    a: "Not yet — checkout is India-only for now. Get in touch if you're ordering for a business outside India.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        kicker="Contact"
        title="Get In Touch"
        description="Questions about an order, a partnership, or anything else — reach out below."
      />
      <div className={`${layout.container} grid grid-cols-1 gap-16 px-6 pb-24 md:px-12 lg:grid-cols-2 lg:px-20`}>
        <div className={`flex flex-col gap-4 border-t border-ink/12 pt-10`}>
          <p className={`${type.eyebrow} text-ink/50`}>Email</p>
          <a href="mailto:hello@yexx.example" className="text-sm underline-offset-4 hover:underline">
            hello@yexx.example
          </a>
          <p className={`${type.eyebrow} mt-6 text-ink/50`}>Response time</p>
          <p className="text-sm text-ink/65">Usually within one business day.</p>
        </div>

        <div className="flex flex-col gap-8 border-t border-ink/12 pt-10">
          {faqs.map((item) => (
            <div key={item.q} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium tracking-wide uppercase">{item.q}</h3>
              <p className="text-sm leading-relaxed text-ink/65">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
