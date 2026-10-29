#!/usr/bin/env node
/**
 * migrate-gallery.mjs
 * -------------------
 * Creates the `gallery_items` table used by the public Gallery page and its
 * admin screen. Every statement is idempotent (IF NOT EXISTS), so running it
 * again is safe. The same statement also lives in src/app/api/seed/route.ts.
 *
 * Usage: node scripts/migrate-gallery.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const envPath of ["./.env.local", "./.env"]) {
    if (!existsSync(envPath)) continue;
    for (const rawLine of readFileSync(envPath, "utf8").split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      if (line.slice(0, eq).trim() !== "DATABASE_URL") continue;
      return line
        .slice(eq + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  }
  throw new Error("DATABASE_URL not found");
}

const sql = neon(loadDatabaseUrl());

await sql`
  CREATE TABLE IF NOT EXISTS gallery_items (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const cols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'gallery_items'
  ORDER BY ordinal_position
`;
console.log("gallery_items columns:", cols.map((c) => c.column_name).join(", "));
