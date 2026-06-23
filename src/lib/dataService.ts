import { sql } from "./db";
import { Product, PickupLocation, PickupHour } from "./staticData";

export interface Guide {
  id: number;
  title: string;
  slug: string;
  body: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

function mapDbProduct(row: any): Product {
  let dbVariants = [];
  if (Array.isArray(row.variants)) {
    dbVariants = row.variants;
  } else if (typeof row.variants === "string") {
    try {
      dbVariants = JSON.parse(row.variants);
    } catch {
      dbVariants = [];
    }
  }

  let dbImages = [];
  if (Array.isArray(row.images)) {
    dbImages = row.images;
  } else if (typeof row.images === "string") {
    try {
      dbImages = JSON.parse(row.images);
    } catch {
      dbImages = [];
    }
  }

  let dbVariantOptions = [];
  if (row.variant_options) {
    try {
      dbVariantOptions = JSON.parse(row.variant_options);
    } catch {
      dbVariantOptions = [];
    }
  }

  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    careLevel: row.care_level || "",
    light: row.light || "",
    avgSize: row.avg_size || "",
    origin: row.origin || "",
    img: row.img || "",
    images: dbImages,
    variantOptions: dbVariantOptions,
    variants: dbVariants.map((v: any) => ({
      id: v.id,
      label: v.label,
      price:
        typeof v.price === "string"
          ? parseFloat(v.price)
          : Number(v.price || 0),
      stock_level: v.stock_level,
      stock_quantity: v.stock_quantity,
      image_url: v.image_url,
    })),
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  if (!sql) {
    console.error("Neon Database: DATABASE_URL is missing. No data available.");
    return [];
  }

  try {
    const rows = await sql`
      SELECT
        p.id, p.slug, p.name, c.slug as category, p.full_description as description,
        i.image_url as img,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Care Level') as care_level,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Light') as light,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Average Size') as avg_size,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Origin') as origin,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Variant Options') as variant_options,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'label', v.label,
              'price', v.price,
              'stock_level', v.stock_level,
              'stock_quantity', v.stock_quantity,
              'image_url', (
                SELECT vi.image_url
                FROM variant_images vi
                WHERE vi.variant_id = v.id AND vi.is_primary = TRUE
                LIMIT 1
              )
            )
            ORDER BY v.label
          )
          FROM product_variants v
          WHERE v.product_id = p.id
        ), '[]'::json) as variants,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'image_url', img.image_url,
              'alt_text', img.alt_text,
              'is_primary', img.is_primary
            )
            ORDER BY img.is_primary DESC, img.id ASC
          )
          FROM images img
          WHERE img.product_id = p.id
        ), '[]'::json) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN images i ON p.id = i.product_id AND i.is_primary = TRUE
      GROUP BY p.id, p.slug, p.name, c.slug, p.full_description, i.image_url
    `;

    const allProducts = rows.map(mapDbProduct);

    if (category && category !== "all") {
      return allProducts.filter((p) => p.category === category);
    }
    return allProducts;
  } catch (error) {
    console.error("Neon Database query failed for products:", error);
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!sql) {
    console.error("Neon Database: DATABASE_URL is missing. No data available.");
    return null;
  }

  try {
    const rows = await sql`
      SELECT
        p.id, p.slug, p.name, c.slug as category, p.full_description as description,
        i.image_url as img,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Care Level') as care_level,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Light') as light,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Average Size') as avg_size,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Origin') as origin,
        (SELECT value FROM product_attribute_values pav JOIN product_attributes pa ON pav.attribute_id = pa.id WHERE pav.product_id = p.id AND pa.name = 'Variant Options') as variant_options,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'label', v.label,
              'price', v.price,
              'stock_level', v.stock_level,
              'stock_quantity', v.stock_quantity,
              'image_url', (
                SELECT vi.image_url
                FROM variant_images vi
                WHERE vi.variant_id = v.id AND vi.is_primary = TRUE
                LIMIT 1
              )
            )
            ORDER BY v.label
          )
          FROM product_variants v
          WHERE v.product_id = p.id
        ), '[]'::json) as variants,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', img.id,
              'image_url', img.image_url,
              'alt_text', img.alt_text,
              'is_primary', img.is_primary
            )
            ORDER BY img.is_primary DESC, img.id ASC
          )
          FROM images img
          WHERE img.product_id = p.id
        ), '[]'::json) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN images i ON p.id = i.product_id AND i.is_primary = TRUE
      WHERE p.slug = ${slug} OR p.id = ${slug}
      GROUP BY p.id, p.slug, p.name, c.slug, p.full_description, i.image_url
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    return mapDbProduct(rows[0]);
  } catch (error) {
    console.error(
      `Neon Database query failed for product slug ${slug}:`,
      error,
    );
    return null;
  }
}

export async function getLocations(): Promise<PickupLocation[]> {
  if (!sql) {
    console.error("Neon Database: DATABASE_URL is missing. No data available.");
    return [];
  }

  try {
    const rows = await sql`
      SELECT id, name, address as detail
      FROM pickup_locations
      WHERE active = TRUE
      ORDER BY id ASC
    `;

    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      detail: r.detail || "",
    }));
  } catch (error) {
    console.error("Neon Database query failed for pickup locations:", error);
    return [];
  }
}

export async function getHours(): Promise<PickupHour[]> {
  if (!sql) {
    console.error("Neon Database: DATABASE_URL is missing. No data available.");
    return [];
  }

  try {
    const rows = await sql`
      SELECT
        weekday,
        MIN(start_time)::text || ' – ' || MAX(end_time)::text as time_range
      FROM weekly_availability_rules
      WHERE active = TRUE
      GROUP BY weekday
      ORDER BY weekday ASC
    `;

    const dayMap: Record<number, string> = {
      0: "Sunday",
      1: "Monday",
      2: "Tuesday",
      3: "Wednesday",
      4: "Thursday",
      5: "Friday",
      6: "Saturday",
    };

    return rows.map((r: any, idx: number) => ({
      id: idx + 1,
      dayRange: dayMap[r.weekday] || "Unknown",
      timeRange: r.time_range,
    }));
  } catch (error) {
    console.error("Neon Database query failed for pickup hours:", error);
    return [];
  }
}

export async function getStoreSettings(): Promise<Record<string, string>> {
  if (!sql) return {};
  try {
    const rows = await sql`SELECT key, value FROM store_settings`;
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch (error) {
    console.error("Neon Database query failed for store settings:", error);
    return {};
  }
}

export async function getGuides(): Promise<Guide[]> {
  if (!sql) {
    console.error("Neon Database: DATABASE_URL is missing. No data available.");
    return [];
  }

  try {
    const rows = await sql`
      SELECT id, title, slug, body, display_order, active, created_at, updated_at
      FROM guides
      WHERE active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `;

    return rows.map((row: any) => ({
      id: Number(row.id),
      title: row.title,
      slug: row.slug,
      body: row.body,
      display_order: Number(row.display_order),
      active: Boolean(row.active),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (error) {
    console.error("Neon Database query failed for guides:", error);
    return [];
  }
}

export async function getSellerWhatsApp(): Promise<string> {
  if (!sql) {
    return "";
  }

  try {
    const rows = await sql`
      SELECT value
      FROM store_settings
      WHERE key = 'seller_whatsapp'
      LIMIT 1
    `;

    if (rows.length === 0) return "";
    let val = String(rows[0].value || "").replace(/\D/g, "");
    
    if (val.startsWith("0")) {
      val = "61" + val.substring(1);
    }
    return val;
  } catch (error) {
    console.error("Neon Database query failed for WhatsApp setting:", error);
    return "";
  }
}
