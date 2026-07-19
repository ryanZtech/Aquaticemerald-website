export type StockLevel =
  | "none"
  | "single"
  | "very_low"
  | "low"
  | "medium"
  | "high"
  | "very_high";

export interface StockLimitSettings {
  max_qty_none?: string;
  max_qty_single?: string;
  max_qty_very_low?: string;
  max_qty_low?: string;
  max_qty_medium?: string;
  max_qty_high?: string;
  max_qty_very_high?: string;
}

// Sensible starting defaults — how many of a single variant a customer can
// order in one go at each stock level. Store owners can override these per
// level in Admin > Settings.
export const DEFAULT_STOCK_LIMITS: Record<StockLevel, number> = {
  none: 0,
  single: 1,
  very_low: 2,
  low: 5,
  medium: 10,
  high: 25,
  very_high: 50,
};

export const STOCK_LEVEL_SETTINGS_KEYS: Record<StockLevel, keyof StockLimitSettings> = {
  none: "max_qty_none",
  single: "max_qty_single",
  very_low: "max_qty_very_low",
  low: "max_qty_low",
  medium: "max_qty_medium",
  high: "max_qty_high",
  very_high: "max_qty_very_high",
};

const LEVEL_KEYS = STOCK_LEVEL_SETTINGS_KEYS;

// Human-readable label for each level, used consistently across admin and
// customer-facing UI.
export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  none: "None",
  single: "Single",
  very_low: "Very Low",
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very High",
};

// Ordered list of all levels, lowest to highest — handy for populating
// <select> dropdowns in a consistent order.
export const STOCK_LEVELS: StockLevel[] = [
  "none",
  "single",
  "very_low",
  "low",
  "medium",
  "high",
  "very_high",
];

// Shared Tailwind class per level so badges look consistent between the
// storefront and any future admin styling that wants color-coding.
export const STOCK_LEVEL_BADGE_CLASSES: Record<StockLevel, string> = {
  none: "bg-destructive/10 text-destructive",
  single: "bg-red-500/10 text-red-600",
  very_low: "bg-orange-500/10 text-orange-600",
  low: "bg-amber-500/10 text-amber-600",
  medium: "bg-yellow-500/10 text-yellow-700",
  high: "bg-lime-500/10 text-lime-700",
  very_high: "bg-emerald-500/10 text-emerald-600",
};

export function normalizeStockLevel(level?: string | null): StockLevel {
  const l = String(level || "").toLowerCase().trim();
  // Accept a few legacy/alternate spellings so existing data and any
  // in-flight requests keep working during the transition.
  if (l === "med") return "medium";
  if (l === "verylow" || l === "very-low") return "very_low";
  if (l === "veryhigh" || l === "very-high") return "very_high";
  if ((STOCK_LEVELS as string[]).includes(l)) return l as StockLevel;
  return "none";
}

export function parseStockLimitSettings(
  settings?: StockLimitSettings | null,
): Record<StockLevel, number> {
  const result: Record<StockLevel, number> = { ...DEFAULT_STOCK_LIMITS };
  if (!settings) return result;
  (Object.keys(LEVEL_KEYS) as StockLevel[]).forEach((level) => {
    const raw = settings[LEVEL_KEYS[level]];
    if (raw !== undefined && raw !== null && raw !== "") {
      const n = parseInt(String(raw), 10);
      if (!Number.isNaN(n) && n >= 0) result[level] = n;
    }
  });
  result.none = 0;
  return result;
}

export function maxQtyForLevel(
  level: string | null | undefined,
  limits: Record<StockLevel, number>,
): number {
  const normalized = normalizeStockLevel(level);
  return Math.max(0, limits[normalized]);
}
