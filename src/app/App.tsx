import { useState, useLayoutEffect, useRef } from "react";
import {
  ShoppingCart, X, ChevronDown, Sun, Moon, MapPin,
  Leaf, Check, Plus, Minus, ArrowLeft, MessageCircle,
  Phone, User, Calendar, Clock, ChevronRight, Info,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ── CONFIG ────────────────────────────────────────────────────────────────────
// Replace with your WhatsApp number: country code + number, no spaces or +
const SELLER_WHATSAPP = "61468766892";

// ── TYPES ─────────────────────────────────────────────────────────────────────
type Page = "home" | "products" | "detail" | "cart" | "checkout" | "info";
type Category = "all" | "plants" | "shrimp" | "snails" | "fish";
type Nav = (page: Page, productId?: string, cat?: Category) => void;

interface Variant { id: string; label: string; price: number; }
interface Product {
  id: string; name: string; category: Exclude<Category, "all">;
  description: string; careLevel: string; light: string;
  avgSize: string; origin: string; variants: Variant[]; img: string;
}
interface CartItem {
  productId: string; variantId: string; qty: number;
  name: string; variantLabel: string; price: number;
}

// ── IMAGES ────────────────────────────────────────────────────────────────────
const IMG = {
  hero:   "https://images.unsplash.com/photo-1779436853149-2e7d501f71cf?w=1600&h=900&fit=crop&auto=format",
  scene1: "https://images.unsplash.com/photo-1779436853049-c19542e3c81c?w=1400&h=700&fit=crop&auto=format",
  t1:     "https://images.unsplash.com/photo-1691387824643-227cc84127cf?w=600&h=600&fit=crop&auto=format",
  t2:     "https://images.unsplash.com/photo-1691387896833-dba10ea7d614?w=600&h=600&fit=crop&auto=format",
  t3:     "https://images.unsplash.com/photo-1691387747539-f681c5fa73d9?w=600&h=600&fit=crop&auto=format",
  p1:     "https://images.unsplash.com/photo-1542598920-1379fbb75939?w=600&h=600&fit=crop&auto=format",
  p2:     "https://images.unsplash.com/photo-1615988506550-20d485e6aaa0?w=600&h=600&fit=crop&auto=format",
  p3:     "https://images.unsplash.com/photo-1728158265471-e20c4b0fab17?w=600&h=600&fit=crop&auto=format",
  p4:     "https://images.unsplash.com/photo-1730530355839-80f863edd421?w=600&h=600&fit=crop&auto=format",
};

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: "redroot", name: "Redroot Floater", category: "plants",
    description: "Phyllanthus fluitans forms floating rosettes that deepen to vivid crimson under strong light. It absorbs excess nutrients, outcompetes algae, and shelters fry and shrimp beneath its delicate dangling roots. One of the most visually striking surface plants in the hobby.",
    careLevel: "Easy", light: "Medium – High", avgSize: "Leaves 2–4 cm across", origin: "South America",
    variants: [{ id: "handful", label: "Handful (12–13 branches)", price: 8 }], img: IMG.p2,
  },
  {
    id: "ludwigia", name: "Ludwigia Mini Super Red", category: "plants",
    description: "Among the most intensely coloured stem plants available. Under strong light and CO₂, foliage transitions from orange to vivid ruby and magenta — a true showstopper in any Nature Aquarium composition.",
    careLevel: "Moderate", light: "High", avgSize: "5–10 cm per stem node", origin: "Southeast Asia (cultivar)",
    variants: [{ id: "2stems", label: "2 × 5 cm stems", price: 8 }], img: IMG.t1,
  },
  {
    id: "rotala", name: "Rotala sp.", category: "plants",
    description: "Slender, feathery stems with delicate leaves that shift from soft green to warm pink and rose with increased light intensity. Essential for creating natural, flowing midground and background textures in planted scapes.",
    careLevel: "Moderate", light: "Medium – High", avgSize: "10–30 cm", origin: "Asia",
    variants: [{ id: "3stems", label: "3 × 10 cm stems", price: 5 }], img: IMG.t2,
  },
  {
    id: "java-fern-med", name: "Java Fern (Medium)", category: "plants",
    description: "Microsorum pteropus — one of the hobby's most iconic plants. Hardy, slow-growing, and deeply forgiving, it thrives attached to driftwood or rock and produces adventitious plantlets along its leaf margins for easy propagation.",
    careLevel: "Very Easy", light: "Low – Medium", avgSize: "15–25 cm", origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }], img: IMG.p1,
  },
  {
    id: "java-fern-baby", name: "Java Fern Baby", category: "plants",
    description: "Juvenile plantlets grown from adventitious buds on mature Java Fern leaves. Fully rooted and ready to attach to hardscape or grow out in a nursery tank. Perfect for detailed aquascape compositions.",
    careLevel: "Very Easy", light: "Low – Medium", avgSize: "3–8 cm", origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }], img: IMG.p1,
  },
  {
    id: "windelov-med", name: "Java Fern Windelov (Medium)", category: "plants",
    description: "The Windelov cultivar features finely branched, forked leaf tips that create an intricate lace-like texture. Shares all the legendary hardiness of standard Java Fern while adding exceptional visual detail to any scape.",
    careLevel: "Very Easy", light: "Low – Medium", avgSize: "15–20 cm", origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }], img: IMG.t3,
  },
  {
    id: "windelov-baby", name: "Java Fern Windelov Baby", category: "plants",
    description: "Young Windelov plantlets with the characteristic branched tips already forming. Ideal for aquarists building detailed hardscape arrangements or looking to expand their Windelov collection affordably.",
    careLevel: "Very Easy", light: "Low – Medium", avgSize: "3–8 cm", origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }], img: IMG.t3,
  },
  {
    id: "hygro-sperma", name: "Hygrophila sp. 'Araguaia'", category: "plants",
    description: "A fast-growing narrow-leaved stem plant that tolerates a wide range of conditions and competes effectively against algae in nutrient-rich setups. Creates lush, dense backgrounds when planted in groups.",
    careLevel: "Easy", light: "Low – Medium", avgSize: "7–20 cm per stem", origin: "South America",
    variants: [{ id: "2stems", label: "2 × 7 cm stems", price: 5 }], img: IMG.p3,
  },
  {
    id: "hygro-corym", name: "Hygrophila corymbosa", category: "plants",
    description: "A classic broad-leaved stem plant with large emerald leaves. Exceptionally adaptable — thrives from low to high light — and grows quickly enough to help cycle nutrients during tank establishment.",
    careLevel: "Easy", light: "Low – High", avgSize: "8–40 cm", origin: "Southeast Asia",
    variants: [{ id: "1stem", label: "1 × 8 cm stem", price: 5 }], img: IMG.p3,
  },
  {
    id: "java-moss", name: "Java Moss", category: "plants",
    description: "Taxiphyllum barbieri — the quintessential aquarium moss. Nearly indestructible, it forms lush carpets, moss walls, and naturalistic tree canopies on driftwood. A vital refuge for shrimp and spawning fish.",
    careLevel: "Very Easy", light: "Low – High", avgSize: "Ball ~5 cm diameter", origin: "Southeast Asia",
    variants: [{ id: "ball", label: "Small ball (~5 cm)", price: 3 }], img: IMG.t1,
  },
  {
    id: "anubias", name: "Anubias Nana Petite", category: "plants",
    description: "The smallest Anubias cultivar — tiny heart-shaped leaves 1–2 cm across, growing at a deliberate pace on rhizomes. Attach to fine hardscape for a jewel-like effect. Near bulletproof in low light without CO₂.",
    careLevel: "Very Easy", light: "Low", avgSize: "Leaves 1–2 cm, 3–8 cm spread", origin: "West Africa (cultivar)",
    variants: [{ id: "1plant", label: "1 plant", price: 12 }], img: IMG.t2,
  },
  {
    id: "crypt-wendtii", name: "Cryptocoryne Wendtii Green", category: "plants",
    description: "A beloved rosette plant with rippled, hammered-texture green leaves. Grows beautifully in low light without CO₂ and develops a striking root system with time. A cornerstone of the Nature Aquarium midground.",
    careLevel: "Easy", light: "Low – Medium", avgSize: "10–15 cm height", origin: "Sri Lanka",
    variants: [
      { id: "small", label: "Small (4–5 leaves)", price: 8 },
      { id: "large", label: "Large (8–9 leaves)", price: 10 },
    ], img: IMG.p4,
  },
  {
    id: "mts", name: "Malaysian Trumpet Snail", category: "snails",
    description: "Melanoides tuberculata — hardworking, largely invisible cleanup crew. These nocturnal burrowers aerate compacted substrate, consume detritus and uneaten food, and help prevent anaerobic pockets. An essential addition to any planted aquarium.",
    careLevel: "Very Easy", light: "N/A", avgSize: "Adult 1.5–3 cm length", origin: "Africa & Asia",
    variants: [{ id: "10pack", label: "10 snails", price: 10 }], img: IMG.t3,
  },
  {
    id: "bloody-mary", name: "Bloody Mary Shrimp", category: "shrimp",
    description: "Neocaridina davidi 'Bloody Mary' — a translucent blood-red neocaridina morph that practically glows against lush greenery. Highly active algae grazers and exceptional scavengers. Graded by the opacity and depth of their red pigmentation.",
    careLevel: "Easy", light: "N/A", avgSize: "Adult 2–3 cm", origin: "Taiwan (captive bred)",
    variants: [
      { id: "low", label: "Low Grade — 5 shrimp", price: 5 },
      { id: "med", label: "Medium Grade — 2 shrimp", price: 5 },
      { id: "high", label: "High Grade — 1 shrimp", price: 5 },
    ], img: IMG.t1,
  },
  {
    id: "guppy", name: "Fancy Guppy", category: "fish",
    description: "Premium fancy guppy strains coming soon to Aquatic Emerald. Check back shortly for updates on availability, strain names, and pricing. Well worth the wait.",
    careLevel: "Easy", light: "N/A", avgSize: "4–6 cm", origin: "South America (captive bred)",
    variants: [], img: IMG.t2,
  },
];

const LOCATIONS = [
  "Crestwood Public School — Front Gates",
  "Outside Coles, Castle Towers",
  "In Front of Baulkham Hills Library",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── UTILITIES ─────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function getTimeWindows(dow: number): string[] {
  const fmt = (h: number, m: number) =>
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  const make = (sH: number, sM: number, eH: number, eM: number) => {
    const ws: string[] = [];
    let h = sH, m = sM;
    while (h < eH || (h === eH && m < eM)) {
      const nm = m + 30, nh = nm >= 60 ? h + 1 : h, am = nm >= 60 ? nm - 60 : nm;
      ws.push(`${fmt(h, m)} – ${fmt(nh, am)}`);
      h = nh; m = am;
    }
    return ws;
  };
  if (dow === 6) return make(11, 0, 18, 0);
  if (dow === 0) return make(13, 0, 18, 0);
  return make(16, 30, 19, 0);
}
function cartTotal(cart: CartItem[]) {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}

// ── NAV ───────────────────────────────────────────────────────────────────────
function Navbar({
  dark, toggleDark, cartCount, nav, currentPage,
}: {
  dark: boolean; toggleDark: () => void; cartCount: number;
  nav: Nav; currentPage: Page;
}) {
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const categories: { cat: Exclude<Category, "all">; emoji: string; label: string }[] = [
    { cat: "plants", emoji: "🌿", label: "Plants" },
    { cat: "shrimp", emoji: "🦐", label: "Shrimp" },
    { cat: "snails", emoji: "🐌", label: "Snails" },
    { cat: "fish",   emoji: "🐟", label: "Fish" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <button onClick={() => nav("home")} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-[17px] font-medium tracking-tight">
            Aquatic <em className="not-italic text-primary font-semibold">Emerald</em>
          </span>
        </button>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {(["home", "info"] as Page[]).map((p) => (
            <button key={p} onClick={() => nav(p)}
              className={`text-sm font-medium capitalize transition-colors hover:text-primary
                ${currentPage === p ? "text-primary" : "text-muted-foreground"}`}>
              {p}
            </button>
          ))}

          {/* Products dropdown */}
          <div
            ref={dropRef}
            className="relative"
            onMouseEnter={() => setDropOpen(true)}
            onMouseLeave={() => setDropOpen(false)}
          >
            <button
              onClick={() => nav("products")}
              className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary
                ${(currentPage === "products" || currentPage === "detail") ? "text-primary" : "text-muted-foreground"}`}
            >
              Products
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {dropOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-44 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
                >
                  {categories.map((c) => (
                    <button
                      key={c.cat}
                      onClick={() => { nav("products", undefined, c.cat); setDropOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <span className="text-base">{c.emoji}</span>
                      <span className="font-medium">{c.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => nav("cart")}
            className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center font-bold leading-none">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ── HOME PAGE ─────────────────────────────────────────────────────────────────
function HomePage({ nav }: { nav: Nav }) {
  const featured = PRODUCTS.filter((p) => p.variants.length > 0).slice(0, 4);

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="relative h-screen min-h-[560px] flex items-center justify-center overflow-hidden bg-black">
        <img
          src={IMG.hero}
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
            Premium Freshwater Botanicals · Hills District, Sydney
          </p>
          <h1 className="font-serif text-[clamp(3rem,10vw,6rem)] font-light text-white leading-[1.05] mb-6">
            Aquatic
            <br />
            <em className="not-italic text-emerald-400 font-semibold">Emerald</em>
          </h1>
          <p className="text-base sm:text-lg text-white/75 font-light max-w-xl mx-auto mb-10 leading-relaxed">
            Curated plants, shrimp &amp; snails for the discerning freshwater aquarist.
            Grown with care, delivered in person.
          </p>
          <button
            onClick={() => nav("products")}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full text-sm font-semibold tracking-wide transition-all duration-300 hover:shadow-[0_0_40px_rgba(52,211,153,0.5)] hover:-translate-y-0.5"
          >
            Shop the Collection
          </button>
        </motion.div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <ChevronDown className="w-6 h-6 text-white" />
        </div>
      </section>

      {/* Featured */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3">
            Featured Collection
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-medium">Current Availability</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              onClick={() => nav("detail", p.id)}
              className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-300"
            >
              <div className="relative h-52 overflow-hidden bg-muted">
                <img
                  src={p.img}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold tracking-widest uppercase px-2.5 py-1 rounded-full">
                  {p.category}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-serif font-medium text-base mb-1.5">{p.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                  {p.description}
                </p>
                <p className="text-primary font-semibold text-sm">
                  from ${Math.min(...p.variants.map((v) => v.price))}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
        <div className="text-center mt-12">
          <button
            onClick={() => nav("products")}
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200"
          >
            View All Products <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Aquascape banner */}
      <section className="relative h-60 sm:h-96 overflow-hidden bg-black">
        <img
          src={IMG.scene1}
          alt="Curved aquarium filled with vibrant aquatic plants and moss"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex items-center">
          <div className="px-8 sm:px-16 max-w-lg">
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-light leading-tight mb-3">
              Build your<br />
              <em className="not-italic text-emerald-400 font-semibold">living</em> world
            </h2>
            <p className="text-white/65 text-sm leading-relaxed">
              Every specimen we sell is healthy, thriving, and ready to transform your aquarium
              into a Nature Aquarium masterpiece.
            </p>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: "🌿",
              title: "Home-Grown Quality",
              desc: "Every plant, shrimp and snail is propagated from thriving personal tanks, ensuring healthy, pest-free specimens adapted to local water conditions.",
            },
            {
              icon: "📍",
              title: "Convenient Pickup",
              desc: "Three pickup locations across the Hills District. Choose a 30-minute window that fits your schedule — weekdays, Saturdays, and Sundays.",
            },
            {
              icon: "💬",
              title: "WhatsApp Orders",
              desc: "Simple, direct ordering via WhatsApp. Get real-time updates from a real person — not a bot. We confirm every order personally.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="text-center p-8 bg-card border border-border rounded-2xl hover:border-primary/30 transition-colors"
            >
              <div className="text-4xl mb-5">{item.icon}</div>
              <h3 className="font-serif font-medium text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-serif text-sm font-medium">Aquatic Emerald</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Aquatic Emerald · Hills District, Sydney · All sales subject to availability
        </p>
      </footer>
    </div>
  );
}

// ── PRODUCTS PAGE ─────────────────────────────────────────────────────────────
function ProductsPage({
  nav, cat, setCat,
}: {
  nav: Nav; cat: Category; setCat: (c: Category) => void;
}) {
  const filtered = cat === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);

  const catOptions: { value: Category; label: string }[] = [
    { value: "all",    label: "All" },
    { value: "plants", label: "🌿 Plants" },
    { value: "shrimp", label: "🦐 Shrimp" },
    { value: "snails", label: "🐌 Snails" },
    { value: "fish",   label: "🐟 Fish" },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-7xl mx-auto">
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
            onClick={() => setCat(c.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all
              ${cat === c.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((p) => (
          <motion.button
            key={p.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => nav("detail", p.id)}
            className="group text-left bg-card border border-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1.5 transition-all duration-300"
          >
            <div className="relative h-52 overflow-hidden bg-muted">
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
            <div className="p-5">
              <h3 className="font-serif font-medium text-base mb-2">{p.name}</h3>
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
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL PAGE ───────────────────────────────────────────────────────
function ProductDetailPage({
  productId, addToCart, nav,
}: {
  productId: string; addToCart: (item: CartItem) => void; nav: Nav;
}) {
  const product = PRODUCTS.find((p) => p.id === productId);
  const [selectedVariant, setSelectedVariant] = useState(product?.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center">
        <p className="text-muted-foreground mb-4">Product not found.</p>
        <button onClick={() => nav("products")} className="text-primary text-sm font-medium hover:underline">
          ← Back to Products
        </button>
      </div>
    );
  }

  const variant = product.variants.find((v) => v.id === selectedVariant);
  const total = variant ? variant.price * qty : 0;

  const handleAdd = () => {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      qty,
      name: product.name,
      variantLabel: variant.label,
      price: variant.price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const stats = [
    { label: "Average Size", value: product.avgSize },
    { label: "Origin",       value: product.origin },
    { label: "Care Level",   value: product.careLevel },
    { label: "Light",        value: product.light },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-5xl mx-auto">
      <button
        onClick={() => nav("products")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div className="rounded-3xl overflow-hidden bg-muted aspect-square shadow-lg">
          <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2 capitalize font-semibold">
            {product.category}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-medium mb-4 leading-snug">
            {product.name}
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 text-sm">{product.description}</p>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary rounded-xl p-3.5">
                <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">
                  {s.label}
                </p>
                <p className="text-sm font-medium">{s.value}</p>
              </div>
            ))}
          </div>

          {product.variants.length === 0 ? (
            <div className="bg-muted rounded-2xl p-8 text-center">
              <p className="font-serif font-medium text-lg mb-2">Coming Soon</p>
              <p className="text-sm text-muted-foreground">
                This product is not yet available. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {/* Variant selector */}
              {product.variants.length > 1 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold mb-3">Select Option</p>
                  <div className="flex flex-col gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v.id)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all
                          ${selectedVariant === v.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/40"}`}
                      >
                        <span>{v.label}</span>
                        <span className="font-semibold">${v.price}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single variant price display */}
              {product.variants.length === 1 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-primary bg-primary/5 text-primary text-sm mb-6">
                  <span>{product.variants[0].label}</span>
                  <span className="font-semibold">${product.variants[0].price}</span>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-8">
                <p className="text-sm font-semibold mb-3">Quantity</p>
                <div className="flex items-center gap-5">
                  <div className="flex items-center border border-border rounded-full overflow-hidden bg-secondary">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-semibold text-sm">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="w-10 h-10 flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {variant && (
                    <span className="text-sm text-muted-foreground">
                      {qty} × ${variant.price} =&nbsp;
                      <span className="text-foreground font-semibold">${total.toFixed(2)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Add to cart */}
              <button
                onClick={handleAdd}
                className={`w-full py-4 rounded-full font-semibold text-sm tracking-wide transition-all duration-300
                  ${added
                    ? "bg-emerald-600 text-white scale-[0.99]"
                    : "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5"}`}
              >
                {added ? "✓ Added to Cart!" : `Add to Cart — $${total.toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── CART PAGE ─────────────────────────────────────────────────────────────────
function CartPage({
  cart, updateQty, removeItem, nav,
}: {
  cart: CartItem[];
  updateQty: (pId: string, vId: string, qty: number) => void;
  removeItem: (pId: string, vId: string) => void;
  nav: Nav;
}) {
  const total = cartTotal(cart);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="pt-24 pb-20 px-4 max-w-3xl mx-auto">
      <h1 className="font-serif text-4xl font-medium mb-8">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="text-center py-28">
          <ShoppingCart className="w-14 h-14 text-muted-foreground/40 mx-auto mb-5" />
          <p className="font-serif text-xl font-medium mb-2">Your cart is empty</p>
          <p className="text-sm text-muted-foreground mb-8">
            Browse our collection and add something beautiful.
          </p>
          <button
            onClick={() => nav("products")}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90 transition"
          >
            Browse Products
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-8">
            {cart.map((item) => {
              const product = PRODUCTS.find((p) => p.id === item.productId);
              return (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {product && (
                      <img src={product.img} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.variantLabel}</p>
                    <p className="text-primary font-semibold text-sm mt-1">
                      ${(item.price * item.qty).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center border border-border rounded-full overflow-hidden bg-secondary">
                      <button
                        onClick={() => updateQty(item.productId, item.variantId, item.qty - 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.productId, item.variantId, item.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-accent transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base mb-6 pt-3 border-t border-border">
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
            <button
              onClick={() => nav("checkout")}
              className="w-full py-4 bg-primary text-primary-foreground rounded-full font-semibold text-sm tracking-wide hover:opacity-90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200"
            >
              Proceed to Pickup Confirmation
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── CHECKOUT PAGE ─────────────────────────────────────────────────────────────
function CheckoutPage({ cart, nav }: { cart: CartItem[]; nav: Nav }) {
  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [year, setYear] = useState(todayY);
  const [month, setMonth] = useState(todayM);
  const [day, setDay] = useState<number | null>(null);
  const [timeWindow, setTimeWindow] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  const total = cartTotal(cart);

  // Available months: current + next 5
  const availableMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(todayY, todayM + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
  });

  const handleMonthChange = (m: number, y: number) => {
    setMonth(m); setYear(y); setDay(null); setTimeWindow("");
  };

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const isDayDisabled = (d: number) => {
    if (year < todayY) return true;
    if (year === todayY && month < todayM) return true;
    if (year === todayY && month === todayM && d < todayD) return true;
    return false;
  };

  const selectedDow = day !== null ? new Date(year, month, day).getDay() : -1;
  const timeWindows = day !== null ? getTimeWindows(selectedDow) : [];

  const dowLabel =
    selectedDow === 6 ? "Saturday: 11:00 am – 6:00 pm"
    : selectedDow === 0 ? "Sunday: 1:00 pm – 6:00 pm"
    : "Weekday: 4:30 pm – 7:00 pm";

  const canConfirm =
    phone.trim().length >= 8 && location && day !== null && timeWindow;

  const handleConfirm = () => {
    if (!phone.trim() || phone.trim().length < 8) {
      setPhoneError(true);
      return;
    }
    const dateStr = `${DAY_NAMES_SHORT[selectedDow]}, ${day} ${MONTH_NAMES[month]} ${year}`;
    const lines = cart.map(
      (i) => `• ${i.qty}× ${i.name} — ${i.variantLabel} ($${(i.price * i.qty).toFixed(2)})`
    ).join("\n");

    const msg =
      `🌿 *Aquatic Emerald — Order Request*\n\n` +
      `*Customer:* ${name.trim() || "Customer"}\n` +
      `*Phone:* ${phone.trim()}\n\n` +
      `*Items:*\n${lines}\n\n` +
      `*Total: $${total.toFixed(2)}*\n\n` +
      `*Pickup Details:*\n` +
      `📍 ${location}\n` +
      `📅 ${dateStr}\n` +
      `⏰ ${timeWindow}\n\n` +
      `Please confirm my order. Thank you! 🙏`;

    window.open(`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (cart.length === 0) {
    return (
      <div className="pt-24 pb-16 px-4 max-w-xl mx-auto text-center py-40">
        <p className="text-muted-foreground mb-4">No items in cart.</p>
        <button
          onClick={() => nav("products")}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-sm font-medium"
        >
          Browse Products
        </button>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4 max-w-2xl mx-auto">
      <button
        onClick={() => nav("cart")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Cart
      </button>

      <h1 className="font-serif text-4xl font-medium mb-2">Pickup Confirmation</h1>
      <p className="text-muted-foreground text-sm mb-10">
        Fill in your details and choose a pickup slot. {"You'll"} then message us on WhatsApp to confirm.
      </p>

      <div className="space-y-6">
        {/* Order summary */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Order Summary
          </p>
          <div className="space-y-2 mb-4">
            {cart.map((item) => (
              <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.qty}× {item.name}
                  <span className="text-xs ml-1">({item.variantLabel})</span>
                </span>
                <span className="font-medium">${(item.price * item.qty).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-3 flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-primary">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Your Details
          </p>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                Phone Number
                <span className="text-red-500 text-xs">* required</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(false); }}
                placeholder="04XX XXX XXX"
                className={`w-full px-4 py-3 rounded-xl bg-secondary border text-sm outline-none focus:ring-2 focus:ring-ring transition
                  ${phoneError ? "border-red-500" : "border-border focus:border-primary"}`}
              />
              {phoneError && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid phone number (min 8 digits).</p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Name
                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary text-sm outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5" /> Pickup Location
          </p>
          <div className="space-y-2">
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm transition-all text-left
                  ${location === loc ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                  ${location === loc ? "border-primary bg-primary" : "border-muted-foreground/40"}`}>
                  {location === loc && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Pickup Date
          </p>

          {/* Month selector */}
          <div className="flex gap-2 flex-wrap mb-5">
            {availableMonths.map((m) => (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => handleMonthChange(m.month, m.year)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${month === m.month && year === m.year
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT.map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground py-1.5 font-semibold uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: totalDays }).map((_, i) => {
                const d = i + 1;
                const disabled = isDayDisabled(d);
                const selected = day === d;
                return (
                  <button
                    key={d}
                    onClick={() => { if (!disabled) { setDay(d); setTimeWindow(""); } }}
                    disabled={disabled}
                    className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all
                      ${disabled ? "text-muted-foreground/25 cursor-not-allowed" : ""}
                      ${selected ? "bg-primary text-primary-foreground font-semibold shadow-sm" : ""}
                      ${!disabled && !selected ? "hover:bg-accent font-medium" : ""}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time window */}
        <AnimatePresence>
          {day !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Pickup Time
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {dowLabel} · 30-minute windows
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {timeWindows.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => setTimeWindow(tw)}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all
                      ${timeWindow === tw ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                  >
                    {tw}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm */}
        <AnimatePresence>
          {canConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
            >
              <button
                onClick={handleConfirm}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-emerald-600/30 hover:-translate-y-0.5"
              >
                <MessageCircle className="w-5 h-5" />
                Confirm &amp; Message on WhatsApp
              </button>
              <p className="text-center text-xs text-muted-foreground mt-3 leading-relaxed">
                This opens WhatsApp with your order pre-filled. Your order is confirmed once the seller responds.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── INFO PAGE ─────────────────────────────────────────────────────────────────
function InfoPage() {
  const guides = [
    {
      title: "Stem Plants (Rotala, Ludwigia, Hygrophila)",
      body: "Stem plants grow upward and require regular trimming to maintain shape. Plant bundles 1–2 cm apart in nutrient-rich substrate. Most benefit from CO₂ injection and fertiliser dosing. Trim the tops and replant for bushier, denser growth. Perform 30% water changes weekly for best results.",
    },
    {
      title: "Rhizome Plants (Java Fern, Anubias)",
      body: "Never bury the rhizome in substrate — attach to driftwood or rock using thread or aquarium-safe gel glue. These plants grow slowly but are extremely hardy. They adapt well to low light and thrive without CO₂. Brown or translucent patches indicate too much direct light on the rhizome.",
    },
    {
      title: "Floating Plants (Redroot Floater)",
      body: "No planting required — simply float on the surface. Provide ample overhead light for vivid red colouring. Remove excess growth regularly to prevent blocking light to plants below. Redroot Floaters are sensitive to surface agitation from strong filters — a calm surface is ideal.",
    },
    {
      title: "Java Moss",
      body: "Attach to hardscape using dark thread or fishing line, or leave free-floating. Thrives in a wide range of water conditions from low to high tech. Trim periodically to maintain shape and encourage dense new growth. Excellent natural refuge for shrimp, fry, and breeding fish.",
    },
    {
      title: "Cryptocoryne",
      body: "Plant in nutrient-rich substrate with the crown just above the surface. May experience 'Crypt melt' — leaves die back when first introduced — do not remove the plant. New leaves adapted to your tank parameters will emerge within 2–4 weeks. Extremely rewarding once established.",
    },
    {
      title: "Bloody Mary Shrimp",
      body: "Maintain water temperature 20–26°C, pH 6.8–7.4, TDS 150–250 ppm. Avoid all copper-based medications — fatal to shrimp. Drip-acclimate slowly over 1–2 hours before introduction. Feed algae wafers, blanched vegetables, and specialised shrimp food. Change no more than 20% water at a time to avoid shocking parameters.",
    },
    {
      title: "Malaysian Trumpet Snails",
      body: "No special care required — MTS thrive in virtually all freshwater aquariums. They reproduce according to food availability, so avoid overfeeding to keep populations in check. Beneficial in planted tanks for substrate aeration. Will not harm healthy plants. Excellent indicator species for tank health.",
    },
  ];

  return (
    <div className="pt-24 pb-20 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.35em] text-primary uppercase mb-3">About Us</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium mb-5">Aquatic Emerald</h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
          A small Hills District operation supplying healthy, home-grown freshwater plants, shrimp and snails
          to planted aquarium hobbyists across Sydney. Every specimen leaves our tanks thriving.
        </p>
      </div>

      {/* Scene image */}
      <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 mb-16 bg-muted shadow-lg">
        <img src={IMG.scene1} alt="Lush planted aquascape" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Pickup info */}
      <h2 className="font-serif text-3xl font-medium mb-6">Pickup Locations</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { name: "Crestwood Public School", detail: "Front Gates, Crestwood" },
          { name: "Coles, Castle Towers",    detail: "Outside the main entrance" },
          { name: "Baulkham Hills Library",  detail: "In front of the library" },
        ].map((loc) => (
          <div key={loc.name} className="bg-card border border-border rounded-2xl p-5">
            <MapPin className="w-5 h-5 text-primary mb-3" />
            <h3 className="font-medium text-sm mb-1">{loc.name}</h3>
            <p className="text-xs text-muted-foreground">{loc.detail}</p>
          </div>
        ))}
      </div>

      {/* Pickup hours */}
      <div className="bg-secondary rounded-2xl p-6 mb-16">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-medium">Pickup Hours</h3>
        </div>
        <div className="space-y-2.5 text-sm">
          {[
            { day: "Saturday",           time: "11:00 am – 6:00 pm" },
            { day: "Sunday",             time: "1:00 pm – 6:00 pm" },
            { day: "Weekdays (Mon–Fri)", time: "4:30 pm – 7:00 pm" },
          ].map((h) => (
            <div key={h.day} className="flex justify-between items-center">
              <span className="text-muted-foreground">{h.day}</span>
              <span className="font-medium">{h.time}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
          All pickups are scheduled in 30-minute windows. Select your preferred slot at checkout.
        </p>
      </div>

      {/* Care guides */}
      <h2 className="font-serif text-3xl font-medium mb-6">Care Guides</h2>
      <div className="space-y-3">
        {guides.map((g) => (
          <details key={g.title} className="group bg-card border border-border rounded-2xl overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none font-medium text-sm select-none hover:bg-accent transition-colors">
              {g.title}
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 group-open:rotate-180 transition-transform duration-200" />
            </summary>
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
              {g.body}
            </div>
          </details>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-4 h-4 text-primary" />
          <span className="font-serif text-sm font-medium">Aquatic Emerald</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2026 Aquatic Emerald · Hills District, Sydney
        </p>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const [page, setPage] = useState<Page>("home");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<Category>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const nav: Nav = (p, productId?, cat?) => {
    setPage(p);
    if (productId !== undefined) setSelectedProductId(productId);
    if (cat !== undefined) setCategoryFilter(cat);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (item: CartItem) => {
    setCart((prev) => {
      const exists = prev.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId
      );
      if (exists) {
        return prev.map((i) =>
          i.productId === item.productId && i.variantId === item.variantId
            ? { ...i, qty: i.qty + item.qty }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (productId: string, variantId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId && i.variantId === variantId ? { ...i, qty } : i
        )
      );
    }
  };

  const removeItem = (productId: string, variantId: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const renderPage = () => {
    switch (page) {
      case "home":
        return <HomePage nav={nav} />;
      case "products":
        return (
          <ProductsPage
            nav={nav}
            cat={categoryFilter}
            setCat={(c) => setCategoryFilter(c)}
          />
        );
      case "detail":
        return selectedProductId ? (
          <ProductDetailPage productId={selectedProductId} addToCart={addToCart} nav={nav} />
        ) : (
          <ProductsPage nav={nav} cat={categoryFilter} setCat={setCategoryFilter} />
        );
      case "cart":
        return <CartPage cart={cart} updateQty={updateQty} removeItem={removeItem} nav={nav} />;
      case "checkout":
        return <CheckoutPage cart={cart} nav={nav} />;
      case "info":
        return <InfoPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        dark={dark}
        toggleDark={() => setDark((d) => !d)}
        cartCount={cartCount}
        nav={nav}
        currentPage={page}
      />
      <AnimatePresence mode="wait">
        <motion.main
          key={page}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
