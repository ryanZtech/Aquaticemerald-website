import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    await sql`
      UPDATE orders
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${parseInt(id)}
    `;

    // If order is finalised or picked_up, send notification emails
    const sendStatuses = ["finalised", "picked_up", "completed"];
    if (sendStatuses.includes((status || '').toString())) {
      try {
        const orderRows = await sql`
          SELECT o.id, o.customer_name, o.customer_email, o.customer_phone, o.pickup_location_id, o.pickup_slot_at, o.subtotal, o.total,
            coalesce(json_agg(json_build_object('id', oi.id, 'snapshot_product_name', oi.snapshot_product_name, 'snapshot_variant_label', oi.snapshot_variant_label, 'snapshot_unit_price', oi.snapshot_unit_price, 'quantity', oi.quantity)) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.id = ${parseInt(id)}
          GROUP BY o.id
        `;

        if (orderRows.length > 0) {
          const o = orderRows[0];
          // fetch seller email
          let sellerEmail = process.env.SELLER_EMAIL || '';
          try {
            const s = await sql`SELECT value FROM store_settings WHERE key = 'seller_email' LIMIT 1`;
            if (s.length > 0) sellerEmail = s[0].value;
          } catch (e) { /* ignore */ }

          const recipients = [];
          if (o.customer_email) recipients.push(o.customer_email);
          if (sellerEmail && !recipients.includes(sellerEmail)) recipients.push(sellerEmail);

          const itemsHtml = (o.items || []).map((i: any) => `<li>${i.quantity}× ${i.snapshot_product_name} (${i.snapshot_variant_label || ''}) — $${(i.snapshot_unit_price * i.quantity).toFixed(2)}</li>`).join('');

          const pickupNameRow = o.pickup_location_id ? (await sql`SELECT name FROM pickup_locations WHERE id = ${parseInt(o.pickup_location_id)}`)[0]?.name : null;

          const html = `
            <h2>Order #${o.id} - ${status}</h2>
            <p><strong>Name:</strong> ${o.customer_name}</p>
            <p><strong>Email:</strong> ${o.customer_email}</p>
            <p><strong>Phone:</strong> ${o.customer_phone}</p>
            <p><strong>Pickup:</strong> ${pickupNameRow || 'N/A'}</p>
            <p><strong>Pickup Slot:</strong> ${o.pickup_slot_at || 'N/A'}</p>
            <ul>${itemsHtml}</ul>
            <p><strong>Total:</strong> $${Number(o.total).toFixed(2)}</p>
          `;

          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          if (RESEND_API_KEY && recipients.length > 0) {
            for (const to of recipients) {
              try {
                await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Aquatic Emerald <no-reply@aquaticemerald.local>', to, subject: `Order ${o.id} ${status}`, html }),
                });
              } catch (e) {
                console.error('Failed to send status email to', to, e);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to notify on order status change', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const orderId = parseInt(id);

    const existing = await sql`
      SELECT pickup_location_id, pickup_slot_at
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (existing.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await sql`DELETE FROM orders WHERE id = ${orderId}`;

    const locationId = existing[0].pickup_location_id;
    const slotAt = existing[0].pickup_slot_at;

    if (locationId && slotAt) {
      await sql`
        UPDATE slot_reservations
        SET current_count = GREATEST(current_count - 1, 0)
        WHERE pickup_location_id = ${locationId}
          AND slot_at = ${slotAt}
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
