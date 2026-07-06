import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { requireAdmin } = await import("@/lib/adminAuth");
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT 
        dc.*,
        p.name as free_product_name,
        (SELECT COUNT(*) FROM orders WHERE promo_code = dc.code) as usage_count
      FROM discount_codes dc
      LEFT JOIN products p ON dc.free_product_id = p.id
      ORDER BY dc.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching discount codes:", error);
    return NextResponse.json({ error: "Failed to fetch discount codes" }, { status: 500 });
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
    const body = await request.json();
    const {
      code,
      description,
      discount_type,
      discount_value,
      free_product_id,
      free_variant_id,
      valid_from,
      valid_until,
      max_uses,
      active
    } = body;

    const result = await sql`
      INSERT INTO discount_codes (
        code, description, discount_type, discount_value,
        free_product_id, free_variant_id, valid_from, valid_until, max_uses, active
      )
      VALUES (
        ${code}, ${description || null}, ${discount_type}, ${discount_value || null},
        ${free_product_id || null}, ${free_variant_id || null},
        ${valid_from}, ${valid_until || null}, ${max_uses || null}, ${active ?? true}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating discount code:", error);
    if (error?.message?.includes('duplicate key')) {
      return NextResponse.json({ error: "Code already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create discount code" }, { status: 500 });
  }
}
