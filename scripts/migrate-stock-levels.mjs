#!/usr/bin/env node
/**
 * migrate-stock-levels.mjs
 * ------------------------
 * One-off migration for the "stock_level" scale change:
 *   none, low, med, high  →  none, single, very_low, low, medium, high, very_high
 *
 * What it does, in order:
 *   1. Reads DATABASE_URL out of .env.local (or the real environment, if
 *      already set — e.g. on Vercel).
 *   2. Finds any CHECK constraint on product_variants.stock_level and drops it,
 *      so old values don't block the update.
 *   3. Normalizes existing rows: 'med' -> 'medium', anything unrecognized -> 'none'.
 *      Recognized values ('none','single','very_low','low','medium','high','very_high')
 *      are left untouched.
 *   4. Re-adds a CHECK constraint restricted to the new 7-value set.
 *   5. Seeds any missing max_qty_* store_settings rows with sensible defaults
 *      (without overwriting any values you've already configured in Admin > Settings).
 *
 * Usage:
 *   node scripts/migrate-stock-levels.mjs           # apply the migration
 *   node scripts/migrate-stock-levels.mjs --dry-run # show what would happen, change nothing
 *
 * Requires: Node 18+ (for global fetch, used by @neondatabase/serverless),
 * and `npm install` already run in this folder (so @neondatabase/serverless exists).
 */

import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");

const NEW_LEVELS = [
  "none",
  "single",
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
];

const DEFAULT_MAX_QTY = {
  none: "0",
  single: "1",
  very_low: "2",
  low: "5",
  medium: "10",
  high: "25",
  very_high: "50",
};

const SETTINGS_KEY_BY_LEVEL = {
  none: "max_qty_none",
  single: "max_qty_single",
  very_low: "max_qty_very_low",
  low: "max_qty_low",
  medium: "max_qty_medium",
  high: "max_qty_high",
  very_high: "max_qty_very_high",
};

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = ".env.local";
  if (!existsSync(envPath)) {
    throw new Error(
      `DATABASE_URL is not set and ${envPath} was not found in the current directory.\n` +
        `Run this script from the folder that contains .env.local (your project root).`,
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
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }

  throw new Error(`Could not find DATABASE_URL in ${envPath}.`);
}

function normalizeLegacyLevel(level) {
  const l = String(level || "").toLowerCase().trim();
  if (l === "med") return "medium";
  if (l === "verylow" || l === "very-low") return "very_low";
  if (l === "veryhigh" || l === "very-high") return "very_high";
  if (NEW_LEVELS.includes(l)) return l;
  return "none";
}

async function main() {
  console.log(DRY_RUN ? "Running in --dry-run mode (no changes will be made).\n" : "");

  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);

  // --- Step 1: find & drop any existing CHECK constraint on stock_level ---
  console.log("Step 1: Looking for existing CHECK constraints on product_variants.stock_level...");
  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'product_variants'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%stock_level%'
  `;

  if (constraints.length === 0) {
    console.log("  No existing CHECK constraint found on stock_level (nothing to drop).");
  } else {
    for (const c of constraints) {
      console.log(`  Found constraint "${c.conname}": ${c.definition}`);
      if (!DRY_RUN) {
        await sql.query(`ALTER TABLE product_variants DROP CONSTRAINT ${c.conname}`);
        console.log(`  Dropped "${c.conname}".`);
      } else {
        console.log(`  (dry-run) Would drop "${c.conname}".`);
      }
    }
  }

  // --- Step 2: inspect current distinct values so you know what's being changed ---
  console.log("\nStep 2: Checking current distinct stock_level values in product_variants...");
  const distinctRows = await sql`
    SELECT stock_level, COUNT(*) AS count
    FROM product_variants
    GROUP BY stock_level
    ORDER BY count DESC
  `;

  if (distinctRows.length === 0) {
    console.log("  No product_variants rows found.");
  } else {
    for (const row of distinctRows) {
      const current = row.stock_level;
      const normalized = normalizeLegacyLevel(current);
      const changeNote = normalized !== current ? `  ->  will become "${normalized}"` : "  (already valid, unchanged)";
      console.log(`  "${current ?? "(null)"}": ${row.count} row(s)${changeNote}`);
    }
  }

  // --- Step 3: migrate any legacy/unrecognized values ---
  console.log("\nStep 3: Normalizing legacy values...");
  const toMigrate = distinctRows.filter((row) => normalizeLegacyLevel(row.stock_level) !== row.stock_level);

  if (toMigrate.length === 0) {
    console.log("  Nothing to migrate — all existing values are already valid.");
  } else {
    for (const row of toMigrate) {
      const target = normalizeLegacyLevel(row.stock_level);
      console.log(`  Updating ${row.count} row(s) from "${row.stock_level ?? "(null)"}" to "${target}"...`);
      if (!DRY_RUN) {
        if (row.stock_level === null) {
          await sql`UPDATE product_variants SET stock_level = ${target} WHERE stock_level IS NULL`;
        } else {
          await sql`UPDATE product_variants SET stock_level = ${target} WHERE stock_level = ${row.stock_level}`;
        }
      } else {
        console.log("  (dry-run) Would run the above update.");
      }
    }
  }

  // --- Step 4: add the new CHECK constraint ---
  console.log("\nStep 4: Adding new CHECK constraint for the 7-level scale...");
  const constraintName = "product_variants_stock_level_check";
  const valuesList = NEW_LEVELS.map((l) => `'${l}'`).join(", ");
  if (!DRY_RUN) {
    await sql.query(
      `ALTER TABLE product_variants ADD CONSTRAINT ${constraintName} CHECK (stock_level IN (${valuesList}))`,
    );
    console.log(`  Added constraint "${constraintName}".`);
  } else {
    console.log(`  (dry-run) Would add: CHECK (stock_level IN (${valuesList}))`);
  }

  // --- Step 5: seed any missing store_settings rows with sensible defaults ---
  console.log("\nStep 5: Seeding missing max_qty_* store_settings (won't overwrite existing values)...");
  for (const level of NEW_LEVELS) {
    const key = SETTINGS_KEY_BY_LEVEL[level];
    const defaultValue = DEFAULT_MAX_QTY[level];
    if (!DRY_RUN) {
      await sql`
        INSERT INTO store_settings (key, value)
        VALUES (${key}, ${defaultValue})
        ON CONFLICT (key) DO NOTHING
      `;
    }
    console.log(`  ${key} -> default "${defaultValue}" (only inserted if not already present)`);
  }

  console.log(
    DRY_RUN
      ? "\nDry run complete. Re-run without --dry-run to apply these changes."
      : "\nMigration complete.",
  );
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
