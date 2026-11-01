/**
 * Pickup times are chosen in local AU calendars; Vercel runs in UTC.
 * Weekday matching, slot reservation counting and reservation release all
 * happen inside the order routes' SQL (see `/api/orders` and
 * `/api/orders/[id]`), which is the only place that can do them atomically.
 */
export const STORE_TIMEZONE = "Australia/Sydney";
