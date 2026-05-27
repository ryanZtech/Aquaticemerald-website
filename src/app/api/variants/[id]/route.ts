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
    const { stock_level, stock_quantity } = await request.json();

    if (!stock_level && stock_quantity === undefined) {
      return NextResponse.json({ error: "No stock data provided" }, { status: 400 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (stock_level) {
      updates.push(`stock_level = $${values.length + 1}`);
      values.push(stock_level);
    }

    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${values.length + 1}`);
      values.push(stock_quantity);
    }

    values.push(id);

    const query = `UPDATE product_variants SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`;

    const result = await sql.query(query, values);

    if (result.length === 0) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating variant:", error);
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}
