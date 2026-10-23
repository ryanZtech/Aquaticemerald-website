/**
 * e2e-value-pack.mjs
 * ------------------
 * End-to-end test of the Value Pack feature through the REAL admin HTTP API
 * (the same endpoints the product form submits to), against the local dev
 * server on :3100.
 *
 * Auth: requireAdmin() verifies the `admin_session` cookie with JWT_SECRET,
 * so this script signs a short-lived (5 min) token locally using that secret
 * — the secret itself is never printed or stored anywhere.
 *
 * Flow tested:
 *   1. Create two throwaway products (item A stock=high, item B stock=low).
 *   2. Create a value pack (sync on) with items A×1 + B×2.
 *      → pack's variant stock must materialize to "low" (lowest item).
 *   3. Set item A to none → pack must become "none" (out of stock).
 *   4. Set item A to very_high → pack must stay "low" (B still lowest).
 *   5. Turn sync OFF and set manual "medium" → pack must keep "medium".
 *   6. Delete the pack and both items (cleanup).
 *
 * Usage: node scripts/e2e-value-pack.mjs   (dev server must be running)
 */
import { readFileSync, existsSync } from "node:fs";
import { SignJWT } from "jose";

function loadEnv(name) {
  if (process.env[name]) return process.env[name];
  const envPath = ["./.env.local", "./.env"].find((p) => existsSync(p));
  if (!envPath) throw new Error("no env file found");
  for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    if (line.slice(0, eq).trim() !== name) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  throw new Error(`${name} not found in env file`);
}

const BASE = "http://localhost:3100";
const secret = loadEnv("JWT_SECRET");
const token = await new SignJWT({})
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("5m")
  .sign(new TextEncoder().encode(secret));
const AUTH = { Cookie: `admin_session=${token}` };

const RUN = Date.now();
let failures = 0;
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "✓" : "✗"} ${name}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
}

async function api(path, { method = "GET", form } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH,
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function productForm(fields) {
  const fd = new FormData();
  fd.append("name", fields.name);
  fd.append("slug", fields.slug);
  fd.append("categoryId", String(fields.categoryId));
  fd.append("shortDescription", fields.shortDescription || "");
  fd.append("fullDescription", fields.fullDescription || "");
  fd.append("variants", JSON.stringify(fields.variants));
  fd.append("attributes", JSON.stringify(fields.attributes || {}));
  fd.append("productImages", JSON.stringify(fields.productImages || []));
  fd.append("valuePack", fields.valuePack ? "true" : "false");
  fd.append("valuePackSyncStock", fields.valuePackSyncStock ? "true" : "false");
  fd.append("valuePackItems", JSON.stringify(fields.valuePackItems || []));
  return fd;
}

const ids = { pack: null, itemA: null, itemB: null };
const slugA = `zz-e2e-item-a-${RUN}`;
const slugB = `zz-e2e-item-b-${RUN}`;
const slugP = `zz-e2e-pack-${RUN}`;

try {
  const cats = await api("/api/categories");
  const categoryId = cats.json[0]?.id;
  if (!categoryId) throw new Error("no categories available");
  console.log(`Using category id ${categoryId}`);

  // 1. Two throwaway component products.
  let r = await api("/api/products", {
    method: "POST",
    form: productForm({
      name: "ZZ E2E Item A",
      slug: slugA,
      categoryId,
      variants: [{ id: "v1", label: "A", price: 5, stock_level: "high" }],
    }),
  });
  if (r.status !== 200) throw new Error(`item A create failed: ${JSON.stringify(r.json)}`);
  ids.itemA = r.json.productId;

  r = await api("/api/products", {
    method: "POST",
    form: productForm({
      name: "ZZ E2E Item B",
      slug: slugB,
      categoryId,
      variants: [{ id: "v1", label: "B", price: 5, stock_level: "low" }],
    }),
  });
  if (r.status !== 200) throw new Error(`item B create failed: ${JSON.stringify(r.json)}`);
  ids.itemB = r.json.productId;

  const variantA = `${ids.itemA}-v1`;
  const variantB = `${ids.itemB}-v1`;

  // 2. Value pack with sync on: items high + low → pack must be low.
  r = await api("/api/products", {
    method: "POST",
    form: productForm({
      name: "ZZ E2E Pack",
      slug: slugP,
      categoryId,
      valuePack: true,
      valuePackSyncStock: true,
      valuePackItems: [
        { variantId: variantA, quantity: 1 },
        { variantId: variantB, quantity: 2 },
      ],
      variants: [{ id: "pack", label: "Value Pack", price: 12, stock_level: "none" }],
    }),
  });
  if (r.status !== 200) throw new Error(`pack create failed: ${JSON.stringify(r.json)}`);
  ids.pack = r.json.productId;
  console.log("Create flow OK — verifying derivation:");

  let pack = (await api(`/api/products/${ids.pack}`)).json;
  check("pack flagged value_pack", pack.value_pack, true);
  check("sync flag persisted", pack.value_pack_sync_stock, true);
  check("pack has 2 items", pack.pack_items?.length, 2);
  check("pack stock = low (lowest of high+low)", pack.variants?.[0]?.stock_level, "low");

  // 3. Item A out of stock → pack out of stock. (variants PUT takes a JSON
  // body, unlike the multipart product endpoints — call fetch directly.)
  await fetch(`${BASE}/api/variants/${variantA}`, {
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ stock_level: "none" }),
  });
  pack = (await api(`/api/products/${ids.pack}`)).json;
  check("item none → pack none", pack.variants?.[0]?.stock_level, "none");

  // 4. Item A very_high → pack stays low (B is still lowest).
  await fetch(`${BASE}/api/variants/${variantA}`, {
    method: "PUT",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ stock_level: "very_high" }),
  });
  pack = (await api(`/api/products/${ids.pack}`)).json;
  check("item very_high → pack still low", pack.variants?.[0]?.stock_level, "low");

  // 5. Sync OFF + manual medium → pack keeps medium.
  r = await api(`/api/products/${ids.pack}`, {
    method: "PUT",
    form: productForm({
      name: "ZZ E2E Pack",
      slug: slugP,
      categoryId,
      valuePack: true,
      valuePackSyncStock: false,
      valuePackItems: [
        { variantId: variantA, quantity: 1 },
        { variantId: variantB, quantity: 2 },
      ],
      variants: [{ id: "pack", label: "Value Pack", price: 12, stock_level: "medium" }],
    }),
  });
  if (r.status !== 200) throw new Error(`pack update failed: ${JSON.stringify(r.json)}`);
  pack = (await api(`/api/products/${ids.pack}`)).json;
  check("sync off → manual medium kept", pack.variants?.[0]?.stock_level, "medium");
} finally {
  for (const id of [ids.pack, ids.itemA, ids.itemB]) {
    if (id) await api(`/api/products/${id}`, { method: "DELETE" });
  }
  console.log("cleanup done");
}

console.log(failures === 0 ? "ALL E2E CHECKS PASSED" : `${failures} E2E CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
