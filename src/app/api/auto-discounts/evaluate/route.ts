import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Public endpoint, untrusted body: coerce rather than trust. A
    // non-array cart or non-numeric total would otherwise throw mid-query.
    const cart = Array.isArray(body?.cart) ? body.cart.slice(0, 100) : [];
    const cartTotal = Number(body?.cartTotal);
    if (!Number.isFinite(cartTotal) || cartTotal < 0 || cartTotal > 1_000_000) {
      return NextResponse.json({ error: "Invalid cart total" }, { status: 400 });
    }

    // Fetch active auto-discounts ordered by priority
    //
    // NOTE: this used to alias two subqueries as `effect_free_variant_id` /
    // `effect_free_variant_label` — the *same* names as columns already
    // pulled in by `ad.*`. With duplicate column names in a Postgres result,
    // the driver keeps only the last one, so the admin's actual configured
    // free variant (`ad.effect_free_variant_id`) was always silently
    // discarded in favor of "whatever variant of that product is cheapest".
    // We now select the fallback under different names and COALESCE, so the
    // admin's explicit choice wins when set, falling back to the cheapest
    // active variant only when they didn't pick one.
    const discounts = await sql`
      SELECT 
        ad.*,
        tp.name as trigger_product_name,
        fp.name as effect_free_product_name,
        fp.slug as effect_free_product_slug,
        COALESCE(
          ad.effect_free_variant_id::text,
          (
            SELECT v.id::text
            FROM product_variants v
            WHERE v.product_id::text = fp.id::text AND v.active = TRUE
            ORDER BY v.price ASC
            LIMIT 1
          )
        ) as resolved_free_variant_id,
        COALESCE(
          (SELECT v.label FROM product_variants v WHERE v.id::text = ad.effect_free_variant_id::text AND v.active = TRUE),
          (
            SELECT v.label
            FROM product_variants v
            WHERE v.product_id = fp.id
            ORDER BY v.price ASC
            LIMIT 1
          )
        ) as resolved_free_variant_label
      FROM auto_discounts ad
      LEFT JOIN products tp ON tp.id::text = ad.trigger_product_id::text
      LEFT JOIN products fp ON fp.id::text = ad.effect_free_product_id::text
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
        triggerMet = cart.some((item: any) => String(item?.productId || "") === String(discount.trigger_product_id || ""));
      } else if (discount.trigger_type === "both") {
        const spendMet = cartTotal >= (discount.trigger_spend_amount || 0);
        const itemMet = cart.some((item: any) => String(item?.productId || "") === String(discount.trigger_product_id || ""));
        triggerMet = spendMet && itemMet;
      }

      if (triggerMet) {
        // Calculate effect
        let discountAmount = 0;
        let freeItem = null;

        if (discount.effect_type === "fixed_amount") {
          discountAmount = Math.min(cartTotal, Math.max(0, Number(discount.effect_value) || 0));
        } else if (discount.effect_type === "percentage") {
          discountAmount = Math.min(cartTotal, cartTotal * ((Number(discount.effect_value) || 0) / 100));
        } else if (discount.effect_type === "free_item" && discount.effect_free_product_id) {
          freeItem = {
            productId: discount.effect_free_product_id,
            productName: discount.effect_free_product_name,
            productSlug: discount.effect_free_product_slug,
            variantId: discount.resolved_free_variant_id,
            variantLabel: discount.resolved_free_variant_label || "Default",
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
