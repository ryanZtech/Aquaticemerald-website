import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`
      SELECT id, pickup_location_id, weekday, start_time, end_time, slot_duration_minutes, max_pickups_per_slot, active
      FROM weekly_availability_rules
      ORDER BY pickup_location_id, weekday, start_time
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching times:", error);
    return NextResponse.json({ error: "Failed to fetch times" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { pickup_location_id, weekday, start_time, end_time, slot_duration_minutes, max_pickups_per_slot, active } = await request.json();

    const result = await sql`
      INSERT INTO weekly_availability_rules (pickup_location_id, weekday, start_time, end_time, slot_duration_minutes, max_pickups_per_slot, active)
      VALUES (${pickup_location_id}, ${weekday}, ${start_time}, ${end_time}, ${slot_duration_minutes ?? 15}, ${max_pickups_per_slot ?? 1}, ${active ?? true})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating time rule:", error);
    return NextResponse.json({ error: "Failed to create time rule" }, { status: 500 });
  }
}
