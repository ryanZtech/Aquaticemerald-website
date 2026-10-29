import { NextRequest, NextResponse } from "next/server";
import { sql, pool } from "@/lib/db";
import { buildCustomerHtml, buildSellerHtml } from "@/lib/emailTemplatesSimple";
import { requireAdmin } from "@/lib/adminAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { STORE_TIMEZONE } from "@/lib/pickupSlots";
import { isValidEmail, isValidPhone } from "@/lib/contactValidation";
import { createHash } from "node:crypto";
import type { PoolClient } from "@neondatabase/serverless";

const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
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
  client?: PoolClient,
): Promise<{ id: string; label: string | null; product_name: string } | null> {
  if (client) {
    const result = await client.query(
      `SELECT v.id, v.label, p.name AS product_name FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.product_id = $1 AND v.active = TRUE AND p.active = TRUE AND v.stock_level != 'none'
       ORDER BY (v.id = $2) DESC NULLS LAST, v.price ASC, v.id ASC LIMIT 1`,
      [productId, preferredVariantId],
    );
    return result.rows[0] ?? null;
  }
  if (!sql) return null;
  const rows = await sql`
    SELECT v.id, v.label, p.name AS product_name FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.product_id = ${productId} AND v.active = TRUE AND p.active = TRUE AND v.stock_level != 'none'
    ORDER BY (v.id = ${preferredVariantId}) DESC NULLS LAST, v.price ASC, v.id ASC LIMIT 1
  `;
  return rows[0] ? { id: rows[0].id, label: rows[0].label, product_name: rows[0].product_name } : null;
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
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone, o.pickup_location_id, pl.name as pickup_location_name, pl.address as pickup_location_detail, o.pickup_slot_at, o.status, o.notes, o.subtotal, o.discount_amount, o.promo_code, o.total, o.created_at,
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
      GROUP BY o.id, pl.name, pl.address
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


  let committedResult: { success: true; orderId: number | null; subtotal: number; discountAmount: number; total: number; promoCode: string | null; freeItems: string[] } | null = null;
  let orderLockClient: PoolClient | null = null;
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
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
      expected_auto_free_variant,
      turnstile_token,
    } = body || {};

    if (typeof orderRef !== "string" || !/^AE-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/.test(orderRef)) {
      return NextResponse.json({ error: "Invalid order reference. Please reload checkout." }, { status: 400 });
    }
    if (!customer_name || String(customer_name).trim().length < 2) {
      return NextResponse.json({ error: "Customer name is required and must be at least 2 characters." }, { status: 400 });
    }

    // Bound the free-text fields — they're stored verbatim and echoed into
    // confirmation emails and WhatsApp links, so an unbounded request body
    // would just become database/mail bloat.
    const cleanName = String(customer_name).trim().slice(0, 100);
    const cleanEmail = customer_email ? String(customer_email).trim().slice(0, 320) : "";
    const cleanPhone = customer_phone ? String(customer_phone).trim().slice(0, 40) : "";
    const cleanNotes = notes ? String(notes).slice(0, 2000) : "";
    const cleanPromoCode = promo_code ? String(promo_code).trim().slice(0, 60) : null;
    const cleanOrderRef = orderRef ? String(orderRef).trim().slice(0, 40) : "";
    if (typeof customer_email !== "string" || !isValidEmail(customer_email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (typeof customer_phone !== "string" || !isValidPhone(customer_phone)) {
      return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    }

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // A random reference and a hash of the submitted order make retries safe even
    // if the first response was lost after the transaction committed.
    const requestHash = createHash("sha256").update(JSON.stringify({
      orderRef, customer_name: cleanName, customer_email: cleanEmail.toLowerCase(),
      customer_phone: cleanPhone, pickup_location_id, pickup_slot_at, cart: rawCart,
      notes: cleanNotes, promo_code: cleanPromoCode,
      expected_auto_free_variant, expected_subtotal: body.subtotal,
      expected_discount: body.discount_amount, expected_total: body.total,
    })).digest("hex");
    if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    // Serialize initialization: concurrent CREATE TABLE IF NOT EXISTS can
    // still race in PostgreSQL before the table has been created.
    const setupClient = await pool.connect();
    try {
      await setupClient.query("BEGIN");
      await setupClient.query("SELECT pg_advisory_xact_lock(hashtext('order-submission-schema'))");
      await setupClient.query(`CREATE TABLE IF NOT EXISTS order_submission_keys (
        reference TEXT PRIMARY KEY, request_hash TEXT NOT NULL, result JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await setupClient.query("COMMIT");
    } catch (error) {
      await setupClient.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      setupClient.release();
    }
    // Fast path for a retry whose first response was lost: the key row is
    // permanent once its transaction commits. This lookup deliberately does
    // NOT take a pooled connection or open a transaction — Turnstile and the
    // catalog reads below must not hold a database session. The authoritative
    // re-check happens under the per-reference advisory lock before writing.
    const previous = await sql`SELECT request_hash, result FROM order_submission_keys WHERE reference = ${cleanOrderRef}`;
    if (previous.length) {
      if (previous[0].request_hash !== requestHash) return NextResponse.json({ error: "This reference was already used for a different order. Please contact the store." }, { status: 409 });
      return NextResponse.json(previous[0].result);
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

    const quantities = new Map<string, number>();
    for (const rawItem of rawCart) {
      const qty = Number(rawItem?.qty);
      if (!rawItem?.productId || !rawItem?.variantId || !Number.isSafeInteger(qty) || qty < 1) {
        return NextResponse.json({ error: "Invalid item in cart." }, { status: 400 });
      }
      const key = JSON.stringify([String(rawItem.productId), String(rawItem.variantId)]);
      quantities.set(key, (quantities.get(key) || 0) + qty);
    }

    for (const [key, qty] of quantities) {
      const [productId, variantId] = JSON.parse(key) as [string, string];
      // NOTE: products.id and product_variants.id are TEXT (slug-style) primary
      // keys, not numeric IDs — do not coerce with Number(), or every valid
      // item will be rejected as NaN.
      const variantRows = await sql`
        SELECT v.id, v.label, v.price, v.stock_level, v.product_id, p.name AS product_name
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ${variantId} AND v.product_id = ${productId}
          AND v.active = TRUE AND p.active = TRUE
        LIMIT 1
      `;

      if (variantRows.length === 0) {
        return NextResponse.json(
          { error: "One of the items in your cart is no longer available." },
          { status: 400 },
        );
      }

      const variant = variantRows[0];
      const variantPrice = Number(variant.price);
      if (!Number.isFinite(variantPrice) || variantPrice < 0) {
        return NextResponse.json({ error: "One of the items in your cart has an invalid price." }, { status: 500 });
      }
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
        price: variantPrice,
        qty,
      });
    }

    const subtotal = money(verifiedCart.reduce((sum, it) => sum + money(it.price) * it.qty, 0));

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
        LEFT JOIN products fp ON fp.id::text = ad.effect_free_product_id::text
        WHERE ad.active = TRUE
        ORDER BY ad.priority DESC
      `;

      for (const discount of autoDiscounts) {
        let triggerMet = false;
        if (discount.trigger_type === "spend_amount") {
          triggerMet = subtotal >= Math.max(0, Number(discount.trigger_spend_amount || 0));
        } else if (discount.trigger_type === "item_in_cart") {
          triggerMet = verifiedCart.some((it) => String(it.productId || "") === String(discount.trigger_product_id || "") && (!discount.trigger_variant_id || String(it.variantId) === String(discount.trigger_variant_id)));
        } else if (discount.trigger_type === "both") {
          const spendMet = subtotal >= Math.max(0, Number(discount.trigger_spend_amount || 0));
          const itemMet = verifiedCart.some((it) => String(it.productId || "") === String(discount.trigger_product_id || "") && (!discount.trigger_variant_id || String(it.variantId) === String(discount.trigger_variant_id)));
          triggerMet = spendMet && itemMet;
        }

        if (!triggerMet) continue;

        if (discount.effect_type === "fixed_amount") {
          autoDiscountAmount = Math.min(subtotal, Math.max(0, Number(discount.effect_value || 0)));
        } else if (discount.effect_type === "percentage") {
          autoDiscountAmount = Math.min(subtotal, subtotal * Math.max(0, Math.min(100, Number(discount.effect_value || 0))) / 100);
        } else if (discount.effect_type === "free_item" && discount.effect_free_product_id) {
          const variant = await findFreeVariant(discount.effect_free_product_id, discount.effect_free_variant_id);
          if (!variant) continue;
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
      console.error("Failed to evaluate auto-discounts:", e);
      return NextResponse.json({ error: "Unable to verify discounts. Please try again." }, { status: 503 });
    }

    if (expected_auto_free_variant && autoFreeItem?.variantId !== String(expected_auto_free_variant)) {
      return NextResponse.json({ error: "The promotional item is no longer available. Please review your cart." }, { status: 400 });
    }

    const pickupLocationId = pickup_location_id ? Number(pickup_location_id) : null;
    const slotStart = pickup_slot_at || null;
    const isCustomLocation = pickup_location_id == null || pickup_location_id === "";
    if (isCustomLocation && slotStart) {
      return NextResponse.json({ error: "Custom pickup locations cannot have a reserved time." }, { status: 400 });
    }
    if (!isCustomLocation && (!Number.isInteger(pickupLocationId) || !pickupLocationId || pickupLocationId < 1)) {
      return NextResponse.json({ error: "Invalid pickup location." }, { status: 400 });
    }
    if (!isCustomLocation && !slotStart) {
      return NextResponse.json({ error: "Please choose a pickup date and time." }, { status: 400 });
    }

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

    if (!isCustomLocation && (!Number.isInteger(pickupLocationId) || !slotStart || Number.isNaN(new Date(slotStart).getTime()))) {
      return NextResponse.json({ error: "Invalid pickup location or time." }, { status: 400 });
    }

    // Load all data needed for confirmations before committing the order.
    const pickupDetails = resolvedLocationId ? await sql`SELECT name, address AS detail FROM pickup_locations WHERE id = ${resolvedLocationId}` : [];

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
    // Take the lock only after Turnstile and every catalog read. Holding an
    // open transaction across those (especially the external siteverify
    // call) would tie up a pool connection for the whole checkout and can
    // exhaust the pool under concurrent orders.
    const client = await pool.connect();
    orderLockClient = client;
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`order:${cleanOrderRef}`]);
    let orderId: number | null = null;
    let discountAmount = autoDiscountAmount;
    let appliedPromoCode: string | null = null;
    let promoFreeItem: OrderLineItem | null = null;

    try {
      const prior = await client.query("SELECT request_hash, result FROM order_submission_keys WHERE reference = $1", [cleanOrderRef]);
      if (prior.rows.length) {
        await client.query("ROLLBACK");
        if (prior.rows[0].request_hash !== requestHash) return NextResponse.json({ error: "This reference was already used for a different order. Please contact the store." }, { status: 409 });
        return NextResponse.json(prior.rows[0].result);
      }

      if (!isCustomLocation) {
        const rules = await client.query(
          `SELECT r.max_pickups_per_slot
           FROM weekly_availability_rules r
           JOIN pickup_locations l ON l.id = r.pickup_location_id AND l.active = TRUE
           WHERE r.pickup_location_id = $1 AND r.active = TRUE
             AND $2::timestamptz > CURRENT_TIMESTAMP
             AND r.weekday = EXTRACT(DOW FROM $2::timestamptz AT TIME ZONE 'Australia/Sydney')
             AND ($2::timestamptz AT TIME ZONE 'Australia/Sydney')::time >= r.start_time
             AND ($2::timestamptz AT TIME ZONE 'Australia/Sydney')::time + make_interval(mins => r.slot_duration_minutes) <= r.end_time
             AND EXTRACT(SECOND FROM ($2::timestamptz AT TIME ZONE 'Australia/Sydney')::time) = 0
             AND mod(EXTRACT(EPOCH FROM (($2::timestamptz AT TIME ZONE 'Australia/Sydney')::time - r.start_time))::integer, NULLIF(r.slot_duration_minutes * 60, 0)) = 0
             AND r.slot_duration_minutes > 0 AND r.max_pickups_per_slot > 0
           ORDER BY r.id LIMIT 1`,
          [resolvedLocationId, slotStart],
        );
        if (!rules.rows.length) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "This pickup time is not available. Please choose another time." }, { status: 400 });
        }
        await client.query(
          `INSERT INTO slot_reservations (pickup_location_id, slot_at, current_count, max_capacity, is_blocked)
           VALUES ($1, $2, 0, $3, FALSE) ON CONFLICT (pickup_location_id, slot_at) DO NOTHING`,
          [resolvedLocationId, slotStart, rules.rows[0].max_pickups_per_slot],
        );
        await client.query("SELECT id FROM slot_reservations WHERE pickup_location_id = $1 AND slot_at = $2 FOR UPDATE", [resolvedLocationId, slotStart]);
        const reservation = await client.query(
          `UPDATE slot_reservations r SET current_count = GREATEST(r.current_count,
             (SELECT COUNT(*) FROM orders o WHERE o.pickup_location_id = $1 AND o.pickup_slot_at = $2 AND o.status != 'cancelled')) + 1,
             max_capacity = $3
           WHERE r.pickup_location_id = $1 AND r.slot_at = $2 AND NOT r.is_blocked
             AND GREATEST(r.current_count, (SELECT COUNT(*) FROM orders o WHERE o.pickup_location_id = $1 AND o.pickup_slot_at = $2 AND o.status != 'cancelled')) < $3
           RETURNING r.id`,
          [resolvedLocationId, slotStart, rules.rows[0].max_pickups_per_slot],
        );
        if (!reservation.rows.length) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "This time slot is fully booked. Please choose another time." }, { status: 400 });
        }
      }

      if (cleanPromoCode) {
        const promoRows = await client.query(
          `SELECT * FROM discount_codes
           WHERE UPPER(code) = UPPER($1)
             AND active = TRUE
             AND valid_from <= CURRENT_TIMESTAMP
             AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
           LIMIT 1
           FOR UPDATE`,
          [cleanPromoCode],
        );

        if (promoRows.rows.length > 0) {
          const discount = promoRows.rows[0];
          const usesResult = await client.query(
            `SELECT COUNT(*) FROM orders WHERE promo_code = $1`,
            [discount.code],
          );
          const currentUses = parseInt(usesResult.rows[0].count, 10);
          const withinUsageLimit = discount.max_uses == null || currentUses < Number(discount.max_uses);

          if (withinUsageLimit) {
            if (discount.discount_type === "percentage") {
              const pct = Math.max(0, Math.min(100, Number(discount.discount_value) || 0));
              discountAmount += Math.min(subtotal, (subtotal * pct) / 100);
            } else if (discount.discount_type === "fixed_amount") {
              discountAmount += Math.min(subtotal, Math.max(0, Number(discount.discount_value) || 0));
            } else if (discount.discount_type === "free_item" && discount.free_product_id) {
              const variant = await findFreeVariant(discount.free_product_id, discount.free_variant_id, client);
              if (!variant) {
                await client.query("ROLLBACK");
                return NextResponse.json({ error: "This promotional item is currently unavailable." }, { status: 400 });
              }
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
        }
        if (!appliedPromoCode) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "This promo code is invalid, expired, or exhausted. Please remove it or try another." }, { status: 400 });
        }
      }

      discountAmount = Math.min(subtotal, money(discountAmount));
      const total = money(Math.max(0, subtotal - discountAmount));
      const clientPricesMatch = rawCart.every((item: any) => {
        const verified = verifiedCart.find((v) => v.productId === String(item.productId) && v.variantId === String(item.variantId));
        return verified && Number.isFinite(Number(item.price)) && money(Number(item.price)) === money(verified.price);
      });
      if (!clientPricesMatch || typeof body.subtotal !== "number" || typeof body.discount_amount !== "number" || typeof body.total !== "number" || !Number.isFinite(body.subtotal) || !Number.isFinite(body.discount_amount) || !Number.isFinite(body.total) ||
          money(Number(body.subtotal)) !== subtotal || money(Number(body.discount_amount)) !== discountAmount || money(Number(body.total)) !== total) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Prices or discounts have changed. Please review the updated total and confirm again.", quote: { subtotal, discountAmount, total, items: verifiedCart.map(({ productId, variantId, price }) => ({ productId, variantId, price })) } }, { status: 409 });
      }
      if (total < 5) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Minimum order is $5.00. Please add more items." }, { status: 400 });
      }
      const finalItems: OrderLineItem[] = [...verifiedCart];
      if (autoFreeItem) finalItems.push(autoFreeItem);
      // Don't give the same free item away twice if both a promo code and
      // an auto-discount happen to reward the exact same product+variant.
      if (promoFreeItem && !(autoFreeItem && autoFreeItem.productId === promoFreeItem.productId && autoFreeItem.variantId === promoFreeItem.variantId)) {
        finalItems.push(promoFreeItem);
      }

      for (const freeItem of finalItems.filter((item) => item.price === 0)) {
        const rows = await client.query("SELECT stock_level FROM product_variants WHERE id = $1 AND active = TRUE", [freeItem.variantId]);
        const max = rows.rows.length ? maxQtyForLevel(rows.rows[0].stock_level, stockLimits) : 0;
        const totalQty = finalItems.filter((item) => item.variantId === freeItem.variantId).reduce((sum, item) => sum + item.qty, 0);
        if (totalQty > max) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "A promotional item exceeds the available order limit. Please review your cart." }, { status: 400 });
        }
      }

      const insertResult = await client.query(
        `INSERT INTO orders (customer_name, customer_email, customer_phone, pickup_location_id, pickup_slot_at, notes, subtotal, discount_amount, total, promo_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, created_at`,
        [
          cleanName,
          cleanEmail,
          cleanPhone,
          resolvedLocationId,
          pickup_slot_at || null,
          [cleanOrderRef, cleanNotes].filter(Boolean).join("\n") || null,
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

      const result = {
        success: true as const, orderId, subtotal, discountAmount, total,
        promoCode: appliedPromoCode,
        freeItems: finalItems.filter((it) => it.price === 0).map((it) => it.name),
      };
      await client.query("INSERT INTO order_submission_keys (reference, request_hash, result) VALUES ($1, $2, $3::jsonb)", [cleanOrderRef, requestHash, JSON.stringify(result)]);
      await client.query("COMMIT");
      committedResult = result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }

    orderLockClient.release();
    orderLockClient = null;

    const total = money(Math.max(0, subtotal - discountAmount));
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

    const cleanCustomerPhone = cleanPhone.replace(/\D/g, '');
    const waCustomerPhone = cleanCustomerPhone.startsWith('0') && cleanCustomerPhone.length > 1 ? '61' + cleanCustomerPhone.substring(1) : cleanCustomerPhone;
    const customerWaLink = waCustomerPhone ? `https://wa.me/${waCustomerPhone}?text=${encodeURIComponent(`Hi ${cleanName}, this is Aquatic Emerald regarding your order #${cleanOrderRef || orderId}!`)}` : '';
    const sellerWaLink = sellerWhatsApp ? `https://wa.me/${sellerWhatsApp}` : '';

    const currentYear = new Date().getFullYear();
    const pickupName = isCustomLocation ? 'Custom Location (to be arranged)' : (pickupDetails[0]?.name || 'N/A');
    const pickupDetail = isCustomLocation ? 'Location and time will be negotiated via WhatsApp' : (pickupDetails[0]?.detail || '');
    const pickupDateObj = pickup_slot_at ? new Date(pickup_slot_at) : null;
    const formattedPickupDate = isCustomLocation ? 'To be arranged via WhatsApp' : (pickupDateObj
      ? pickupDateObj.toLocaleDateString('en-AU', { timeZone: STORE_TIMEZONE, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : 'N/A');
    const formattedPickupTime = isCustomLocation ? '' : (pickupDateObj
      ? pickupDateObj.toLocaleTimeString('en-AU', { timeZone: STORE_TIMEZONE, hour: 'numeric', minute: '2-digit', hour12: true })
      : 'N/A');

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const fromEmail = process.env.EMAIL_FROM || 'Aquatic Emerald <orders@aquaticemerald.com>';

      if (cleanEmail) {
        const customerHtml = buildCustomerHtml({
          customer_name: cleanName,
          customer_email: cleanEmail,
          customer_phone: cleanPhone,
          orderRef: cleanOrderRef,
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
              to: cleanEmail,
              subject: `Order Confirmation - ${cleanOrderRef || orderId}`,
              html: customerHtml,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to send customer email:', errorData);
          }
        } catch (e) {
          console.error('Failed to send email to customer:', cleanEmail, e);
        }
      }

      if (sellerEmail) {
        const sellerHtml = buildSellerHtml({
          customer_name: cleanName,
          customer_email: cleanEmail,
          customer_phone: cleanPhone,
          orderRef: cleanOrderRef,
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
              subject: `NEW ORDER RECEIVED - ${cleanOrderRef || orderId}`,
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
    console.error(committedResult ? "Order committed, but confirmation failed:" : "Error creating order:", error);
    if (committedResult) return NextResponse.json(committedResult);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  } finally {
    if (orderLockClient) {
      await orderLockClient.query("ROLLBACK").catch(() => {});
      orderLockClient.release();
    }
  }
}
