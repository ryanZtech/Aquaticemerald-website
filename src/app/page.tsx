import { getProducts, getStoreSettings } from "@/lib/dataService";
import HomeClient from "@/components/HomeClient";

export const revalidate = 60;

const CLIENT_SAFE_SETTING_KEYS = ["hero_image", "scene_image"] as const;

export default async function Home() {
  const [products, allSettings] = await Promise.all([
    getProducts(),
    getStoreSettings(),
  ]);

  const settings = Object.fromEntries(
    CLIENT_SAFE_SETTING_KEYS
      .filter((k) => allSettings[k] !== undefined)
      .map((k) => [k, allSettings[k]]),
  );

  return <HomeClient products={products} settings={settings} />;
}
