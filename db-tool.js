#!/usr/bin/env node
/**
 * db-tool.js
 * ----------
 * A read-first, safe-by-default tool for inspecting and patching the live
 * Postgres database directly — useful for anything not captured by
 * src/app/api/seed/route.ts (which only knows how to CREATE TABLE IF NOT
 * EXISTS for the "core" tables; several tables used by the app —
 * discount_codes, auto_discounts, variant_images — were added by hand at
 * some point and aren't in that file, so their real column types,
 * nullability, and foreign keys are currently unknown to the codebase).
 *
 * USAGE
 *   node db-tool.js schema                    List every table, its columns
 *                                              (type/nullable/default), and
 *                                              its constraints (PK/FK/UNIQUE/
 *                                              CHECK), straight from Postgres'
 *                                              own catalogs. Safe, read-only.
 *
 *   node db-tool.js schema <table> [table...]  Same, but only for the named
 *                                              table(s), e.g.:
 *                                              node db-tool.js schema discount_codes auto_discounts variant_images
 *
 *   node db-tool.js check                      Runs a set of read-only
 *                                              integrity checks (see
 *                                              CHECKS below) and reports
 *                                              anything that looks wrong,
 *                                              with the actual affected
 *                                              rows printed out. Nothing is
 *                                              changed.
 *
 *   node db-tool.js fix <name> [--dry-run]     Applies one specific, named
 *                                              fix (see FIXES below).
 *                                              Always prints the affected
 *                                              rows/columns before AND
 *                                              after. Without --dry-run it
 *                                              writes to the database;
 *                                              with it, it only shows what
 *                                              would happen.
 *
 *   node db-tool.js fix list                   Lists available fix names.
 *
 * Requires: Node 18+, and `npm install` already run in this folder (for
 * @neondatabase/serverless). Reads DATABASE_URL from the real environment
 * if set, otherwise from .env.local in the current directory — same
 * convention as scripts/migrate-stock-levels.mjs.
 */

import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const DRY_RUN = process.argv.includes("--dry-run");
const [, , COMMAND, ...ARGS] = process.argv;
const POSITIONAL_ARGS = ARGS.filter((a) => a !== "--dry-run");

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

function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log("  (no rows)");
    return;
  }
  const widths = columns.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const line = (cells) =>
    "  " + cells.map((c, i) => String(c).padEnd(widths[i])).join("  |  ");
  console.log(line(columns));
  console.log("  " + widths.map((w) => "-".repeat(w)).join("--+--"));
  for (const row of rows) {
    console.log(line(columns.map((c) => row[c] ?? "")));
  }
}

// ---------------------------------------------------------------------------
// schema: dump columns + constraints for one, several, or all public tables
// ---------------------------------------------------------------------------
async function listTables(sql) {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r) => r.table_name);
}

async function describeTable(sql, table) {
  console.log(`\n=== ${table} ===`);

  const exists = await sql`SELECT to_regclass(${"public." + table}) AS reg`;
  if (!exists[0]?.reg) {
    console.log(`  Table "${table}" does not exist in this database.`);
    return;
  }

  const columns = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  console.log("Columns:");
  printTable(
    columns.map((c) => ({
      column: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable,
      default: c.column_default ?? "",
    })),
    ["column", "type", "nullable", "default"],
  );

  const constraints = await sql`
    SELECT conname, contype, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = (${"public." + table})::regclass
    ORDER BY contype, conname
  `;
  console.log("Constraints:");
  if (constraints.length === 0) {
    console.log("  (none)");
  } else {
    for (const c of constraints) {
      const kind = { p: "PRIMARY KEY", f: "FOREIGN KEY", u: "UNIQUE", c: "CHECK" }[c.contype] || c.contype;
      console.log(`  [${kind}] ${c.conname}: ${c.definition}`);
    }
  }
}

async function cmdSchema(sql, tables) {
  const targets = tables.length > 0 ? tables : await listTables(sql);
  for (const t of targets) {
    await describeTable(sql, t);
  }
}

// ---------------------------------------------------------------------------
// check: read-only integrity checks. Each one is self-contained and skips
// itself (with a note) if the table/column it needs doesn't exist, rather
// than crashing the whole run.
// ---------------------------------------------------------------------------
async function tableExists(sql, table) {
  const rows = await sql`SELECT to_regclass(${"public." + table}) AS reg`;
  return Boolean(rows[0]?.reg);
}

async function columnExists(sql, table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

const CHECKS = [
  {
    name: "orders.pickup_slot_at nullability",
    async run(sql) {
      const rows = await sql`
        SELECT is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pickup_slot_at'
      `;
      if (rows.length === 0) return "orders.pickup_slot_at column not found.";
      if (rows[0].is_nullable === "NO") {
        return (
          "orders.pickup_slot_at is still NOT NULL. Every custom-location checkout " +
          "(which submits pickup_slot_at = null) will fail. Run: node db-tool.js fix pickup-slot-at"
        );
      }
      return null; // OK
    },
  },
  {
    name: "discount_codes / auto_discounts tables exist",
    async run(sql) {
      const missing = [];
      for (const t of ["discount_codes", "auto_discounts"]) {
        if (!(await tableExists(sql, t))) missing.push(t);
      }
      if (missing.length > 0) {
        return `Missing table(s): ${missing.join(", ")}. Every route that queries them will fail at runtime.`;
      }
      return null;
    },
  },
  {
    name: "variant-reference columns have the right type (TEXT, matching product_variants.id)",
    async run(sql) {
      const targets = [
        ["discount_codes", "free_variant_id"],
        ["auto_discounts", "trigger_variant_id"],
        ["auto_discounts", "effect_free_variant_id"],
      ];
      const wrong = [];
      for (const [table, column] of targets) {
        if (!(await tableExists(sql, table))) continue;
        const rows = await sql`
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
        `;
        if (rows.length > 0 && rows[0].data_type !== "text") {
          wrong.push({ table, column, data_type: rows[0].data_type });
        }
      }
      if (wrong.length === 0) return null;
      console.log("  Columns with the wrong type (product_variants.id is TEXT, so these can never store a valid reference):");
      printTable(wrong, ["table", "column", "data_type"]);
      return `${wrong.length} column(s) are the wrong type. This is also why the orphan-check below can crash with "operator does not exist: text = integer" until fixed. Run: node db-tool.js fix variant-id-column-types`;
    },
  },
  {
    name: "discount_codes.free_product_id / free_variant_id orphans",
    async run(sql) {
      if (!(await tableExists(sql, "discount_codes"))) return null; // reported above
      if (!(await columnExists(sql, "discount_codes", "free_product_id"))) {
        return "discount_codes has no free_product_id column — schema differs from what the app code expects (src/app/api/discount-codes/route.ts).";
      }
      const orphanProducts = await sql`
        SELECT id, code, free_product_id
        FROM discount_codes
        WHERE free_product_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = discount_codes.free_product_id)
      `;
      const orphanVariants = await sql`
        SELECT id, code, free_variant_id
        FROM discount_codes
        WHERE free_variant_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.id = discount_codes.free_variant_id)
      `;
      if (orphanProducts.length === 0 && orphanVariants.length === 0) return null;
      console.log("  Discount codes pointing at a deleted product:");
      printTable(orphanProducts, ["id", "code", "free_product_id"]);
      console.log("  Discount codes pointing at a deleted variant:");
      printTable(orphanVariants, ["id", "code", "free_variant_id"]);
      return `${orphanProducts.length + orphanVariants.length} discount_codes row(s) reward a product/variant that no longer exists — redeeming them will silently give no free item (see findFreeVariant() in orders/route.ts).`;
    },
  },
  {
    name: "auto_discounts.effect_free_product_id / effect_free_variant_id orphans",
    async run(sql) {
      if (!(await tableExists(sql, "auto_discounts"))) return null; // reported above
      const orphanProducts = await sql`
        SELECT id, name, effect_free_product_id
        FROM auto_discounts
        WHERE effect_free_product_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = auto_discounts.effect_free_product_id)
      `;
      const orphanVariants = await sql`
        SELECT id, name, effect_free_variant_id
        FROM auto_discounts
        WHERE effect_free_variant_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.id = auto_discounts.effect_free_variant_id)
      `;
      if (orphanProducts.length === 0 && orphanVariants.length === 0) return null;
      console.log("  Auto-discounts pointing at a deleted product:");
      printTable(orphanProducts, ["id", "name", "effect_free_product_id"]);
      console.log("  Auto-discounts pointing at a deleted variant:");
      printTable(orphanVariants, ["id", "name", "effect_free_variant_id"]);
      return `${orphanProducts.length + orphanVariants.length} auto_discounts row(s) reward a product/variant that no longer exists.`;
    },
  },
  {
    name: "variant_images: foreign key behavior and any variants with multiple images",
    async run(sql) {
      if (!(await tableExists(sql, "variant_images"))) {
        return "variant_images table does not exist, but src/app/api/products/[id]/route.ts INSERTs into it on every product save — those inserts must currently be failing (silently, if wrapped in try/catch upstream — check server logs).";
      }
      const fk = await sql`
        SELECT conname, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conrelid = 'variant_images'::regclass
          AND contype = 'f'
          AND pg_get_constraintdef(oid) ILIKE '%product_variants%'
      `;
      if (fk.length === 0) {
        // No FK at all — check for orphans directly, since nothing stops them from accumulating.
        const orphans = await sql`
          SELECT id, variant_id, image_url
          FROM variant_images
          WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.id = variant_images.variant_id)
        `;
        let msg = "variant_images.variant_id has no foreign key to product_variants at all — nothing enforces referential integrity or cleans up old rows when a variant is genuinely removed via PUT /api/products/[id].";
        if (orphans.length > 0) {
          console.log("  Orphaned variant_images rows (variant no longer exists):");
          printTable(orphans, ["id", "variant_id", "image_url"]);
          msg += ` ${orphans.length} orphaned row(s) found right now — these are dead weight and will never be cleaned up on their own.`;
        }
        return msg;
      }
      const def = fk[0].definition;
      // products/[id]/route.ts now upserts variants (INSERT ... ON
      // CONFLICT DO UPDATE) instead of deleting and recreating all of a
      // product's variants on every save — a variant only actually gets
      // deleted (and cascades its images away) when it's genuinely removed
      // from the edit form, which is correct/desired. So CASCADE here is
      // no longer a live problem in general. The one remaining edge case:
      // a variant that currently has more than one image would still lose
      // the extras *if that specific variant is later deleted* — check the
      // real data rather than assuming.
      const multiImageVariants = await sql`
        SELECT variant_id, COUNT(*) AS image_count
        FROM variant_images
        GROUP BY variant_id
        HAVING COUNT(*) > 1
      `;
      if (multiImageVariants.length > 0 && /ON DELETE CASCADE/i.test(def)) {
        console.log("  Variants that currently have more than one image (deleting one of these variants will drop the extras):");
        printTable(multiImageVariants, ["variant_id", "image_count"]);
        return `variant_images has "${fk[0].conname}": ${def}. ${multiImageVariants.length} variant(s) right now have more than one image — deleting any of those specific variants (not just editing the product) will cascade-drop the extra photo(s).`;
      }
      if (!/ON DELETE CASCADE/i.test(def)) {
        return `variant_images has "${fk[0].conname}": ${def} — no CASCADE, so deleting a product_variants row that still has variant_images referencing it will raise a foreign-key violation (caught as a generic 500 by the PUT handler's try/catch, but the product save — or the variant-removal path within it — will fail).`;
      }
      return null; // CASCADE + no variant currently has multiple images: fixed at the application level, nothing to flag.
    },
  },
  {
    name: "order_items referencing deleted products/variants",
    async run(sql) {
      // Expected/benign for old orders after a product is discontinued — this
      // is informational, not necessarily something to "fix".
      const rows = await sql`
        SELECT oi.id, oi.order_id, oi.product_id, oi.variant_id, oi.snapshot_product_name
        FROM order_items oi
        WHERE oi.product_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM products p WHERE p.id = oi.product_id)
        LIMIT 20
      `;
      if (rows.length === 0) return null;
      console.log("  order_items referencing a since-deleted product (first 20) — expected for discontinued products, informational only:");
      printTable(rows, ["id", "order_id", "product_id", "variant_id", "snapshot_product_name"]);
      return null; // not flagged as a problem, just surfaced
    },
  },
  {
    name: "products: duplicate slugs across different ids",
    async run(sql) {
      // src/app/api/seed/route.ts inserts hardcoded (id, slug) pairs with
      // ON CONFLICT (id) DO NOTHING — if a row with the same slug but a
      // *different* id already exists (e.g. a product was recreated by
      // hand through the admin panel), the insert fails on the separate
      // products_slug_key UNIQUE constraint, which used to abort the whole
      // seed run. This check shows you which slugs are involved so you can
      // decide whether to rename one or delete the stale row.
      const rows = await sql`
        SELECT slug, array_agg(id) AS ids, COUNT(*) AS count
        FROM products
        GROUP BY slug
        HAVING COUNT(*) > 1
      `;
      if (rows.length === 0) return null;
      console.log("  Slugs shared by more than one product id:");
      printTable(rows, ["slug", "ids", "count"]);
      return `${rows.length} slug(s) are shared by multiple product ids — this is what causes "duplicate key value violates unique constraint products_slug_key" if the seed script's hardcoded id for that slug doesn't match.`;
    },
  },
  {
    name: "product_attributes: duplicate names",
    async run(sql) {
      // /api/seed used to insert with ON CONFLICT DO NOTHING but no target
      // (product_attributes had no UNIQUE constraint on name), so every
      // re-run of /api/seed created 4 fresh duplicate rows. If a product
      // ends up with product_attribute_values under two different ids that
      // both mean e.g. "Care Level", getProducts()'s correlated subquery
      // for that attribute throws "more than one row returned by a
      // subquery used as an expression" — which, because that query runs
      // once for the WHOLE product list, takes down the entire public
      // storefront (not just the one affected product).
      const rows = await sql`
        SELECT name, array_agg(id ORDER BY id) AS ids, COUNT(*) AS count
        FROM product_attributes
        GROUP BY name
        HAVING COUNT(*) > 1
      `;
      if (rows.length === 0) return null;
      console.log("  Duplicate attribute names:");
      printTable(rows, ["name", "ids", "count"]);
      return `${rows.length} attribute name(s) have duplicate rows. Run: node db-tool.js fix product-attributes-dedupe`;
    },
  },
];

async function cmdCheck(sql) {
  let problems = 0;
  for (const check of CHECKS) {
    console.log(`\n--- ${check.name} ---`);
    try {
      const result = await check.run(sql);
      if (result) {
        problems++;
        console.log(`  ⚠ ${result}`);
      } else {
        console.log("  OK");
      }
    } catch (err) {
      // One check failing (e.g. a type mismatch a fix hasn't been applied
      // for yet) shouldn't stop the rest from running and reporting.
      problems++;
      console.log(`  ⚠ Check failed to run: ${err.message || err}`);
    }
  }
  console.log(`\n${problems === 0 ? "No problems found." : `${problems} issue(s) found — see ⚠ lines above.`}`);
}

// ---------------------------------------------------------------------------
// fix: named, narrow, idempotent write operations. Each always prints the
// affected rows/columns, both before and after.
// ---------------------------------------------------------------------------
const FIXES = {
  "pickup-slot-at": {
    description: "Make orders.pickup_slot_at nullable, so custom-location orders (which submit no slot) can be inserted.",
    async run(sql, dryRun) {
      console.log("Before:");
      const before = await sql`
        SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pickup_slot_at'
      `;
      printTable(before, ["column_name", "is_nullable"]);

      if (before[0]?.is_nullable === "YES") {
        console.log("Already nullable — nothing to do.");
        return;
      }

      if (dryRun) {
        console.log("(dry-run) Would run: ALTER TABLE orders ALTER COLUMN pickup_slot_at DROP NOT NULL;");
        return;
      }

      await sql`ALTER TABLE orders ALTER COLUMN pickup_slot_at DROP NOT NULL`;

      console.log("After:");
      const after = await sql`
        SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pickup_slot_at'
      `;
      printTable(after, ["column_name", "is_nullable"]);
    },
  },

  "variant-id-column-types": {
    description: "Convert discount_codes.free_variant_id / auto_discounts.trigger_variant_id / auto_discounts.effect_free_variant_id from INTEGER to TEXT (matching product_variants.id) and add proper foreign keys.",
    async run(sql, dryRun) {
      const targets = [
        { table: "discount_codes", column: "free_variant_id", fkName: "discount_codes_free_variant_id_fkey", onDelete: "SET NULL" },
        { table: "auto_discounts", column: "trigger_variant_id", fkName: "auto_discounts_trigger_variant_id_fkey", onDelete: "CASCADE" },
        { table: "auto_discounts", column: "effect_free_variant_id", fkName: "auto_discounts_effect_free_variant_id_fkey", onDelete: "SET NULL" },
      ];

      console.log("Before:");
      const beforeRows = [];
      for (const t of targets) {
        const exists = await sql`SELECT to_regclass(${"public." + t.table}) AS reg`;
        if (!exists[0]?.reg) {
          console.log(`  Table "${t.table}" does not exist — skipping its columns.`);
          continue;
        }
        const rows = await sql`
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${t.table} AND column_name = ${t.column}
        `;
        beforeRows.push({ table: t.table, column: t.column, data_type: rows[0]?.data_type ?? "(not found)" });
      }
      printTable(beforeRows, ["table", "column", "data_type"]);

      const toFix = targets.filter((t) => {
        const row = beforeRows.find((b) => b.table === t.table && b.column === t.column);
        return row && row.data_type !== "text";
      });

      if (toFix.length === 0) {
        console.log("All target columns are already TEXT — nothing to convert. (Foreign keys will still be checked/added below.)");
      }

      if (dryRun) {
        for (const t of toFix) {
          console.log(`(dry-run) Would run: ALTER TABLE ${t.table} ALTER COLUMN ${t.column} TYPE TEXT USING ${t.column}::text;`);
        }
        for (const t of targets) {
          console.log(`(dry-run) Would run (if not already present): ALTER TABLE ${t.table} ADD CONSTRAINT ${t.fkName} FOREIGN KEY (${t.column}) REFERENCES product_variants(id) ON DELETE ${t.onDelete};`);
        }
        return;
      }

      for (const t of toFix) {
        await sql.query(`ALTER TABLE ${t.table} ALTER COLUMN ${t.column} TYPE TEXT USING ${t.column}::text`);
        console.log(`Converted ${t.table}.${t.column} to TEXT.`);
      }

      for (const t of targets) {
        try {
          await sql.query(
            `ALTER TABLE ${t.table} ADD CONSTRAINT ${t.fkName} FOREIGN KEY (${t.column}) REFERENCES product_variants(id) ON DELETE ${t.onDelete}`,
          );
          console.log(`Added foreign key ${t.fkName}.`);
        } catch (err) {
          if (/already exists/i.test(err.message || "")) {
            console.log(`Foreign key ${t.fkName} already exists — skipped.`);
          } else {
            console.warn(`Could not add foreign key ${t.fkName}: ${err.message}`);
          }
        }
      }

      console.log("\nAfter:");
      const afterRows = [];
      for (const t of targets) {
        const exists = await sql`SELECT to_regclass(${"public." + t.table}) AS reg`;
        if (!exists[0]?.reg) continue;
        const rows = await sql`
          SELECT data_type FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${t.table} AND column_name = ${t.column}
        `;
        afterRows.push({ table: t.table, column: t.column, data_type: rows[0]?.data_type ?? "(not found)" });
      }
      printTable(afterRows, ["table", "column", "data_type"]);
    },
  },


  "orphaned-variant-images": {
    description: "Delete variant_images rows whose variant_id no longer exists in product_variants (only meaningful if that FK check reported orphans).",
    async run(sql, dryRun) {
      const exists = await sql`SELECT to_regclass('public.variant_images') AS reg`;
      if (!exists[0]?.reg) {
        console.log("variant_images table does not exist — nothing to fix.");
        return;
      }

      console.log("Before — rows that would be deleted:");
      const before = await sql`
        SELECT id, variant_id, image_url
        FROM variant_images
        WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.id = variant_images.variant_id)
      `;
      printTable(before, ["id", "variant_id", "image_url"]);

      if (before.length === 0) {
        console.log("No orphaned rows — nothing to do.");
        return;
      }

      if (dryRun) {
        console.log(`(dry-run) Would delete ${before.length} row(s) shown above.`);
        return;
      }

      const ids = before.map((r) => r.id);
      await sql`DELETE FROM variant_images WHERE id = ANY(${ids})`;

      console.log("After:");
      const after = await sql`
        SELECT id, variant_id, image_url
        FROM variant_images
        WHERE id = ANY(${ids})
      `;
      printTable(after, ["id", "variant_id", "image_url"]);
      console.log(`Deleted ${before.length} row(s).`);
    },
  },

  "product-attributes-dedupe": {
    description: "Merge duplicate product_attributes rows (same name, different id — caused by /api/seed's ON CONFLICT DO NOTHING never having a real target to conflict on, so every re-run inserted 4 fresh duplicates), repoint/collapse product_attribute_values onto one 'keeper' row per name, then add a UNIQUE(name) constraint so it can't happen again.",
    async run(sql, dryRun) {
      if (!(await tableExists(sql, "product_attributes"))) {
        console.log("product_attributes table does not exist — nothing to do.");
        return;
      }

      console.log("Before — duplicate attribute names:");
      const dupeGroups = await sql`
        SELECT name, array_agg(id ORDER BY id) AS ids, COUNT(*) AS count
        FROM product_attributes
        GROUP BY name
        HAVING COUNT(*) > 1
      `;
      printTable(dupeGroups, ["name", "ids", "count"]);
      if (dupeGroups.length === 0) {
        console.log("No duplicates.");
      }

      if (dryRun) {
        if (dupeGroups.length > 0) {
          console.log(
            `(dry-run) Would merge ${dupeGroups.length} duplicate group(s) onto their lowest id, repoint/collapse product_attribute_values, then delete the duplicate rows.`,
          );
        }
        console.log("(dry-run) Would run (if not already present): ALTER TABLE product_attributes ADD CONSTRAINT product_attributes_name_key UNIQUE (name);");
        return;
      }

      for (const group of dupeGroups) {
        const ids = group.ids; // ordered ascending — ids[0] is the keeper
        const keeperId = ids[0];
        const dupeIds = ids.slice(1);
        for (const dupeId of dupeIds) {
          // A product that already has a value under the keeper id can't
          // also get one under the duplicate id (product_id, attribute_id)
          // is the primary key — so drop the duplicate's value there.
          await sql`
            DELETE FROM product_attribute_values pav
            WHERE pav.attribute_id = ${dupeId}
              AND EXISTS (
                SELECT 1 FROM product_attribute_values k
                WHERE k.attribute_id = ${keeperId} AND k.product_id = pav.product_id
              )
          `;
          // Everything else just gets repointed onto the keeper id.
          await sql`
            UPDATE product_attribute_values
            SET attribute_id = ${keeperId}
            WHERE attribute_id = ${dupeId}
          `;
        }
        await sql`DELETE FROM product_attributes WHERE id = ANY(${dupeIds})`;
        console.log(`Merged "${group.name}": kept id ${keeperId}, removed [${dupeIds.join(", ")}].`);
      }

      try {
        await sql`ALTER TABLE product_attributes ADD CONSTRAINT product_attributes_name_key UNIQUE (name)`;
        console.log("Added UNIQUE constraint on product_attributes.name.");
      } catch (err) {
        if (/already exists/i.test(err.message || "")) {
          console.log("UNIQUE constraint already present.");
        } else {
          console.warn(`Could not add UNIQUE constraint: ${err.message}`);
        }
      }

      console.log("\nAfter:");
      const after = await sql`SELECT id, name FROM product_attributes ORDER BY name`;
      printTable(after, ["id", "name"]);
    },
  },
};

async function cmdFix(sql, name, dryRun) {
  if (!name || name === "list") {
    console.log("Available fixes:");
    for (const [key, fix] of Object.entries(FIXES)) {
      console.log(`  ${key.padEnd(24)} ${fix.description}`);
    }
    return;
  }
  const fix = FIXES[name];
  if (!fix) {
    console.error(`Unknown fix "${name}". Run "node db-tool.js fix list" to see available fixes.`);
    process.exitCode = 1;
    return;
  }
  console.log(dryRun ? `Running fix "${name}" in --dry-run mode (no changes will be made).\n` : `Running fix "${name}".\n`);
  await fix.run(sql, dryRun);
}

async function main() {
  const databaseUrl = loadDatabaseUrl();
  const sql = neon(databaseUrl);

  switch (COMMAND) {
    case "schema":
      await cmdSchema(sql, POSITIONAL_ARGS);
      break;
    case "check":
      await cmdCheck(sql);
      break;
    case "fix":
      await cmdFix(sql, POSITIONAL_ARGS[0], DRY_RUN);
      break;
    default:
      console.log(
        [
          "Usage:",
          "  node db-tool.js schema [table...]   Dump columns + constraints (all tables, or just the ones named)",
          "  node db-tool.js check                Run read-only integrity checks",
          "  node db-tool.js fix list              List available fixes",
          "  node db-tool.js fix <name> [--dry-run] Apply a named fix, printing affected rows before/after",
          "",
          "Examples:",
          "  node db-tool.js schema discount_codes auto_discounts variant_images",
          "  node db-tool.js check",
          "  node db-tool.js fix pickup-slot-at --dry-run",
          "  node db-tool.js fix pickup-slot-at",
        ].join("\n"),
      );
  }
}

main().catch((err) => {
  console.error("\ndb-tool.js failed:", err.message || err);
  process.exitCode = 1;
});
