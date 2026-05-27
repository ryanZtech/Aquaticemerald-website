import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT id, title, slug, body, display_order, active, created_at, updated_at
      FROM guides
      ORDER BY display_order ASC, created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching guides:", error);
    return NextResponse.json({ error: "Failed to fetch guides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { title, slug, body, display_order, active } = await request.json();

    const result = await sql`
      INSERT INTO guides (title, slug, body, display_order, active)
      VALUES (${title}, ${slug}, ${body}, ${display_order ?? 0}, ${active ?? true})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating guide:", error);
    return NextResponse.json({ error: "Failed to create guide" }, { status: 500 });
  }
}
