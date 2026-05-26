import { Suspense } from "react";
import { getProducts } from "@/lib/dataService";
import ProductsClient from "@/components/ProductsClient";

export const revalidate = 60;

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <Suspense
      fallback={
        <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto min-h-screen text-center">
          <p className="text-muted-foreground font-serif animate-pulse mt-20">Loading collection...</p>
        </div>
      }
    >
      <ProductsClient products={products} />
    </Suspense>
  );
}
