export interface Variant {
  id: string;
  label: string;
  price: number;
  stock_quantity?: number;
  stock_level?: string;
  image_url?: string;
}

export interface ProductImage {
  id?: number;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
}

export type Category = "plants" | "shrimp" | "snails" | "fish";
export type AllCategory = "all" | Category;

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  description: string;
  careLevel: string;
  light: string;
  avgSize: string;
  origin: string;
  variants: Variant[];
  img: string;
  images?: ProductImage[];
  variantOptions?: string[];
}

export interface CartItem {
  productId: string;
  variantId: string;
  qty: number;
  name: string;
  variantLabel: string;
  price: number;
  img?: string;
  stock_level?: string;
  stock_quantity?: number;
}

export interface PickupLocation {
  id: number;
  name: string;
  detail: string;
}

export interface PickupHour {
  id: number;
  dayRange: string;
  timeRange: string;
}

// Configuration Constants
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DAY_NAMES_SHORT = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

// Utility Functions
export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function getTimeWindows(dow: number): string[] {
  const fmt = (h: number, m: number) =>
    `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  const make = (sH: number, sM: number, eH: number, eM: number) => {
    const ws: string[] = [];
    let h = sH,
      m = sM;
    while (h < eH || (h === eH && m < eM)) {
      const nm = m + 15,
        nh = nm >= 60 ? h + 1 : h,
        am = nm >= 60 ? nm - 60 : nm;
      ws.push(`${fmt(h, m)} – ${fmt(nh, am)}`);
      h = nh;
      m = am;
    }
    return ws;
  };
  if (dow === 6) return make(11, 0, 18, 0);
  if (dow === 0) return make(13, 0, 18, 0);
  return make(16, 30, 19, 0);
}
