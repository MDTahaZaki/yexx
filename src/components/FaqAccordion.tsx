import type { FaqItem } from "@/lib/faq";

/**
 * Native <details>/<summary> rather than a hand-rolled ARIA accordion —
 * keyboard support (Enter/Space to toggle, Tab to move between items)
 * and the expanded/collapsed state are handled by the browser for free,
 * which is more reliably correct than reimplementing aria-expanded /
 * aria-controls by hand.
 */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <div className="flex flex-col divide-y divide-ink/12 border-t border-b border-ink/12">
      {items.map((item) => (
        <details key={item.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium tracking-[0.05em]">
            {item.question}
            <span
              aria-hidden="true"
              className="shrink-0 text-gold-deep transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
