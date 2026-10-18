import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { id } = await params;
    const locId = parseInt(id);
    if (!Number.isInteger(locId) || locId < 1) {
      return NextResponse.json({ error: 'Invalid location id' }, { status: 400 });
    }
    const body = await request.json();
    const { name, detail, active } = body;
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const result = await sql`
      UPDATE pickup_locations SET name = ${String(name).trim()}, address = ${detail?.trim() || null}, active = ${active ?? true}, updated_at = CURRENT_TIMESTAMP WHERE id = ${locId} RETURNING id
    `;
    if (result.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to update location', e);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { id } = await params;
    const locId = parseInt(id);
    if (!Number.isInteger(locId) || locId < 1) {
      return NextResponse.json({ error: 'Invalid location id' }, { status: 400 });
    }
    const referencingOrders = await sql`SELECT COUNT(*)::int AS n FROM orders WHERE pickup_location_id = ${locId}`;
    if (referencingOrders[0].n > 0) {
      return NextResponse.json({ error: 'Cannot delete a location that has orders. Deactivate it instead.' }, { status: 400 });
    }
    const result = await sql`DELETE FROM pickup_locations WHERE id = ${locId} RETURNING id`;
    if (result.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Failed to delete location', e);
    if (e?.code === '23503') {
      return NextResponse.json({ error: 'Cannot delete this location because other records still reference it.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
