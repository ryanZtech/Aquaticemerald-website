import { getProductBySlug } from "@/lib/dataService";
import ProductDetailClient from "@/components/ProductDetailClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Revalidate details every 60 seconds (ISR)
export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center">
        <p className="text-muted-foreground mb-4 font-serif text-lg">Product not found.</p>
        <Link 
          href="/products" 
          className="text-primary text-sm font-medium hover:underline inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </Link>
      </div>
    );
  }

  return <ProductDetailClient product={product} />;
}
