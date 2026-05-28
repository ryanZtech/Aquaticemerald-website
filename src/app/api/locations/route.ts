import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  if (!sql) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    const rows = await sql`
      SELECT id, name, address as detail, address, instructions, active
      FROM pickup_locations
      ORDER BY name
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "DB not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { name, detail, active } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO pickup_locations (name, address, active)
      VALUES (${name.trim()}, ${detail?.trim() || null}, ${active ?? true})
      RETURNING id, name, address as detail, address, instructions, active
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
