"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Product } from "@/lib/staticData";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Layers,
  HelpCircle,
} from "lucide-react";

interface ProductsClientProps {
  products: Product[];
}

export default function ProductsClient({ products }: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dynamic categories from database
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          const activeCats = data.filter((c: any) => c.active).map((c: any) => ({
            slug: c.slug,
            name: c.name,
          }));
          setCategories(activeCats);
        }
      } catch (err) {
        console.error("Failed to load categories in ProductsClient:", err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setActiveCategory(cat);
    } else {
      setActiveCategory("all");
    }
  }, [searchParams]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    if (cat === "all") {
      router.push("/products", { scroll: false });
    } else {
      router.push(`/products?category=${cat}`, { scroll: false });
    }
  };



  // Perform multi-dimensional filter: both category AND search query
  const filtered = products
    .filter((p) => activeCategory === "all" || p.category === activeCategory)
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    });

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-2">
            Our Collection
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium">Shop</h1>
        </div>

        {/* Dynamic Search Bar */}
        <div className="relative w-full sm:max-w-xs group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary text-secondary-foreground border border-border rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all duration-200 hover:border-border/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap mb-10 items-center">
        <button
          onClick={() => handleCategoryChange("all")}
          className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
            ${activeCategory === "all"
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
        >
          <span>All</span>
        </button>

        {categories.map((c) => (
          <button
            key={c.slug}
            onClick={() => handleCategoryChange(c.slug)}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
                ${activeCategory === c.slug
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            <span>{c.name}</span>
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
                  {p.variants.length > 0 && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded-full font-light">
                      {(() => {
                        const stockLevels = p.variants.map((v) => v.stock_level || (v.stock_quantity && v.stock_quantity > 20 ? 'high' : v.stock_quantity && v.stock_quantity > 10 ? 'med' : v.stock_quantity && v.stock_quantity > 0 ? 'low' : 'none'));
                        const allSame = stockLevels.every((s) => s === stockLevels[0]);
                        const stockLabel = allSame ? (stockLevels[0] || 'none') : 'Mixed';
                        return `Stock: ${stockLabel.charAt(0).toUpperCase() + stockLabel.slice(1)}`;
                      })()}
                    </div>
                  )}
                </div>
                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="font-serif font-medium text-base mb-2">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed flex-grow font-light">
                    {p.description}
                  </p>
                  <div className="mt-auto">
                    {p.variants.length > 0 ? (
                      <p className="text-primary font-semibold text-sm">
                        {p.variants.length > 1
                          ? `$${Math.min(...p.variants.map((v) => v.price)).toFixed(2)} – $${Math.max(...p.variants.map((v) => v.price)).toFixed(2)}`
                          : `$${p.variants[0].price.toFixed(2)}`}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-sm font-light">Coming Soon</p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {filtered.length === 0 && (
        <div className="text-center py-20 bg-card border border-border border-dashed rounded-3xl flex flex-col items-center justify-center">
          <HelpCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm font-serif font-light">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
