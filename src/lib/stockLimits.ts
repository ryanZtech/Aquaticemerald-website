export type StockLevel = "none" | "low" | "med" | "high";

export interface StockLimitSettings {
  max_qty_none?: string;
  max_qty_low?: string;
  max_qty_med?: string;
  max_qty_high?: string;
}

export const DEFAULT_STOCK_LIMITS: Record<StockLevel, number> = {
  none: 0,
  low: 1,
  med: 10,
  high: 25,
};

const LEVEL_KEYS: Record<StockLevel, keyof StockLimitSettings> = {
  none: "max_qty_none",
  low: "max_qty_low",
  med: "max_qty_med",
  high: "max_qty_high",
};

export function normalizeStockLevel(level?: string | null): StockLevel {
  const l = String(level || "").toLowerCase();
  if (l === "medium") return "med";
  if (l === "none" || l === "low" || l === "med" || l === "high") return l;
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
