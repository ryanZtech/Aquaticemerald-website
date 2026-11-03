import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { normalizeGalleryImages } from "@/lib/galleryImages";

/** Best-effort removal of gallery blobs; orphans are preferred to a broken row. */
async function deleteGalleryBlobs(urls: string[]) {
  const blobUrls = Array.from(
    new Set(urls.filter((url) => url.includes("vercel-storage.com"))),
  );
  if (blobUrls.length === 0) return;

  try {
    const { del } = await import("@vercel/blob");
    await del(blobUrls);
  } catch (error) {
    console.error("Failed to delete gallery image:", error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return NextResponse.json({ error: "Invalid gallery item id" }, { status: 400 });
    }
    const { title, description, image_url, image_urls } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const images = normalizeGalleryImages(image_urls, image_url);
    if (images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    const existing = await sql`
      SELECT image_url, image_urls FROM gallery_items WHERE id = ${itemId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }
    const previousImages = normalizeGalleryImages(
      existing[0].image_urls,
      existing[0].image_url,
    );

    const result = await sql`
      UPDATE gallery_items
      SET title = ${String(title).trim()},
          description = ${description && String(description).trim() ? String(description).trim() : null},
          image_url = ${images[0]},
          image_urls = ${images}
      WHERE id = ${itemId}
      RETURNING id, title, description, image_url, image_urls, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    // The row now points at the saved photo list; remove blobs that were
    // dropped from it only after the database update succeeded, so a failed
    // save never leaves a gallery entry pointing at deleted storage.
    await deleteGalleryBlobs(
      previousImages.filter((url) => !images.includes(url)),
    );

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating gallery item:", error);
    return NextResponse.json({ error: "Failed to update gallery item" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return NextResponse.json({ error: "Invalid gallery item id" }, { status: 400 });
    }

    // Remove the database row first. If that fails, the gallery images must
    // still exist; deleting the blobs beforehand would leave a broken entry.
    const deleted = await sql`
      DELETE FROM gallery_items WHERE id = ${itemId}
      RETURNING image_url, image_urls
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    await deleteGalleryBlobs(
      normalizeGalleryImages(deleted[0].image_urls, deleted[0].image_url),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    return NextResponse.json({ error: "Failed to delete gallery item" }, { status: 500 });
  }
}
