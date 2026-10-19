import { getFaqs } from "@/lib/dataService";
import Accordion from "@/components/Accordion";

export const revalidate = 60;

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="mb-12">
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">FAQ</h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">
          Answers to common questions about our products and ordering process.
        </p>
      </div>

      {faqs.length === 0 ? (
        <p className="text-muted-foreground text-sm font-light py-12 text-center">
          No FAQs available yet.
        </p>
      ) : (
        <Accordion items={faqs.map((f) => ({ id: f.id, title: f.title, body: f.body }))} />
      )}
    </div>
  );
}
