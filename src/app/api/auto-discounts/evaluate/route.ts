import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { cart, cartTotal } = await request.json();

    // Fetch active auto-discounts ordered by priority
    const discounts = await sql`
      SELECT 
        ad.*,
        tp.name as trigger_product_name,
        fp.name as effect_free_product_name,
        fp.slug as effect_free_product_slug,
        (
          SELECT v.id
          FROM product_variants v
          WHERE v.product_id = fp.id
          ORDER BY v.price ASC
          LIMIT 1
        ) as effect_free_variant_id,
        (
          SELECT v.label
          FROM product_variants v
          WHERE v.product_id = fp.id
          ORDER BY v.price ASC
          LIMIT 1
        ) as effect_free_variant_label
      FROM auto_discounts ad
      LEFT JOIN products tp ON ad.trigger_product_id = tp.id
      LEFT JOIN products fp ON ad.effect_free_product_id = fp.id
      WHERE ad.active = TRUE
      ORDER BY ad.priority DESC
    `;

    if (discounts.length === 0) {
      return NextResponse.json({ applicable: false });
    }

    // Check each discount (take highest priority that matches)
    for (const discount of discounts) {
      let triggerMet = false;

      // Check trigger conditions
      if (discount.trigger_type === "spend_amount") {
        triggerMet = cartTotal >= (discount.trigger_spend_amount || 0);
      } else if (discount.trigger_type === "item_in_cart") {
        triggerMet = cart.some((item: any) => item.productId === discount.trigger_product_id);
      } else if (discount.trigger_type === "both") {
        const spendMet = cartTotal >= (discount.trigger_spend_amount || 0);
        const itemMet = cart.some((item: any) => item.productId === discount.trigger_product_id);
        triggerMet = spendMet && itemMet;
      }

      if (triggerMet) {
        // Calculate effect
        let discountAmount = 0;
        let freeItem = null;

        if (discount.effect_type === "fixed_amount") {
          discountAmount = discount.effect_value || 0;
        } else if (discount.effect_type === "percentage") {
          discountAmount = cartTotal * ((discount.effect_value || 0) / 100);
        } else if (discount.effect_type === "free_item" && discount.effect_free_product_id) {
          freeItem = {
            productId: discount.effect_free_product_id,
            productName: discount.effect_free_product_name,
            productSlug: discount.effect_free_product_slug,
            variantId: discount.effect_free_variant_id,
            variantLabel: discount.effect_free_variant_label || "Default",
          };
        }

        return NextResponse.json({
          applicable: true,
          discount: {
            id: discount.id,
            name: discount.name,
            description: discount.description,
            effect_type: discount.effect_type,
            discount_amount: discountAmount,
            free_item: freeItem,
          },
        });
      }
    }

    return NextResponse.json({ applicable: false });
  } catch (error) {
    console.error("Error evaluating auto discounts:", error);
    return NextResponse.json({ error: "Failed to evaluate discounts" }, { status: 500 });
  }
}
