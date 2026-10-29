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

    // Same validation as POST — must match the
    // discount_codes_discount_type_check constraint, otherwise the UPDATE
    // fails at the DB with a 500, and a blank code or invalid date would be
    // saved as a permanently unusable promotion.
    const cleanCode = typeof code === "string" ? code.trim().toUpperCase().slice(0, 60) : "";
    if (!cleanCode) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }
    if (!["percentage", "free_item"].includes(discount_type)) {
      return NextResponse.json({ error: "discount_type must be one of: percentage, free_item" }, { status: 400 });
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
      UPDATE discount_codes
      SET 
        code = ${cleanCode},
        description = ${description || null},
        discount_type = ${discount_type},
        discount_value = ${discount_value || null},
        free_product_id = ${free_product_id || null},
        free_variant_id = ${free_variant_id || null},
        valid_from = ${valid_from},
        valid_until = ${valid_until || null},
        max_uses = ${max_uses || null},
        active = ${active ?? true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating discount code:", error);
    return NextResponse.json({ error: "Failed to update discount code" }, { status: 500 });
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
    const result = await sql`
      DELETE FROM discount_codes
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discount code:", error);
    return NextResponse.json({ error: "Failed to delete discount code" }, { status: 500 });
  }
}
