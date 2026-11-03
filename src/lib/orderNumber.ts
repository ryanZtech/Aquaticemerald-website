import { randomInt } from "node:crypto";

/**
 * Customer-facing order numbers look like `AE-123456`: six digits, allocated
 * per checkout and checked against every order reference already submitted.
 */
export const ORDER_REFERENCE_PATTERN = /^AE-\d{6}$/;

/** A single six-digit candidate code (000000–999999). */
export function randomOrderCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Build the full customer-facing reference from a six-digit code. */
export function formatOrderReference(code: string | number): string {
  return `AE-${String(code).padStart(6, "0")}`;
}
