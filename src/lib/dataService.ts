import { sql } from './db';
import {
  Product,
  PickupLocation,
  PickupHour,
  PRODUCTS as STATIC_PRODUCTS,
  LOCATIONS as STATIC_LOCATIONS,
  PICKUP_HOURS as STATIC_PICKUP_HOURS,
  SELLER_WHATSAPP as STATIC_WHATSAPP
} from './staticData';

// Helper mapper to normalize database rows to Product interface
function mapDbProduct(row: any): Product {
  let dbVariants = [];
  if (Array.isArray(row.variants)) {
    dbVariants = row.variants;
  } else if (typeof row.variants === 'string') {
    try {
      dbVariants = JSON.parse(row.variants);
    } catch {
      dbVariants = [];
    }
  }

  return {
    id: row.id,
    slug: row.slug || row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    careLevel: row.care_level || row.carelevel || '',
    light: row.light,
    avgSize: row.avg_size || row.avgsize || '',
    origin: row.origin,
    img: row.img,
    variants: dbVariants.map((v: any) => ({
      id: v.id,
      label: v.label,
      price: typeof v.price === 'string' ? parseFloat(v.price) : Number(v.price || 0)
    }))
  };
}

export async function getProducts(category?: string): Promise<Product[]> {
  if (!sql) {
    console.log('Neon Database: Using static products fallback (Missing DATABASE_URL)');
    return category && category !== 'all'
      ? STATIC_PRODUCTS.filter((p) => p.category === category)
      : STATIC_PRODUCTS;
  }

  try {
    const rows = await sql`
      SELECT p.id, p.slug, p.name, p.category, p.description, p.care_level, p.light, p.avg_size, p.origin, p.img,
             coalesce(
               json_agg(
                 json_build_object('id', v.id, 'label', v.label, 'price', v.price)
               ) FILTER (WHERE v.id IS NOT NULL), '[]'
             ) as variants
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id
      GROUP BY p.id, p.slug, p.name, p.category, p.description, p.care_level, p.light, p.avg_size, p.origin, p.img
    `;

    const allProducts = rows.map(mapDbProduct);

    if (category && category !== 'all') {
      return allProducts.filter((p) => p.category === category);
    }
    return allProducts;
  } catch (error) {
    console.error('Neon Database query failed for products, falling back to static products:', error);
    return category && category !== 'all'
      ? STATIC_PRODUCTS.filter((p) => p.category === category)
      : STATIC_PRODUCTS;
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!sql) {
    console.log(`Neon Database: Using static product detail fallback for slug: ${slug}`);
    return STATIC_PRODUCTS.find((p) => p.slug === slug || p.id === slug) || null;
  }

  try {
    const rows = await sql`
      SELECT p.id, p.slug, p.name, p.category, p.description, p.care_level, p.light, p.avg_size, p.origin, p.img,
             coalesce(
               json_agg(
                 json_build_object('id', v.id, 'label', v.label, 'price', v.price)
               ) FILTER (WHERE v.id IS NOT NULL), '[]'
             ) as variants
      FROM products p
      LEFT JOIN product_variants v ON p.id = v.product_id
      WHERE p.slug = ${slug} OR p.id = ${slug}
      GROUP BY p.id, p.slug, p.name, p.category, p.description, p.care_level, p.light, p.avg_size, p.origin, p.img
      LIMIT 1
    `;

    if (rows.length === 0) return null;
    return mapDbProduct(rows[0]);
  } catch (error) {
    console.error(`Neon Database query failed for product slug ${slug}, falling back to static:`, error);
    return STATIC_PRODUCTS.find((p) => p.slug === slug || p.id === slug) || null;
  }
}

export async function getLocations(): Promise<PickupLocation[]> {
  if (!sql) {
    console.log('Neon Database: Using static locations fallback');
    return STATIC_LOCATIONS;
  }

  try {
    const rows = await sql`
      SELECT id, name, detail 
      FROM pickup_locations 
      ORDER BY id ASC
    `;
    
    if (rows.length === 0) return STATIC_LOCATIONS;
    
    return rows.map((r: any) => ({
      id: Number(r.id),
      name: r.name,
      detail: r.detail || ''
    }));
  } catch (error) {
    console.error('Neon Database query failed for pickup locations, falling back to static:', error);
    return STATIC_LOCATIONS;
  }
}

export async function getHours(): Promise<PickupHour[]> {
  if (!sql) {
    console.log('Neon Database: Using static hours fallback');
    return STATIC_PICKUP_HOURS;
  }

  try {
    const rows = await sql`
      SELECT id, day_range, time_range 
      FROM pickup_hours 
      ORDER BY id ASC
    `;

    if (rows.length === 0) return STATIC_PICKUP_HOURS;

    return rows.map((r: any) => ({
      id: Number(r.id),
      dayRange: r.day_range,
      timeRange: r.time_range
    }));
  } catch (error) {
    console.error('Neon Database query failed for pickup hours, falling back to static:', error);
    return STATIC_PICKUP_HOURS;
  }
}

export async function getSellerWhatsApp(): Promise<string> {
  if (!sql) {
    return STATIC_WHATSAPP;
  }

  try {
    const rows = await sql`
      SELECT value 
      FROM settings 
      WHERE key = 'seller_whatsapp' 
      LIMIT 1
    `;

    if (rows.length === 0) return STATIC_WHATSAPP;
    return rows[0].value;
  } catch (error) {
    console.error('Neon Database query failed for WhatsApp setting, falling back to static:', error);
    return STATIC_WHATSAPP;
  }
}
