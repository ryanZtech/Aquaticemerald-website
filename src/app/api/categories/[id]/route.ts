import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

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
    const { name, slug, description, imageUrl, iconName, parentId, sortOrder, active } = body;

    if (!name || !String(name).trim() || !slug || !String(slug).trim()) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    }

    const result = await sql`
      UPDATE categories
      SET name = ${name}, slug = ${slug}, description = ${description || null},
          image_url = ${imageUrl || null}, icon_name = ${iconName || 'package'}, parent_id = ${parentId || null},
          sort_order = ${sortOrder || 0}, active = ${active !== false}
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating category:", error);
    if (error?.message?.includes("duplicate key")) {
      return NextResponse.json({ error: "A category with this slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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

    const products = await sql`SELECT COUNT(*)::int as count FROM products WHERE category_id = ${parseInt(id)}`;
    if (products[0].count > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with products" },
        { status: 400 }
      );
    }

    const children = await sql`SELECT COUNT(*)::int as count FROM categories WHERE parent_id = ${parseInt(id)}`;
    if (children[0].count > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with subcategories" },
        { status: 400 }
      );
    }

    const result = await sql`DELETE FROM categories WHERE id = ${parseInt(id)} RETURNING id`;
    if (result.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting category:", error);
    if (error?.code === "23503") {
      return NextResponse.json({ error: "Cannot delete this category because other records still reference it." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
