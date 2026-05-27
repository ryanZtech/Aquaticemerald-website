import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET all orders
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
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
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST create new order and send emails via Resend
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      orderRef,
      customer_name,
      customer_email,
      customer_phone,
      pickup_location_id,
      pickup_slot_at,
      cart,
      subtotal,
      total,
      notes,
    } = body;

    // Insert order
    const insert = await sql`
      INSERT INTO orders (customer_name, customer_email, customer_phone, pickup_location_id, pickup_slot_at, notes, subtotal, total)
      VALUES (${customer_name}, ${customer_email}, ${customer_phone}, ${pickup_location_id || null}, ${pickup_slot_at || null}, ${notes || orderRef || null}, ${subtotal}, ${total})
      RETURNING id, created_at
    `;

    const orderId = insert[0].id;

    // Insert order items
    for (const it of cart) {
      await sql`
        INSERT INTO order_items (order_id, product_id, variant_id, snapshot_product_name, snapshot_variant_label, snapshot_unit_price, quantity)
        VALUES (${orderId}, ${it.productId || null}, ${it.variantId || null}, ${it.name}, ${it.variantLabel}, ${it.price}, ${it.qty})
      `;
    }

    // Fetch seller_email from settings in database
    let sellerEmail = "ryan.zhao254@gmail.com";
    try {
      const settingsRows = await sql`SELECT key, value FROM store_settings WHERE key = 'seller_email'`;
      if (settingsRows.length > 0) {
        sellerEmail = settingsRows[0].value;
      }
    } catch (e) {
      console.error("Failed to load seller_email setting:", e);
    }

    // Send emails if Resend key present
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY && (customer_email || sellerEmail)) {
      const recipients: string[] = [];
      if (customer_email) recipients.push(customer_email);
      if (sellerEmail && !recipients.includes(sellerEmail)) {
        recipients.push(sellerEmail);
      }

      const itemsHtml = (cart || [])
        .map((i: any) => `<li>${i.qty}× ${i.name} (${i.variantLabel}) — $${(i.price * i.qty).toFixed(2)}</li>`)
        .join("");

      const pickupNameRow = pickup_location_id
        ? (await sql`SELECT name FROM pickup_locations WHERE id = ${parseInt(pickup_location_id)}`)[0]?.name
        : null;

      const html = `
        <h2>Order #${orderRef || orderId}</h2>
        <p><strong>Name:</strong> ${customer_name}</p>
        <p><strong>Email:</strong> ${customer_email}</p>
        <p><strong>Phone:</strong> ${customer_phone}</p>
        <p><strong>Pickup:</strong> ${pickupNameRow || "N/A"}</p>
        <p><strong>Pickup Slot:</strong> ${pickup_slot_at || "N/A"}</p>
        <ul>${itemsHtml}</ul>
        <p><strong>Subtotal:</strong> $${Number(subtotal).toFixed(2)}</p>
        <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>
      `;

      for (const to of recipients) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "Aquatic Emerald <no-reply@aquaticemerald.local>",
              to,
              subject: `Order Confirmation - ${orderRef || orderId}`,
              html,
            }),
          });
        } catch (e) {
          console.error("Failed to send email to", to, e);
        }
      }
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
