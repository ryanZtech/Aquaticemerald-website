import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { del } from "@vercel/blob";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const popupId = Number(id);
    if (!Number.isInteger(popupId) || popupId < 1) {
      return NextResponse.json({ error: "Invalid promo popup id" }, { status: 400 });
    }
    const body = await request.json();
    const {
      name,
      heading,
      body_text,
      button_text,
      button_url,
      image_url,
      delay_seconds,
      active
    } = body;

    const existing = await sql`
      SELECT image_url FROM promo_popups WHERE id = ${popupId}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: "Promo popup not found" }, { status: 404 });
    }
    const previousImageUrl = String(existing[0].image_url || "");

    const result = await sql`
      UPDATE promo_popups
      SET 
        name = ${name},
        heading = ${heading},
        body_text = ${body_text || null},
        button_text = ${button_text},
        button_url = ${button_url},
        image_url = ${image_url || null},
        delay_seconds = ${delay_seconds || 3},
        active = ${active},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${popupId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Promo popup not found" }, { status: 404 });
    }

    // Only remove the replaced blob after the row no longer references it.
    const nextImageUrl = String(result[0].image_url || "");
    if (previousImageUrl && previousImageUrl !== nextImageUrl && previousImageUrl.includes("vercel-storage.com")) {
      try {
        await del(previousImageUrl);
      } catch (blobError) {
        console.error("Failed to delete replaced promo image:", blobError);
      }
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating promo popup:", error);
    return NextResponse.json({ error: "Failed to update promo popup" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const popupId = Number(id);
    if (!Number.isInteger(popupId) || popupId < 1) {
      return NextResponse.json({ error: "Invalid promo popup id" }, { status: 400 });
    }

    // Delete the row first. Deleting the blob before this succeeds would
    // leave a popup in the database pointing at a missing image if the
    // delete failed.
    const deleted = await sql`
      DELETE FROM promo_popups
      WHERE id = ${popupId}
      RETURNING image_url
    `;

    if (deleted.length === 0) {
      return NextResponse.json({ error: "Promo popup not found" }, { status: 404 });
    }

    // Blob cleanup is best-effort once the row is gone.
    if (deleted[0].image_url) {
      try {
        await del(deleted[0].image_url);
      } catch (blobError) {
        console.error("Failed to delete blob image:", blobError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promo popup:", error);
    return NextResponse.json({ error: "Failed to delete promo popup" }, { status: 500 });
  }
}
