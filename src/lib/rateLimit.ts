
// NOTE on limitations: this rate limiter stores counters in an in-process
// Map. That's fine for a single long-running Node server, but on serverless
// platforms (e.g. Vercel) each invocation may hit a different instance with
// its own memory, so limits are only enforced "best effort" per-instance,
// not globally. For strict enforcement in production, back this with a
// shared store such as Upstash Redis / Vercel KV instead of an in-memory Map.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Extract the client's IP address from request headers.
 * `x-forwarded-for` can contain a comma-separated chain
 * ("client, proxy1, proxy2") — the first entry is the original client.
 * Note: if this app isn't deployed behind a platform/proxy that overwrites
 * this header (e.g. Vercel), a direct caller could set it arbitrarily and
 * spoof a fresh identity on every request, bypassing the limiter. This is a
 * defense-in-depth measure, not a substitute for auth/CAPTCHA on public
 * write endpoints.
 */
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || "unknown";
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Simple rate limiter
 * @param identifier - Unique identifier (e.g., IP address)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000 // 1 minute
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No entry or expired - create new
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  // Entry exists and not expired
  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    reset: entry.resetAt,
  };
}
