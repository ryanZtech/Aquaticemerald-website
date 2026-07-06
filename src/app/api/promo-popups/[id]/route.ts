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
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Promo popup not found" }, { status: 404 });
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
    
    // Fetch the popup to get image_url for deletion
    const popup = await sql`
      SELECT image_url FROM promo_popups WHERE id = ${parseInt(id)}
    `;

    if (popup.length === 0) {
      return NextResponse.json({ error: "Promo popup not found" }, { status: 404 });
    }

    // Delete from Vercel Blob if image exists
    if (popup[0].image_url) {
      try {
        await del(popup[0].image_url);
      } catch (blobError) {
        console.error("Failed to delete blob image:", blobError);
        // Continue with DB deletion even if blob delete fails
      }
    }

    // Delete from database
    await sql`
      DELETE FROM promo_popups
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting promo popup:", error);
    return NextResponse.json({ error: "Failed to delete promo popup" }, { status: 500 });
  }
}
