import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { buildCustomerHtml, buildSellerHtml } from "@/lib/emailTemplatesSimple";
import { requireAdmin } from "@/lib/adminAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import {
  parseStockLimitSettings,
  maxQtyForLevel,
  STOCK_LEVELS,
  STOCK_LEVEL_SETTINGS_KEYS,
} from "@/lib/stockLimits";

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
      SELECT o.id, o.customer_name, o.customer_email, o.customer_phone, o.pickup_location_id, pl.name as pickup_location_name, o.pickup_slot_at, o.status, o.subtotal, o.total, o.created_at,
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
    } = body || {};

    if (!customer_name || String(customer_name).trim().length < 2) {
      return NextResponse.json({ error: "Customer name is required and must be at least 2 characters." }, { status: 400 });
    }

    if (!Array.isArray(rawCart) || rawCart.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
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
      productId: number | null;
      variantId: number | null;
      name: string;
      variantLabel: string | undefined;
      price: number;
      qty: number;
    }> = [];

    for (const rawItem of rawCart) {
      const productId = rawItem?.productId ? Number(rawItem.productId) : null;
      const variantId = rawItem?.variantId ? Number(rawItem.variantId) : null;
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

    let subtotal = verifiedCart.reduce((sum, it) => sum + it.price * it.qty, 0);
    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    // Re-validate any promo code server-side rather than trusting the
    // client-computed discount amount.
    if (promo_code && String(promo_code).trim()) {
      const promoRows = await sql`
        SELECT dc.*,
          (SELECT COUNT(*) FROM orders WHERE promo_code = dc.code) as current_uses
        FROM discount_codes dc
        WHERE UPPER(dc.code) = UPPER(${promo_code})
          AND dc.active = TRUE
          AND dc.valid_from <= CURRENT_TIMESTAMP
          AND (dc.valid_until IS NULL OR dc.valid_until >= CURRENT_TIMESTAMP)
        LIMIT 1
      `;

      if (promoRows.length > 0) {
        const discount = promoRows[0];
        const withinUsageLimit =
          !discount.max_uses || discount.current_uses < discount.max_uses;

        if (withinUsageLimit) {
          if (discount.discount_type === "percentage") {
            discountAmount = subtotal * (Number(discount.discount_value) / 100);
          }
          appliedPromoCode = discount.code;
        }
      }
      // If the code is invalid/expired/exhausted, we simply don't apply a
      // discount rather than failing the whole order.
    }

    const total = Math.max(0, subtotal - discountAmount);
    const cart = verifiedCart;

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

    const insert = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, pickup_location_id, pickup_slot_at, notes, subtotal, total, promo_code)
      VALUES (${customer_name}, ${customer_email}, ${customer_phone}, ${resolvedLocationId}, ${pickup_slot_at || null}, ${notes || orderRef || null}, ${subtotal}, ${total}, ${appliedPromoCode})
      RETURNING id, created_at
    `;

    const orderId = insert[0]?.id;

    for (const it of cart) {
      await sql`
        INSERT INTO order_items (order_id, product_id, variant_id, snapshot_product_name, snapshot_variant_label, snapshot_unit_price, quantity)
        VALUES (${orderId}, ${it.productId}, ${it.variantId}, ${it.name}, ${it.variantLabel}, ${it.price}, ${it.qty})
      `;
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

    return NextResponse.json({ success: true, orderId });
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
