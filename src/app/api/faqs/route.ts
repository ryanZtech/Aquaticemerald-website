import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const isAdmin = (await requireAdmin()) === null;
    const rows = await sql`
      SELECT id, title, slug, body, display_order, active, created_at, updated_at
      FROM faqs
      WHERE ${isAdmin} OR active = TRUE
      ORDER BY display_order ASC, created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json({ error: "Failed to fetch FAQs" }, { status: 500 });
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
    const { title, slug, body, display_order, active } = await request.json();

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!slug || !String(slug).trim()) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }
    if (!body || !String(body).trim()) {
      return NextResponse.json({ error: "Body is required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO faqs (title, slug, body, display_order, active)
      VALUES (${title}, ${slug}, ${body}, ${display_order ?? 0}, ${active ?? true})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating FAQ:", error);
    if (error?.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "An FAQ with this slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
  }
}
