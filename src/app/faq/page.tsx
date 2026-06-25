import { getFaqs } from "@/lib/dataService";

export const revalidate = 60;

export default async function FaqPage() {
  const faqs = await getFaqs();

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto min-h-screen">
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3">Help</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">FAQ</h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl font-light">
          Answers to common questions about our products and ordering process.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.length === 0 ? (
          <p className="text-muted-foreground text-sm font-light py-12 text-center">
            No FAQs available yet.
          </p>
        ) : (
          faqs.map((faq) => (
            <details
              key={faq.id}
              className="group bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200"
            >
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-sm select-none hover:bg-accent transition-colors">
                {faq.title}
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed font-light">
                {faq.body}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
