import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

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
    const { title, description, image_url } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!image_url || !String(image_url).trim()) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const existing = await sql`
      SELECT image_url FROM gallery_items WHERE id = ${itemId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }
    const previousImageUrl = String(existing[0].image_url || "");

    const result = await sql`
      UPDATE gallery_items
      SET title = ${String(title).trim()},
          description = ${description && String(description).trim() ? String(description).trim() : null},
          image_url = ${String(image_url).trim()}
      WHERE id = ${itemId}
      RETURNING id, title, description, image_url, created_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    // The row now points at the replacement image; remove the old blob only
    // after the database update succeeded so a failed save never leaves a
    // gallery entry pointing at deleted storage.
    const nextImageUrl = String(result[0].image_url || "");
    if (previousImageUrl && previousImageUrl !== nextImageUrl && previousImageUrl.includes("vercel-storage.com")) {
      try {
        const { del } = await import("@vercel/blob");
        await del(previousImageUrl);
      } catch (error) {
        console.error("Failed to delete replaced gallery image:", error);
      }
    }

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

    // Remove the database row first. If that fails, the gallery image must
    // still exist; deleting the blob beforehand would leave a broken entry.
    const deleted = await sql`
      DELETE FROM gallery_items WHERE id = ${itemId} RETURNING image_url
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Gallery item not found" }, { status: 404 });
    }

    // Blob cleanup is best-effort: an orphaned file is preferable to
    // reporting a failed delete after the row is already gone.
    const imageUrl = String(deleted[0].image_url || "");
    if (imageUrl.includes("vercel-storage.com")) {
      try {
        const { del } = await import("@vercel/blob");
        await del(imageUrl);
      } catch (error) {
        console.error("Failed to delete gallery image:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    return NextResponse.json({ error: "Failed to delete gallery item" }, { status: 500 });
  }
}
