import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { put } from "@vercel/blob";

// GET all products with optional search
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");

    let query = `
      SELECT
        p.id, p.slug, p.name, c.slug as category, c.name as category_name, 
        p.short_description, p.full_description,
        i.image_url as img,
        coalesce(
          json_agg(
            json_build_object('id', v.id, 'label', v.label, 'price', v.price, 'stock_quantity', v.stock_quantity, 'stock_level', v.stock_level, 'image_url', (SELECT image_url FROM variant_images WHERE variant_id = v.id AND is_primary = TRUE LIMIT 1))
          ) FILTER (WHERE v.id IS NOT NULL), '[]'
        ) as variants,
        coalesce(
          json_agg(
            json_build_object('id', img.id, 'image_url', img.image_url, 'alt_text', img.alt_text, 'is_primary', img.is_primary)
          ) FILTER (WHERE img.id IS NOT NULL), '[]'
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN images i ON p.id = i.product_id AND i.is_primary = TRUE
      LEFT JOIN images img ON p.id = img.product_id
      LEFT JOIN product_variants v ON p.id = v.product_id
    `;

    const conditions = [];
    const params: any[] = [];

    if (search) {
      conditions.push(`(p.name ILIKE $${params.length + 1} OR p.short_description ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }

    if (category && category !== "all") {
      conditions.push(`c.slug = $${params.length + 1}`);
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY p.id, p.slug, p.name, c.slug, c.name, p.short_description, p.full_description, i.image_url ORDER BY p.name`;

    // Use the library's conventional query method when passing parameterized SQL
    // (sql`...` is the tagged template form; for dynamic query strings use sql.query)
    const rows = await sql.query(query, params);

    // Fetch attributes for all products in one query
    if (rows.length > 0) {
      const productIds = rows.map((r: any) => r.id);
      const attrRows = await sql`
        SELECT pav.product_id, pa.name, pav.value
        FROM product_attribute_values pav
        JOIN product_attributes pa ON pav.attribute_id = pa.id
        WHERE pav.product_id = ANY(${productIds})
      `;

      // Build a map of product_id -> attributes
      const attrMap: Record<string, Record<string, string>> = {};
      for (const ar of attrRows) {
        if (!attrMap[ar.product_id]) attrMap[ar.product_id] = {};
        attrMap[ar.product_id][ar.name] = ar.value;
      }

      // Attach attributes to each product row
      const enriched = rows.map((r: any) => ({
        ...r,
        attributes: attrMap[r.id] || {},
      }));
      return NextResponse.json(enriched);
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const categoryId = formData.get("categoryId") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const fullDescription = formData.get("fullDescription") as string;
    const variants = JSON.parse(formData.get("variants") as string);
    const attributes = JSON.parse(formData.get("attributes") as string || "{}");
    const productImages = JSON.parse(formData.get("productImages") as string || "[]");
    const newImages = formData.getAll("newImages") as File[];

    // Generate product ID
    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload new images to Vercel Blob
    const uploadedProductImages: Array<{ image_url: string; alt_text: string; is_primary: boolean }> = [];
    for (let i = 0; i < newImages.length; i++) {
      const file = newImages[i];
      const blob = await put(`products/${productId}/${file.name}`, file, {
        access: "public",
      });
      uploadedProductImages.push({
        image_url: blob.url,
        alt_text: `${name} Image ${i + 1}`,
        is_primary: i === 0 && productImages.length === 0,
      });
    }

    // Insert product
    await sql`
      INSERT INTO products (id, name, slug, short_description, full_description, category_id, active)
      VALUES (${productId}, ${name}, ${slug}, ${shortDescription}, ${fullDescription}, ${parseInt(categoryId)}, TRUE)
    `;

    // Insert variants
    for (const variant of variants) {
      const variantId = `${productId}-${variant.id}`;
      const levelToNumber = (lvl: any) => {
        if (!lvl) return 0;
        if (typeof lvl === "string") {
          const s = lvl.toLowerCase();
          if (s === "low") return 0;
          if (s === "med" || s === "medium") return 10;
          if (s === "high") return 100;
          const n = parseInt(s, 10);
          return isNaN(n) ? 0 : Math.max(0, n);
        }
        if (typeof lvl === "number") return Math.max(0, Math.floor(lvl));
        const parsed = parseInt(String(lvl), 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      };

      const stockQty = levelToNumber(variant.stockLevel ?? variant.stock);

      await sql`
        INSERT INTO product_variants (id, product_id, label, price, stock_quantity, stock_level, active)
        VALUES (${variantId}, ${productId}, ${variant.label}, ${variant.price}, ${stockQty}, ${variant.stockLevel ?? 'none'}, TRUE)
      `;

      // Handle variant image
      const variantImageFile = formData.get(`variantImage_${variant.id}`) as File | null;
      if (variantImageFile) {
        const blob = await put(`products/${productId}/variants/${variantId}/${variantImageFile.name}`, variantImageFile, {
          access: "public",
        });
        await sql`
          INSERT INTO variant_images (variant_id, image_url, alt_text, is_primary)
          VALUES (${variantId}, ${blob.url}, ${variant.label}, TRUE)
        `;
      }
    }

    // Insert images
    const allProductImages = [...productImages, ...uploadedProductImages];
    for (const img of allProductImages) {
      await sql`
        INSERT INTO images (product_id, image_url, alt_text, is_primary)
        VALUES (${productId}, ${img.image_url}, ${img.alt_text || name}, ${img.is_primary})
      `;
    }

    // Insert attributes
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      if (attrValue) {
        let attrId;
        const attrResult = await sql`SELECT id FROM product_attributes WHERE name = ${attrName}`;
        if (attrResult.length > 0) {
          attrId = attrResult[0].id;
        } else {
          const insertAttr = await sql`
            INSERT INTO product_attributes (name, data_type)
            VALUES (${attrName}, 'string')
            RETURNING id
          `;
          attrId = insertAttr[0].id;
        }

        await sql`
          INSERT INTO product_attribute_values (product_id, attribute_id, value)
          VALUES (${productId}, ${attrId}, ${attrValue as string})
        `;
      }
    }

    return NextResponse.json({ success: true, productId });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
