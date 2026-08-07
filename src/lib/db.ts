import { neon, Pool, neonConfig } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

// The default export: an HTTP-based client. Fast and simple, but each
// `sql\`...\`` call is its own independent request — there's no way to run
// several dependent statements (e.g. "insert an order, then insert its
// items using the new order's id") as a single all-or-nothing unit with
// this client. Use it for standalone reads/writes.
export const sql = databaseUrl ? neon(databaseUrl) : null;

// Node.js (unlike edge/Workers runtimes) doesn't always have a global
// `WebSocket`, which `Pool`/`Client` need for their real, interactive
// Postgres session. Wire in the `ws` package so `pool.connect()` works here.
if (databaseUrl && typeof WebSocket === 'undefined') {
  // Lazy require so this has no effect (and no dependency needed) in
  // environments that already provide a global WebSocket.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  neonConfig.webSocketConstructor = require('ws');
}

// A real, interactive-session client for the rare cases that need an actual
// multi-statement Postgres transaction (BEGIN ... COMMIT/ROLLBACK) — e.g.
// order creation, where we must insert the order, insert its line items,
// and (for promo codes) check-and-lock a usage limit, all atomically.
// Always `client.release()` (in a `finally`) after use.
export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
