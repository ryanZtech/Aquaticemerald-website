import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/dataService";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.aquaticemerald.com";
  const products = await getProducts();
  return [
    ...["", "/products", "/info", "/faq", "/guides", "/gallery", "/contact"].map((path) => ({ url: `${base}${path}` })),
    ...products.map((product) => ({ url: `${base}/products/${encodeURIComponent(product.slug)}` })),
  ];
}
