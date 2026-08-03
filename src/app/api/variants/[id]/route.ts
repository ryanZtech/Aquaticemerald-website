import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { STOCK_LEVELS, normalizeStockLevel } from "@/lib/stockLimits";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { stock_level } = body;

    const rawLevel = String(stock_level || "").toLowerCase();
    if (!(STOCK_LEVELS as string[]).includes(rawLevel)) {
      return NextResponse.json(
        { error: "Invalid stock level" },
        { status: 400 },
      );
    }
    const level = normalizeStockLevel(rawLevel);

    const result = await sql`
      UPDATE product_variants
      SET stock_level = ${level}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating variant:", error);
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 },
    );
  }
}
