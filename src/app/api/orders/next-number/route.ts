import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { formatOrderReference, randomOrderCode } from "@/lib/orderNumber";

/**
 * Hand the checkout a fresh `AE-123456` number that no submitted order has
 * used yet. Order numbers are what customers quote on WhatsApp and what the
 * admin order list looks them up by, so the store — not the browser — decides
 * which one is free.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`order-number:${ip}`, 30, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    // `order_submission_keys` is created lazily by the first order. Until it
    // exists, no reference can have been used, so every code is free.
    const tableRows = await sql`
      SELECT to_regclass('public.order_submission_keys') AS reg
    `;
    const tableExists = Boolean(tableRows[0]?.reg);

    // A six-digit space is small enough that a collision is possible, so try
    // a few candidates rather than trusting the first random number.
    for (let attempt = 0; attempt < 25; attempt++) {
      const reference = formatOrderReference(randomOrderCode());
      if (!tableExists) return NextResponse.json({ orderRef: reference });

      const used = await sql`
        SELECT 1 FROM order_submission_keys WHERE reference = ${reference} LIMIT 1
      `;
      if (used.length === 0) {
        return NextResponse.json({ orderRef: reference });
      }
    }

    return NextResponse.json(
      { error: "Could not allocate an order number. Please try again." },
      { status: 503 },
    );
  } catch (error) {
    console.error("Error allocating an order number:", error);
    return NextResponse.json(
      { error: "Could not allocate an order number. Please try again." },
      { status: 500 },
    );
  }
}
