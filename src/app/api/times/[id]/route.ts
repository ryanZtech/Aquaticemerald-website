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

    // Same validation as POST /api/times — an unchecked update here would
    // 500 at the DB (or store a nonsense rule the checkout then chokes on).
    const locId = Number(pickup_location_id);
    const wd = Number(weekday);
    if (!Number.isInteger(locId) || locId < 1) {
      return NextResponse.json({ error: "Valid pickup_location_id is required" }, { status: 400 });
    }
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) {
      return NextResponse.json({ error: "weekday must be an integer 0-6" }, { status: 400 });
    }
    const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
    if (typeof start_time !== "string" || !TIME_RE.test(start_time)) {
      return NextResponse.json({ error: "start_time must be HH:MM(:SS)" }, { status: 400 });
    }
    if (typeof end_time !== "string" || !TIME_RE.test(end_time)) {
      return NextResponse.json({ error: "end_time must be HH:MM(:SS)" }, { status: 400 });
    }
    if (start_time >= end_time) {
      return NextResponse.json({ error: "end_time must be after start_time" }, { status: 400 });
    }
    const slotMin = slot_duration_minutes == null ? 15 : Number(slot_duration_minutes);
    const maxPick = max_pickups_per_slot == null ? 1 : Number(max_pickups_per_slot);
    if (!Number.isFinite(slotMin) || slotMin < 1 || slotMin > 1440) {
      return NextResponse.json({ error: "slot_duration_minutes must be 1-1440" }, { status: 400 });
    }
    if (!Number.isInteger(maxPick) || maxPick < 1 || maxPick > 1000) {
      return NextResponse.json({ error: "max_pickups_per_slot must be an integer 1-1000" }, { status: 400 });
    }

    const result = await sql`
      UPDATE weekly_availability_rules
      SET pickup_location_id = ${locId}, weekday = ${wd}, start_time = ${start_time}, end_time = ${end_time}, slot_duration_minutes = ${slotMin}, max_pickups_per_slot = ${maxPick}, active = ${active ?? true}
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
