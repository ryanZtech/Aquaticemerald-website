import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, detail, active } = body;
    await sql`
      UPDATE pickup_locations SET name = ${name}, address = ${detail}, active = ${active ?? true}, updated_at = CURRENT_TIMESTAMP WHERE id = ${parseInt(id)}
    `;
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
    await sql`DELETE FROM pickup_locations WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Failed to delete location', e);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
