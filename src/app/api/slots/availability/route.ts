import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

/**
 * Public, aggregate pickup-slot availability for one location:
 * `{ "<ISO slot start>": bookedCount }` for upcoming reservations.
 * Blocked slots are represented by a count larger than any configured capacity.
 *
 * Deliberately returns counts only — no customer names/emails/phones — so it
 * is safe to expose anonymously. The checkout page previously derived this
 * from GET /api/orders, which is admin-only, so real customers always got a
 * 401 and the "fully booked" display silently never worked.
 */
export async function GET(request: NextRequest) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  const ip = getClientIp(request.headers);
  if (!rateLimit(`slot-availability:${ip}`, 30, 60 * 1000).success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const locationId = Number(request.nextUrl.searchParams.get("locationId"));
  if (!Number.isInteger(locationId) || locationId < 1) {
    return NextResponse.json({ error: "Invalid locationId" }, { status: 400 });
  }

  try {
    const rows = await sql`
      WITH order_counts AS (
        SELECT pickup_slot_at AS slot_at, COUNT(*)::integer AS booked
        FROM orders WHERE pickup_location_id = ${locationId} AND pickup_slot_at >= CURRENT_TIMESTAMP
          AND status != 'cancelled'
        GROUP BY pickup_slot_at
      )
      SELECT COALESCE(r.slot_at, o.slot_at) AS pickup_slot_at,
        CASE WHEN r.is_blocked THEN 2147483647 ELSE GREATEST(COALESCE(r.current_count, 0), COALESCE(o.booked, 0)) END AS booked
      FROM (SELECT * FROM slot_reservations WHERE pickup_location_id = ${locationId} AND slot_at >= CURRENT_TIMESTAMP) r
      FULL JOIN order_counts o ON o.slot_at = r.slot_at
    `;

    const counts: Record<string, number> = {};
    for (const row of rows) {
      // Key in the same format the checkout builds slots with
      // (Date#toISOString), regardless of how the driver hands back the
      // timestamp column.
      const key = new Date(row.pickup_slot_at).toISOString();
      counts[key] = Number(row.booked);
    }

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Error fetching slot availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch slot availability" },
      { status: 500 },
    );
  }
}
