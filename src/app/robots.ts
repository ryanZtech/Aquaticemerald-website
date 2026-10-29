import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/checkout", "/cart", "/login"] },
    sitemap: "https://www.aquaticemerald.com/sitemap.xml",
  };
}
