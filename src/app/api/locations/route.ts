import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  if (!sql) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const rows = await sql`
      SELECT id, name, detail, address, instructions, color, active
      FROM pickup_locations
      ORDER BY name
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json([], { status: 200 });
  }
}
