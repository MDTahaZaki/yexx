import Link from "next/link";
import { layout, type } from "@/config/brand";
import SweepButton from "@/components/SweepButton";

export default function NotFound() {
  return (
    <div className={`${layout.container} flex min-h-[70vh] flex-col items-start justify-center gap-6 px-6 md:px-12 lg:px-20`}>
      <p className={`${type.eyebrow} text-gold-deep`}>404</p>
      <h1 className={`${type.h2} font-medium uppercase`}>Page Not Found</h1>
      <p className="max-w-sm text-sm leading-relaxed text-ink/65">
        That page doesn&apos;t exist, or it moved when we redid the site. Head back home or
        browse the shop.
      </p>
      <div className="flex flex-wrap items-center gap-6 pt-2">
        <SweepButton variant="dark" href="/">
          Back Home
        </SweepButton>
        <Link href="/shop" className="text-xs tracking-[0.2em] text-ink underline underline-offset-4 uppercase">
          Shop
        </Link>
      </div>
    </div>
  );
}
