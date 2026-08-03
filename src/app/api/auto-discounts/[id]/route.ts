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
      name,
      description,
      trigger_type,
      trigger_spend_amount,
      trigger_product_id,
      trigger_variant_id,
      effect_type,
      effect_value,
      effect_free_product_id,
      effect_free_variant_id,
      priority,
      active
    } = body;

    const result = await sql`
      UPDATE auto_discounts
      SET 
        name = ${name},
        description = ${description || null},
        trigger_type = ${trigger_type},
        trigger_spend_amount = ${trigger_spend_amount || null},
        trigger_product_id = ${trigger_product_id || null},
        trigger_variant_id = ${trigger_variant_id || null},
        effect_type = ${effect_type},
        effect_value = ${effect_value || null},
        effect_free_product_id = ${effect_free_product_id || null},
        effect_free_variant_id = ${effect_free_variant_id || null},
        priority = ${priority || 0},
        active = ${active},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Auto discount not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating auto discount:", error);
    return NextResponse.json({ error: "Failed to update auto discount" }, { status: 500 });
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
      DELETE FROM auto_discounts
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Auto discount not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting auto discount:", error);
    return NextResponse.json({ error: "Failed to delete auto discount" }, { status: 500 });
  }
}
