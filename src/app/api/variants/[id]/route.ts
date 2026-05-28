import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function getStockLevelFromQuantity(quantity: number) {
  if (quantity <= 0) return "none";
  if (quantity <= 1) return "low";
  if (quantity <= 10) return "med";
  return "high";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sql) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    let { stock_level, stock_quantity } = body;

    if (!stock_level && stock_quantity === undefined) {
      return NextResponse.json(
        { error: "No stock data provided" },
        { status: 400 },
      );
    }

    if (stock_level && stock_quantity === undefined) {
      if (stock_level === "none") stock_quantity = 0;
      if (stock_level === "low") stock_quantity = 1;
      if (stock_level === "med" || stock_level === "medium")
        stock_quantity = 10;
      if (stock_level === "high") stock_quantity = 25;
    }

    if (stock_quantity !== undefined && !stock_level) {
      stock_level = getStockLevelFromQuantity(stock_quantity);
    }

    // If both are provided, ensure they are somewhat consistent if quantity is 0 but level is positive
    if (stock_level && stock_quantity === 0) {
      if (stock_level === "low") stock_quantity = 1;
      if (stock_level === "med" || stock_level === "medium")
        stock_quantity = 10;
      if (stock_level === "high") stock_quantity = 25;
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
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 },
    );
  }
}
