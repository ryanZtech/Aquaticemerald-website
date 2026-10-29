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

    // Keep PUT validation identical to POST: an unchecked edit could store
    // a negative/oversized percentage or a free-item discount with no item,
    // and the checkout preview then disagrees with what the order applies.
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const ALLOWED_TRIGGERS = ["spend_amount", "item_in_cart", "both"];
    const ALLOWED_EFFECTS = ["fixed_amount", "percentage", "free_item"];
    if (!ALLOWED_TRIGGERS.includes(trigger_type)) {
      return NextResponse.json({ error: `trigger_type must be one of: ${ALLOWED_TRIGGERS.join(", ")}` }, { status: 400 });
    }
    if (!ALLOWED_EFFECTS.includes(effect_type)) {
      return NextResponse.json({ error: `effect_type must be one of: ${ALLOWED_EFFECTS.join(", ")}` }, { status: 400 });
    }
    if ((trigger_type === "spend_amount" || trigger_type === "both") && !(Number(trigger_spend_amount) > 0)) {
      return NextResponse.json({ error: "trigger_spend_amount must be > 0" }, { status: 400 });
    }
    if ((trigger_type === "item_in_cart" || trigger_type === "both") && !trigger_product_id) {
      return NextResponse.json({ error: "trigger_product_id is required" }, { status: 400 });
    }
    if (effect_type === "percentage" && !(Number(effect_value) > 0 && Number(effect_value) <= 100)) {
      return NextResponse.json({ error: "effect_value percentage must be > 0 and <= 100" }, { status: 400 });
    }
    if (effect_type === "fixed_amount" && !(Number(effect_value) > 0)) {
      return NextResponse.json({ error: "effect_value amount must be > 0" }, { status: 400 });
    }
    if (effect_type === "free_item" && !effect_free_product_id) {
      return NextResponse.json({ error: "effect_free_product_id is required" }, { status: 400 });
    }

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
        active = ${active ?? true},
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
