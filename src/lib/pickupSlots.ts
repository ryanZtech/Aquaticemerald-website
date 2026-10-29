import { sql } from "./db";

/** Pickup times are chosen in local AU calendars; Vercel runs in UTC. */
export const STORE_TIMEZONE = "Australia/Sydney";

const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** JS weekday (0=Sun … 6=Sat) in the store timezone, not the server's. */
export function weekdayInStoreTz(isoOrDate: string | Date): number {
  const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return -1;
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIMEZONE,
    weekday: "short",
  }).format(date);
  return WEEKDAY_SHORT_TO_INDEX[weekday] ?? -1;
}

export async function releaseSlotReservation(
  pickupLocationId: number,
  slotAt: string,
): Promise<void> {
  if (!sql) return;
  await sql`
    UPDATE slot_reservations
    SET current_count = GREATEST(current_count - 1, 0)
    WHERE pickup_location_id = ${pickupLocationId}
      AND slot_at = ${slotAt}
  `;
}
