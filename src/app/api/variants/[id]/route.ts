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

    // Accept the same legacy spellings ("med", "very-low", ...) that
    // normalizeStockLevel handles everywhere else — the old strict check
    // rejected them here while the rest of the app accepted them.
    const level = normalizeStockLevel(stock_level);
    const rawLower = String(stock_level || "").toLowerCase().trim();
    const LEGACY_ALIASES = ["med", "verylow", "very-low", "veryhigh", "very-high"];
    if (!(STOCK_LEVELS as string[]).includes(rawLower) && !LEGACY_ALIASES.includes(rawLower)) {
      return NextResponse.json(
        { error: "Invalid stock level" },
        { status: 400 },
      );
    }

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
