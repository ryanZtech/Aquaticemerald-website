import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeGalleryImages } from "@/lib/galleryImages";

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT id, title, description, image_url, image_urls, created_at
      FROM gallery_items
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching gallery:", error);
    return NextResponse.json({ error: "Failed to fetch gallery" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/adminAuth");
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { title, description, image_url, image_urls } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const images = normalizeGalleryImages(image_urls, image_url);
    if (images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO gallery_items (title, description, image_url, image_urls)
      VALUES (
        ${String(title).trim()},
        ${description && String(description).trim() ? String(description).trim() : null},
        ${images[0]},
        ${images}
      )
      RETURNING id, title, description, image_url, image_urls, created_at
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating gallery item:", error);
    return NextResponse.json({ error: "Failed to create gallery item" }, { status: 500 });
  }
}
