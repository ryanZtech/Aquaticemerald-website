import { neon } from "@neondatabase/serverless";
import { PRODUCTS, LOCATIONS, PICKUP_HOURS, SELLER_WHATSAPP } from "@/lib/staticData";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "DATABASE_URL is not defined in your environment variables. Please add it to your Next.js (.env.local) or Vercel settings.",
      },
      { status: 400 }
    );
  }

  try {
    const sql = neon(dbUrl);

    console.log("Neon Seed API: Initializing tables...");

    // 1. Create table products
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        care_level TEXT NOT NULL,
        light TEXT NOT NULL,
        avg_size TEXT NOT NULL,
        origin TEXT NOT NULL,
        img TEXT NOT NULL
      );
    `;

    // 2. Create table product_variants referencing products(id)
    await sql`
      CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        price NUMERIC(10, 2) NOT NULL
      );
    `;

    // 3. Create table pickup_locations
    await sql`
      CREATE TABLE IF NOT EXISTS pickup_locations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        detail TEXT
      );
    `;

    // 4. Create table pickup_hours
    await sql`
      CREATE TABLE IF NOT EXISTS pickup_hours (
        id SERIAL PRIMARY KEY,
        day_range TEXT NOT NULL,
        time_range TEXT NOT NULL
      );
    `;

    // 5. Create table settings
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

    console.log("Neon Seed API: Tables validated. Seeding records if empty...");

    // 6. Check and seed products
    const productCountResult = await sql`SELECT count(*) FROM products`;
    const productCount = parseInt(productCountResult[0].count);
    let productsSeeded = 0;
    let variantsSeeded = 0;

    if (productCount === 0) {
      for (const p of PRODUCTS) {
        await sql`
          INSERT INTO products (id, slug, name, category, description, care_level, light, avg_size, origin, img)
          VALUES (${p.id}, ${p.slug}, ${p.name}, ${p.category}, ${p.description}, ${p.careLevel}, ${p.light}, ${p.avgSize}, ${p.origin}, ${p.img})
        `;
        productsSeeded++;

        for (const v of p.variants) {
          const varId = `${p.id}-${v.id}`;
          await sql`
            INSERT INTO product_variants (id, product_id, label, price)
            VALUES (${varId}, ${p.id}, ${v.label}, ${v.price})
          `;
          variantsSeeded++;
        }
      }
    }

    // 7. Check and seed locations
    const locCountResult = await sql`SELECT count(*) FROM pickup_locations`;
    const locCount = parseInt(locCountResult[0].count);
    let locationsSeeded = 0;

    if (locCount === 0) {
      for (const loc of LOCATIONS) {
        await sql`
          INSERT INTO pickup_locations (name, detail)
          VALUES (${loc.name}, ${loc.detail})
        `;
        locationsSeeded++;
      }
    }

    // 8. Check and seed hours
    const hourCountResult = await sql`SELECT count(*) FROM pickup_hours`;
    const hourCount = parseInt(hourCountResult[0].count);
    let hoursSeeded = 0;

    if (hourCount === 0) {
      for (const h of PICKUP_HOURS) {
        await sql`
          INSERT INTO pickup_hours (day_range, time_range)
          VALUES (${h.dayRange}, ${h.timeRange})
        `;
        hoursSeeded++;
      }
    }

    // 9. Check and seed settings (WhatsApp number)
    const settingCountResult = await sql`SELECT count(*) FROM settings WHERE key = 'seller_whatsapp'`;
    const hasWhatsappSetting = parseInt(settingCountResult[0].count) > 0;
    let whatsappSeeded = false;

    if (!hasWhatsappSetting) {
      await sql`
        INSERT INTO settings (key, value)
        VALUES ('seller_whatsapp', ${SELLER_WHATSAPP})
      `;
      whatsappSeeded = true;
    }

    console.log("Neon Seed API: Seeding complete.");

    return NextResponse.json({
      success: true,
      message: "Database tables created and seeded successfully!",
      stats: {
        productsSeeded,
        variantsSeeded,
        locationsSeeded,
        hoursSeeded,
        whatsappSeeded,
      },
    });
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Database seeding failed due to a server error.",
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
