import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sanitizeEnv } from "@/lib/env";

/**
 * Defense-in-depth for the admin panel's page routes.
 *
 * Note: `src/app/admin/layout.tsx` already enforces this same check as a
 * Server Component (reads the cookie, verifies the JWT, and calls redirect()
 * before any HTML is sent) — that alone is sufficient, since it runs fully
 * server-side with no way for the browser to see protected content first.
 * This middleware doesn't change that; it's an extra, independent layer so
 * that if a future admin page is ever added outside that layout tree, it's
 * still protected without anyone having to remember to add the check.
 *
 * This does NOT cover API routes: several API routes intentionally serve
 * both public (GET) and admin-only (POST/PUT/DELETE) requests on the same
 * path (e.g. /api/products), so a blanket path-based middleware can't
 * distinguish those without duplicating the per-route requireAdmin() checks
 * that already exist in each route file. Keep adding requireAdmin() to any
 * new admin-only API route directly.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("admin_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secretStr = sanitizeEnv(process.env.JWT_SECRET);
  if (!secretStr) {
    // Server misconfigured — fail closed rather than letting the request through.
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const secret = new TextEncoder().encode(secretStr);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
