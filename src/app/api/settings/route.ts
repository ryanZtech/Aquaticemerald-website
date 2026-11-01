import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { STOCK_LEVELS, STOCK_LEVEL_SETTINGS_KEYS } from "@/lib/stockLimits";

// Every key the app actually reads. Anything else is refused rather than
// written into store_settings: previously any key of any length was accepted,
// so a buggy (or same-site-forged) admin request could create arbitrary rows.
const ALLOWED_SETTING_KEYS = new Set<string>([
  "seller_whatsapp",
  "seller_email",
  "hero_image",
  "scene_image",
  ...STOCK_LEVELS.map((level) => STOCK_LEVEL_SETTINGS_KEYS[level]),
]);

// Longest legitimate value is an image URL; nothing here is free text.
const MAX_VALUE_LENGTH = 500;

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  try {
    const rows = await sql`SELECT key, value FROM store_settings`;
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({ ...settings, turnstile_health: {
      siteKeyConfigured: Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()),
      secretKeyConfigured: Boolean(process.env.TURNSTILE_SECRET_KEY?.trim()),
    } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Error fetching settings from database:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  if (!sql) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  // `Object.entries` throws on null (a 500 with a misleading "failed to save")
  // and silently yields nothing for an array (a 200 that saved nothing).
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Settings payload must be a JSON object of key/value pairs." },
      { status: 400 },
    );
  }

  const entries = Object.entries(body as Record<string, unknown>);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No settings were provided." }, { status: 400 });
  }

  const unknownKeys = entries.map(([key]) => key).filter((key) => !ALLOWED_SETTING_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return NextResponse.json(
      { error: `Unknown setting(s): ${unknownKeys.join(", ")}` },
      { status: 400 },
    );
  }

  // Validate the whole payload before writing any of it, so a bad value can
  // never leave the store half-updated.
  for (const [key, value] of entries) {
    if (typeof value !== "string") {
      return NextResponse.json(
        { error: `Setting "${key}" must be a string.` },
        { status: 400 },
      );
    }
    if (value.length > MAX_VALUE_LENGTH) {
      return NextResponse.json(
        { error: `Setting "${key}" is too long (max ${MAX_VALUE_LENGTH} characters).` },
        { status: 400 },
      );
    }
  }

  try {
    for (const [key, value] of entries) {
      await sql`
        INSERT INTO store_settings (key, value)
        VALUES (${key}, ${value as string})
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings to database:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
