import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT *
      FROM promo_popups
      WHERE active = TRUE
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return NextResponse.json(rows[0] || null);
  } catch (error) {
    console.error("Error fetching promo popup:", error);
    return NextResponse.json({ error: "Failed to fetch promo popup" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/adminAuth");
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      name,
      heading,
      body_text,
      button_text,
      button_url,
      image_url,
      delay_seconds,
      active
    } = body;

    const result = await sql`
      INSERT INTO promo_popups (
        name, heading, body_text, button_text, button_url,
        image_url, delay_seconds, active
      )
      VALUES (
        ${name}, ${heading}, ${body_text || null}, ${button_text},
        ${button_url}, ${image_url || null}, ${delay_seconds || 3}, ${active ?? true}
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating promo popup:", error);
    return NextResponse.json({ error: "Failed to create promo popup" }, { status: 500 });
  }
}
