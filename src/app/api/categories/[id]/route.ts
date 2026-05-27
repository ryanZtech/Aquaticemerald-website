import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// PUT update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, imageUrl, parentId, sortOrder, active } = body;

    await sql`
      UPDATE categories
      SET name = ${name}, slug = ${slug}, description = ${description || null},
          image_url = ${imageUrl || null}, parent_id = ${parentId || null},
          sort_order = ${sortOrder || 0}, active = ${active !== false}
      WHERE id = ${parseInt(id)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

// DELETE category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;

    // Check if category has products
    const products = await sql`SELECT COUNT(*) as count FROM products WHERE category_id = ${parseInt(id)}`;
    if (products[0].count > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with products" },
        { status: 400 }
      );
    }

    await sql`DELETE FROM categories WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
