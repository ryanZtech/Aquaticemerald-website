import { getGalleryItems } from "@/lib/dataService";
import GalleryGrid from "@/components/GalleryGrid";

export const revalidate = 60;
export const metadata = { title: "Gallery", description: "Aquatic Emerald aquascape photos.", alternates: { canonical: "/gallery" } };

export default async function GalleryPage() {
  const items = await getGalleryItems();

  return (
    <div className="pt-24 pb-20 px-4 max-w-6xl mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">
          Gallery
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">
          Photos of my designed works.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm font-light py-12 text-center">
          No photos yet. Check back soon.
        </p>
      ) : (
        <GalleryGrid items={items} />
      )}
    </div>
  );
}
