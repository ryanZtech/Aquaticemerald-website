import Link from "next/link";

export default function NotFound() {
  return (
    <main className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center min-h-screen flex flex-col justify-center items-center">
      <h1 className="font-serif text-3xl mb-4">Page not found</h1>
      <p className="text-muted-foreground mb-4">The page you requested does not exist.</p>
      <Link href="/products" className="text-primary underline">Browse products</Link>
    </main>
  );
}
