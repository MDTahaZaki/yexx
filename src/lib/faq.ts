// FAQ copy. Every answer here is compiled from facts already stated
// elsewhere in the app (brand.ts, products.ts, the Contact page, the
// pre-order flow's own copy) — nothing about pricing, policy, or ship
// dates is invented. Still worth a client read-through before launch:
// the *wording* and any implied commitment (e.g. "you can cancel any
// time before it ships") is my phrasing, not a quote from the client.
export interface FaqItem {
  question: string;
  answer: string;
}

export const preorderFaqs: FaqItem[] = [
  {
    question: "What does pre-ordering mean?",
    answer:
      "Pre-ordering registers your interest in a can size ahead of launch — it's not a purchase. It tells us how much demand to plan for and gets you a heads-up the moment that size is ready to ship.",
  },
  {
    question: "When does it ship?",
    answer:
      "There's no confirmed shipping date yet. We'll email everyone with a pre-order registered as soon as one is set.",
  },
  {
    question: "Is payment taken when I pre-order?",
    answer: "No. No payment is taken at any point in the pre-order flow.",
  },
  {
    question: "Can I cancel my pre-order?",
    answer:
      "Yes — sign in and visit your Account page any time before it ships to cancel, or to change the size or quantity.",
  },
  {
    question: "What sizes are available?",
    answer: "YEXX comes in two can sizes: 150ml and 250ml. Both are brewed to the same formula.",
  },
  {
    question: "What's actually in the can?",
    answer:
      "Natural, coffee-bean-derived caffeine, a tuned B-vitamin complex, and zero sugar — see the Why YEXX page for the full ingredient breakdown.",
  },
  {
    question: "How much caffeine does it have?",
    answer:
      "45mg of natural caffeine per 100mL. See the nutrition table on the Why YEXX page for the exact total per can size.",
  },
  {
    question: "Where do you ship?",
    answer: "India only, for now.",
  },
  {
    question: "How do I get in touch with a question?",
    answer: "Email hello@yexx.example, or use the form on the Contact page.",
  },
];
