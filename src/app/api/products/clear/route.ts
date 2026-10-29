import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;
  if (!pool) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  let body: { action?: string; confirmation?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (body?.action !== "archive" && body?.action !== "restore") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (body.action === "archive" && body.confirmation !== "ARCHIVE") {
    return NextResponse.json({ error: "Type ARCHIVE to confirm." }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    let count = 0;
    let remaining = 0;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext('inventory-archive'))");
      await client.query(`CREATE TABLE IF NOT EXISTS inventory_archive_batches (
        id BIGSERIAL PRIMARY KEY,
        product_ids TEXT[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        restored_at TIMESTAMPTZ
      )`);
      if (body.action === "archive") {
        const archived = await client.query("UPDATE products SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE active = TRUE RETURNING id");
        count = archived.rows.length;
        if (count) await client.query("INSERT INTO inventory_archive_batches (product_ids) VALUES ($1::text[])", [archived.rows.map((row) => row.id)]);
      } else {
        const batch = await client.query("SELECT id, product_ids, created_at FROM inventory_archive_batches WHERE restored_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE");
        if (!batch.rows.length) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "There is no archived inventory batch to restore." }, { status: 404 });
        }
        const restored = await client.query("UPDATE products SET active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::text[]) AND active = FALSE AND updated_at = (SELECT created_at FROM inventory_archive_batches WHERE id = $2) RETURNING id", [batch.rows[0].product_ids, batch.rows[0].id]);
        count = restored.rows.length;
        const restoredIds = new Set(restored.rows.map((row) => String(row.id)));
        const unresolved = (batch.rows[0].product_ids as string[]).filter((id) => !restoredIds.has(id));
        remaining = unresolved.length;
        if (remaining) {
          await client.query("UPDATE inventory_archive_batches SET product_ids = $1::text[] WHERE id = $2", [unresolved, batch.rows[0].id]);
        } else {
          await client.query("UPDATE inventory_archive_batches SET restored_at = NOW() WHERE id = $1", [batch.rows[0].id]);
        }
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    try {
      revalidatePath("/", "layout");
    } catch (error) {
      // The archive is already committed; do not report it as a failed write.
      console.error("Failed to revalidate catalog after inventory change:", error);
    }
    return NextResponse.json({ success: true, message: `${count} product${count === 1 ? "" : "s"} ${body.action === "archive" ? "archived" : "restored"}.${remaining ? ` ${remaining} changed or missing product${remaining === 1 ? " was" : "s were"} not restored automatically.` : ""}` });
  } catch (error) {
    console.error("Inventory archive operation failed:", error);
    return NextResponse.json({ error: "Failed to change inventory" }, { status: 500 });
  }
}
