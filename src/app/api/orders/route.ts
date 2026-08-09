import { NextRequest, NextResponse } from "next/server";
import { sql, pool } from "@/lib/db";
import { buildCustomerHtml, buildSellerHtml } from "@/lib/emailTemplatesSimple";
import { requireAdmin } from "@/lib/adminAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  parseStockLimitSettings,
  maxQtyForLevel,
  STOCK_LEVELS,
  STOCK_LEVEL_SETTINGS_KEYS,
} from "@/lib/stockLimits";

interface OrderLineItem {
  productId: string | null;
  variantId: string | null;
  name: string;
  variantLabel: string | undefined;
  price: number;
  qty: number;
}

/** Look up a single variant + its parent product, for validating a free-item reward. */
async function findFreeVariant(
  productId: string,
  preferredVariantId: string | null,
): Promise<{ id: string; label: string | null; product_name: string } | null> {
  if (!sql) return null;
  if (preferredVariantId) {
    const rows = await sql`
      SELECT v.id, v.label, v.stock_level, p.name AS product_name
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.id = ${preferredVariantId} AND v.product_id = ${productId}
      LIMIT 1
    `;
    if (rows.length > 0 && rows[0].stock_level !== "none") {
      return { id: rows[0].id, label: rows[0].label, product_name: rows[0].product_name };
    }
  }
  // Fall back to the cheapest in-stock variant of the product.
  const fallbackRows = await sql`
    SELECT v.id, v.label, v.stock_level, p.name AS product_name
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.product_id = ${productId} AND v.stock_level != 'none'
    ORDER BY v.price ASC
    LIMIT 1
  `;
  if (fallbackRows.length === 0) return null;
  return { id: fallbackRows[0].id, label: fallbackRows[0].label, product_name: fallbackRows[0].product_name };
}

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const rows = await sql`
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone, o.pickup_location_id, pl.name as pickup_location_name, o.pickup_slot_at, o.status, o.subtotal, o.discount_amount, o.promo_code, o.total, o.created_at,
        coalesce(
          json_agg(
            json_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'variant_id', oi.variant_id,
              'snapshot_product_name', oi.snapshot_product_name,
              'snapshot_variant_label', oi.snapshot_variant_label,
              'snapshot_unit_price', oi.snapshot_unit_price,
              'quantity', oi.quantity
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN pickup_locations pl ON pl.id = o.pickup_location_id
      GROUP BY o.id, pl.name
      ORDER BY o.created_at DESC
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!sql) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  // Basic abuse protection: 5 order attempts per minute per IP.
  const ip = getClientIp(request.headers);
  const orderRateLimit = rateLimit(`create-order:${ip}`, 5, 60 * 1000);
  if (!orderRateLimit.success) {
    return NextResponse.json(
      { error: "Too many order attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  let reservedSlot = false;
  let reservedLocationId: number | null = null;
  let reservedSlotAt: string | null = null;

  try {
    const body = await request.json();
    const {
      orderRef,
      customer_name,
      customer_email,
      customer_phone,
      pickup_location_id,
      pickup_slot_at,
      cart: rawCart = [],
      notes,
      promo_code,
      turnstile_token,
    } = body || {};

    if (!customer_name || String(customer_name).trim().length < 2) {
      return NextResponse.json({ error: "Customer name is required and must be at least 2 characters." }, { status: 400 });
    }

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // Same rule as everywhere else Turnstile is used in this app: verify
    // server-side, never trust the client's own claim that the widget
    // succeeded. This runs after the cheap validation above (so a
    // malformed request fails fast without spending a siteverify call) but
    // before any database writes.
    const turnstileResult = await verifyTurnstileToken(turnstile_token, ip);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: "Verification failed. Please complete the check again and resubmit." },
        { status: 400 },
      );
    }

    // --- SECURITY: never trust client-supplied prices, subtotal, or total. ---
    // Re-fetch each cart line's real price/name/stock from the database and
    // recompute the subtotal server-side. This prevents a modified client
    // (or a direct API call) from placing an order at an arbitrary price.
    const stockSettingKeys = STOCK_LEVELS.map((level) => STOCK_LEVEL_SETTINGS_KEYS[level]);
    const stockSettingsRows = await sql`
      SELECT key, value FROM store_settings
      WHERE key = ANY(${stockSettingKeys})
    `;
    const stockLimitSettings = Object.fromEntries(
      stockSettingsRows.map((r: Record<string, any>) => [r.key, r.value]),
    );
    const stockLimits = parseStockLimitSettings(stockLimitSettings);

    const verifiedCart: Array<{
      productId: string | null;
      variantId: string | null;
      name: string;
      variantLabel: string | undefined;
      price: number;
      qty: number;
    }> = [];

    for (const rawItem of rawCart) {
      // NOTE: products.id and product_variants.id are TEXT (slug-style) primary
      // keys, not numeric IDs — do not coerce with Number(), or every valid
      // item will be rejected as NaN.
      const productId = rawItem?.productId ? String(rawItem.productId) : null;
      const variantId = rawItem?.variantId ? String(rawItem.variantId) : null;
      const qty = Math.max(1, Math.floor(Number(rawItem?.qty) || 0));

      if (!productId || !variantId || qty < 1) {
        return NextResponse.json({ error: "Invalid item in cart." }, { status: 400 });
      }

      const variantRows = await sql`
        SELECT v.id, v.label, v.price, v.stock_level, v.product_id, p.name AS product_name
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ${variantId} AND v.product_id = ${productId}
        LIMIT 1
      `;

      if (variantRows.length === 0) {
        return NextResponse.json(
          { error: "One of the items in your cart is no longer available." },
          { status: 400 },
        );
      }

      const variant = variantRows[0];
      const maxQty = maxQtyForLevel(variant.stock_level, stockLimits);

      if (maxQty <= 0) {
        return NextResponse.json(
          { error: `${variant.product_name} is currently out of stock.` },
          { status: 400 },
        );
      }

      if (qty > maxQty) {
        return NextResponse.json(
          { error: `Only ${maxQty} of ${variant.product_name} (${variant.label}) can be ordered right now.` },
          { status: 400 },
        );
      }

      verifiedCart.push({
        productId,
        variantId,
        name: variant.product_name,
        variantLabel: variant.label ?? undefined,
        price: Number(variant.price),
        qty,
      });
    }

    const subtotal = verifiedCart.reduce((sum, it) => sum + it.price * it.qty, 0);

    // --- Auto-discounts (e.g. "spend $50 get $10 off", "buy X get Y free") ---
    // These were previously evaluated only for display on the cart page
    // (/api/auto-discounts/evaluate) and never actually applied when the
    // order was placed — customers would see a discount or a free item
    // promised, then get charged full price with nothing free. Evaluate the
    // same rules here, server-side, against the *verified* cart/subtotal, so
    // whatever the cart page promised is what the order actually reflects.
    let autoDiscountAmount = 0;
    let autoFreeItem: OrderLineItem | null = null;
    try {
      const autoDiscounts = await sql`
        SELECT ad.*, fp.name AS effect_free_product_name
        FROM auto_discounts ad
        LEFT JOIN products fp ON ad.effect_free_product_id = fp.id
        WHERE ad.active = TRUE
        ORDER BY ad.priority DESC
      `;

      for (const discount of autoDiscounts) {
        let triggerMet = false;
        if (discount.trigger_type === "spend_amount") {
          triggerMet = subtotal >= Number(discount.trigger_spend_amount || 0);
        } else if (discount.trigger_type === "item_in_cart") {
          triggerMet = verifiedCart.some((it) => it.productId === discount.trigger_product_id);
        } else if (discount.trigger_type === "both") {
          const spendMet = subtotal >= Number(discount.trigger_spend_amount || 0);
          const itemMet = verifiedCart.some((it) => it.productId === discount.trigger_product_id);
          triggerMet = spendMet && itemMet;
        }

        if (!triggerMet) continue;

        if (discount.effect_type === "fixed_amount") {
          autoDiscountAmount = Number(discount.effect_value || 0);
        } else if (discount.effect_type === "percentage") {
          autoDiscountAmount = subtotal * (Number(discount.effect_value || 0) / 100);
        } else if (discount.effect_type === "free_item" && discount.effect_free_product_id) {
          const variant = await findFreeVariant(discount.effect_free_product_id, discount.effect_free_variant_id);
          if (variant) {
            autoFreeItem = {
              productId: discount.effect_free_product_id,
              variantId: variant.id,
              name: `${variant.product_name} (Free — ${discount.name})`,
              variantLabel: variant.label ?? undefined,
              price: 0,
              qty: 1,
            };
          }
        }
        break; // highest-priority matching discount wins
      }
    } catch (e) {
      // An auto-discount misconfiguration shouldn't block checkout.
      console.error("Failed to evaluate auto-discounts:", e);
    }

    const pickupLocationId = pickup_location_id ? Number(pickup_location_id) : null;
    const slotStart = pickup_slot_at || null;
    const isCustomLocation = !pickupLocationId || (notes && String(notes).includes('Custom location'));

    // If custom location, resolve it to the 'Custom' pickup_location entry in DB
    let resolvedLocationId: number | null = pickupLocationId;
    if (isCustomLocation && !pickupLocationId) {
      try {
        const customLoc = await sql`SELECT id FROM pickup_locations WHERE name = 'Custom' LIMIT 1`;
        resolvedLocationId = customLoc[0]?.id ?? null;
      } catch (e) {
        console.error('Failed to resolve custom location id:', e);
      }
    }

    if (resolvedLocationId && slotStart) {
      const dayOfWeek = new Date(slotStart).getDay();
      const ruleRows = await sql`
        SELECT max_pickups_per_slot FROM weekly_availability_rules
        WHERE pickup_location_id = ${resolvedLocationId}
          AND weekday = ${dayOfWeek}
          AND active = TRUE
        LIMIT 1
      `;
      const maxPickups = Math.max(1, Number(ruleRows[0]?.max_pickups_per_slot || 1));

      const reservationRows = await sql`
        INSERT INTO slot_reservations (pickup_location_id, slot_at, current_count, max_capacity, is_blocked)
        VALUES (${resolvedLocationId}, ${slotStart}, 1, ${maxPickups}, FALSE)
        ON CONFLICT (pickup_location_id, slot_at)
        DO UPDATE
        SET current_count = slot_reservations.current_count + 1,
            max_capacity = EXCLUDED.max_capacity
        WHERE NOT slot_reservations.is_blocked
          AND slot_reservations.current_count < slot_reservations.max_capacity
        RETURNING id, current_count, max_capacity
      `;

      if (!reservationRows || reservationRows.length === 0) {
        return NextResponse.json({ error: "This time slot is fully booked. Please choose another time." }, { status: 400 });
      }

      reservedSlot = true;
      reservedLocationId = resolvedLocationId;
      reservedSlotAt = slotStart;
    }

    if (!pool) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // From here on, everything happens inside one real, interactive
    // Postgres transaction (BEGIN/COMMIT/ROLLBACK) rather than as several
    // independent HTTP requests. Two reasons:
    //
    // 1. Order + line items must be all-or-nothing. Previously each
    //    `order_items` INSERT was its own request; if one failed partway
    //    through the loop (a bad value, a dropped connection, etc.) the
    //    order row and whichever items *had* already been inserted were
    //    left behind — a corrupt, partial order with no rollback.
    //
    // 2. Promo code redemption must be race-free. Previously "how many
    //    times has this code been used" was read, checked against
    //    max_uses, and only *then* — in a later, separate request — did the
    //    order (which counts as a use) get written. Two checkouts redeeming
    //    the same code at the same moment could both pass the check before
    //    either order exists, letting a code be used more than its max_uses
    //    allows. `SELECT ... FOR UPDATE` below locks the discount code's
    //    row so a second concurrent redemption blocks until the first
    //    transaction commits (or rolls back), then re-checks the count.
    const client = await pool.connect();
    let orderId: number | null = null;
    let discountAmount = autoDiscountAmount;
    let appliedPromoCode: string | null = null;
    let promoFreeItem: OrderLineItem | null = null;

    try {
      await client.query("BEGIN");

      if (promo_code && String(promo_code).trim()) {
        const promoRows = await client.query(
          `SELECT * FROM discount_codes
           WHERE UPPER(code) = UPPER($1)
             AND active = TRUE
             AND valid_from <= CURRENT_TIMESTAMP
             AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
           LIMIT 1
           FOR UPDATE`,
          [promo_code],
        );

        if (promoRows.rows.length > 0) {
          const discount = promoRows.rows[0];
          const usesResult = await client.query(
            `SELECT COUNT(*) FROM orders WHERE promo_code = $1`,
            [discount.code],
          );
          const currentUses = parseInt(usesResult.rows[0].count, 10);
          const withinUsageLimit = !discount.max_uses || currentUses < discount.max_uses;

          if (withinUsageLimit) {
            if (discount.discount_type === "percentage") {
              discountAmount += subtotal * (Number(discount.discount_value) / 100);
            } else if (discount.discount_type === "free_item" && discount.free_product_id) {
              const variant = await findFreeVariant(discount.free_product_id, discount.free_variant_id);
              if (variant) {
                promoFreeItem = {
                  productId: discount.free_product_id,
                  variantId: variant.id,
                  name: `${variant.product_name} (Free — ${discount.code})`,
                  variantLabel: variant.label ?? undefined,
                  price: 0,
                  qty: 1,
                };
              }
            }
            appliedPromoCode = discount.code;
          }
          // If the code is invalid/expired/exhausted, we simply don't apply
          // a discount rather than failing the whole order.
        }
      }

      const total = Math.max(0, subtotal - discountAmount);
      const finalItems: OrderLineItem[] = [...verifiedCart];
      if (autoFreeItem) finalItems.push(autoFreeItem);
      // Don't give the same free item away twice if both a promo code and
      // an auto-discount happen to reward the exact same product+variant.
      if (promoFreeItem && !(autoFreeItem && autoFreeItem.productId === promoFreeItem.productId && autoFreeItem.variantId === promoFreeItem.variantId)) {
        finalItems.push(promoFreeItem);
      }

      const insertResult = await client.query(
        `INSERT INTO orders (customer_name, customer_email, customer_phone, pickup_location_id, pickup_slot_at, notes, subtotal, discount_amount, total, promo_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, created_at`,
        [
          customer_name,
          customer_email,
          customer_phone,
          resolvedLocationId,
          pickup_slot_at || null,
          notes || orderRef || null,
          subtotal,
          discountAmount,
          total,
          appliedPromoCode,
        ],
      );
      orderId = insertResult.rows[0].id;

      for (const it of finalItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, variant_id, snapshot_product_name, snapshot_variant_label, snapshot_unit_price, quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [orderId, it.productId, it.variantId, it.name, it.variantLabel, it.price, it.qty],
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    const total = Math.max(0, subtotal - discountAmount);
    const cart: OrderLineItem[] = [...verifiedCart];
    if (autoFreeItem) cart.push(autoFreeItem);
    if (promoFreeItem && !(autoFreeItem && autoFreeItem.productId === promoFreeItem.productId && autoFreeItem.variantId === promoFreeItem.variantId)) {
      cart.push(promoFreeItem);
    }

    let sellerEmail: string | null = null;
    
    let sellerWhatsApp: string = process.env.SELLER_WHATSAPP || '';
    try {
      const settingsRows = await sql`SELECT key, value FROM store_settings WHERE key IN ('seller_email', 'seller_whatsapp')`;
      for (const row of settingsRows) {
        if (row.key === 'seller_email') sellerEmail = row.value;
        if (row.key === 'seller_whatsapp') sellerWhatsApp = String(row.value || '').replace(/\D/g, '');
      }
    } catch (e) {
      console.error('Failed to load seller settings:', e);
    }
    if (sellerWhatsApp && sellerWhatsApp.startsWith('0')) sellerWhatsApp = '61' + sellerWhatsApp.substring(1);

    const cleanCustomerPhone = String(customer_phone || '').replace(/\D/g, '');
    const waCustomerPhone = cleanCustomerPhone.startsWith('0') && cleanCustomerPhone.length > 1 ? '61' + cleanCustomerPhone.substring(1) : cleanCustomerPhone;
    const customerWaLink = waCustomerPhone ? `https://wa.me/${waCustomerPhone}?text=${encodeURIComponent(`Hi ${customer_name}, this is Aquatic Emerald regarding your order #${orderRef || orderId}!`)}` : '';
    const sellerWaLink = sellerWhatsApp ? `https://wa.me/${sellerWhatsApp}` : '';

    const currentYear = new Date().getFullYear();
    const pickupDetails = resolvedLocationId ? await sql`SELECT name, address AS detail FROM pickup_locations WHERE id = ${resolvedLocationId}` : [];
    const pickupName = isCustomLocation ? 'Custom Location (to be arranged)' : (pickupDetails[0]?.name || 'N/A');
    const pickupDetail = isCustomLocation ? 'Location and time will be negotiated via WhatsApp' : (pickupDetails[0]?.detail || '');
    const pickupDateObj = pickup_slot_at ? new Date(pickup_slot_at) : null;
    const formattedPickupDate = isCustomLocation ? 'To be arranged via WhatsApp' : (pickupDateObj
      ? pickupDateObj.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A');
    const formattedPickupTime = isCustomLocation ? '' : (pickupDateObj
      ? pickupDateObj.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
      : 'N/A');

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const fromEmail = process.env.EMAIL_FROM || 'Aquatic Emerald <orders@aquaticemerald.com>';

      if (customer_email) {
        const customerHtml = buildCustomerHtml({
          customer_name,
          customer_email,
          customer_phone,
          orderRef,
          orderId,
          cart,
          subtotal,
          total,
          pickupName,
          pickupDetail,
          formattedPickupDate,
          formattedPickupTime,
          sellerWaLink,
          currentYear,
        });

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: customer_email,
              subject: `Order Confirmation - ${orderRef || orderId}`,
              html: customerHtml,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send customer email:', errorData);
          }
        } catch (e) {
          console.error('Failed to send email to customer:', customer_email, e);
        }
      }

      if (sellerEmail) {
        const sellerHtml = buildSellerHtml({
          customer_name,
          customer_email,
          customer_phone,
          orderRef,
          orderId,
          cart,
          subtotal,
          total,
          pickupName,
          pickupDetail,
          formattedPickupDate,
          formattedPickupTime,
          customerWaLink,
          currentYear,
        });

        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: sellerEmail,
              subject: `NEW ORDER RECEIVED - ${orderRef || orderId}`,
              html: sellerHtml,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send seller email:', errorData);
          }
        } catch (e) {
          console.error('Failed to send email to seller:', sellerEmail, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      subtotal,
      discountAmount,
      total,
      promoCode: appliedPromoCode,
      freeItems: cart.filter((it) => it.price === 0).map((it) => it.name),
    });
  } catch (error) {
    console.error("Error creating order:", error);
    if (reservedSlot && reservedLocationId && reservedSlotAt) {
      try {
        await sql`
          UPDATE slot_reservations
          SET current_count = GREATEST(current_count - 1, 0)
          WHERE pickup_location_id = ${reservedLocationId}
            AND slot_at = ${reservedSlotAt}
        `;
      } catch (releaseError) {
        console.error("Failed to release slot reservation after order error:", releaseError);
      }
    }
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
