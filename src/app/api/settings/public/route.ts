import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { STOCK_LEVELS, STOCK_LEVEL_SETTINGS_KEYS } from "@/lib/stockLimits";

export const dynamic = "force-dynamic";

// Keys that are safe to expose to anonymous/public clients.
const PUBLIC_KEYS = [
  "hero_image",
  "scene_image",
  ...STOCK_LEVELS.map((level) => STOCK_LEVEL_SETTINGS_KEYS[level]),
] as const;

export async function GET() {
  if (!sql) {
    return NextResponse.json({});
  }

  try {
    const rows = await sql`
      SELECT key, value
      FROM store_settings
      WHERE key = ANY(${PUBLIC_KEYS as unknown as string[]})
    `;
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}
