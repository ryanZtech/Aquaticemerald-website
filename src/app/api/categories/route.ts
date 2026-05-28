import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET all categories
export async function GET() {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const categories = await sql`
      SELECT id, name, slug, description, image_url, icon_name, parent_id, sort_order, active
      FROM categories
      ORDER BY sort_order, name
    `;
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      description,
      imageUrl,
      iconName,
      parentId,
      sortOrder,
      active,
    } = body;

    const result = await sql`
      INSERT INTO categories (name, slug, description, image_url, icon_name, parent_id, sort_order, active)
      VALUES (${name}, ${slug}, ${description || null}, ${imageUrl || null}, ${iconName || "package"}, ${parentId || null}, ${sortOrder || 0}, ${active !== false})
      RETURNING id, name, slug, description, image_url, icon_name, parent_id, sort_order, active
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
