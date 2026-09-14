import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct, products } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";
import ReviewsSection from "@/components/ReviewsSection";
import { createClient } from "@/lib/supabase/server";

export function generateStaticParams() {
  return products.map((product) => ({ handle: product.handle }));
}

export async function generateMetadata(props: PageProps<"/product/[handle]">): Promise<Metadata> {
  const { handle } = await props.params;
  const product = findProduct(handle);
  if (!product) return {};
  return {
    title: `${product.title} — YEXX Energy Drink`,
    description: product.description,
  };
}

export default async function ProductPage(props: PageProps<"/product/[handle]">) {
  const { handle } = await props.params;
  const product = findProduct(handle);
  if (!product) notFound();

  // Approved-only, RLS-enforced (reviews_select_own_or_approved) — works
  // for a signed-out visitor too, since "status = 'approved'" doesn't
  // require a matching auth.uid().
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, title, body, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <>
      <ProductDetail product={product} />
      <ReviewsSection
        reviews={(reviews ?? []).map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.created_at,
        }))}
      />
    </>
  );
}
