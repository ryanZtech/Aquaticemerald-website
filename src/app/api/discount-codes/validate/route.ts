import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // Rate limiting: 10 requests per minute per IP
    const ip = getClientIp(request.headers);
    
    const rateLimitResult = rateLimit(`promo-validate:${ip}`, 10, 60 * 1000);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: "Too many requests. Please try again later.",
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        }, 
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString()
          }
        }
      );
    }

    const { code, cartTotal } = await request.json();

    if (!code || !code.trim()) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT 
        dc.*,
        p.name as free_product_name,
        p.slug as free_product_slug,
        (SELECT COUNT(*) FROM orders WHERE promo_code = dc.code) as current_uses
      FROM discount_codes dc
      LEFT JOIN products p ON dc.free_product_id = p.id
      WHERE UPPER(dc.code) = UPPER(${code})
        AND dc.active = TRUE
        AND dc.valid_from <= CURRENT_TIMESTAMP
        AND (dc.valid_until IS NULL OR dc.valid_until >= CURRENT_TIMESTAMP)
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
    }

    const discount = rows[0];

    // Check max uses
    if (discount.max_uses && discount.current_uses >= discount.max_uses) {
      return NextResponse.json({ error: "Code usage limit reached" }, { status: 400 });
    }
    let discountAmount = 0;
    let freeItem = null;

    if (discount.discount_type === 'percentage') {
      discountAmount = (cartTotal * (discount.discount_value / 100));
    } else if (discount.discount_type === 'free_item') {
      freeItem = {
        productId: discount.free_product_id,
        variantId: discount.free_variant_id,
        productName: discount.free_product_name,
        productSlug: discount.free_product_slug,
      };
    }

    return NextResponse.json({
      valid: true,
      code: discount.code,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      discount_amount: discountAmount,
      free_item: freeItem,
      description: discount.description,
    }, {
      headers: {
        "X-RateLimit-Limit": rateLimitResult.limit.toString(),
        "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        "X-RateLimit-Reset": rateLimitResult.reset.toString()
      }
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    return NextResponse.json({ error: "Failed to validate code" }, { status: 500 });
  }
}
