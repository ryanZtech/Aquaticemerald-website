import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// One-time migration: adds the Custom location and drops NOT NULL on pickup_slot_at
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const results: string[] = [];

  try {
    // 1. Drop NOT NULL constraint on pickup_slot_at so custom location orders work
    await sql`ALTER TABLE orders ALTER COLUMN pickup_slot_at DROP NOT NULL`;
    results.push("✅ Dropped NOT NULL on orders.pickup_slot_at");
  } catch (e: any) {
    results.push(`ℹ️ pickup_slot_at already nullable (${e.message})`);
  }

  try {
    // 2. Insert the Custom location if it doesn't exist yet
    await sql`
      INSERT INTO pickup_locations (name, address, instructions, active)
      VALUES ('Custom', 'To be arranged via WhatsApp', 'Contact seller via WhatsApp to arrange a custom pickup location and time.', TRUE)
      ON CONFLICT DO NOTHING
    `;
    results.push("✅ Inserted Custom pickup location");
  } catch (e: any) {
    results.push(`❌ Failed to insert Custom location: ${e.message}`);
  }

  return NextResponse.json({ results });
}
