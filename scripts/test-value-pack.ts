/**
 * test-value-pack.mjs (run with tsx so we can import the real TS helpers)
 * Live verification of the value pack stock derivation against the real DB.
 * Creates a temporary pack + 2 items, checks the derived level follows the
 * LOWEST item at every step, then removes everything it created.
 */
import { readFileSync, existsSync } from "node:fs";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Check every env file: the key may live in .env while .env.local holds
  // unrelated secrets (and shadows it if we only look at the first file).
  for (const envPath of ["./.env.local", "./.env"]) {
    if (!existsSync(envPath)) continue;
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
  }
  throw new Error("DATABASE_URL not found");
}

process.env.DATABASE_URL = loadDatabaseUrl();

const { sql: maybeSql } = await import("../src/lib/db");
if (!maybeSql) throw new Error("sql client failed to initialise");
const sql = maybeSql;
const {
  recomputePackProduct,
  recomputeDependentPacks,
} = await import("../src/lib/valuePack");
const { deriveStockLevel } = await import("../src/lib/stockLimits");

const RUN = Date.now();
const packId = `test_pack_${RUN}`;
const itemA = `test_pack_${RUN}_itema`;
const itemB = `test_pack_${RUN}_itemb`;
const packVariant = `${packId}-pack`;

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}: got "${actual}", expected "${expected}"`);
}

// Pure-function cases first (no DB).
console.log("deriveStockLevel unit cases:");
check("empty → none", deriveStockLevel([]), "none");
check("[high, low] → low", deriveStockLevel(["high", "low"]), "low");
check("[medium, none, high] → none", deriveStockLevel(["medium", "none", "high"]), "none");
check("[single, very_low] → single", deriveStockLevel(["single", "very_low"]), "single");
check("[blank, medium] → none", deriveStockLevel(["", "medium"]), "none");

console.log("DB recompute flow:");
try {
  // Seed three plain variants with known stock levels.
  await sql`INSERT INTO products (id, name, slug, value_pack, value_pack_sync_stock) VALUES (${packId}, 'ZZ Test Pack', ${packId}, TRUE, TRUE) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO products (id, name, slug) VALUES (${itemA + "_p"}, 'ZZ Test Item A', ${itemA + "_p"}) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO products (id, name, slug) VALUES (${itemB + "_p"}, 'ZZ Test Item B', ${itemB + "_p"}) ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO product_variants (id, product_id, label, price, stock_level) VALUES (${itemA}, ${itemA + "_p"}, 'A', 5, 'high') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO product_variants (id, product_id, label, price, stock_level) VALUES (${itemB}, ${itemB + "_p"}, 'B', 5, 'medium') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO product_variants (id, product_id, label, price, stock_level) VALUES (${packVariant}, ${packId}, 'Value Pack', 9, 'none') ON CONFLICT (id) DO NOTHING`;
  await sql`INSERT INTO value_pack_items (pack_product_id, item_variant_id, quantity) VALUES (${packId}, ${itemA}, 1), (${packId}, ${itemB}, 1)`;

  // Step 1: items high + medium → pack medium.
  let derived = await recomputePackProduct(packId);
  check("items high+medium → medium", derived, "medium");
  let row = (await sql`SELECT stock_level FROM product_variants WHERE id = ${packVariant}`)[0];
  check("pack variant materialized to medium", row.stock_level, "medium");

  // Step 2: drop item B to none → pack none (out of stock).
  await sql`UPDATE product_variants SET stock_level = 'none' WHERE id = ${itemB}`;
  await recomputeDependentPacks([itemB]);
  row = (await sql`SELECT stock_level FROM product_variants WHERE id = ${packVariant}`)[0];
  check("dependent recompute: item none → pack none", row.stock_level, "none");

  // Step 3: item B back to very_low → pack very_low.
  await sql`UPDATE product_variants SET stock_level = 'very_low' WHERE id = ${itemB}`;
  await recomputeDependentPacks([itemB]);
  row = (await sql`SELECT stock_level FROM product_variants WHERE id = ${packVariant}`)[0];
  check("dependent recompute: item very_low → pack very_low", row.stock_level, "very_low");

  // Step 4: unsynced pack keeps its manual level.
  await sql`UPDATE products SET value_pack_sync_stock = FALSE WHERE id = ${packId}`;
  await sql`UPDATE product_variants SET stock_level = 'high' WHERE id = ${packVariant}`;
  derived = await recomputePackProduct(packId);
  row = (await sql`SELECT stock_level FROM product_variants WHERE id = ${packVariant}`)[0];
  check("unsynced pack keeps manual high", row.stock_level, "high");
} finally {
  // Remove everything this test created.
  await sql`DELETE FROM products WHERE id IN (${packId}, ${itemA + "_p"}, ${itemB + "_p"})`;
  console.log("cleanup done");
}

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
