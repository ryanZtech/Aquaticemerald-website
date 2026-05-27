"use client";

import Link from "next/link";
import { Product } from "@/lib/staticData";
import { ChevronDown, ChevronRight, Sprout, MapPin, MessageCircle } from "lucide-react";
import { motion } from "motion/react";

interface HomeClientProps {
  products: Product[];
  settings: Record<string, string>;
}

export default function HomeClient({ products, settings }: HomeClientProps) {
  // Filter out products that have variants (active items) and take first 4 for featured listing
  const featured = products.filter((p) => p.variants.length > 0).slice(0, 4);

  const heroImg =
    settings.hero_image ||
    "https://images.unsplash.com/photo-1779436853149-2e7d501f71cf?w=1600&h=900&fit=crop&auto=format";
  const sceneImg =
    settings.scene_image ||
    "https://images.unsplash.com/photo-1779436853049-c19542e3c81c?w=1400&h=700&fit=crop&auto=format";

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[560px] flex items-center justify-center overflow-hidden bg-black">
        <img
          src={heroImg}
          alt="Lush Nature Aquarium aquascape with dense green plants"
          className="absolute inset-0 w-full h-full object-cover scale-[1.03] opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative z-10 text-center px-4 max-w-3xl mx-auto"
        >
          <p className="text-xs font-semibold tracking-[0.35em] text-emerald-400 uppercase mb-5">
            Premium Freshwater Botanicals, Hills District, Sydney
          </p>
          <h1 className="font-serif text-[clamp(3rem,10vw,6rem)] font-light text-white leading-[1.05] mb-6">
            Aquatic
            <br />
            <em className="not-italic text-emerald-400 font-semibold">
              Emerald
            </em>
          </h1>
          <p className="text-base sm:text-lg text-white/75 font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Curated plants, shrimp &amp; snails for the discerning freshwater
            aquarist. Grown with care, organised pickups.
          </p>
          <Link
            href="/products"
            className="inline-block px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] hover:-translate-y-0.5"
          >
            Shop the Collection
          </Link>
        </motion.div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <ChevronDown className="w-6 h-6 text-white" />
        </div>
      </section>

      {/* Featured Collection Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3">
            Featured Collection
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-medium">
            Current Availability
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((p, i) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
            >
              <div className="relative h-52 overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                  {p.category}
                </div>
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="font-serif font-medium text-base mb-1.5">
                  {p.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed flex-grow">
                  {p.description}
                </p>
                <p className="text-primary font-semibold text-sm mt-auto">
                  from ${Math.min(...p.variants.map((v) => v.price))}
                </p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            View All Products <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Aquascape banner */}
      <section className="relative h-60 sm:h-96 overflow-hidden bg-black">
        <img
          src={sceneImg}
          alt="Curved aquarium filled with vibrant aquatic plants and moss"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center">
          <div className="px-8 sm:px-16 max-w-lg">
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-light leading-tight mb-3">
              Build your
              <br />
              <em className="not-italic text-emerald-400 font-semibold">
                living
              </em>{" "}
              world
            </h2>
            <p className="text-white/65 text-sm leading-relaxed">
              Every specimen we sell is healthy, thriving, and ready to
              transform your aquarium into a Nature Aquarium masterpiece.
            </p>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              Icon: Sprout,
              title: "Home-Grown Quality",
              desc: "Every plant, shrimp and snail is propagated from thriving personal tanks, ensuring healthy, pest-free specimens adapted to local water conditions.",
            },
            {
              Icon: MapPin,
              title: "Convenient Pickup",
              desc: "Three pickup locations across the Hills District. Choose a 30-minute window that fits your schedule — weekdays, Saturdays, and Sundays.",
            },
            {
              Icon: MessageCircle,
              title: "WhatsApp Orders",
              desc: "Simple, direct ordering via WhatsApp. Get real-time updates from a real person — not a bot. We confirm every order personally.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="text-center p-8 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all duration-200 group"
            >
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <item.Icon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <h3 className="font-serif font-medium text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/logo.png" alt="Aquatic Emerald Logo" className="w-4 h-4 object-contain" />
          <span className="font-serif text-sm font-medium">
            Aquatic Emerald
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Aquatic Emerald · Hills District, Sydney · All sales subject to
          availability
        </p>
      </footer>
    </div>
  );
}
