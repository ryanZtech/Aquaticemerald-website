import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { STOCK_LEVELS, normalizeStockLevel } from "@/lib/stockLimits";
import {
  recomputeDependentPacks,
  recomputePackProduct,
} from "@/lib/valuePack";

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

    // If this variant is a component of any "keep stock at lowest" value
    // pack, those packs' derived stock levels need to follow it.
    await recomputeDependentPacks([id]);

    // If the variant itself belongs to a synced pack, its manual edit is
    // authoritative only when the pack is NOT synced; a synced pack's level
    // is derived from its items, so restore it (and let the response carry
    // the effective level so the admin UI shows what actually stuck).
    const owner = await sql`
      SELECT product_id FROM product_variants WHERE id = ${id}
    `;
    let effective = result[0];
    if (owner.length > 0) {
      const packRows = await sql`
        SELECT value_pack, value_pack_sync_stock FROM products WHERE id = ${owner[0].product_id}
      `;
      if (packRows.length > 0 && packRows[0].value_pack && packRows[0].value_pack_sync_stock) {
        await recomputePackProduct(String(owner[0].product_id));
        const refreshed = await sql`
          SELECT * FROM product_variants WHERE id = ${id}
        `;
        if (refreshed.length > 0) effective = refreshed[0];
      }
    }

    return NextResponse.json(effective);
  } catch (error) {
    console.error("Error updating variant:", error);
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 },
    );
  }
}
