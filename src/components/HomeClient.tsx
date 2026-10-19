"use client";

import Link from "next/link";
import { Product } from "@/lib/staticData";
import {
  ChevronRight,
  Sprout,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { motion } from "motion/react";
import PromoPopup from "./PromoPopup";

interface HomeClientProps {
  products: Product[];
  settings: Record<string, string>;
}

export default function HomeClient({ products, settings }: HomeClientProps) {
  
  const featured = products.filter((p) => p.variants.length > 0).slice(0, 4);

  const heroImg = settings.hero_image || "https://aquaticemerald.com/hero.png";
  const sceneImg =
    settings.scene_image || "https://aquaticemerald.com/front1.png";

  return (
    <div>
      {/* Promo Popup */}
      <PromoPopup />
      
      {}
      <section className="relative h-[calc(100vh-4rem)] min-h-[560px] flex items-center justify-center overflow-hidden bg-black">
        {heroImg ? (
          <img
            src={heroImg}
            alt="Lush Nature Aquarium aquascape with dense green plants"
            className="absolute inset-0 w-full h-full object-cover scale-[1.03] opacity-80"
          />
        ) : (
          <div className="absolute inset-0 bg-secondary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/80" />
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="relative z-10 text-center px-4 max-w-3xl mx-auto"
        >
          <h1 className="font-serif text-[clamp(3rem,10vw,6rem)] font-light text-white leading-[1.05] mb-6">
            Aquatic
            <br />
            <em className="not-italic text-primary font-semibold">
              Emerald
            </em>
          </h1>
          <p className="text-base sm:text-lg text-white/75 font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Curated plants, shrimp &amp; snails for the discerning freshwater
            aquarist. Grown with care, organised pickups.
          </p>
          <Link
            href="/products"
            className="inline-block px-8 py-4 bg-primary hover:opacity-90 text-primary-foreground rounded-full text-sm font-semibold tracking-wide transition-opacity duration-200"
          >
            Shop the Collection
          </Link>
        </motion.div>
      </section>

      {}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-serif text-4xl sm:text-5xl font-medium">
            Current Availability
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((p, i) => (
            <Link
              key={p.id}
              href={`/products/${p.slug}`}
              className="group text-left bg-card border border-border rounded-2xl overflow-hidden transition-colors flex flex-col"
            >
              <div className="relative h-52 overflow-hidden bg-muted flex-shrink-0">
                {p.img ? (
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
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

      {}
      <section className="relative h-60 sm:h-96 overflow-hidden bg-black">
        {sceneImg ? (
          <img
            src={sceneImg}
            alt="Curved aquarium filled with vibrant aquatic plants and moss"
            className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="w-full h-full bg-secondary opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center">
          <div className="px-8 sm:px-16 max-w-lg">
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-light leading-tight mb-3">
              Build your
              <br />
              <em className="not-italic text-primary font-semibold">
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

      {}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
          {[
            {
              Icon: Sprout,
              title: "Home-Grown Quality",
              desc: "Every plant, shrimp and snail is propagated from thriving personal tanks: healthy, pest-free specimens adapted to local water conditions.",
            },
            {
              Icon: MapPin,
              title: "Convenient Pickup",
              desc: "Three pickup locations across the Hills District: choose a 30-minute window that fits your schedule, weekdays, Saturdays, and Sundays.",
            },
            {
              Icon: MessageCircle,
              title: "WhatsApp Orders",
              desc: "Simple, direct ordering via WhatsApp: real-time updates from a real person, not a bot. We confirm every order personally.",
            },
          ].map((item) => (
            <div key={item.title} className="text-left">
              <h3 className="flex items-center gap-2.5 font-serif font-medium text-lg mb-2">
                <item.Icon className="w-5 h-5 text-primary flex-shrink-0" />
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-light">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
