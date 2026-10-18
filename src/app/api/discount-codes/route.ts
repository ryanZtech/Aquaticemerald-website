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

    const cleanCode = typeof code === "string" ? code.trim().toUpperCase().slice(0, 60) : "";
    if (!cleanCode) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    // Must match the discount_codes_discount_type_check constraint in the
    // database, which only allows these two — anything else fails at the DB
    // with a 500 instead of a clean 400.
    const ALLOWED_TYPES = ["percentage", "free_item"];
    if (!ALLOWED_TYPES.includes(discount_type)) {
      return NextResponse.json({ error: `discount_type must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
    }
    if (discount_type === "percentage") {
      const pct = Number(discount_value);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return NextResponse.json({ error: "percentage discount_value must be > 0 and <= 100" }, { status: 400 });
      }
    }
    if (discount_type === "free_item" && !free_product_id) {
      return NextResponse.json({ error: "free_product_id is required for free_item codes" }, { status: 400 });
    }
    if (!valid_from || isNaN(Date.parse(valid_from))) {
      return NextResponse.json({ error: "valid_from must be a valid date" }, { status: 400 });
    }
    if (valid_until && isNaN(Date.parse(valid_until))) {
      return NextResponse.json({ error: "valid_until must be a valid date" }, { status: 400 });
    }
    if (max_uses != null && max_uses !== "" && (!Number.isInteger(Number(max_uses)) || Number(max_uses) < 1)) {
      return NextResponse.json({ error: "max_uses must be a positive integer" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO discount_codes (
        code, description, discount_type, discount_value,
        free_product_id, free_variant_id, valid_from, valid_until, max_uses, active
      )
      VALUES (
        ${cleanCode}, ${description || null}, ${discount_type}, ${discount_value || null},
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
