import { layout, type } from "@/config/brand";

export interface ReviewRow {
  id: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
}

/**
 * Never renders a placeholder/sample review — the product hasn't
 * shipped yet, so there are none to show, and a fake one here would be
 * exactly the kind of review markup Google penalizes (see the FAQ page,
 * which deliberately carries no Review/AggregateRating JSON-LD either,
 * for the same reason).
 */
export default function ReviewsSection({ reviews }: { reviews: ReviewRow[] }) {
  return (
    <section className={`${layout.section} bg-bone-deep text-ink`}>
      <div className={`${layout.container} max-w-3xl`}>
        <h2 className={`${type.h3} mb-8 font-medium uppercase`}>Reviews</h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-ink/60">Reviews open once the first cans ship.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-ink/12 border-t border-ink/12">
            {reviews.map((review) => (
              <li key={review.id} className="flex flex-col gap-2 py-6">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="text-sm tracking-widest text-gold-deep">
                    {"★".repeat(review.rating)}
                    <span className="text-ink/20">{"★".repeat(5 - review.rating)}</span>
                  </span>
                  <span className="sr-only">{review.rating} out of 5 stars</span>
                  <p className="text-sm font-medium">{review.title}</p>
                </div>
                <p className="text-sm leading-relaxed text-ink/70">{review.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
