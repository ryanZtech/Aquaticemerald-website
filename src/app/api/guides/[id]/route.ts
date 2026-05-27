import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const rows = await sql`
      SELECT id, title, slug, body, display_order, active, created_at, updated_at
      FROM guides
      WHERE id = ${parseInt(id)}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching guide:", error);
    return NextResponse.json({ error: "Failed to fetch guide" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { title, slug, body, display_order, active } = await request.json();

    const result = await sql`
      UPDATE guides
      SET title = ${title}, slug = ${slug}, body = ${body}, display_order = ${display_order}, active = ${active}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating guide:", error);
    return NextResponse.json({ error: "Failed to update guide" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const result = await sql`
      DELETE FROM guides
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting guide:", error);
    return NextResponse.json({ error: "Failed to delete guide" }, { status: 500 });
  }
}
