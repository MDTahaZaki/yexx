import { layout, type } from "@/config/brand";
import MaskedLines from "./MaskedLines";
import FadeUp from "./FadeUp";

/** Shared intro banner for every secondary page (shop, our-story, why-yexx,
 *  wholesale, contact) — keeps the pt-[var(--nav-h)] offset for the fixed
 *  Nav, and the heading/kicker treatment, consistent across the site. */
export default function PageHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className={`${layout.container} px-6 pt-[calc(var(--nav-h)+3rem)] pb-16 md:px-12 lg:px-20`}>
      <p className={`${type.eyebrow} mb-4 text-gold-deep`}>{kicker}</p>
      <MaskedLines as="h1" text={title} className={`${type.h2} max-w-3xl font-medium uppercase`} />
      {description && (
        <FadeUp className="mt-6 max-w-xl text-sm leading-relaxed text-ink/65">{description}</FadeUp>
      )}
    </div>
  );
}
