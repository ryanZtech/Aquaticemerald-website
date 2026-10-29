import { NextRequest, NextResponse } from "next/server";
import { sql, pool } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { escapeHtml } from "@/lib/emailTemplatesSimple";
import { STORE_TIMEZONE } from "@/lib/pickupSlots";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  // Only these values are ever meaningful to the app (the "picked up"
  // toggle only ever sends "pending"/"picked_up", but the notification
  // logic below also understands a couple of others). Reject anything
  // else instead of writing an arbitrary string into the status column.
  const ALLOWED_STATUSES = ["pending", "picked_up", "finalised", "completed", "cancelled"];

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT status, pickup_location_id, pickup_slot_at FROM orders WHERE id = $1 FOR UPDATE", [parseInt(id, 10)]);
      if (!existing.rows.length) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const order = existing.rows[0];
      if (order.pickup_location_id && order.pickup_slot_at && order.status !== status) {
        if (status === "cancelled" && order.status !== "cancelled") {
          await client.query(`UPDATE slot_reservations SET current_count = GREATEST(current_count - 1,
            (SELECT COUNT(*) FROM orders WHERE pickup_location_id = $1 AND pickup_slot_at = $2 AND status != 'cancelled') - 1, 0)
            WHERE pickup_location_id = $1 AND slot_at = $2`, [order.pickup_location_id, order.pickup_slot_at]);
        } else if (order.status === "cancelled" && status !== "cancelled") {
          const reserved = await client.query(`UPDATE slot_reservations SET current_count = GREATEST(current_count,
            (SELECT COUNT(*) FROM orders WHERE pickup_location_id = $1 AND pickup_slot_at = $2 AND status != 'cancelled')) + 1
            WHERE pickup_location_id = $1 AND slot_at = $2 AND NOT is_blocked AND GREATEST(current_count,
            (SELECT COUNT(*) FROM orders WHERE pickup_location_id = $1 AND pickup_slot_at = $2 AND status != 'cancelled')) < max_capacity RETURNING id`, [order.pickup_location_id, order.pickup_slot_at]);
          if (!reserved.rows.length) {
            await client.query("ROLLBACK");
            return NextResponse.json({ error: "Cannot restore this order: its pickup slot is unavailable." }, { status: 409 });
          }
        }
      }
      await client.query("UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [status, parseInt(id, 10)]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    const sendStatuses = ["finalised", "picked_up", "completed"];
    if (sendStatuses.includes((status || '').toString())) {
      try {
        const orderRows = await sql`
          SELECT o.id, o.notes, o.customer_name, o.customer_email, o.customer_phone, o.pickup_location_id, o.pickup_slot_at, o.subtotal, o.total,
            coalesce(json_agg(json_build_object('id', oi.id, 'snapshot_product_name', oi.snapshot_product_name, 'snapshot_variant_label', oi.snapshot_variant_label, 'snapshot_unit_price', oi.snapshot_unit_price, 'quantity', oi.quantity)) FILTER (WHERE oi.id IS NOT NULL), '[]') as items
          FROM orders o
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.id = ${parseInt(id)}
          GROUP BY o.id
        `;

        if (orderRows.length > 0) {
          const o = orderRows[0];
          
          let sellerEmail = process.env.SELLER_EMAIL || '';
          try {
            const s = await sql`SELECT value FROM store_settings WHERE key = 'seller_email' LIMIT 1`;
            if (s.length > 0) sellerEmail = s[0].value;
          } catch (e) {  }

          const recipients = [];
          if (o.customer_email) recipients.push(o.customer_email);
          if (sellerEmail && !recipients.includes(sellerEmail)) recipients.push(sellerEmail);

          const itemsHtml = (o.items || []).map((i: any) => `<li>${i.quantity}× ${escapeHtml(i.snapshot_product_name)} (${escapeHtml(i.snapshot_variant_label)}) — $${(i.snapshot_unit_price * i.quantity).toFixed(2)}</li>`).join('');

          const pickupNameRow = o.pickup_location_id ? (await sql`SELECT name FROM pickup_locations WHERE id = ${parseInt(o.pickup_location_id)}`)[0]?.name : null;

          // The customer knows their AE- reference, not the database id.
          const orderReference = (String(o.notes || "").match(/\bAE-[A-Z0-9-]+\b/)?.[0]) || `#${o.id}`;
          // Format in store time, never the server's UTC clock.
          const pickupWhen = o.pickup_slot_at
            ? new Date(o.pickup_slot_at).toLocaleString("en-AU", {
                timeZone: STORE_TIMEZONE,
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
            : "N/A";

          const html = `
            <h2>Order ${escapeHtml(orderReference)} - ${escapeHtml(status)}</h2>
            <p><strong>Name:</strong> ${escapeHtml(o.customer_name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(o.customer_email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(o.customer_phone)}</p>
            <p><strong>Pickup:</strong> ${escapeHtml(pickupNameRow || 'N/A')}</p>
            <p><strong>Pickup Slot:</strong> ${escapeHtml(pickupWhen)}</p>
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
                  body: JSON.stringify({ from: process.env.EMAIL_FROM || 'Aquatic Emerald <no-reply@aquaticemerald.com>', to, subject: `Order ${orderReference} ${status}`, html }),
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
  const authError = await requireAdmin();
  if (authError) return authError;
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query("SELECT pickup_location_id, pickup_slot_at, status FROM orders WHERE id = $1 FOR UPDATE", [orderId]);
      if (!existing.rows.length) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const order = existing.rows[0];
      await client.query("DELETE FROM orders WHERE id = $1", [orderId]);
      if (order.pickup_location_id && order.pickup_slot_at && order.status !== "cancelled") {
        await client.query(`UPDATE slot_reservations SET current_count = GREATEST(current_count - 1,
          (SELECT COUNT(*) FROM orders WHERE pickup_location_id = $1 AND pickup_slot_at = $2 AND status != 'cancelled'), 0)
          WHERE pickup_location_id = $1 AND slot_at = $2`, [order.pickup_location_id, order.pickup_slot_at]);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
