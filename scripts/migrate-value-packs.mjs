#!/usr/bin/env node
/**
 * migrate-value-packs.mjs
 * -----------------------
 * One-off migration for the "Value Pack" feature:
 *   1. Adds `value_pack BOOLEAN DEFAULT FALSE` and
 *      `value_pack_sync_stock BOOLEAN DEFAULT FALSE` to products.
 *   2. Creates the `value_pack_items` table (pack product → component
 *      variant links with quantities).
 *
 * Every statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT
 * EXISTS), so re-running is safe. The same statements also live in
 * src/app/api/seed/route.ts; this script just applies them directly so the
 * feature works before/without a re-seed.
 *
 * Usage:
 *   node scripts/migrate-value-packs.mjs           # apply the migration
 *   node scripts/migrate-value-packs.mjs --dry-run # show what would happen
 *
 * Requires: Node 18+ and `npm install` already run (for
 * @neondatabase/serverless).
 */

import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // This project keeps its credentials in `.env` (Next.js also loads
  // `.env.local` when present) — try both before giving up.
  const envPath = ["./.env.local", "./.env"].find((p) => existsSync(p));
  if (!envPath) {
    throw new Error(
      `DATABASE_URL is not set and neither .env.local nor .env was found in the current directory.\n` +
        `Run this script from the folder that contains your env file (your project root).`,
    );
  }

  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key !== "DATABASE_URL") continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  throw new Error(`DATABASE_URL was not found inside ${envPath}.`);
}

const STEPS = [
  {
    label: "products.value_pack (BOOLEAN DEFAULT FALSE)",
    run: (sql) =>
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS value_pack BOOLEAN DEFAULT FALSE`,
  },
  {
    label: "products.value_pack_sync_stock (BOOLEAN DEFAULT FALSE)",
    run: (sql) =>
      sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS value_pack_sync_stock BOOLEAN DEFAULT FALSE`,
  },
  {
    label: "value_pack_items table",
    run: (sql) => sql`
      CREATE TABLE IF NOT EXISTS value_pack_items (
        id SERIAL PRIMARY KEY,
        pack_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        item_variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,
  },
];

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);

  console.log(
    `Value pack migration ${DRY_RUN ? "(dry run) " : ""}starting...`,
  );

  for (const step of STEPS) {
    if (DRY_RUN) {
      console.log(`  (dry-run) Would apply: ${step.label}`);
      continue;
    }
    try {
      await step.run(sql);
      console.log(`  ✓ ${step.label}`);
    } catch (err) {
      console.error(`  ✗ ${step.label}: ${err?.message || err}`);
      process.exitCode = 1;
      return;
    }
  }

  console.log(
    DRY_RUN
      ? "Dry run complete — nothing was changed."
      : "Value pack migration complete.",
  );
}

main().catch((err) => {
  console.error("Migration failed:", err?.message || err);
  process.exit(1);
});
