import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const SELLER_WHATSAPP = process.env.SELLER_WHATSAPP || "61400000000";

const LOCATIONS = [
  {
    id: 1,
    name: "Crestwood Public School — Front Gates",
    detail: "Front Gates, Crestwood",
  },
  {
    id: 2,
    name: "Outside Coles, Castle Towers",
    detail: "Outside the main entrance",
  },
  {
    id: 3,
    name: "In Front of Baulkham Hills Library",
    detail: "In front of the library",
  },
];
const PRODUCTS = [
  {
    id: "redroot",
    slug: "redroot",
    name: "Redroot Floater",
    category: "plants",
    description:
      "Phyllanthus fluitans forms floating rosettes that deepen to vivid crimson under strong light. It absorbs excess nutrients, outcompetes algae, and shelters fry and shrimp beneath its delicate dangling roots. One of the most visually striking surface plants in the hobby.",
    careLevel: "Easy",
    light: "Medium – High",
    avgSize: "Leaves 2–4 cm across",
    origin: "South America",
    variants: [{ id: "handful", label: "Handful (12–13 branches)", price: 8 }],
    img: "https://images.unsplash.com/photo-1615988506550-20d485e6aaa0?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "ludwigia",
    slug: "ludwigia",
    name: "Ludwigia Mini Super Red",
    category: "plants",
    description:
      "Among the most intensely coloured stem plants available. Under strong light and CO₂, foliage transitions from orange to vivid ruby and magenta — a true showstopper in any Nature Aquarium composition.",
    careLevel: "Moderate",
    light: "High",
    avgSize: "5–10 cm per stem node",
    origin: "Southeast Asia (cultivar)",
    variants: [{ id: "2stems", label: "2 × 5 cm stems", price: 8 }],
    img: "https://images.unsplash.com/photo-1691387824643-227cc84127cf?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "rotala",
    slug: "rotala",
    name: "Rotala sp.",
    category: "plants",
    description:
      "Slender, feathery stems with delicate leaves that shift from soft green to warm pink and rose with increased light intensity. Essential for creating natural, flowing midground and background textures in planted scapes.",
    careLevel: "Moderate",
    light: "Medium – High",
    avgSize: "10–30 cm",
    origin: "Asia",
    variants: [{ id: "3stems", label: "3 × 10 cm stems", price: 5 }],
    img: "https://images.unsplash.com/photo-1691387896833-dba10ea7d614?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "java-fern-med",
    slug: "java-fern-med",
    name: "Java Fern (Medium)",
    category: "plants",
    description:
      "Microsorum pteropus — one of the hobby's most iconic plants. Hardy, slow-growing, and deeply forgiving, it thrives attached to driftwood or rock and produces adventitious plantlets along its leaf margins for easy propagation.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "15–25 cm",
    origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }],
    img: "https://images.unsplash.com/photo-1542598920-1379fbb75939?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "java-fern-baby",
    slug: "java-fern-baby",
    name: "Java Fern Baby",
    category: "plants",
    description:
      "Juvenile plantlets grown from adventitious buds on mature Java Fern leaves. Fully rooted and ready to attach to hardscape or grow out in a nursery tank. Perfect for detailed aquascape compositions.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "3–8 cm",
    origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }],
    img: "https://images.unsplash.com/photo-1542598920-1379fbb75939?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "windelov-med",
    slug: "windelov-med",
    name: "Java Fern Windelov (Medium)",
    category: "plants",
    description:
      "The Windelov cultivar features finely branched, forked leaf tips that create an intricate lace-like texture. Shares all the legendary hardiness of standard Java Fern while adding exceptional visual detail to any scape.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "15–20 cm",
    origin: "Southeast Asia",
    variants: [{ id: "med", label: "1 medium plant", price: 8 }],
    img: "https://images.unsplash.com/photo-1691387747539-f681c5fa73d9?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "windelov-baby",
    slug: "windelov-baby",
    name: "Java Fern Windelov Baby",
    category: "plants",
    description:
      "Young Windelov plantlets with the characteristic branched tips already forming. Ideal for aquarists building detailed hardscape arrangements or looking to expand their Windelov collection affordably.",
    careLevel: "Very Easy",
    light: "Low – Medium",
    avgSize: "3–8 cm",
    origin: "Southeast Asia",
    variants: [{ id: "baby", label: "1 baby plant", price: 2 }],
    img: "https://images.unsplash.com/photo-1691387747539-f681c5fa73d9?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "hygro-sperma",
    slug: "hygro-sperma",
    name: "Hygrophila sp. 'Araguaia'",
    category: "plants",
    description:
      "A fast-growing narrow-leaved stem plant that tolerates a wide range of conditions and competes effectively against algae in nutrient-rich setups. Creates lush, dense backgrounds when planted in groups.",
    careLevel: "Easy",
    light: "Low – Medium",
    avgSize: "7–20 cm per stem",
    origin: "South America",
    variants: [{ id: "2stems", label: "2 × 7 cm stems", price: 5 }],
    img: "https://images.unsplash.com/photo-1728158265471-e20c4b0fab17?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "hygro-corym",
    slug: "hygro-corym",
    name: "Hygrophila corymbosa",
    category: "plants",
    description:
      "A classic broad-leaved stem plant with large emerald leaves. Exceptionally adaptable — thrives from low to high light — and grows quickly enough to help cycle nutrients during tank establishment.",
    careLevel: "Easy",
    light: "Low – High",
    avgSize: "8–40 cm",
    origin: "Southeast Asia",
    variants: [{ id: "1stem", label: "1 × 8 cm stem", price: 5 }],
    img: "https://images.unsplash.com/photo-1728158265471-e20c4b0fab17?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "java-moss",
    slug: "java-moss",
    name: "Java Moss",
    category: "plants",
    description:
      "Taxiphyllum barbieri — the quintessential aquarium moss. Nearly indestructible, it forms lush carpets, moss walls, and naturalistic tree canopies on driftwood. A vital refuge for shrimp and spawning fish.",
    careLevel: "Very Easy",
    light: "Low – High",
    avgSize: "Ball ~5 cm diameter",
    origin: "Southeast Asia",
    variants: [{ id: "ball", label: "Small ball (~5 cm)", price: 3 }],
    img: "https://images.unsplash.com/photo-1691387824643-227cc84127cf?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "anubias",
    slug: "anubias",
    name: "Anubias Nana Petite",
    category: "plants",
    description:
      "The smallest Anubias cultivar — tiny heart-shaped leaves 1–2 cm across, growing at a deliberate pace on rhizomes. Attach to fine hardscape for a jewel-like effect. Near bulletproof in low light without CO₂.",
    careLevel: "Very Easy",
    light: "Low",
    avgSize: "Leaves 1–2 cm, 3–8 cm spread",
    origin: "West Africa (cultivar)",
    variants: [{ id: "1plant", label: "1 plant", price: 12 }],
    img: "https://images.unsplash.com/photo-16913896833-dba10ea7d614?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "crypt-wendtii",
    slug: "crypt-wendtii",
    name: "Cryptocoryne Wendtii Green",
    category: "plants",
    description:
      "A beloved rosette plant with rippled, hammered-texture green leaves. Grows beautifully in low light without CO₂ and develops a striking root system with time. A cornerstone of the Nature Aquarium midground.",
    careLevel: "Easy",
    light: "Low – Medium",
    avgSize: "10–15 cm height",
    origin: "Sri Lanka",
    variants: [
      { id: "small", label: "Small (4–5 leaves)", price: 8 },
      { id: "large", label: "Large (8–9 leaves)", price: 10 },
    ],
    img: "https://images.unsplash.com/photo-1730530355839-80f863edd421?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "mts",
    slug: "mts",
    name: "Malaysian Trumpet Snail",
    category: "snails",
    description:
      "Melanoides tuberculata — hardworking, largely invisible cleanup crew. These nocturnal burrowers aerate compacted substrate, consume detritus and uneaten food, and help prevent anaerobic pockets. An essential addition to any planted aquarium.",
    careLevel: "Very Easy",
    light: "N/A",
    avgSize: "Adult 1.5–3 cm length",
    origin: "Africa & Asia",
    variants: [{ id: "10pack", label: "10 snails", price: 10 }],
    img: "https://images.unsplash.com/photo-1691387747539-f681c5fa73d9?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "bloody-mary",
    slug: "bloody-mary",
    name: "Bloody Mary Shrimp",
    category: "shrimp",
    description:
      "Neocaridina davidi 'Bloody Mary' — a translucent blood-red neocaridina morph that practically glows against lush greenery. Highly active algae grazers and exceptional scavengers. Graded by the opacity and depth of their red pigmentation.",
    careLevel: "Easy",
    light: "N/A",
    avgSize: "Adult 2–3 cm",
    origin: "Taiwan (captive bred)",
    variants: [
      { id: "low", label: "Low Grade — 5 shrimp", price: 5 },
      { id: "med", label: "Medium Grade — 2 shrimp", price: 5 },
      { id: "high", label: "High Grade — 1 shrimp", price: 5 },
    ],
    img: "https://images.unsplash.com/photo-1691387824643-227cc84127cf?w=600&h=600&fit=crop&auto=format",
  },
  {
    id: "guppy",
    slug: "guppy",
    name: "Fancy Guppy",
    category: "fish",
    description:
      "Premium fancy guppy strains coming soon to Aquatic Emerald. Check back shortly for updates on availability, strain names, and pricing. Well worth the wait.",
    careLevel: "Easy",
    light: "N/A",
    avgSize: "4–6 cm",
    origin: "South America (captive bred)",
    variants: [],
    img: "https://images.unsplash.com/photo-16913896833-dba10ea7d614?w=600&h=600&fit=crop&auto=format",
  },
];

export async function GET() {
  
  const authError = await requireAdmin();
  if (authError) return authError;
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      { success: false, message: "DATABASE_URL is not defined." },
      { status: 400 },
    );
  }

  try {
    const sql = neon(dbUrl);
    console.log("Neon Seed API: Initializing full schema...");

    await sql`CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, image_url TEXT, parent_id INTEGER REFERENCES categories(id), sort_order INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE);`;

    await sql`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, short_description TEXT, full_description TEXT, category_id INTEGER REFERENCES categories(id), featured BOOLEAN DEFAULT FALSE, active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    await sql`CREATE TABLE IF NOT EXISTS product_variants (id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, label TEXT NOT NULL, price NUMERIC(10, 2) NOT NULL, stock_quantity INTEGER DEFAULT 0, active BOOLEAN DEFAULT TRUE, sku TEXT, sort_order INTEGER DEFAULT 0);`;

    await sql`CREATE TABLE IF NOT EXISTS images (id SERIAL PRIMARY KEY, product_id TEXT REFERENCES products(id) ON DELETE CASCADE, variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE, image_url TEXT NOT NULL, alt_text TEXT, is_primary BOOLEAN DEFAULT FALSE, sort_order INTEGER DEFAULT 0, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    await sql`CREATE TABLE IF NOT EXISTS tags (id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL);`;

    await sql`CREATE TABLE IF NOT EXISTS product_tag_links (product_id TEXT REFERENCES products(id) ON DELETE CASCADE, tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (product_id, tag_id));`;

    await sql`CREATE TABLE IF NOT EXISTS product_attributes (id SERIAL PRIMARY KEY, name TEXT NOT NULL, data_type TEXT NOT NULL, unit TEXT);`;

    await sql`CREATE TABLE IF NOT EXISTS product_attribute_values (product_id TEXT REFERENCES products(id) ON DELETE CASCADE, attribute_id INTEGER REFERENCES product_attributes(id) ON DELETE CASCADE, value TEXT NOT NULL, PRIMARY KEY (product_id, attribute_id));`;

    await sql`CREATE TABLE IF NOT EXISTS pickup_locations (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, instructions TEXT, active BOOLEAN DEFAULT TRUE, latitude NUMERIC(10, 8), longitude NUMERIC(11, 8), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    await sql`CREATE TABLE IF NOT EXISTS weekly_availability_rules (id SERIAL PRIMARY KEY, pickup_location_id INTEGER REFERENCES pickup_locations(id) ON DELETE CASCADE, weekday INTEGER NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL, slot_duration_minutes INTEGER DEFAULT 30, max_pickups_per_slot INTEGER DEFAULT 1, active BOOLEAN DEFAULT TRUE);`;

    await sql`CREATE TABLE IF NOT EXISTS availability_overrides (id SERIAL PRIMARY KEY, pickup_location_id INTEGER REFERENCES pickup_locations(id) ON DELETE CASCADE, start_at TIMESTAMP WITH TIME ZONE NOT NULL, end_at TIMESTAMP WITH TIME ZONE NOT NULL, override_type TEXT NOT NULL, custom_hours_json JSONB, reason TEXT, active BOOLEAN DEFAULT TRUE);`;

    await sql`CREATE TABLE IF NOT EXISTS orders (id SERIAL PRIMARY KEY, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_phone TEXT, pickup_location_id INTEGER REFERENCES pickup_locations(id), pickup_slot_at TIMESTAMP WITH TIME ZONE NOT NULL, status TEXT DEFAULT 'pending', notes TEXT, subtotal NUMERIC(10, 2) NOT NULL, total NUMERIC(10, 2) NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`;

    await sql`CREATE TABLE IF NOT EXISTS order_items (id SERIAL PRIMARY KEY, order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE, product_id TEXT, variant_id TEXT, snapshot_product_name TEXT NOT NULL, snapshot_variant_label TEXT, snapshot_unit_price NUMERIC(10, 2) NOT NULL, quantity INTEGER NOT NULL);`;

    await sql`CREATE TABLE IF NOT EXISTS slot_reservations (id SERIAL PRIMARY KEY, pickup_location_id INTEGER REFERENCES pickup_locations(id) ON DELETE CASCADE, slot_at TIMESTAMP WITH TIME ZONE NOT NULL, current_count INTEGER DEFAULT 0, max_capacity INTEGER DEFAULT 1, is_blocked BOOLEAN DEFAULT FALSE, UNIQUE(pickup_location_id, slot_at));`;

    await sql`CREATE TABLE IF NOT EXISTS store_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`;

    await sql`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip_address TEXT,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log("Neon Seed API: Tables validated. Seeding records...");

    const categories = Array.from(new Set(PRODUCTS.map((p) => p.category)));
    for (const cat of categories) {
      await sql`INSERT INTO categories (name, slug) VALUES (${cat.charAt(0).toUpperCase() + cat.slice(1)}, ${cat}) ON CONFLICT (slug) DO NOTHING;`;
    }

    const attributeNames = ["Care Level", "Light", "Average Size", "Origin"];
    for (const name of attributeNames) {
      await sql`INSERT INTO product_attributes (name, data_type) VALUES (${name}, 'string') ON CONFLICT DO NOTHING;`;
    }
    const attributesResult =
      await sql`SELECT id, name FROM product_attributes;`;
    const attrMap = Object.fromEntries(
      attributesResult.map((r) => [r.name, r.id]),
    );

    const categoryResult = await sql`SELECT id, slug FROM categories;`;
    const catMap = Object.fromEntries(
      categoryResult.map((r) => [r.slug, r.id]),
    );

    for (const p of PRODUCTS) {
      await sql`INSERT INTO products (id, name, slug, short_description, full_description, category_id) VALUES (${p.id}, ${p.name}, ${p.slug}, ${p.description.substring(0, 100) + "..."}, ${p.description}, ${catMap[p.category]}) ON CONFLICT (id) DO NOTHING;`;
      for (const v of p.variants) {
        const varId = `${p.id}-${v.id}`;
        await sql`INSERT INTO product_variants (id, product_id, label, price, stock_quantity) VALUES (${varId}, ${p.id}, ${v.label}, ${v.price}, 10) ON CONFLICT (id) DO NOTHING;`;
      }
      await sql`INSERT INTO images (product_id, image_url, alt_text, is_primary) VALUES (${p.id}, ${p.img}, ${p.name}, TRUE) ON CONFLICT DO NOTHING;`;
      const attrs = [
        { name: "Care Level", value: p.careLevel },
        { name: "Light", value: p.light },
        { name: "Average Size", value: p.avgSize },
        { name: "Origin", value: p.origin },
      ];
      for (const attr of attrs) {
        if (attrMap[attr.name]) {
          await sql`INSERT INTO product_attribute_values (product_id, attribute_id, value) VALUES (${p.id}, ${attrMap[attr.name]}, ${attr.value}) ON CONFLICT DO NOTHING;`;
        }
      }
    }

    for (const loc of LOCATIONS) {
      await sql`INSERT INTO pickup_locations (name, address, instructions) VALUES (${loc.name}, ${loc.detail}, 'Please arrive on time.') ON CONFLICT DO NOTHING;`;
    }

    const locResult = await sql`SELECT id FROM pickup_locations;`;
    for (const loc of locResult) {
      await sql`INSERT INTO weekly_availability_rules (pickup_location_id, weekday, start_time, end_time) VALUES (${loc.id}, 6, '11:00:00', '18:00:00') ON CONFLICT DO NOTHING;`;
      await sql`INSERT INTO weekly_availability_rules (pickup_location_id, weekday, start_time, end_time) VALUES (${loc.id}, 0, '13:00:00', '18:00:00') ON CONFLICT DO NOTHING;`;
      for (let i = 1; i <= 5; i++) {
        await sql`INSERT INTO weekly_availability_rules (pickup_location_id, weekday, start_time, end_time) VALUES (${loc.id}, ${i}, '16:30:00', '19:00:00') ON CONFLICT DO NOTHING;`;
      }
    }

    const sellerEmail = process.env.SELLER_EMAIL || "seller@example.com";
    await sql`INSERT INTO store_settings (key, value) VALUES ('seller_whatsapp', ${SELLER_WHATSAPP}), ('seller_email', ${sellerEmail}), ('hero_image', 'https://images.unsplash.com/photo-1779436853149-2e7d501f71cf?w=1600&h=900&fit=crop&auto=format'), ('scene_image', 'https://images.unsplash.com/photo-1779436853049-c19542e3c81c?w=1400&h=700&fit=crop&auto=format') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`;

    console.log("Neon Seed API: Seeding complete.");
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully!",
    });
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return NextResponse.json(
      { success: false, message: "Seeding failed.", error: error.message },
      { status: 500 },
    );
  }
}
