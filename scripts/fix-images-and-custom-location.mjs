#!/usr/bin/env node
/**
 * fix-images-and-custom-location.mjs
 * ----------------------------------
 * One-off migration that:
 *   1. Ensures the special "Custom" pickup location exists.
 *   2. Makes orders.pickup_slot_at nullable if needed.
 *   3. Updates hero_image and scene_image to local /hero.png and /front1.png.
 *
 * Usage (from project root that has .env.local):
 *   node scripts/fix-images-and-custom-location.mjs
 *   node scripts/fix-images-and-custom-location.mjs --dry-run
 */

import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = ".env.local";
  if (!existsSync(envPath)) {
    throw new Error(`DATABASE_URL is not set and ${envPath} was not found.\nRun this from the project root that contains .env.local.`);
  }
  const contents = readFileSync(envPath, "utf8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "DATABASE_URL") return value;
  }
  throw new Error(`DATABASE_URL not found inside ${envPath}`);
}

async function main() {
  const sql = neon(loadDatabaseUrl());
  console.log(DRY_RUN ? "=== DRY RUN ===\n" : "=== Applying migration ===\n");

  console.log('1. Ensuring "Custom" pickup location exists...');
  if (!DRY_RUN) {
    const existing = await sql`SELECT id, name, active FROM pickup_locations WHERE name = 'Custom' LIMIT 1`;
    if (existing.length > 0) {
      console.log(`   Already present (id=${existing[0].id}, active=${existing[0].active}).`);
      if (!existing[0].active) {
        await sql`UPDATE pickup_locations SET active = TRUE WHERE id = ${existing[0].id}`;
        console.log("   Reactivated it.");
      }
    } else {
      await sql`
        INSERT INTO pickup_locations (name, address, instructions, active)
        VALUES ('Custom', 'To be arranged via WhatsApp', 'Contact seller via WhatsApp to arrange a custom pickup location and time.', TRUE)
      `;
      console.log('   Inserted new "Custom" location.');
    }
  } else {
    console.log('   (dry-run) Would ensure "Custom" location exists.');
  }

  console.log("\n2. Ensuring orders.pickup_slot_at is nullable...");
  try {
    if (!DRY_RUN) {
      await sql`ALTER TABLE orders ALTER COLUMN pickup_slot_at DROP NOT NULL`;
      console.log("   Dropped NOT NULL (or already nullable).");
    } else {
      console.log("   (dry-run) Would drop NOT NULL on pickup_slot_at.");
    }
  } catch (e) {
    console.log(`   Already nullable (${e.message}).`);
  }

  console.log("\n3. Updating hero_image and scene_image to local assets...");
  for (const { key, value } of [
    { key: "hero_image", value: "/hero.png" },
    { key: "scene_image", value: "/front1.png" },
  ]) {
    if (!DRY_RUN) {
      await sql`INSERT INTO store_settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
      console.log(`   Set ${key} = ${value}`);
    } else {
      console.log(`   (dry-run) Would set ${key} = ${value}`);
    }
  }

  console.log(DRY_RUN ? "\nDry run complete." : "\nMigration complete.");
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
