import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { put, del } from "@vercel/blob";

function getDefaultQuantityForLevel(level?: string) {
  switch ((level || "").toLowerCase()) {
    case "low":
      return 1;
    case "med":
    case "medium":
      return 10;
    case "high":
      return 25;
    default:
      return 0;
  }
}

// GET single product
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

    const rows = await sql`
      SELECT
        p.id, p.slug, p.name, p.category_id, c.slug as category, c.name as category_name,
        p.short_description, p.full_description,
        i.image_url as img,
        coalesce((
          SELECT json_agg(
            json_build_object(
              'id', v.id,
              'label', v.label,
              'price', v.price,
              'stock_quantity', v.stock_quantity,
              'stock_level', v.stock_level,
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
      WHERE p.id = ${id}
      GROUP BY p.id, p.slug, p.name, p.category_id, c.slug, c.name, p.short_description, p.full_description, i.image_url
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get attributes
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

// PUT update product
export async function PUT(
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
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const categoryId = formData.get("categoryId") as string;
    const shortDescription = formData.get("shortDescription") as string;
    const fullDescription = formData.get("fullDescription") as string;
    const variants = JSON.parse(formData.get("variants") as string);
    const attributes = JSON.parse(
      (formData.get("attributes") as string) || "{}",
    );
    const productImages = JSON.parse(
      (formData.get("productImages") as string) || "[]",
    );
    const newImages = formData.getAll("newImages") as File[];

    // Update product
    await sql`
      UPDATE products
      SET name = ${name}, slug = ${slug}, category_id = ${parseInt(categoryId)},
          short_description = ${shortDescription}, full_description = ${fullDescription},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    // Delete existing variants
    await sql`DELETE FROM product_variants WHERE product_id = ${id}`;

    // Insert new variants
    for (const variant of variants) {
      const variantId = `${id}-${variant.id}`;
      const stockLevel = (
        variant.stock_level ||
        variant.stockLevel ||
        "none"
      ).toLowerCase();
      const stockQty = Math.max(
        0,
        Number(
          variant.stock_quantity ??
            variant.stockQuantity ??
            variant.stock ??
            getDefaultQuantityForLevel(stockLevel),
        ) || 0,
      );

      await sql`
        INSERT INTO product_variants (id, product_id, label, price, stock_quantity, stock_level, active)
        VALUES (${variantId}, ${id}, ${variant.label}, ${variant.price}, ${stockQty}, ${stockLevel}, TRUE)
      `;

      // Handle variant image
      const variantImageFile = formData.get(
        `variantImage_${variant.id}`,
      ) as File | null;
      if (variantImageFile) {
        const blob = await put(
          `products/${id}/variants/${variantId}/${variantImageFile.name}`,
          variantImageFile,
          {
            access: "public",
            addRandomSuffix: true,
          },
        );
        await sql`
          INSERT INTO variant_images (variant_id, image_url, alt_text, is_primary)
          VALUES (${variantId}, ${blob.url}, ${variant.label}, TRUE)
        `;
      } else if (variant.image_url) {
        await sql`
          INSERT INTO variant_images (variant_id, image_url, alt_text, is_primary)
          VALUES (${variantId}, ${variant.image_url}, ${variant.label}, TRUE)
        `;
      }
    }

    // Handle product images update
    if (newImages.length > 0 || productImages.length > 0) {
      const existingImages: any[] =
        await sql`SELECT id, image_url FROM images WHERE product_id = ${id}`;
      const existingImageIds = existingImages.map((img) => img.id);
      const productImageIdsToKeep = productImages
        .filter((img: any) => img.id)
        .map((img: any) => img.id);
      const imagesToDelete = existingImages.filter(
        (img) => !productImageIdsToKeep.includes(img.id),
      );

      // Delete old images
      for (const img of imagesToDelete) {
        if (img.image_url.includes("vercel-storage.com")) {
          try {
            await del(img.image_url);
          } catch (e) {
            console.error("Failed to delete old image:", e);
          }
        }
      }
      await sql`DELETE FROM images WHERE product_id = ${id} AND id != ALL(${productImageIdsToKeep.length > 0 ? productImageIdsToKeep : [null]})`;

      // Upload new images
      const uploadedProductImages: Array<{
        image_url: string;
        alt_text: string;
        is_primary: boolean;
      }> = [];
      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const blob = await put(`products/${id}/${file.name}`, file, {
          access: "public",
          addRandomSuffix: true,
        });
        uploadedProductImages.push({
          image_url: blob.url,
          alt_text: `${name} Image ${i + 1}`,
          is_primary: false,
        });
      }

      // Insert all product images
      const allProductImages = [...productImages, ...uploadedProductImages];
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
            WHERE id = ${img.id}
          `;
        }
      }
    }

    // Update attributes
    await sql`DELETE FROM product_attribute_values WHERE product_id = ${id}`;
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 },
    );
  }
}

// DELETE product
export async function DELETE(
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

    // Delete image from blob storage
    const images =
      await sql`SELECT image_url FROM images WHERE product_id = ${id}`;
    for (const img of images) {
      if (img.image_url.includes("vercel-storage.com")) {
        try {
          await del(img.image_url);
        } catch (e) {
          console.error("Failed to delete image:", e);
        }
      }
    }

    // Delete product (cascades to variants, images, attributes)
    await sql`DELETE FROM products WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
