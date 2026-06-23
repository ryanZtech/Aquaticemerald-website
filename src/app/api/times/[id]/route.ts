import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const rows = await sql`
      SELECT id, pickup_location_id, weekday, start_time, end_time, slot_duration_minutes, max_pickups_per_slot, active
      FROM weekly_availability_rules
      WHERE id = ${parseInt(id)}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Time rule not found" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error fetching time rule:", error);
    return NextResponse.json({ error: "Failed to fetch time rule" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const { pickup_location_id, weekday, start_time, end_time, slot_duration_minutes, max_pickups_per_slot, active } = await request.json();

    const result = await sql`
      UPDATE weekly_availability_rules
      SET pickup_location_id = ${pickup_location_id}, weekday = ${weekday}, start_time = ${start_time}, end_time = ${end_time}, slot_duration_minutes = ${slot_duration_minutes}, max_pickups_per_slot = ${max_pickups_per_slot}, active = ${active}
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Time rule not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error updating time rule:", error);
    return NextResponse.json({ error: "Failed to update time rule" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const { id } = await params;
    const result = await sql`
      DELETE FROM weekly_availability_rules
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Time rule not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time rule:", error);
    return NextResponse.json({ error: "Failed to delete time rule" }, { status: 500 });
  }
}
