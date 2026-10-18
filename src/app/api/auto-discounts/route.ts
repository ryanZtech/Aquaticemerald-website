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
        ad.*,
        tp.name as trigger_product_name,
        fp.name as effect_free_product_name
      FROM auto_discounts ad
      LEFT JOIN products tp ON ad.trigger_product_id = tp.id
      LEFT JOIN products fp ON ad.effect_free_product_id = fp.id
      ORDER BY ad.priority DESC, ad.created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching auto discounts:", error);
    return NextResponse.json({ error: "Failed to fetch auto discounts" }, { status: 500 });
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
      INSERT INTO auto_discounts (
        name, description, trigger_type, trigger_spend_amount,
        trigger_product_id, trigger_variant_id, effect_type, effect_value,
        effect_free_product_id, effect_free_variant_id, priority, active
      )
      VALUES (
        ${name}, ${description || null}, ${trigger_type},
        ${trigger_spend_amount || null}, ${trigger_product_id || null},
        ${trigger_variant_id || null}, ${effect_type}, ${effect_value || null},
        ${effect_free_product_id || null}, ${effect_free_variant_id || null},
        ${priority || 0}, ${active ?? true}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating auto discount:", error);
    return NextResponse.json({ error: "Failed to create auto discount" }, { status: 500 });
  }
}
