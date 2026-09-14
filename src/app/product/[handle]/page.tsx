import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct, products } from "@/lib/products";
import ProductDetail from "@/components/ProductDetail";

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

  return <ProductDetail product={product} />;
}
