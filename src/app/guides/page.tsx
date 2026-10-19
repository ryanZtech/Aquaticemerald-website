import { getGuides } from "@/lib/dataService";
import Accordion from "@/components/Accordion";

export const revalidate = 60;

export default async function GuidesPage() {
  const guides = await getGuides();

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">Care Guides</h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">Detailed care guides and species information for aquarium hobbyists.</p>
      </div>

      {guides.length === 0 ? (
        <p className="text-muted-foreground text-sm font-light py-12 text-center">
          No care guides available yet.
        </p>
      ) : (
        <Accordion items={guides.map((g) => ({ id: g.id, title: g.title, body: g.body }))} />
      )}
    </div>
  );
}
