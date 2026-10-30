#!/usr/bin/env node
/**
 * convert-value-packs.mjs
 * -----------------------
 * Turns the bundles that already exist as plain products (category "Value
 * Pack") into real Value Packs, using the same columns the admin product
 * form writes:
 *
 *   products.value_pack             = TRUE
 *   products.value_pack_sync_stock  = TRUE   (keep stock at the lowest item)
 *   value_pack_items                = one row per component variant
 *   product_variants.stock_level    = derived from those items
 *
 * The component lists come straight from each product's own description
 * ("Includes: 9x Sakura Cherry Shrimp, 2x Handful Red Root Floaters, …").
 * The pack's own price/variant is left untouched.
 *
 * Usage:
 *   node scripts/convert-value-packs.mjs --dry-run   # show what would change
 *   node scripts/convert-value-packs.mjs             # apply
 *
 * Requires: Node 18+, `npm install` already run (uses @neondatabase/serverless),
 * and DATABASE_URL in the environment, .env.local or .env.
 */

import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");

const LEVELS = ["none", "single", "very_low", "low", "medium", "high", "very_high"];

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const envPath of ["./.env.local", "./.env"]) {
    if (!existsSync(envPath)) continue;
    for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1 || line.slice(0, eq).trim() !== "DATABASE_URL") continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (value) return value;
    }
  }
  throw new Error("Could not find DATABASE_URL in the environment, .env.local or .env.");
}

// Component variants, written out in full so a rename/re-price can't silently
// point a pack at the wrong product.
const V = {
  sakuraShrimp: "prod_1780127487440_o9tw80u94-var_1780127197893_1",
  bloodyMaryShrimp: "prod_1780127487440_o9tw80u94-var_1780127197893_3",
  redRootFloaters: "prod_1779943590430_lwjsj3gpk-var_1779943560151",
  javaFernWindelovLarge: "prod_1780013142274_zf4erw0mm-var_1780013048487_2",
  javaMossBall: "prod_1780015603268_mr2o2m66u-var_1780015483836",
  algaeWafers: "prod_1779962435962_0jzufxhhg-var_1779962403630",
  maleCommonGuppy: "prod_1780175213440_wtvli2f94-var_1780175159798",
  femaleGuppy: "prod_1780174476054_d05nqu2l1-var_1780174386750",
  tropicalGroundFood: "prod_1779967843674_ph5hg46mc-var_1779967744805",
  rotalaStems: "prod_1780012121542_gr8xzv0y4-var_1780011948416",
  cryptocoryneMedium: "prod_1780011062234_9vnicmhii-var_1780010954869_1",
};

/** variantId -> quantity, in the order the description lists them. */
const PACKS = [
  {
    slug: "shrimp-starter-pack-small",
    items: [
      [V.bloodyMaryShrimp, 5],
      [V.redRootFloaters, 1],
      [V.algaeWafers, 1], // 40pcs cup — the smallest unit sold
    ],
  },
  {
    slug: "shrimp-starter-pack-medium",
    items: [
      [V.sakuraShrimp, 7],
      [V.redRootFloaters, 1],
      [V.javaFernWindelovLarge, 1],
      [V.algaeWafers, 1],
    ],
  },
  {
    slug: "shrimp-starter-pack-large",
    items: [
      [V.sakuraShrimp, 9],
      [V.redRootFloaters, 2],
      [V.javaFernWindelovLarge, 1],
      [V.javaMossBall, 1],
      [V.algaeWafers, 1],
    ],
  },
  {
    slug: "guppy-breeding-package-small",
    items: [
      [V.maleCommonGuppy, 2],
      [V.femaleGuppy, 4],
      [V.redRootFloaters, 1],
      [V.tropicalGroundFood, 1],
      [V.javaMossBall, 1],
    ],
  },
  {
    slug: "guppy-breeding-package-big",
    items: [
      [V.maleCommonGuppy, 3],
      [V.femaleGuppy, 5],
      [V.redRootFloaters, 1],
      [V.tropicalGroundFood, 1],
      [V.javaMossBall, 1],
      [V.rotalaStems, 1],
      [V.cryptocoryneMedium, 1],
    ],
  },
];

function deriveStockLevel(levels) {
  if (levels.length === 0) return "none";
  let lowest = LEVELS.length - 1;
  for (const level of levels) {
    const index = LEVELS.indexOf(String(level || "").trim() || "none");
    if (index !== -1 && index < lowest) lowest = index;
  }
  return LEVELS[lowest];
}

async function main() {
  console.log(DRY_RUN ? "Dry run — nothing will be written.\n" : "");
  const sql = neon(loadDatabaseUrl());

  for (const pack of PACKS) {
    const rows = await sql`
      SELECT id, name, value_pack, value_pack_sync_stock
      FROM products WHERE slug = ${pack.slug}
    `;
    const product = rows[0];
    if (!product) {
      console.log(`! ${pack.slug}: no product with that slug — skipped.`);
      continue;
    }

    console.log(`\n=== ${product.name} (${pack.slug})`);
    console.log(
      `    before: value_pack=${product.value_pack}, sync=${product.value_pack_sync_stock}`,
    );

    const componentLevels = [];
    for (const [variantId, quantity] of pack.items) {
      const variant = await sql`
        SELECT v.label, v.stock_level, p.name
        FROM product_variants v JOIN products p ON p.id = v.product_id
        WHERE v.id = ${variantId}
      `;
      if (variant.length === 0) {
        throw new Error(`Item variant ${variantId} does not exist`);
      }
      componentLevels.push(variant[0].stock_level);
      console.log(
        `    item: ×${quantity} ${variant[0].name} — ${variant[0].label} (${variant[0].stock_level})`,
      );
    }
    const derived = deriveStockLevel(componentLevels);
    console.log(`    derived pack stock: ${derived}`);

    if (DRY_RUN) continue;

    await sql`DELETE FROM value_pack_items WHERE pack_product_id = ${product.id}`;
    let sortOrder = 0;
    for (const [variantId, quantity] of pack.items) {
      await sql`
        INSERT INTO value_pack_items (pack_product_id, item_variant_id, quantity, sort_order)
        VALUES (${product.id}, ${variantId}, ${quantity}, ${sortOrder})
      `;
      sortOrder++;
    }
    await sql`
      UPDATE products
      SET value_pack = TRUE, value_pack_sync_stock = TRUE
      WHERE id = ${product.id}
    `;
    await sql`
      UPDATE product_variants
      SET stock_level = ${derived}, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ${product.id}
    `;
    console.log(`    ✓ converted, ${pack.items.length} component(s), stock now ${derived}`);
  }

  if (DRY_RUN) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  console.log("\n=== Result");
  const result = await sql`
    SELECT p.slug, p.value_pack_sync_stock, COUNT(vpi.id) AS items,
           (SELECT string_agg(DISTINCT v.stock_level, ',') FROM product_variants v WHERE v.product_id = p.id) AS pack_stock
    FROM products p
    LEFT JOIN value_pack_items vpi ON vpi.pack_product_id = p.id
    WHERE p.value_pack = TRUE
    GROUP BY p.id, p.slug, p.value_pack_sync_stock
    ORDER BY p.slug
  `;
  for (const row of result) {
    console.log(
      `  ${row.slug.padEnd(30)} items=${row.items}  sync=${row.value_pack_sync_stock}  stock=${row.pack_stock}`,
    );
  }
}

main().catch((error) => {
  console.error("\nFailed:", error.message || error);
  process.exit(1);
});
