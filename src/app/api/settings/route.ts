import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET all store settings
export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`SELECT key, value FROM store_settings`;
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings from database:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST update settings
export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    
    // Save each key-value pair to database using INSERT ON CONFLICT
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") {
        await sql`
          INSERT INTO store_settings (key, value)
          VALUES (${key}, ${value})
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings to database:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
