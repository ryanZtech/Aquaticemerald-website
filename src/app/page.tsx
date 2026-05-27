import { getProducts, getStoreSettings } from "@/lib/dataService";
import HomeClient from "@/components/HomeClient";

// Revalidate home page every 60 seconds to catch database updates (Incremental Static Regeneration)
export const revalidate = 60;

export default async function Home() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getStoreSettings(),
  ]);

  return <HomeClient products={products} settings={settings} />;
}
