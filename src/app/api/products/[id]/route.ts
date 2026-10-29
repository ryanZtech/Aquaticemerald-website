import { NextRequest, NextResponse } from "next/server";
import { sql, pool, transactionSql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { put, del } from "@vercel/blob";
import { validateImageFile, safeImageKey } from "@/lib/fileValidation";
import { normalizeStockLevel } from "@/lib/stockLimits";
import {
  normalizePackItems,
  recomputePackProduct,
  recomputeDependentPacks,
  variantIdsForProduct,
  packsUsingVariants,
  type ValuePackItemInput,
} from "@/lib/valuePack";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const isAdmin = (await requireAdmin()) === null;

    const rows = await sql`
      SELECT
        p.id, p.slug, p.name, p.category_id, c.slug as category, c.name as category_name,
        p.short_description, p.full_description,
        p.value_pack, p.value_pack_sync_stock,
        i.image_url as img,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'label', v.label,
              'price', v.price,
              'stock_level', v.stock_level,
              'image_url', (
                SELECT vi.image_url
                FROM variant_images vi
                WHERE vi.variant_id = v.id AND vi.is_primary = TRUE
                LIMIT 1
              )
            )
            ORDER BY v.sort_order, v.label, v.id
          )
          FROM product_variants v
          WHERE v.product_id = p.id AND (${isAdmin} OR v.active = TRUE)
        ), '[]'::json) as variants,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'variant_id', vpi.item_variant_id,
              'quantity', vpi.quantity,
              'product_name', ip.name,
              'product_slug', ip.slug,
              'variant_label', iv.label,
              'stock_level', iv.stock_level
            )
            ORDER BY vpi.sort_order, vpi.id
          )
          FROM value_pack_items vpi
          JOIN product_variants iv ON iv.id = vpi.item_variant_id
          JOIN products ip ON ip.id = iv.product_id
          WHERE vpi.pack_product_id = p.id AND (${isAdmin} OR (iv.active = TRUE AND ip.active = TRUE))
        ), '[]'::json) as pack_items,
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
      WHERE p.id = ${id} AND (${isAdmin} OR p.active = TRUE)
      GROUP BY p.id, p.slug, p.name, p.category_id, c.slug, c.name, p.short_description, p.full_description, p.value_pack, p.value_pack_sync_stock, i.image_url
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const attributes = await sql`
      SELECT pa.name, pav.value
      FROM product_attribute_values pav
      JOIN product_attributes pa ON pav.attribute_id = pa.id
      WHERE pav.product_id = ${id}
    `;

    const product = {
      ...rows[0],
      attributes: Object.fromEntries(attributes.map((a) => [a.name, a.value])),
    };

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requireAdmin } = await import("@/lib/adminAuth");
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const formData = await request.formData();
    const heroImage = formData.get("heroImage");
    if (heroImage instanceof File) {
      const validation = validateImageFile(heroImage);
      if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 400 });
      if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
      const blob = await put(safeImageKey(`products/${id}`, heroImage), heroImage, { access: "public", addRandomSuffix: true });
      let client;
      try {
        client = await pool.connect();
        await client.query("BEGIN");
        const product = await client.query("SELECT name FROM products WHERE id = $1 FOR UPDATE", [id]);
        if (!product.rows.length) throw new Error("Product not found");
        await client.query("UPDATE images SET is_primary = FALSE WHERE product_id = $1", [id]);
        await client.query("INSERT INTO images (product_id, image_url, alt_text, is_primary) VALUES ($1, $2, $3, TRUE)", [id, blob.url, product.rows[0].name]);
        await client.query("COMMIT");
      } catch (error) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        await del(blob.url).catch((cleanupError) => console.error("Failed to clean up uploaded image:", cleanupError));
        throw error;
      } finally {
        client?.release();
      }
      return NextResponse.json({ success: true });
    }
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const categoryId = formData.get("categoryId") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const fullDescription = formData.get("fullDescription") as string;

    // Mirror POST validation. Without this, a blank price or negative value
    // could reach the numeric column (a 500 after uploads) or be persisted
    // and make checkout reject the product later.
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }
    if (!slug || !String(slug).trim()) {
      return NextResponse.json({ error: "Product slug is required" }, { status: 400 });
    }
    const catId = parseInt(String(categoryId));
    if (!Number.isInteger(catId) || catId < 1) {
      return NextResponse.json({ error: "Valid categoryId is required" }, { status: 400 });
    }

    let variants: any[];
    let attributes: Record<string, unknown>;
    let productImages: any[];
    try {
      variants = JSON.parse(formData.get("variants") as string);
      attributes = JSON.parse((formData.get("attributes") as string) || "{}");
      productImages = JSON.parse((formData.get("productImages") as string) || "[]");
    } catch {
      return NextResponse.json({ error: "Invalid JSON in variants, attributes, or productImages" }, { status: 400 });
    }
    const newImages = formData.getAll("newImages") as File[];
    if (!Array.isArray(variants) || variants.length === 0 || !Array.isArray(productImages) ||
        !attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
      return NextResponse.json({ error: "At least one variant and a valid image list are required." }, { status: 400 });
    }
    for (const variant of variants) {
      const price = Number(variant?.price);
      if (!variant?.label || !String(variant.label).trim()) {
        return NextResponse.json({ error: "Each variant needs a label" }, { status: 400 });
      }
      if (!Number.isFinite(price) || price < 0 || price > 1000000) {
        return NextResponse.json({ error: `Invalid price for variant "${variant?.label || "?"}"` }, { status: 400 });
      }
    }
    const existingVariantRows = await sql`SELECT id FROM product_variants WHERE product_id = ${id}`;
    const existingVariantIds = new Set(existingVariantRows.map((row) => String(row.id)));
    const resolveVariantId = (variantId: unknown) => {
      const raw = String(variantId);
      return existingVariantIds.has(raw) ? raw : `${id}-${raw}`;
    };

    // --- Value pack fields ---
    const valuePack = formData.get("valuePack") === "true";
    const valuePackSyncStock = formData.get("valuePackSyncStock") === "true";
    let packItems: ValuePackItemInput[] = [];
    if (valuePack) {
      let parsedItems: unknown = [];
      try {
        parsedItems = JSON.parse(
          (formData.get("valuePackItems") as string) || "[]",
        );
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON in valuePackItems" },
          { status: 400 },
        );
      }
      const ownVariantIds = variants.map((v: any) => resolveVariantId(v.id));
      const normalized = normalizePackItems(parsedItems, ownVariantIds);
      if (normalized.error || !normalized.items) {
        return NextResponse.json(
          { error: normalized.error || "Invalid pack items" },
          { status: 400 },
        );
      }
      packItems = normalized.items;
    }

    if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    const client = await pool.connect();
    const uploadedUrls: string[] = [];
    const removedUrls: string[] = [];
    let committed = false;
    try {
    await client.query("BEGIN");
    const sql = transactionSql(client);
    if (valuePack) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('value-pack-graph'))");
      const cycle = await client.query(`WITH RECURSIVE descendants(id) AS (
        SELECT product_id FROM product_variants WHERE id = ANY($1::text[])
        UNION
        SELECT v.product_id FROM descendants d
          JOIN value_pack_items i ON i.pack_product_id = d.id
          JOIN product_variants v ON v.id = i.item_variant_id
      ) SELECT 1 FROM descendants WHERE id = $2 LIMIT 1`, [packItems.map((item) => item.variantId), id]);
      if (cycle.rows.length) return NextResponse.json({ error: "A value pack cannot contain itself, directly or through another pack." }, { status: 400 });
    }

    await sql`
      UPDATE products
      SET name = ${name}, slug = ${slug}, category_id = ${catId},
          short_description = ${shortDescription}, full_description = ${fullDescription},
          value_pack = ${valuePack},
          value_pack_sync_stock = ${valuePack ? valuePackSyncStock : false},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    // Upsert (not delete-then-recreate) each submitted variant. Variant
    // rows that simply persist across an edit now keep their existing
    // variant_images row(s) intact — variant_images.variant_id cascades on
    // delete, so wiping every variant on every save (even just to fix a
    // typo elsewhere on the product) was silently dropping every variant
    // photo down to whichever single image this form resubmitted (and
    // resetting sku/sort_order to their defaults every time too, since
    // neither was ever included in the re-insert). Only variants actually
    // removed from the form (no longer present in `variants`) get deleted
    // below — which still correctly cascades their images away, since the
    // variant itself is genuinely gone.
    const submittedVariantIds: string[] = [];

    for (const variant of variants) {
      const variantId = resolveVariantId(variant.id);
      submittedVariantIds.push(variantId);
      const stockLevel = normalizeStockLevel(
        variant.stock_level || variant.stockLevel,
      );

      await sql`
        INSERT INTO product_variants (id, product_id, label, price, stock_level, active)
        VALUES (${variantId}, ${id}, ${variant.label}, ${variant.price}, ${stockLevel}, TRUE)
        ON CONFLICT (id) DO UPDATE SET
          label = EXCLUDED.label,
          price = EXCLUDED.price,
          stock_level = EXCLUDED.stock_level,
          updated_at = CURRENT_TIMESTAMP
      `;

      const variantImageFile = formData.get(
        `variantImage_${variant.id}`,
      ) as File | null;
      if (variantImageFile) {
        const validation = validateImageFile(variantImageFile);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        const blob = await put(
          safeImageKey(`products/${id}/variants/${variantId}`, variantImageFile),
          variantImageFile,
          {
            access: "public",
            addRandomSuffix: true,
          },
        );
        uploadedUrls.push(blob.url);
        // A new image was uploaded for this variant — replace only its
        // primary image row, leaving any other images it might have alone.
        await sql`DELETE FROM variant_images WHERE variant_id = ${variantId} AND is_primary = TRUE`;
        await sql`
          INSERT INTO variant_images (variant_id, image_url, alt_text, is_primary)
          VALUES (${variantId}, ${blob.url}, ${variant.label}, TRUE)
        `;
      } else if (variant.image_url) {
        // No new upload — the form is just echoing back the image it
        // already had. Make sure a primary row exists (covers a brand-new
        // variant, or one whose image predates this fix) without
        // duplicating it if one's already there, and keep alt_text in sync
        // with the variant's current label.
        const existingPrimary = await sql`
          SELECT id FROM variant_images WHERE variant_id = ${variantId} AND is_primary = TRUE LIMIT 1
        `;
        if (existingPrimary.length > 0) {
          await sql`
            UPDATE variant_images SET alt_text = ${variant.label}
            WHERE id = ${existingPrimary[0].id}
          `;
        } else {
          await sql`
            INSERT INTO variant_images (variant_id, image_url, alt_text, is_primary)
            VALUES (${variantId}, ${variant.image_url}, ${variant.label}, TRUE)
          `;
        }
      }
    }

    // Now remove any variant the admin actually deleted from the form (and,
    // via cascade, its images) — but only those, not every variant. Capture
    // which packs used them first so their stock can be recomputed below.
    const removedVariantIds = (
      await sql`
        SELECT id FROM product_variants
        WHERE product_id = ${id}
          AND NOT (id = ANY(${submittedVariantIds}::text[]))
      `
    ).map((r: any) => String(r.id));
    const packsUsingRemoved = await packsUsingVariants(removedVariantIds, id, sql);
    await sql`
      DELETE FROM product_variants
      WHERE product_id = ${id}
        AND NOT (id = ANY(${submittedVariantIds}::text[]))
    `;

    // --- Value pack items ---
    // Replace the pack's contents wholesale with what the form submitted
    // (rows pointing at deleted variants are already gone via cascade).
    await sql`DELETE FROM value_pack_items WHERE pack_product_id = ${id}`;
    if (valuePack) {
      let sortOrder = 0;
      for (const item of packItems) {
        await sql`
          INSERT INTO value_pack_items (pack_product_id, item_variant_id, quantity, sort_order)
          VALUES (${id}, ${item.variantId}, ${item.quantity}, ${sortOrder})
        `;
        sortOrder++;
      }
    }

    // Materialize derived stock for this pack, then any pack whose items
    // changed because variants above were edited or removed.
    if (valuePack) {
      await recomputePackProduct(id, sql);
    }
    await recomputeDependentPacks(submittedVariantIds, sql);
    for (const packId of packsUsingRemoved) {
      await recomputePackProduct(packId, sql);
      await recomputeDependentPacks(await variantIdsForProduct(packId, sql), sql);
    }

    if (formData.has("productImages")) {
      const existingImages: any[] =
        await sql`SELECT id, image_url FROM images WHERE product_id = ${id}`;
      const existingImageIds = existingImages.map((img) => img.id);
      const productImageIdsToKeep = productImages
        .filter((img: any) => img.id)
        .map((img: any) => img.id);
      const imagesToDelete = existingImages.filter(
        (img) => !productImageIdsToKeep.includes(img.id),
      );

      for (const img of imagesToDelete) {
        if (img.image_url.includes("vercel-storage.com")) removedUrls.push(img.image_url);
      }
      await sql`DELETE FROM images WHERE product_id = ${id} AND NOT (id = ANY(${productImageIdsToKeep}::int[]))`;

      const uploadedProductImages: Array<{
        image_url: string;
        alt_text: string;
        is_primary: boolean;
      }> = [];
      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const validation = validateImageFile(file);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        const blob = await put(safeImageKey(`products/${id}`, file), file, {
          access: "public",
          addRandomSuffix: true,
        });
        uploadedUrls.push(blob.url);
        uploadedProductImages.push({
          image_url: blob.url,
          alt_text: `${name} Image ${i + 1}`,
          is_primary: Number(formData.get("primaryNewImage")) === i && formData.has("primaryNewImage"),
        });
      }

      const allProductImages = [...productImages, ...uploadedProductImages];
      if (allProductImages.length && !allProductImages.some((img: any) => img.is_primary)) allProductImages[0].is_primary = true;
      for (const img of allProductImages) {
        if (!img.id) {
          await sql`
            INSERT INTO images (product_id, image_url, alt_text, is_primary)
            VALUES (${id}, ${img.image_url}, ${img.alt_text || name}, ${img.is_primary})
          `;
        } else {
          await sql`
            UPDATE images
            SET alt_text = ${img.alt_text || name}, is_primary = ${img.is_primary}
            WHERE id = ${img.id} AND product_id = ${id}
          `;
        }
      }
    }

    await sql`DELETE FROM product_attribute_values WHERE product_id = ${id}
      AND attribute_id IN (SELECT id FROM product_attributes WHERE name = ANY(${Object.keys(attributes)}::text[]))`;
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      if (attrValue) {
        let attrId;
        const attrResult =
          await sql`SELECT id FROM product_attributes WHERE name = ${attrName}`;
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
          VALUES (${id}, ${attrId}, ${attrValue as string})
        `;
      }
    }

    await client.query("COMMIT");
    committed = true;
    for (const url of removedUrls) await del(url).catch((error) => console.error("Failed to delete old image:", error));
    return NextResponse.json({ success: true });
    } finally {
      if (!committed) {
        await client.query("ROLLBACK").catch(() => {});
        for (const url of uploadedUrls) await del(url).catch((error) => console.error("Failed to clean up upload:", error));
      }
      client.release();
    }
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { requireAdmin } = await import("@/lib/adminAuth");
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;

    if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    const client = await pool.connect();
    let images: Array<{ image_url: string }> = [];
    let variantImages: Array<{ image_url: string }> = [];
    try {
      await client.query("BEGIN");
      const tx = transactionSql(client);
      images = await tx`SELECT image_url FROM images WHERE product_id = ${id}` as Array<{ image_url: string }>;
      // Variant photos live in a separate table and cascade away with the
      // product, so their blobs must be collected here too or they leak.
      variantImages = await tx`
        SELECT vi.image_url
        FROM variant_images vi
        JOIN product_variants v ON v.id = vi.variant_id
        WHERE v.product_id = ${id}
      ` as Array<{ image_url: string }>;
      const ownVariantIds = await variantIdsForProduct(id, tx);
      const dependentPacks = await packsUsingVariants(ownVariantIds, id, tx);
      const deleted = await tx`DELETE FROM products WHERE id = ${id} RETURNING id` as Array<{ id: string }>;
      if (deleted.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      for (const packId of dependentPacks) {
        await recomputePackProduct(packId, tx);
        await recomputeDependentPacks(await variantIdsForProduct(packId, tx), tx);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    for (const img of [...images, ...variantImages]) {
      if (img.image_url.includes("vercel-storage.com")) {
        await del(img.image_url).catch((error) => console.error("Failed to delete image:", error));
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
