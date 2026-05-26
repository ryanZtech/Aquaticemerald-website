"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Product, Category, AllCategory } from "@/lib/staticData";
import { motion, AnimatePresence } from "motion/react";

interface ProductsClientProps {
  products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Set initial category from URL search params (or default to 'all')
  const [activeCategory, setActiveCategory] = useState<AllCategory>("all");

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && ["plants", "shrimp", "snails", "fish"].includes(cat)) {
      setActiveCategory(cat as Category);
    } else {
      setActiveCategory("all");
    }
  }, [searchParams]);

  const catOptions: { value: AllCategory; label: string }[] = [
    { value: "all",    label: "All" },
    { value: "plants", label: "🌿 Plants" },
    { value: "shrimp", label: "🦐 Shrimp" },
    { value: "snails", label: "🐌 Snails" },
    { value: "fish",   label: "🐟 Fish" },
  ];

  const handleCategoryChange = (cat: AllCategory) => {
    setActiveCategory(cat);
    if (cat === "all") {
      router.push("/products", { scroll: false });
    } else {
      router.push(`/products?category=${cat}`, { scroll: false });
    }
  };

  const filtered = activeCategory === "all"
    ? products
    : products.filter((p) => p.category === activeCategory);

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-2">
          Our Collection
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium">Shop</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-10">
        {catOptions.map((c) => (
          <button
            key={c.value}
            onClick={() => handleCategoryChange(c.value)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
              ${activeCategory === c.value
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
              className="flex"
            >
              <Link
                href={`/products/${p.slug}`}
                className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col w-full"
              >
                <div className="relative h-52 overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.variants.length === 0 && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold tracking-widest uppercase">
                        Coming Soon
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                    {p.category}
                  </div>
                </div>
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="font-serif font-medium text-base mb-2">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed flex-grow">
                    {p.description}
                  </p>
                  <div className="mt-auto">
                    {p.variants.length > 0 ? (
                      <p className="text-primary font-semibold text-sm">
                        {p.variants.length > 1
                          ? `$${Math.min(...p.variants.map((v) => v.price))} – $${Math.max(...p.variants.map((v) => v.price))}`
                          : `$${p.variants[0].price}`}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm">Coming Soon</p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl">
          <p className="text-muted-foreground text-sm font-serif">No products found in this category.</p>
        </div>
      )}
    </div>
  );
}
