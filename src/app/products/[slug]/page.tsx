import { getProductBySlug } from "@/lib/dataService";
import ProductDetailClient from "@/components/ProductDetailClient";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const description = product.description || `Discover ${product.name} at Aquatic Emerald.`;
  const url = `/products/${encodeURIComponent(product.slug)}`;
  const images = product.img ? [product.img] : undefined;
  return { title: product.name, description, alternates: { canonical: url }, openGraph: { title: product.name, description, url, images }, twitter: { card: "summary_large_image", title: product.name, description, images } };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  return <ProductDetailClient product={product} />;
}
