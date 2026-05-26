export interface Variant {
  id: string;
  label: string;
  price: number;
}

export type Category = "plants" | "shrimp" | "snails" | "fish";
export type AllCategory = "all" | Category;

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  careLevel: string;
  light: string;
  avgSize: string;
  origin: string;
  variants: Variant[];
  img: string;
}

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  name: string;
  variantLabel: string;
  price: number;
}

export interface PickupLocation {
  id: number;
  name: string;
  detail: string;
}

export interface PickupHour {
  id: number;
  dayRange: string;
  timeRange: string;
}

export const SELLER_WHATSAPP = "61468766892";

export const IMG = {
  hero: "https://images.unsplash.com/photo-1779436853149-2e7d501f71cf?w=1600&h=900&fit=crop&auto=format",
  scene1: "https://images.unsplash.com/photo-1779436853049-c19542e3c81c?w=1400&h=700&fit=crop&auto=format",
  t1: "https://images.unsplash.com/photo-1691387824643-227cc84127cf?w=600&h=600&fit=crop&auto=format",
  t2: "https://images.unsplash.com/photo-1691387896833-dba10ea7d614?w=600&h=600&fit=crop&auto=format",
  t3: "https://images.unsplash.com/photo-1691387747539-f681c5fa73d9?w=600&h=600&fit=crop&auto=format",
  p1: "https://images.unsplash.com/photo-1542598920-1379fbb75939?w=600&h=600&fit=crop&auto=format",
  p2: "https://images.unsplash.com/photo-1615988506550-20d485e6aaa0?w=600&h=600&fit=crop&auto=format",
  p3: "https://images.unsplash.com/photo-1728158265471-e20c4b0fab17?w=600&h=600&fit=crop&auto=format",
  p4: "https://images.unsplash.com/photo-1730530355839-80f863edd421?w=600&h=600&fit=crop&auto=format",
};

export const PRODUCTS: Product[] = [
  {
    id: "redroot",
    slug: "redroot",
    name: "Redroot Floater",
    category: "plants",
    description: "Phyllanthus fluitans forms floating rosettes that deepen to vivid crimson under strong light. It absorbs excess nutrients, outcompetes algae, and shelters fry and shrimp beneath its delicate dangling roots. One of the most visually striking surface plants in the hobby.",
    careLevel: "Easy",
    light: "Medium – High",
    avgSize: "Leaves 2–4 cm across",
    origin: "South America",
    variants: [{ id: "handful", label: "Handful (12–13 branches)", price: 8 }],
    img: IMG.p2,
  },
  {
    id: "ludwigia",
    slug: "ludwigia",
    name: "Ludwigia Mini Super Red",
    category: "plants",
    description: "Among the most intensely coloured stem plants available. Under strong light and CO₂, foliage transitions from orange to vivid ruby and magenta — a true showstopper in any Nature Aquarium composition.",
    careLevel: "Moderate",
    light: "High",
    avgSize: "5–10 cm per stem node",
    origin: "Southeast Asia (cultivar)",
    variants: [{ id: "2stems", label: "2 × 5 cm stems", price: 8 }],
    img: IMG.t1,
  },
  {
    id: "rotala",
    slug: "rotala",
    name: "Rotala sp.",
    category: "plants",
    description: "Slender, feathery stems with delicate leaves that shift from soft green to warm pink and rose with increased light intensity. Essential for creating natural, flowing midground and background textures in planted scapes.",
    careLevel: "Moderate",
    light: "Medium – High",
    avgSize: "10–30 cm",
    origin: "Asia",
    variants: [{ id: "3stems", label: "3 × 10 cm stems", price: 5 }],
    img: IMG.t2,
  },
  {
    id: "java-fern-med",
    slug: "java-fern-med",
    name: "Java Fern (Medium)",
    category: "plants",
    description: "Microsorum pteropus — one of the hobby's most iconic plants. Hardy, slow-growing, and deeply forgiving, it thrives attached to driftwood or rock and produces adventitious plantlets along its leaf margins for easy propagation.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "15–25 cm",
    origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }],
    img: IMG.p1,
  },
  {
    id: "java-fern-baby",
    slug: "java-fern-baby",
    name: "Java Fern Baby",
    category: "plants",
    description: "Juvenile plantlets grown from adventitious buds on mature Java Fern leaves. Fully rooted and ready to attach to hardscape or grow out in a nursery tank. Perfect for detailed aquascape compositions.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "3–8 cm",
    origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }],
    img: IMG.p1,
  },
  {
    id: "windelov-med",
    slug: "windelov-med",
    name: "Java Fern Windelov (Medium)",
    category: "plants",
    description: "The Windelov cultivar features finely branched, forked leaf tips that create an intricate lace-like texture. Shares all the legendary hardiness of standard Java Fern while adding exceptional visual detail to any scape.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "15–20 cm",
    origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }],
    img: IMG.t3,
  },
  {
    id: "windelov-baby",
    slug: "windelov-baby",
    name: "Java Fern Windelov Baby",
    category: "plants",
    description: "Young Windelov plantlets with the characteristic branched tips already forming. Ideal for aquarists building detailed hardscape arrangements or looking to expand their Windelov collection affordably.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "3–8 cm",
    origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }],
    img: IMG.t3,
  },
  {
    id: "hygro-sperma",
    slug: "hygro-sperma",
    name: "Hygrophila sp. 'Araguaia'",
    category: "plants",
    description: "A fast-growing narrow-leaved stem plant that tolerates a wide range of conditions and competes effectively against algae in nutrient-rich setups. Creates lush, dense backgrounds when planted in groups.",
    careLevel: "Easy",
    light: "Low – Medium",
    avgSize: "7–20 cm per stem",
    origin: "South America",
    variants: [{ id: "2stems", label: "2 × 7 cm stems", price: 5 }],
    img: IMG.p3,
  },
  {
    id: "hygro-corym",
    slug: "hygro-corym",
    name: "Hygrophila corymbosa",
    category: "plants",
    description: "A classic broad-leaved stem plant with large emerald leaves. Exceptionally adaptable — thrives from low to high light — and grows quickly enough to help cycle nutrients during tank establishment.",
    careLevel: "Easy",
    light: "Low – High",
    avgSize: "8–40 cm",
    origin: "Southeast Asia",
    variants: [{ id: "1stem", label: "1 × 8 cm stem", price: 5 }],
    img: IMG.p3,
  },
  {
    id: "java-moss",
    slug: "java-moss",
    name: "Java Moss",
    category: "plants",
    description: "Taxiphyllum barbieri — the quintessential aquarium moss. Nearly indestructible, it forms lush carpets, moss walls, and naturalistic tree canopies on driftwood. A vital refuge for shrimp and spawning fish.",
    careLevel: "Very Easy",
    light: "Low – High",
    avgSize: "Ball ~5 cm diameter",
    origin: "Southeast Asia",
    variants: [{ id: "ball", label: "Small ball (~5 cm)", price: 3 }],
    img: IMG.t1,
  },
  {
    id: "anubias",
    slug: "anubias",
    name: "Anubias Nana Petite",
    category: "plants",
    description: "The smallest Anubias cultivar — tiny heart-shaped leaves 1–2 cm across, growing at a deliberate pace on rhizomes. Attach to fine hardscape for a jewel-like effect. Near bulletproof in low light without CO₂.",
    careLevel: "Very Easy",
    light: "Low",
    avgSize: "Leaves 1–2 cm, 3–8 cm spread",
    origin: "West Africa (cultivar)",
    variants: [{ id: "1plant", label: "1 plant", price: 12 }],
    img: IMG.t2,
  },
  {
    id: "crypt-wendtii",
    slug: "crypt-wendtii",
    name: "Cryptocoryne Wendtii Green",
    category: "plants",
    description: "A beloved rosette plant with rippled, hammered-texture green leaves. Grows beautifully in low light without CO₂ and develops a striking root system with time. A cornerstone of the Nature Aquarium midground.",
    careLevel: "Easy",
    light: "Low – Medium",
    avgSize: "10–15 cm height",
    origin: "Sri Lanka",
    variants: [
      { id: "small", label: "Small (4–5 leaves)", price: 8 },
      { id: "large", label: "Large (8–9 leaves)", price: 10 },
    ],
    img: IMG.p4,
  },
  {
    id: "mts",
    slug: "mts",
    name: "Malaysian Trumpet Snail",
    category: "snails",
    description: "Melanoides tuberculata — hardworking, largely invisible cleanup crew. These nocturnal burrowers aerate compacted substrate, consume detritus and uneaten food, and help prevent anaerobic pockets. An essential addition to any planted aquarium.",
    careLevel: "Very Easy",
    light: "N/A",
    avgSize: "Adult 1.5–3 cm length",
    origin: "Africa & Asia",
    variants: [{ id: "10pack", label: "10 snails", price: 10 }],
    img: IMG.t3,
  },
  {
    id: "bloody-mary",
    slug: "bloody-mary",
    name: "Bloody Mary Shrimp",
    category: "shrimp",
    description: "Neocaridina davidi 'Bloody Mary' — a translucent blood-red neocaridina morph that practically glows against lush greenery. Highly active algae grazers and exceptional scavengers. Graded by the opacity and depth of their red pigmentation.",
    careLevel: "Easy",
    light: "N/A",
    avgSize: "Adult 2–3 cm",
    origin: "Taiwan (captive bred)",
    variants: [
      { id: "low", label: "Low Grade — 5 shrimp", price: 5 },
      { id: "med", label: "Medium Grade — 2 shrimp", price: 5 },
      { id: "high", label: "High Grade — 1 shrimp", price: 5 },
    ],
    img: IMG.t1,
  },
  {
    id: "guppy",
    slug: "guppy",
    name: "Fancy Guppy",
    category: "fish",
    description: "Premium fancy guppy strains coming soon to Aquatic Emerald. Check back shortly for updates on availability, strain names, and pricing. Well worth the wait.",
    careLevel: "Easy",
    light: "N/A",
    avgSize: "4–6 cm",
    origin: "South America (captive bred)",
    variants: [],
    img: IMG.t2,
  },
];

export const LOCATIONS: PickupLocation[] = [
  { id: 1, name: "Crestwood Public School — Front Gates", detail: "Front Gates, Crestwood" },
  { id: 2, name: "Outside Coles, Castle Towers", detail: "Outside the main entrance" },
  { id: 3, name: "In Front of Baulkham Hills Library", detail: "In front of the library" },
];

export const PICKUP_HOURS: PickupHour[] = [
  { id: 1, dayRange: "Saturday", timeRange: "11:00 am – 6:00 pm" },
  { id: 2, dayRange: "Sunday", timeRange: "1:00 pm – 6:00 pm" },
  { id: 3, dayRange: "Weekdays (Mon–Fri)", timeRange: "4:30 pm – 7:00 pm" },
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function getTimeWindows(dow: number): string[] {
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
