import { sql } from "./db";
import { deriveStockLevel, type StockLevel } from "./stockLimits";

export { deriveStockLevel };

// ---------------------------------------------------------------------------
// Value Packs
//
// A value pack is a normal product row with `value_pack = TRUE`. It has its
// own variant(s) whose price is the pack price, and its contents live in
// `value_pack_items` (one row per component variant).
//
// With `value_pack_sync_stock = TRUE` the pack variant's stock_level is
// DERIVED: the lowest stock level among its component items ("if one of the
// items is low stock the pack is low stock; if one is out of stock the pack
// is out of stock"). The derived value is materialized into
// product_variants.stock_level so every existing consumer — cart quantity
// limits, storefront badges, order validation — keeps working untouched.
// Whenever a component's stock changes we recompute the packs that contain
// it (see recomputeDependentPacks below).
// ---------------------------------------------------------------------------

export interface ValuePackItemInput {
  variantId: string;
  quantity?: number;
}

/**
 * Recompute the materialized stock level of one pack product (its variants
 * all mirror the same derived level). No-op for non-packs and for packs
 * whose sync flag is off (those keep manually-set stock).
 */
export async function recomputePackProduct(
  packProductId: string,
): Promise<StockLevel | null> {
  if (!sql) return null;

  const packRows = await sql`
    SELECT id, value_pack_sync_stock
    FROM products
    WHERE id = ${packProductId} AND value_pack = TRUE
  `;
  if (packRows.length === 0) return null;
  if (!packRows[0].value_pack_sync_stock) return null;

  const itemRows = await sql`
    SELECT v.stock_level
    FROM value_pack_items vpi
    JOIN product_variants v ON v.id = vpi.item_variant_id
    WHERE vpi.pack_product_id = ${packProductId}
  `;

  const derived = deriveStockLevel(itemRows.map((r: any) => r.stock_level));

  await sql`
    UPDATE product_variants
    SET stock_level = ${derived}, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ${packProductId}
  `;

  return derived;
}

/**
 * Recompute every synced pack that contains any of the given variants in
 * its items. Call this after a variant's stock_level changes (directly or
 * via a product save/delete) so dependent packs pick up the new minimum.
 */
export async function recomputeDependentPacks(
  variantIds: string[],
): Promise<void> {
  if (!sql || variantIds.length === 0) return;

  // A pack may itself be an item of another pack, so propagate level by
  // level: recompute the packs containing the changed variants, and if a
  // pack's derived level actually moved, push ITS variants into the next
  // round. The loop is depth-capped (packs can't nest meaningfully deeper
  // than a level or two) which also breaks any accidental cycle.
  let frontier = variantIds;
  for (let depth = 0; depth < 5 && frontier.length > 0; depth++) {
    const packRows = await sql`
      SELECT DISTINCT vpi.pack_product_id AS id
      FROM value_pack_items vpi
      JOIN products p ON p.id = vpi.pack_product_id
      WHERE vpi.item_variant_id = ANY(${frontier})
        AND p.value_pack = TRUE
        AND p.value_pack_sync_stock = TRUE
    `;

    const next: string[] = [];
    for (const row of packRows as Array<{ id: string }>) {
      const before = await sql`
        SELECT DISTINCT stock_level FROM product_variants WHERE product_id = ${row.id}
      `;
      const derived = await recomputePackProduct(row.id);
      const changed =
        derived !== null &&
        (before.length !== 1 || before[0].stock_level !== derived);
      if (changed) {
        next.push(...(await variantIdsForProduct(row.id)));
      }
    }
    frontier = next;
  }
}

/**
 * Variant ids belonging to a product (used to find pack items that point at
 * a product about to change or be deleted).
 */
export async function variantIdsForProduct(
  productId: string,
): Promise<string[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT id FROM product_variants WHERE product_id = ${productId}
  `;
  return rows.map((r: any) => String(r.id));
}

/**
 * Pack products (excluding one id) that use any of the given variants —
 * captured BEFORE deleting a product so its packs can be recomputed after
 * the cascade removes their items.
 */
export async function packsUsingVariants(
  variantIds: string[],
  excludePackId?: string,
): Promise<string[]> {
  if (!sql || variantIds.length === 0) return [];
  // The exclude filter is split out rather than written as
  // `($x IS NULL OR ... != $x)`: each template interpolation becomes its own
  // untyped parameter, and a param that only ever appears in `IS NULL` has no
  // type context — Postgres rejects it with "could not determine data type of
  // parameter" (42P18) and the whole delete fails.
  const rows = excludePackId
    ? await sql`
        SELECT DISTINCT vpi.pack_product_id AS id
        FROM value_pack_items vpi
        JOIN products p ON p.id = vpi.pack_product_id
        WHERE vpi.item_variant_id = ANY(${variantIds})
          AND p.value_pack = TRUE
          AND p.value_pack_sync_stock = TRUE
          AND vpi.pack_product_id != ${excludePackId}
      `
    : await sql`
        SELECT DISTINCT vpi.pack_product_id AS id
        FROM value_pack_items vpi
        JOIN products p ON p.id = vpi.pack_product_id
        WHERE vpi.item_variant_id = ANY(${variantIds})
          AND p.value_pack = TRUE
          AND p.value_pack_sync_stock = TRUE
      `;
  return rows.map((r: any) => String(r.id));
}

/**
 * Validate and normalize the items payload from the product form. Returns
 * an error string on failure, otherwise the cleaned list (deduped by
 * variantId, quantities clamped to 1..99).
 */
export function normalizePackItems(
  raw: unknown,
  ownVariantIds: string[],
): { error?: string; items?: ValuePackItemInput[] } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: "A value pack needs at least one item" };
  }

  const seen = new Set<string>();
  const items: ValuePackItemInput[] = [];
  for (const entry of raw) {
    const variantId = String(
      (entry as any)?.variantId ?? (entry as any)?.variant_id ?? "",
    ).trim();
    if (!variantId) {
      return { error: "Each pack item needs a variant" };
    }
    if (ownVariantIds.includes(variantId)) {
      return {
        error: "A value pack cannot contain its own items",
      };
    }
    if (seen.has(variantId)) continue;
    seen.add(variantId);

    const qtyRaw = Number((entry as any)?.quantity ?? 1);
    const quantity = Number.isFinite(qtyRaw)
      ? Math.min(99, Math.max(1, Math.floor(qtyRaw)))
      : 1;

    items.push({ variantId, quantity });
  }

  return { items };
}
